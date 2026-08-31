export type AccountRole = "member" | "director";
export type RecordVisibility = "private" | "public" | "unlisted" | "deleted";
export type SourceType = "douyin" | "social_media" | "in_person" | "direct" | "other";
export type MessageKind = "question" | "answer" | "image" | "pause" | "note" | "section";
export type SpeakerRole = "interviewer" | "participant" | "recorder" | "system";

export interface Account { id: string; email: string; displayName: string; role: AccountRole; status: "active" | "suspended" }
export interface InterviewRecordSummary { id: string; recordNumber: string; title: string; excerpt: string; conductedAt: string; displayName: string; personSlug: string; identityMode: "real_name" | "pseudonym" | "anonymous"; topics: Array<{ slug: string; name: string }> }
export interface ConversationUnit { id?: string; sequence: number; kind: MessageKind; speakerRole: SpeakerRole; body: string; occurredAt: string | null; durationSeconds: number | null; parentUnitId: string | null }
export interface RecordDraft {
  participant: { slug: string; displayName: string; identityMode: "real_name" | "pseudonym" | "anonymous"; bio: string };
  record: { title: string; excerpt: string; conductedAt: string; endedAt?: string };
  story: string[];
  recordNote: string;
  units: ConversationUnit[];
  topics: Array<{ slug: string; name: string }>;
  source: { sourceType: SourceType; platformName?: string; externalId?: string; canonicalUrl?: string };
}
export interface InterviewRecordDetail extends InterviewRecordSummary { edition: { number: number; publishedAt: string; changeSummary: string; contentHash: string }; story: string[]; recordNote: string; units: Required<ConversationUnit>[]; source: { sourceType: SourceType; platformName: string | null; canonicalUrl: string | null } | null }
export interface ManagedRecord { id: string; record_number: string | null; title: string; visibility: RecordVisibility; updated_at: string; revision: number }
export interface EditableRecord { id: string; record_number: string | null; visibility: RecordVisibility; revision: number; snapshot: string }
export interface ClaimRequest { id: string; record_id: string; request_text: string; status: "pending" | "approved" | "rejected" | "cancelled"; created_at: string; title: string; claimant_name?: string }
export interface ApiEnvelope<T> { data: T }
