export interface ArchiveSummary {
  id: string;
  archiveNumber: string;
  title: string;
  excerpt: string;
  conductedAt: string;
  displayName: string;
  personSlug: string;
  identityMode: "real_name" | "pseudonym" | "anonymous";
  topics: Array<{ slug: string; name: string }>;
}

export interface ArchiveDetail extends ArchiveSummary {
  edition: { number: number; publishedAt: string; changeSummary: string; contentHash: string };
  story: string[];
  editorialNote: string;
  units: Array<{
    id: string;
    sequence: number;
    kind: "question" | "answer" | "image" | "pause" | "note" | "section";
    speakerRole: "interviewer" | "participant" | "editor" | "system";
    body: string;
    occurredAt: string | null;
    durationSeconds: number | null;
    parentUnitId: string | null;
  }>;
  source: { platform: string; canonicalUrl: string | null } | null;
}

export interface ApiEnvelope<T> { data: T }
