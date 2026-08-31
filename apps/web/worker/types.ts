export type MessageKind = "question" | "answer" | "image" | "pause" | "note" | "section";
export type SpeakerRole = "interviewer" | "participant" | "editor" | "system";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: string;
  SITE_URL: string;
}

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

export interface MessageUnit {
  id: string;
  sequence: number;
  kind: MessageKind;
  speakerRole: SpeakerRole;
  body: string;
  occurredAt: string | null;
  durationSeconds: number | null;
  parentUnitId: string | null;
}

export interface PublishedSnapshot {
  story: string[];
  editorialNote: string;
}

export interface ArchiveDetail extends ArchiveSummary {
  edition: {
    number: number;
    publishedAt: string;
    changeSummary: string;
    contentHash: string;
  };
  story: string[];
  editorialNote: string;
  units: MessageUnit[];
  source: {
    platform: string;
    canonicalUrl: string | null;
  } | null;
}

export interface DraftSnapshot {
  person: {
    slug: string;
    displayName: string;
    identityMode: "real_name" | "pseudonym" | "anonymous";
    bio: string;
  };
  interview: {
    title: string;
    excerpt: string;
    conductedAt: string;
    endedAt?: string;
  };
  story: string[];
  editorialNote: string;
  units: Array<Omit<MessageUnit, "id"> & { id?: string }>;
  topics: Array<{ slug: string; name: string }>;
  source?: {
    platform: "douyin" | "direct" | "other";
    externalId?: string;
    canonicalUrl?: string;
  };
}
