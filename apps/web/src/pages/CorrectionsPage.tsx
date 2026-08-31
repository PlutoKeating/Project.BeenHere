import { FormEvent, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

export function CorrectionsPage() {
  const [params] = useSearchParams();
  const [status, setStatus] = useState<{ type: "idle" | "sending" | "success" | "error"; message?: string }>({ type: "idle" });

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ type: "sending" });
    const form = new FormData(event.currentTarget);
    try {
      const result = await api.submitCorrection({
        archiveNumber: String(form.get("archiveNumber") ?? "") || undefined,
        requesterContact: String(form.get("requesterContact") ?? ""),
        requesterRole: String(form.get("requesterRole") ?? "reader"),
        kind: String(form.get("kind") ?? "fact"),
        description: String(form.get("description") ?? ""),
      });
      event.currentTarget.reset();
      setStatus({ type: "success", message: `请求已登记：${result.requestId}` });
    } catch (error) {
      setStatus({ type: "error", message: error instanceof Error ? error.message : "提交失败。" });
    }
  }

  return (
    <section className="page-shell py-14 tablet:py-20">
      <div className="grid gap-12 tablet:grid-cols-12">
        <header className="tablet:col-span-5">
          <p className="archive-label text-blueprint">CORRECTION DESK</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tablet:text-6xl">更正、认领<br />与撤回</h1>
          <p className="mt-7 max-w-md text-sm leading-8 text-ink-muted">档案不会静默改写，但人始终可以要求更正、补充、匿名化或停止公开。隐私与撤回请求优先处理。</p>
        </header>
        <form onSubmit={submit} className="paper-card space-y-7 p-6 tablet:col-span-7 tablet:p-10">
          <div><label className="field-label" htmlFor="archiveNumber">Archive Number（可选）</label><input className="field font-mono" id="archiveNumber" name="archiveNumber" defaultValue={params.get("archive") ?? ""} placeholder="BH-000001" pattern="BH-\d{6}" /></div>
          <div className="grid gap-7 sm:grid-cols-2">
            <div><label className="field-label" htmlFor="requesterRole">你的身份</label><select className="field" id="requesterRole" name="requesterRole" defaultValue="reader"><option value="participant">受访者本人</option><option value="representative">授权代表</option><option value="reader">读者</option><option value="other">其他</option></select></div>
            <div><label className="field-label" htmlFor="kind">请求类型</label><select className="field" id="kind" name="kind" defaultValue="fact"><option value="fact">事实更正</option><option value="identity">本人认领</option><option value="privacy">隐私遮蔽</option><option value="consent">授权争议</option><option value="supplement">补充材料</option><option value="topic">话题建议</option><option value="withdrawal">撤回公开</option></select></div>
          </div>
          <div><label className="field-label" htmlFor="requesterContact">联系方式</label><input className="field" id="requesterContact" name="requesterContact" required minLength={3} maxLength={200} placeholder="仅用于核实与回复，不公开展示" /></div>
          <div><label className="field-label" htmlFor="description">具体说明</label><textarea className="field min-h-32 resize-y" id="description" name="description" required minLength={10} maxLength={4000} placeholder="请说明位置、期望处理方式和必要背景。" /></div>
          {status.type !== "idle" && <p className={`text-sm leading-6 ${status.type === "error" ? "text-danger" : "text-ink-muted"}`} role="status">{status.type === "sending" ? "正在登记…" : status.message}</p>}
          <button type="submit" className="button-primary w-full" disabled={status.type === "sending"}>{status.type === "sending" ? "正在提交" : "提交请求"}</button>
        </form>
      </div>
    </section>
  );
}
