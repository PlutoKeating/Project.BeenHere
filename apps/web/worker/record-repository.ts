import { normalizeExclusions } from "./domain";
import { HttpError } from "./http";
import type { ConversationUnit, InterviewRecordDetail, InterviewRecordSummary, RecordDraft } from "./types";

type SummaryRow = {
  id: string; record_number: string; title: string; excerpt: string; conducted_at: string;
  display_name: string; person_slug: string; identity_mode: InterviewRecordSummary["identityMode"];
};
type TopicRow = { slug: string; name: string };
const summarySelect = `SELECT r.id, r.record_number, r.title, r.excerpt, r.conducted_at,
  p.display_name, p.slug AS person_slug, p.identity_mode
  FROM interview_records r JOIN people p ON p.id = r.person_id`;

function mapSummary(row: SummaryRow, topics: TopicRow[] = []): InterviewRecordSummary {
  return {
    id: row.id,
    recordNumber: row.record_number,
    title: row.title,
    excerpt: row.excerpt,
    conductedAt: row.conducted_at,
    displayName: row.display_name,
    personSlug: row.person_slug,
    identityMode: row.identity_mode,
    topics,
  };
}

export class RecordRepository {
  constructor(private readonly db: D1Database) {}

  private async topics(recordId: string): Promise<TopicRow[]> {
    const rows = await this.db.prepare(`SELECT t.slug, t.name FROM topics t
      JOIN record_topics rt ON rt.topic_id = t.id WHERE rt.record_id = ? ORDER BY t.name`).bind(recordId).all<TopicRow>();
    return rows.results;
  }

  private async summaries(rows: SummaryRow[]): Promise<InterviewRecordSummary[]> {
    return Promise.all(rows.map(async (row) => mapSummary(row, await this.topics(row.id))));
  }

  async meta() {
    const results = await this.db.batch([
      this.db.prepare("SELECT COUNT(*) AS count FROM interview_records WHERE visibility = 'public'"),
      this.db.prepare("SELECT COUNT(DISTINCT person_id) AS count FROM interview_records WHERE visibility = 'public'"),
      this.db.prepare("SELECT COUNT(*) AS count FROM topics"),
      this.db.prepare("SELECT COUNT(DISTINCT substr(conducted_at, 1, 4)) AS count FROM interview_records WHERE visibility = 'public'"),
    ]);
    const count = (result: D1Result | undefined) => Number((result?.results[0] as { count?: number })?.count ?? 0);
    return { records: count(results[0]), people: count(results[1]), topics: count(results[2]), years: count(results[3]) };
  }

  async list(limit = 24): Promise<InterviewRecordSummary[]> {
    const rows = await this.db.prepare(`${summarySelect} WHERE r.visibility = 'public' ORDER BY r.record_number LIMIT ?`)
      .bind(Math.min(Math.max(limit, 1), 50)).all<SummaryRow>();
    return this.summaries(rows.results);
  }

  async find(recordNumber: string): Promise<InterviewRecordDetail> {
    const row = await this.db.prepare(`${summarySelect} WHERE r.record_number = ? AND r.visibility IN ('public', 'unlisted')`)
      .bind(recordNumber).first<SummaryRow>();
    if (!row) throw new HttpError(404, "record_not_found", "没有找到这条采访记录。\n");
    const edition = await this.db.prepare(`SELECT pe.id, pe.edition_number, pe.snapshot, pe.change_summary, pe.published_at, pe.content_hash
      FROM published_editions pe JOIN interview_records r ON r.current_edition_id = pe.id WHERE r.id = ?`).bind(row.id).first<{
      id: string; edition_number: number; snapshot: string; change_summary: string; published_at: string; content_hash: string;
    }>();
    if (!edition) throw new HttpError(409, "edition_missing", "采访记录尚未公开。\n");
    const units = await this.db.prepare(`SELECT id, sequence, kind, speaker_role, body, occurred_at, duration_seconds, parent_unit_id
      FROM conversation_units WHERE edition_id = ? ORDER BY sequence`).bind(edition.id).all<{
      id: string; sequence: number; kind: ConversationUnit["kind"]; speaker_role: ConversationUnit["speakerRole"];
      body: string; occurred_at: string | null; duration_seconds: number | null; parent_unit_id: string | null;
    }>();
    const snapshot = JSON.parse(edition.snapshot) as RecordDraft;
    return {
      ...mapSummary(row, await this.topics(row.id)),
      edition: { number: edition.edition_number, publishedAt: edition.published_at, changeSummary: edition.change_summary, contentHash: edition.content_hash },
      story: snapshot.story,
      recordNote: snapshot.recordNote,
      units: units.results.map((unit) => ({
        id: unit.id, sequence: unit.sequence, kind: unit.kind, speakerRole: unit.speaker_role, body: unit.body,
        occurredAt: unit.occurred_at, durationSeconds: unit.duration_seconds, parentUnitId: unit.parent_unit_id,
      })),
      source: {
        sourceType: snapshot.source.sourceType,
        platformName: snapshot.source.platformName ?? null,
        canonicalUrl: snapshot.source.canonicalUrl ?? null,
      },
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
    return mapSummary(row, await this.topics(row.id));
  }

  async search(query: string): Promise<InterviewRecordSummary[]> {
    const term = query.trim().slice(0, 100);
    if (!term) return [];
    const pattern = `%${term.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const rows = await this.db.prepare(`${summarySelect} LEFT JOIN published_editions pe ON pe.id = r.current_edition_id
      WHERE r.visibility = 'public' AND (r.record_number = ? OR r.title LIKE ? ESCAPE '\\' OR r.excerpt LIKE ? ESCAPE '\\'
      OR p.display_name LIKE ? ESCAPE '\\' OR pe.snapshot LIKE ? ESCAPE '\\') ORDER BY r.conducted_at DESC LIMIT 50`)
      .bind(term.toUpperCase(), pattern, pattern, pattern, pattern).all<SummaryRow>();
    return this.summaries(rows.results);
  }

  async byPerson(slug: string) {
    const person = await this.db.prepare("SELECT id, slug, display_name, identity_mode, bio FROM people WHERE slug = ?").bind(slug).first<{
      id: string; slug: string; display_name: string; identity_mode: string; bio: string;
    }>();
    if (!person) throw new HttpError(404, "participant_not_found", "没有找到这位被采访者。\n");
    const rows = await this.db.prepare(`${summarySelect} WHERE p.id = ? AND r.visibility = 'public' ORDER BY r.conducted_at DESC`).bind(person.id).all<SummaryRow>();
    return {
      person: { slug: person.slug, displayName: person.display_name, identityMode: person.identity_mode, bio: person.bio },
      records: await this.summaries(rows.results),
    };
  }

  async byTopic(slug: string) {
    const topic = await this.db.prepare("SELECT id, slug, name, description FROM topics WHERE slug = ?").bind(slug).first<{
      id: string; slug: string; name: string; description: string;
    }>();
    if (!topic) throw new HttpError(404, "topic_not_found", "没有找到这个话题。\n");
    const rows = await this.db.prepare(`${summarySelect} JOIN record_topics rt ON rt.record_id = r.id
      WHERE rt.topic_id = ? AND r.visibility = 'public' ORDER BY r.conducted_at DESC`).bind(topic.id).all<SummaryRow>();
    return { topic: { slug: topic.slug, name: topic.name, description: topic.description }, records: await this.summaries(rows.results) };
  }

  async byYear(year: string): Promise<InterviewRecordSummary[]> {
    const rows = await this.db.prepare(`${summarySelect} WHERE substr(r.conducted_at, 1, 4) = ? AND r.visibility = 'public' ORDER BY r.conducted_at DESC`).bind(year).all<SummaryRow>();
    return this.summaries(rows.results);
  }
}
