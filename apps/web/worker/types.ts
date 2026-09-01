export type SpeakerRole = "interviewer" | "participant";
export type AccountRole = "member" | "director";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  PRESENCE: DurableObjectNamespace;
  APP_ENV: string;
  SITE_URL: string;
  SUPERADMIN_EMAILS?: string;
  SESSION_SECRET: string;
  SMTP_HOST: string;
  SMTP_PORT: string;
  SMTP_USERNAME: string;
  SMTP_PASSWORD: string;
  SMTP_FROM_NAME?: string;
}

export interface Account {
  id: string;
  email: string;
  displayName: string;
  role: AccountRole;
  status: "pending" | "active" | "suspended" | "deleted";
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
}

export interface InterviewMessage {
  id: string;
  speakerRole: SpeakerRole;
  body: string;
}

export interface RecordDraft {
  participant: {
    displayName: string;
    identityMode: "real_name" | "pseudonym" | "anonymous";
  };
  conductedAt: string;
  messages: Array<Omit<InterviewMessage, "id"> & { id?: string }>;
  source: {
    sourceType: "douyin" | "social_media" | "in_person" | "direct" | "other";
    platformName?: string;
    canonicalUrl?: string;
  };
}

export interface InterviewRecordDetail extends InterviewRecordSummary {
  edition: { number: number; publishedAt: string; changeSummary: string; contentHash: string };
  messages: InterviewMessage[];
  source: { sourceType: string; platformName: string | null; canonicalUrl: string | null } | null;
}
