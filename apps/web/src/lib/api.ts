import type { ApiEnvelope, ArchiveDetail, ArchiveSummary } from "../types";

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...init?.headers },
  });
  const payload = await response.json() as ApiEnvelope<T> | { error?: { message?: string } };
  if (!response.ok) {
    const message = "error" in payload ? payload.error?.message : undefined;
    throw new ApiError(response.status, message ?? "档案馆暂时无法完成请求。");
  }
  return (payload as ApiEnvelope<T>).data;
}

export const api = {
  meta: () => request<{ interviews: number; people: number; topics: number; years: number }>("/api/v1/meta"),
  archives: () => request<{ items: ArchiveSummary[]; nextCursor: string | null }>("/api/v1/archives"),
  archive: (number: string) => request<ArchiveDetail>(`/api/v1/archives/${encodeURIComponent(number)}`),
  drift: (exclusions: string[] = []) => request<ArchiveSummary>(`/api/v1/drift?${new URLSearchParams(exclusions.map((value) => ["exclude", value])).toString()}`),
  search: (query: string) => request<ArchiveSummary[]>(`/api/v1/search?q=${encodeURIComponent(query)}`),
  person: (slug: string) => request<{ person: { slug: string; displayName: string; identityMode: string; bio: string }; interviews: ArchiveSummary[] }>(`/api/v1/people/${encodeURIComponent(slug)}`),
  topic: (slug: string) => request<{ topic: { slug: string; name: string; description: string }; interviews: ArchiveSummary[] }>(`/api/v1/topics/${encodeURIComponent(slug)}`),
  year: (year: string) => request<ArchiveSummary[]>(`/api/v1/years/${encodeURIComponent(year)}`),
  submitCorrection: (body: object) => request<{ requestId: string; status: string }>("/api/v1/correction-requests", { method: "POST", body: JSON.stringify(body) }),
  createDraft: (body: object) => request<{ interviewId: string; revision: number; status: string }>("/api/admin/interviews", {
    method: "POST",
    headers: location.hostname === "localhost" ? { "x-local-admin": "1" } : undefined,
    body: JSON.stringify(body),
  }),
};
