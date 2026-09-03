export type AccountRole = "member" | "director";
export type RecordVisibility = "private" | "public" | "unlisted" | "deleted";
export type SourceType = "douyin" | "social_media" | "in_person" | "direct" | "other";
export type SpeakerRole = "interviewer" | "participant";

export interface Account { id: string; email: string; displayName: string; role: AccountRole; status: "pending" | "active" | "suspended" | "deleted" }
export interface InterviewRecordSummary { id: string; recordNumber: string; title: string; excerpt: string; conductedAt: string; displayName: string; personSlug: string; identityMode: "real_name" | "pseudonym" | "anonymous" }
export interface InterviewMessage { id?: string; speakerRole: SpeakerRole; body: string }
export interface RecordDraft {
  ingestionMethod?: "automated_interview";
  participant: { displayName: string; identityMode: "real_name" | "pseudonym" | "anonymous" };
  conductedAt: string;
  messages: InterviewMessage[];
  source: { sourceType: SourceType; platformName?: string; canonicalUrl?: string };
}
export interface InterviewRecordDetail extends InterviewRecordSummary { isClaimed: boolean; edition: { number: number; publishedAt: string; changeSummary: string; contentHash: string }; messages: Required<InterviewMessage>[]; source: { sourceType: SourceType; platformName: string | null; canonicalUrl: string | null } | null }
export interface ManagedRecord { id: string; record_number: string | null; title: string; visibility: RecordVisibility; updated_at: string; revision: number }
export interface EditableRecord { id: string; record_number: string | null; visibility: RecordVisibility; revision: number; snapshot: string }
export interface ClaimRequest { id: string; record_id: string; request_text: string; status: "pending" | "approved" | "rejected" | "cancelled"; created_at: string; title: string; claimant_name?: string }
export interface ApiEnvelope<T> { data: T }
