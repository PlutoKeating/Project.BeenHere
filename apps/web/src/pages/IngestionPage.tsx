import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { RecordForm } from "../components/RecordForm";
import { api } from "../lib/api";
import type { RecordDraft } from "../types";

export function IngestionPage(){const navigate=useNavigate(),[busy,setBusy]=useState(false),[error,setError]=useState<string|null>(null);async function create(draft:RecordDraft){setBusy(true);setError(null);try{const result=await api.createRecord(draft);navigate(`/studio/records/${result.recordId}`);}catch(cause){setError(cause instanceof Error?cause.message:"保存失败。");setBusy(false);}}return <section className="page-shell py-14 tablet:py-20"><header className="mb-10 max-w-3xl"><p className="record-label text-blueprint">INGESTION MODULE</p><h1 className="mt-4 font-serif text-4xl font-semibold tablet:text-6xl">录入采访记录</h1><p className="mt-6 text-sm leading-8 text-ink-muted">这是独立的录入模块。它不绑定抖音，也不预设对话一定是文字：公开社交平台、面对面采访或其他真实对话都能在同一模型中保存。</p></header>{error&&<p className="mb-6 border border-danger/30 bg-danger-surface/30 p-4 text-sm text-danger" role="alert">{error}</p>}<RecordForm submitLabel="保存为未公开记录" busy={busy} onSubmit={create}/></section>}
