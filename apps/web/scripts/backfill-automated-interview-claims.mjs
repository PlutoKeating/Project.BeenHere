import { createHash, randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

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

function hash(value) {
  return createHash("sha256").update(value).digest("hex");
}

function loadCandidates() {
  const response = runWrangler([
    "d1", "execute", database, "--remote", "--json", "--command",
    `SELECT r.id, r.record_number, r.visibility, d.revision, d.snapshot,
      ro.account_id, ro.ownership_kind
    FROM interview_records r
    JOIN record_drafts d ON d.record_id = r.id
    JOIN record_owners ro ON ro.record_id = r.id
    WHERE ro.ownership_kind = 'uploader'
      AND json_type(d.snapshot, '$.ingestionMethod') IS NULL
      AND EXISTS (
        SELECT 1 FROM source_records s
        WHERE s.record_id = r.id
          AND s.source_type = 'direct'
          AND s.platform_name = '来过 · 自动采访'
      )
      AND NOT EXISTS (
        SELECT 1 FROM record_owners claimed
        WHERE claimed.record_id = r.id AND claimed.ownership_kind = 'claimed'
      )
      AND 1 = (SELECT COUNT(*) FROM record_owners owners WHERE owners.record_id = r.id)
    ORDER BY r.created_at`,
  ]);
  return response[0]?.results ?? [];
}

const candidates = loadCandidates();
console.log(`Automated interview claim backfill ${apply ? "apply" : "dry run"}: ${candidates.length} record(s) need repair.`);
for (const candidate of candidates) {
  console.log(candidate.visibility === "public" || candidate.visibility === "unlisted" ? candidate.record_number : "[non-public record]");
}

if (!apply || candidates.length === 0) process.exit(0);

const triggerCheck = runWrangler([
  "d1", "execute", database, "--remote", "--json", "--command",
  "SELECT COUNT(*) AS count FROM sqlite_master WHERE type = 'trigger' AND name IN ('record_drafts_automated_claim_insert', 'record_drafts_automated_claim_update', 'record_owners_keep_automated_claim_update', 'record_owners_keep_automated_claim_delete')",
]);
if (triggerCheck[0]?.results?.[0]?.count !== 4) throw new Error("Automated interview claim invariant triggers are missing. Deploy migration 0005 before applying the backfill.");

const recovery = runWrangler(["d1", "time-travel", "info", database, "--json"]);
console.log(`Recovery bookmark before write: ${recovery.bookmark}`);

for (const candidate of candidates) {
  const nextSnapshot = JSON.stringify({ ...JSON.parse(candidate.snapshot), ingestionMethod: "automated_interview" });
  const repairedAt = new Date().toISOString();
  const auditId = `audit-${randomUUID()}`;
  const command = `UPDATE record_owners
    SET ownership_kind = 'claimed', granted_by = account_id
    WHERE record_id = ${sql(candidate.id)}
      AND account_id = ${sql(candidate.account_id)}
      AND ownership_kind = 'uploader'
      AND NOT EXISTS (
        SELECT 1 FROM record_owners claimed
        WHERE claimed.record_id = ${sql(candidate.id)} AND claimed.ownership_kind = 'claimed'
      );
    UPDATE record_drafts
    SET snapshot = ${sql(nextSnapshot)}, revision = revision + 1, updated_at = ${sql(repairedAt)}
    WHERE record_id = ${sql(candidate.id)}
      AND revision = ${Number(candidate.revision)}
      AND snapshot = ${sql(candidate.snapshot)}
      AND EXISTS (
        SELECT 1 FROM record_owners
        WHERE record_id = ${sql(candidate.id)}
          AND account_id = ${sql(candidate.account_id)}
          AND ownership_kind = 'claimed'
      );
    INSERT INTO audit_events
      (id, actor_label, action, target_type, target_id, reason, before_hash, after_hash, created_at)
    SELECT ${sql(auditId)}, 'system:maintenance', 'record.automated_claim_repaired',
      'interview_record', ${sql(candidate.id)},
      '修复早期自动采访被错误标记为上传者且缺失录入来源的问题',
      ${sql(hash(candidate.snapshot))}, ${sql(hash(nextSnapshot))}, ${sql(repairedAt)}
    WHERE EXISTS (
      SELECT 1 FROM record_drafts
      WHERE record_id = ${sql(candidate.id)}
        AND revision = ${Number(candidate.revision) + 1}
        AND updated_at = ${sql(repairedAt)}
        AND snapshot = ${sql(nextSnapshot)}
    );`;
  runWrangler(["d1", "execute", database, "--remote", "--json", "--command", command]);

  const verification = runWrangler([
    "d1", "execute", database, "--remote", "--json", "--command",
    `SELECT ro.ownership_kind,
      json_extract(d.snapshot, '$.ingestionMethod') AS ingestion_method,
      d.revision,
      EXISTS (SELECT 1 FROM audit_events WHERE id = ${sql(auditId)}) AS audit_written
    FROM record_owners ro
    JOIN record_drafts d ON d.record_id = ro.record_id
    WHERE ro.record_id = ${sql(candidate.id)} AND ro.account_id = ${sql(candidate.account_id)}`,
  ])[0]?.results?.[0];
  if (verification?.ownership_kind !== "claimed"
    || verification?.ingestion_method !== "automated_interview"
    || verification?.revision !== Number(candidate.revision) + 1
    || verification?.audit_written !== 1) {
    throw new Error(`Repair verification failed for ${candidate.record_number ?? "a non-public record"}. Use the printed recovery bookmark before retrying.`);
  }
}

const remaining = loadCandidates();
if (remaining.length > 0) throw new Error(`${remaining.length} automated interview record(s) still need repair.`);
console.log(`Automated interview claim backfill verified: ${candidates.length} record(s) repaired.`);
