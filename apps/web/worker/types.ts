export type MessageKind = "question" | "answer" | "image" | "pause" | "note" | "section";
export type SpeakerRole = "interviewer" | "participant" | "recorder" | "system";
export type AccountRole = "member" | "director";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  APP_ENV: string;
  SITE_URL: string;
  ACCESS_TEAM_DOMAIN?: string;
  ACCESS_AUD?: string;
  SUPERADMIN_EMAILS?: string;
}

export interface Account {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  status: "active" | "suspended";
}

export interface InterviewRecordSummary {
  id: string;
  recordNumber: string;
  title: string;
  excerpt: string;
  conductedAt: string;
  displayName: string;
  personSlug: string;
  identityMode: "real_name" | "pseudonym" | "anonymous";
  topics: Array<{ slug: string; name: string }>;
}

export interface ConversationUnit {
  id: string;
  sequence: number;
  kind: MessageKind;
  speakerRole: SpeakerRole;
  body: string;
  occurredAt: string | null;
  durationSeconds: number | null;
  parentUnitId: string | null;
}

export interface RecordDraft {
  participant: {
    slug: string;
    displayName: string;
    identityMode: "real_name" | "pseudonym" | "anonymous";
    bio: string;
  };
  record: { title: string; excerpt: string; conductedAt: string; endedAt?: string };
  story: string[];
  recordNote: string;
  units: Array<Omit<ConversationUnit, "id"> & { id?: string }>;
  topics: Array<{ slug: string; name: string }>;
  source: {
    sourceType: "douyin" | "social_media" | "in_person" | "direct" | "other";
    platformName?: string;
    externalId?: string;
    canonicalUrl?: string;
  };
}

export interface InterviewRecordDetail extends InterviewRecordSummary {
  edition: { number: number; publishedAt: string; changeSummary: string; contentHash: string };
  story: string[];
  recordNote: string;
  units: ConversationUnit[];
  source: { sourceType: string; platformName: string | null; canonicalUrl: string | null } | null;
}
