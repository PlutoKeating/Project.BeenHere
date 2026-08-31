export type MessageKind = "question" | "answer" | "image" | "pause" | "note" | "section";
export type SpeakerRole = "interviewer" | "participant" | "editor" | "system";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: string;
  SITE_URL: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
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

export type PublishedSnapshot = DraftSnapshot;

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
    existingPersonId?: string;
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
