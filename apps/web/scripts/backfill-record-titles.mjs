import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { deriveInterviewTitle } from "../worker/domain.ts";

const webDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wrangler = path.resolve(webDirectory, "../../node_modules/.bin/wrangler");
const database = "beenhere-records";
const apply = process.argv.includes("--apply");

function runWrangler(args) {
  const result = spawnSync(wrangler, args, { cwd: webDirectory, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(`Wrangler command failed with exit code ${result.status ?? "unknown"}.`);
  return JSON.parse(result.stdout);
}

function sql(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function loadRows() {
  const response = runWrangler([
    "d1", "execute", database, "--remote", "--json", "--command",
    `SELECT r.id, r.record_number, r.visibility, r.title, r.current_edition_id, d.revision,
      CASE WHEN r.current_edition_id IS NOT NULL THEN pe.snapshot ELSE d.snapshot END AS snapshot
      FROM interview_records r
      LEFT JOIN record_drafts d ON d.record_id = r.id
      LEFT JOIN published_editions pe ON pe.id = r.current_edition_id
      ORDER BY r.created_at`,
  ]);
  return response[0]?.results ?? [];
}

const rows = loadRows();
const recordsWithoutSnapshots = rows.filter((row) => !row.snapshot);
if (recordsWithoutSnapshots.length > 0) throw new Error(`${recordsWithoutSnapshots.length} records have neither a current published snapshot nor a draft snapshot.`);
const proposals = rows.map((row) => ({
  ...row,
  nextTitle: deriveInterviewTitle(JSON.parse(row.snapshot)),
})).filter((row) => row.title !== row.nextTitle);

console.log(`Title backfill ${apply ? "apply" : "dry run"}: ${proposals.length}/${rows.length} records need changes.`);
for (const proposal of proposals) {
  const visibleTitle = proposal.visibility === "public" || proposal.visibility === "unlisted" ? proposal.nextTitle : "[non-public title redacted]";
  console.log(`${proposal.record_number ?? proposal.id} (${proposal.visibility}) -> ${visibleTitle}`);
}

if (!apply || proposals.length === 0) process.exit(0);

const triggerCheck = runWrangler(["d1", "execute", database, "--remote", "--json", "--command", "SELECT 1 AS ok FROM sqlite_master WHERE type = 'trigger' AND name = 'audit_interview_record_title_updates'"]);
if (triggerCheck[0]?.results?.[0]?.ok !== 1) throw new Error("Title audit trigger is missing. Deploy migration 0003 before applying the backfill.");

const recovery = runWrangler(["d1", "time-travel", "info", database, "--json"]);
console.log(`Recovery bookmark before write: ${recovery.bookmark}`);

for (const proposal of proposals) {
  const draftRevisionGuard = proposal.current_edition_id === null
    ? `AND EXISTS (SELECT 1 FROM record_drafts WHERE record_id = ${sql(proposal.id)} AND revision = ${Number(proposal.revision)})`
    : "";
  const command = `UPDATE interview_records SET title = ${sql(proposal.nextTitle)}
    WHERE id = ${sql(proposal.id)} AND title = ${sql(proposal.title)}
      AND COALESCE(current_edition_id, '') = ${sql(proposal.current_edition_id ?? "")}
      ${draftRevisionGuard};`;
  runWrangler(["d1", "execute", database, "--remote", "--json", "--command", command]);
}

const remaining = loadRows().filter((row) => row.title !== deriveInterviewTitle(JSON.parse(row.snapshot)));
if (remaining.length > 0) throw new Error(`${remaining.length} records still have stale titles after backfill.`);
console.log(`Title backfill verified: ${rows.length} records now use participant-message summaries.`);
