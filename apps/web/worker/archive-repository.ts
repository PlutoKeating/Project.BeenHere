import { HttpError } from "./http";
import { normalizeExclusions } from "./domain";
import type { ArchiveDetail, ArchiveSummary, MessageUnit, PublishedSnapshot } from "./types";

interface SummaryRow {
  id: string;
  archive_number: string;
  title: string;
  excerpt: string;
  conducted_at: string;
  display_name: string;
  person_slug: string;
  identity_mode: "real_name" | "pseudonym" | "anonymous";
}

interface TopicRow {
  slug: string;
  name: string;
}

const summarySelect = `
  SELECT i.id, i.archive_number, i.title, i.excerpt, i.conducted_at,
         p.display_name, p.slug AS person_slug, p.identity_mode
  FROM interviews i
  JOIN people p ON p.id = i.person_id
`;

function mapSummary(row: SummaryRow, topics: TopicRow[] = []): ArchiveSummary {
  return {
    id: row.id,
    archiveNumber: row.archive_number,
    title: row.title,
    excerpt: row.excerpt,
    conductedAt: row.conducted_at,
    displayName: row.display_name,
    personSlug: row.person_slug,
    identityMode: row.identity_mode,
    topics,
  };
}

async function topicsFor(db: D1Database, interviewId: string): Promise<TopicRow[]> {
  const result = await db
    .prepare(`SELECT t.slug, t.name FROM topics t JOIN interview_topics it ON it.topic_id = t.id WHERE it.interview_id = ? ORDER BY t.name`)
    .bind(interviewId)
    .all<TopicRow>();
  return result.results;
}

export class ArchiveRepository {
  constructor(private readonly db: D1Database) {}

  async meta() {
    const [interviews, people, topics, years] = await this.db.batch([
      this.db.prepare("SELECT COUNT(*) AS count FROM interviews WHERE visibility = 'public'"),
      this.db.prepare("SELECT COUNT(DISTINCT person_id) AS count FROM interviews WHERE visibility = 'public'"),
      this.db.prepare("SELECT COUNT(*) AS count FROM topics"),
      this.db.prepare("SELECT COUNT(DISTINCT substr(conducted_at, 1, 4)) AS count FROM interviews WHERE visibility = 'public'"),
    ]);
    const count = (result: D1Result | undefined) => Number((result?.results[0] as { count?: number } | undefined)?.count ?? 0);
    return { interviews: count(interviews), people: count(people), topics: count(topics), years: count(years) };
  }

  async list(limit = 24, cursor?: string): Promise<{ items: ArchiveSummary[]; nextCursor: string | null }> {
    const safeLimit = Math.min(Math.max(limit, 1), 50);
    const condition = cursor ? "AND i.archive_number > ?" : "";
    const statement = this.db
      .prepare(`${summarySelect} WHERE i.visibility = 'public' ${condition} ORDER BY i.archive_number LIMIT ?`)
      .bind(...(cursor ? [cursor, safeLimit + 1] : [safeLimit + 1]));
    const result = await statement.all<SummaryRow>();
    const rows = result.results.slice(0, safeLimit);
    const items = await Promise.all(rows.map(async (row) => mapSummary(row, await topicsFor(this.db, row.id))));
    return {
      items,
      nextCursor: result.results.length > safeLimit ? rows.at(-1)?.archive_number ?? null : null,
    };
  }

  async findByArchiveNumber(archiveNumber: string): Promise<ArchiveDetail> {
    const row = await this.db
      .prepare(`${summarySelect} WHERE i.archive_number = ? AND i.visibility IN ('public', 'unlisted') LIMIT 1`)
      .bind(archiveNumber)
      .first<SummaryRow>();
    if (!row) throw new HttpError(404, "archive_not_found", "没有找到这份档案。\n");

    const edition = await this.db
      .prepare(`SELECT pe.id, pe.edition_number, pe.snapshot, pe.change_summary, pe.published_at, pe.content_hash
        FROM published_editions pe JOIN interviews i ON i.current_edition_id = pe.id
        WHERE i.id = ? LIMIT 1`)
      .bind(row.id)
      .first<{ id: string; edition_number: number; snapshot: string; change_summary: string; published_at: string; content_hash: string }>();
    if (!edition) throw new HttpError(409, "edition_missing", "档案尚无可读取版本。\n");

    const unitsResult = await this.db
      .prepare(`SELECT id, sequence, kind, speaker_role, body, occurred_at, duration_seconds, parent_unit_id
        FROM message_units WHERE edition_id = ? ORDER BY sequence`)
      .bind(edition.id)
      .all<{
        id: string;
        sequence: number;
        kind: MessageUnit["kind"];
        speaker_role: MessageUnit["speakerRole"];
        body: string;
        occurred_at: string | null;
        duration_seconds: number | null;
        parent_unit_id: string | null;
      }>();
    const source = await this.db
      .prepare("SELECT platform, canonical_url FROM source_records WHERE interview_id = ? ORDER BY captured_at LIMIT 1")
      .bind(row.id)
      .first<{ platform: string; canonical_url: string | null }>();
    const snapshot = JSON.parse(edition.snapshot) as PublishedSnapshot;

    return {
      ...mapSummary(row, await topicsFor(this.db, row.id)),
      edition: {
        number: edition.edition_number,
        publishedAt: edition.published_at,
        changeSummary: edition.change_summary,
        contentHash: edition.content_hash,
      },
      story: snapshot.story,
      editorialNote: snapshot.editorialNote,
      units: unitsResult.results.map((unit) => ({
        id: unit.id,
        sequence: unit.sequence,
        kind: unit.kind,
        speakerRole: unit.speaker_role,
        body: unit.body,
        occurredAt: unit.occurred_at,
        durationSeconds: unit.duration_seconds,
        parentUnitId: unit.parent_unit_id,
      })),
      source: source ? { platform: source.platform, canonicalUrl: source.canonical_url } : null,
    };
  }

  async drift(exclusions: string[]): Promise<ArchiveSummary> {
    const randomKey = Math.random();
    const filtered = normalizeExclusions(exclusions);
    const placeholders = filtered.map(() => "?").join(", ");
    const exclusionSql = filtered.length ? `AND i.archive_number NOT IN (${placeholders})` : "";
    const params = [randomKey, ...filtered];
    let row = await this.db
      .prepare(`${summarySelect} WHERE i.visibility = 'public' AND i.random_key >= ? ${exclusionSql} ORDER BY i.random_key LIMIT 1`)
      .bind(...params)
      .first<SummaryRow>();
    if (!row) {
      row = await this.db
        .prepare(`${summarySelect} WHERE i.visibility = 'public' ${exclusionSql} ORDER BY i.random_key LIMIT 1`)
        .bind(...filtered)
        .first<SummaryRow>();
    }
    if (!row) throw new HttpError(404, "drift_empty", "暂时没有可漂流的档案。\n");
    return mapSummary(row, await topicsFor(this.db, row.id));
  }

  async search(query: string, limit = 20): Promise<ArchiveSummary[]> {
    const trimmed = query.trim().slice(0, 100);
    if (!trimmed) return [];
    const pattern = `%${trimmed.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
    const result = await this.db
      .prepare(`${summarySelect}
        LEFT JOIN published_editions pe ON pe.id = i.current_edition_id
        WHERE i.visibility = 'public'
          AND (i.archive_number = ? OR i.title LIKE ? ESCAPE '\\' OR i.excerpt LIKE ? ESCAPE '\\'
               OR p.display_name LIKE ? ESCAPE '\\' OR pe.snapshot LIKE ? ESCAPE '\\')
        ORDER BY i.conducted_at DESC LIMIT ?`)
      .bind(trimmed.toUpperCase(), pattern, pattern, pattern, pattern, Math.min(limit, 50))
      .all<SummaryRow>();
    return Promise.all(result.results.map(async (row) => mapSummary(row, await topicsFor(this.db, row.id))));
  }

  async byPerson(slug: string) {
    const person = await this.db.prepare("SELECT id, slug, display_name, identity_mode, bio FROM people WHERE slug = ? AND status = 'active'").bind(slug).first<{
      id: string; slug: string; display_name: string; identity_mode: string; bio: string;
    }>();
    if (!person) throw new HttpError(404, "person_not_found", "没有找到这份人物档案。\n");
    const rows = await this.db.prepare(`${summarySelect} WHERE p.id = ? AND i.visibility = 'public' ORDER BY i.conducted_at DESC`).bind(person.id).all<SummaryRow>();
    const interviews = await Promise.all(rows.results.map(async (row) => mapSummary(row, await topicsFor(this.db, row.id))));
    return { person: { slug: person.slug, displayName: person.display_name, identityMode: person.identity_mode, bio: person.bio }, interviews };
  }

  async byTopic(slug: string) {
    const topic = await this.db.prepare("SELECT id, slug, name, description FROM topics WHERE slug = ?").bind(slug).first<{ id: string; slug: string; name: string; description: string }>();
    if (!topic) throw new HttpError(404, "topic_not_found", "没有找到这个话题。\n");
    const rows = await this.db.prepare(`${summarySelect} JOIN interview_topics it ON it.interview_id = i.id WHERE it.topic_id = ? AND i.visibility = 'public' ORDER BY i.conducted_at DESC`).bind(topic.id).all<SummaryRow>();
    const interviews = await Promise.all(rows.results.map(async (row) => mapSummary(row, await topicsFor(this.db, row.id))));
    return { topic: { slug: topic.slug, name: topic.name, description: topic.description }, interviews };
  }

  async byYear(year: string): Promise<ArchiveSummary[]> {
    const rows = await this.db.prepare(`${summarySelect} WHERE substr(i.conducted_at, 1, 4) = ? AND i.visibility = 'public' ORDER BY i.conducted_at DESC`).bind(year).all<SummaryRow>();
    return Promise.all(rows.results.map(async (row) => mapSummary(row, await topicsFor(this.db, row.id))));
  }
}
