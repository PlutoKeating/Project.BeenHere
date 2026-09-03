import { normalizeExclusions } from "./domain";
import { HttpError } from "./http";
import type { InterviewMessage, InterviewRecordDetail, InterviewRecordSummary } from "./types";

type SummaryRow = {
  id: string; record_number: string; title: string; excerpt: string; conducted_at: string;
  display_name: string; person_slug: string; identity_mode: InterviewRecordSummary["identityMode"];
};
const summarySelect = `SELECT r.id, r.record_number, r.title, r.excerpt, r.conducted_at,
  p.display_name, p.slug AS person_slug, p.identity_mode
  FROM interview_records r JOIN people p ON p.id = r.person_id`;

function mapSummary(row: SummaryRow): InterviewRecordSummary {
  return {
    id: row.id,
    recordNumber: row.record_number,
    title: row.title,
    excerpt: row.excerpt,
    conductedAt: row.conducted_at,
    displayName: row.display_name,
    personSlug: row.person_slug,
    identityMode: row.identity_mode,
  };
}

export class RecordRepository {
  constructor(private readonly db: D1Database) {}

  async meta() {
    const results = await this.db.batch([
      this.db.prepare("SELECT COUNT(*) AS count FROM interview_records WHERE visibility = 'public'"),
      this.db.prepare("SELECT COUNT(DISTINCT person_id) AS count FROM interview_records WHERE visibility = 'public'"),
      this.db.prepare("SELECT COUNT(DISTINCT substr(conducted_at, 1, 4)) AS count FROM interview_records WHERE visibility = 'public'"),
    ]);
    const count = (result: D1Result | undefined) => Number((result?.results[0] as { count?: number })?.count ?? 0);
    return { records: count(results[0]), people: count(results[1]), years: count(results[2]) };
  }

  async list(limit = 24): Promise<InterviewRecordSummary[]> {
    const rows = await this.db.prepare(`${summarySelect} WHERE r.visibility = 'public' ORDER BY r.record_number LIMIT ?`)
      .bind(Math.min(Math.max(limit, 1), 50)).all<SummaryRow>();
    return rows.results.map(mapSummary);
  }

  async find(recordNumber: string): Promise<InterviewRecordDetail> {
    const row = await this.db.prepare(`${summarySelect} WHERE r.record_number = ? AND r.visibility IN ('public', 'unlisted')`)
      .bind(recordNumber).first<SummaryRow>();
    if (!row) throw new HttpError(404, "record_not_found", "没有找到这条采访记录。\n");
    const edition = await this.db.prepare(`SELECT pe.id, pe.edition_number, pe.change_summary, pe.published_at, pe.content_hash
      FROM published_editions pe JOIN interview_records r ON r.current_edition_id = pe.id WHERE r.id = ?`).bind(row.id).first<{
      id: string; edition_number: number; change_summary: string; published_at: string; content_hash: string;
    }>();
    if (!edition) throw new HttpError(409, "edition_missing", "采访记录尚未公开。\n");
    const messages = await this.db.prepare(`SELECT id, speaker_role, body
      FROM interview_messages WHERE edition_id = ? ORDER BY sequence`).bind(edition.id).all<{
      id: string; speaker_role: InterviewMessage["speakerRole"]; body: string;
    }>();
    const source = await this.db.prepare(`SELECT source_type, platform_name, canonical_url
      FROM source_records WHERE record_id = ? ORDER BY captured_at LIMIT 1`).bind(row.id).first<{
      source_type: string; platform_name: string | null; canonical_url: string | null;
    }>();
    const claimedOwner = await this.db.prepare("SELECT 1 AS ok FROM record_owners WHERE record_id = ? AND ownership_kind = 'claimed' LIMIT 1").bind(row.id).first();
    return {
      ...mapSummary(row),
      isClaimed: Boolean(claimedOwner),
      edition: { number: edition.edition_number, publishedAt: edition.published_at, changeSummary: edition.change_summary, contentHash: edition.content_hash },
      messages: messages.results.map((message) => ({ id: message.id, speakerRole: message.speaker_role, body: message.body })),
      source: source ? { sourceType: source.source_type, platformName: source.platform_name, canonicalUrl: source.canonical_url } : null,
    };
  }

  async drift(exclusions: string[]): Promise<InterviewRecordSummary> {
    const normalized = normalizeExclusions(exclusions);
    const placeholders = normalized.map(() => "?").join(",");
    const exclusionSql = normalized.length ? `AND r.record_number NOT IN (${placeholders})` : "";
    const randomKey = Math.random();
    let row = await this.db.prepare(`${summarySelect} WHERE r.visibility = 'public' AND r.random_key >= ? ${exclusionSql} ORDER BY r.random_key LIMIT 1`).bind(randomKey, ...normalized).first<SummaryRow>();
    if (!row) row = await this.db.prepare(`${summarySelect} WHERE r.visibility = 'public' ${exclusionSql} ORDER BY r.random_key LIMIT 1`).bind(...normalized).first<SummaryRow>();
    if (!row) throw new HttpError(404, "drift_empty", "暂时没有公开的采访记录。\n");
    return mapSummary(row);
  }

  async search(query: string): Promise<InterviewRecordSummary[]> {
    const term = query.trim().slice(0, 100);
    if (!term) return [];
    const pattern = `%${term.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const rows = await this.db.prepare(`${summarySelect} LEFT JOIN published_editions pe ON pe.id = r.current_edition_id
      WHERE r.visibility = 'public' AND (r.record_number = ? OR r.title LIKE ? ESCAPE '\\' OR r.excerpt LIKE ? ESCAPE '\\'
      OR p.display_name LIKE ? ESCAPE '\\' OR pe.snapshot LIKE ? ESCAPE '\\') ORDER BY r.conducted_at DESC LIMIT 50`)
      .bind(term.toUpperCase(), pattern, pattern, pattern, pattern).all<SummaryRow>();
    return rows.results.map(mapSummary);
  }

  async byPerson(slug: string) {
    const person = await this.db.prepare("SELECT id, slug, display_name, identity_mode FROM people WHERE slug = ?").bind(slug).first<{
      id: string; slug: string; display_name: string; identity_mode: string;
    }>();
    if (!person) throw new HttpError(404, "participant_not_found", "没有找到这位被采访者。\n");
    const rows = await this.db.prepare(`${summarySelect} WHERE p.id = ? AND r.visibility = 'public' ORDER BY r.conducted_at DESC`).bind(person.id).all<SummaryRow>();
    return {
      person: { slug: person.slug, displayName: person.display_name, identityMode: person.identity_mode },
      records: rows.results.map(mapSummary),
    };
  }

  async byYear(year: string): Promise<InterviewRecordSummary[]> {
    const rows = await this.db.prepare(`${summarySelect} WHERE substr(r.conducted_at, 1, 4) = ? AND r.visibility = 'public' ORDER BY r.conducted_at DESC`).bind(year).all<SummaryRow>();
    return rows.results.map(mapSummary);
  }
}
