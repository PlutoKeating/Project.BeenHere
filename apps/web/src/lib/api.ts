import type { Account, ApiEnvelope, ClaimRequest, EditableRecord, InterviewRecordDetail, InterviewRecordSummary, ManagedRecord, RecordDraft } from "../types";

export class ApiError extends Error { constructor(readonly status: number, message: string) { super(message); } }
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { ...init, credentials: "same-origin", headers: { "content-type": "application/json", ...init?.headers } });
  const payload = await response.json().catch(() => null) as (ApiEnvelope<T> & { error?: { message?: string } }) | null;
  if (!response.ok) throw new ApiError(response.status, payload?.error?.message ?? "暂时无法完成请求。");
  return payload!.data;
}
export const api = {
  register: (body: {email:string;displayName:string;password:string}) => request<{message:string}>("/api/auth/register", {method:"POST",body:JSON.stringify(body)}),
  verifyEmail: (token:string) => request<Account>("/api/auth/verify-email", {method:"POST",body:JSON.stringify({token})}),
  login: (email:string,password:string) => request<Account>("/api/auth/login", {method:"POST",body:JSON.stringify({email,password})}),
  logout: () => request<{status:string}>("/api/auth/logout", {method:"POST",body:"{}"}),
  forgotPassword: (email:string) => request<{message:string}>("/api/auth/forgot-password", {method:"POST",body:JSON.stringify({email})}),
  resetPassword: (token:string,password:string) => request<Account>("/api/auth/reset-password", {method:"POST",body:JSON.stringify({token,password})}),
  confirmEmailChange: (token:string) => request<{status:string}>("/api/auth/confirm-email-change", {method:"POST",body:JSON.stringify({token})}),
  confirmDeletion: (token:string) => request<{status:string}>("/api/auth/confirm-deletion", {method:"POST",body:JSON.stringify({token})}),
  meta: () => request<{ records: number; people: number; topics: number; years: number }>("/api/v1/meta"),
  records: () => request<InterviewRecordSummary[]>("/api/v1/records"),
  record: (number: string) => request<InterviewRecordDetail>(`/api/v1/records/${encodeURIComponent(number)}`),
  drift: (exclusions: string[] = []) => request<InterviewRecordSummary>(`/api/v1/drift?${new URLSearchParams(exclusions.map((value) => ["exclude", value])).toString()}`),
  search: (query: string) => request<InterviewRecordSummary[]>(`/api/v1/search?q=${encodeURIComponent(query)}`),
  person: (slug: string) => request<{ person: { slug: string; displayName: string; identityMode: string; bio: string }; records: InterviewRecordSummary[] }>(`/api/v1/people/${encodeURIComponent(slug)}`),
  topic: (slug: string) => request<{ topic: { slug: string; name: string; description: string }; records: InterviewRecordSummary[] }>(`/api/v1/topics/${encodeURIComponent(slug)}`),
  year: (year: string) => request<InterviewRecordSummary[]>(`/api/v1/years/${encodeURIComponent(year)}`),
  correction: (body: object) => request<{ requestId: string }>("/api/v1/correction-requests", { method: "POST", body: JSON.stringify(body) }),
  me: () => request<Account>("/api/account/me"),
  updateProfile: (displayName: string) => request<Account>("/api/account/me", { method: "PATCH", body: JSON.stringify({ displayName }) }),
  changePassword: (currentPassword:string,newPassword:string) => request<{status:string}>("/api/account/password", {method:"PATCH",body:JSON.stringify({currentPassword,newPassword})}),
  changeEmail: (currentPassword:string,newEmail:string) => request<{message:string}>("/api/account/email", {method:"PATCH",body:JSON.stringify({currentPassword,newEmail})}),
  requestDeletion: () => request<{message:string}>("/api/account/deletion", {method:"POST",body:"{}"}),
  managedRecords: () => request<ManagedRecord[]>("/api/account/records"),
  createRecord: (draft: RecordDraft) => request<{ recordId: string; revision: number }>("/api/account/records", { method: "POST", body: JSON.stringify(draft) }),
  editableRecord: (id: string) => request<EditableRecord>(`/api/account/records/${encodeURIComponent(id)}`),
  updateRecord: (id: string, expectedRevision: number, draft: RecordDraft) => request<{ recordId: string; revision: number }>(`/api/account/records/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ expectedRevision, draft }) }),
  publishRecord: (id: string, changeSummary: string) => request<{ recordId: string; recordNumber: string; edition: number }>(`/api/account/records/${encodeURIComponent(id)}/publish`, { method: "POST", body: JSON.stringify({ changeSummary }) }),
  deleteRecord: (id: string, reason: string) => request<{ status: string }>(`/api/account/records/${encodeURIComponent(id)}`, { method: "DELETE", body: JSON.stringify({ reason }) }),
  submitClaim: (recordId: string, requestText: string) => request<{ claimId: string }>(`/api/account/records/${encodeURIComponent(recordId)}/claim`, { method: "POST", body: JSON.stringify({ requestText }) }),
  claims: () => request<{ received: ClaimRequest[]; sent: ClaimRequest[] }>("/api/account/claims"),
  reviewClaim: (id: string, decision: "approved" | "rejected", note: string) => request<{ status: string }>(`/api/account/claims/${encodeURIComponent(id)}/review`, { method: "POST", body: JSON.stringify({ decision, note }) }),
  accounts: () => request<Account[]>("/api/director/accounts"),
  setAccountStatus: (id: string, status: "active" | "suspended") => request<{ status: string }>(`/api/director/accounts/${encodeURIComponent(id)}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
};
