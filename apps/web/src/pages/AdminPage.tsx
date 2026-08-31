import { FormEvent, useState } from "react";
import { api } from "../lib/api";

export function AdminPage() {
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("正在建立草稿…");
    const form = new FormData(event.currentTarget);
    const conductedAt = new Date(String(form.get("conductedAt"))).toISOString();
    const question = String(form.get("question"));
    const answer = String(form.get("answer"));
    try {
      const result = await api.createDraft({
        person: {
          slug: String(form.get("slug")),
          displayName: String(form.get("displayName")),
          identityMode: String(form.get("identityMode")),
          bio: String(form.get("bio")),
        },
        interview: {
          title: String(form.get("title")),
          excerpt: String(form.get("excerpt")),
          conductedAt,
        },
        story: String(form.get("story")).split(/\n\s*\n/).filter(Boolean),
        editorialNote: String(form.get("editorialNote")),
        units: [
          { sequence: 1, kind: "question", speakerRole: "interviewer", body: question, occurredAt: conductedAt, durationSeconds: null, parentUnitId: null },
          { sequence: 2, kind: "answer", speakerRole: "participant", body: answer, occurredAt: conductedAt, durationSeconds: null, parentUnitId: null },
        ],
        topics: String(form.get("topics")).split(/[，,]/).map((name) => name.trim()).filter(Boolean).map((name) => ({ slug: name.toLowerCase().replaceAll(" ", "-"), name })),
        source: { platform: "douyin", canonicalUrl: String(form.get("sourceUrl")) || undefined },
      });
      event.currentTarget.reset();
      setMessage(`草稿已建立：${result.interviewId}。下一步进入受访者确认。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "建立草稿失败。请检查 Cloudflare Access。\n");
    }
  }

  return (
    <section className="page-shell py-14 tablet:py-20">
      <header className="border-b border-line pb-10">
        <p className="archive-label text-blueprint">EDITORIAL WORKBENCH</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold tablet:text-6xl">新建采访草稿</h1>
        <p className="mt-5 max-w-2xl text-sm leading-7 text-ink-muted">生产环境由 Cloudflare Access 保护。此页只创建 Editorial Draft，不能跳过确认直接公开。</p>
      </header>
      <form onSubmit={submit} className="mt-10 grid gap-10 tablet:grid-cols-12">
        <fieldset className="paper-card space-y-6 p-6 tablet:col-span-5 tablet:p-8">
          <legend className="archive-label px-2 text-seal">PERSON & SOURCE</legend>
          <div><label className="field-label" htmlFor="displayName">展示名</label><input className="field" id="displayName" name="displayName" required /></div>
          <div><label className="field-label" htmlFor="slug">稳定路径</label><input className="field font-mono" id="slug" name="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="xiaolin" /></div>
          <div><label className="field-label" htmlFor="identityMode">身份呈现</label><select className="field" id="identityMode" name="identityMode"><option value="pseudonym">化名</option><option value="real_name">实名</option><option value="anonymous">匿名</option></select></div>
          <div><label className="field-label" htmlFor="bio">人物短注</label><textarea className="field min-h-20" id="bio" name="bio" maxLength={500} /></div>
          <div><label className="field-label" htmlFor="sourceUrl">抖音来源 URL</label><input className="field" id="sourceUrl" name="sourceUrl" type="url" /></div>
        </fieldset>
        <fieldset className="paper-card space-y-6 p-6 tablet:col-span-7 tablet:p-8">
          <legend className="archive-label px-2 text-seal">INTERVIEW DRAFT</legend>
          <div><label className="field-label" htmlFor="title">档案标题</label><input className="field" id="title" name="title" required maxLength={120} /></div>
          <div><label className="field-label" htmlFor="conductedAt">采访时间</label><input className="field" id="conductedAt" name="conductedAt" type="datetime-local" required /></div>
          <div><label className="field-label" htmlFor="excerpt">摘要</label><textarea className="field min-h-20" id="excerpt" name="excerpt" required maxLength={300} /></div>
          <div><label className="field-label" htmlFor="question">第一个问题</label><textarea className="field min-h-16" id="question" name="question" required /></div>
          <div><label className="field-label" htmlFor="answer">第一个回答</label><textarea className="field min-h-24" id="answer" name="answer" required /></div>
          <div><label className="field-label" htmlFor="story">Story 段落</label><textarea className="field min-h-36" id="story" name="story" required placeholder="段落之间空一行" /></div>
          <div><label className="field-label" htmlFor="editorialNote">编辑说明</label><textarea className="field min-h-20" id="editorialNote" name="editorialNote" required /></div>
          <div><label className="field-label" htmlFor="topics">话题</label><input className="field" id="topics" name="topics" placeholder="日常, 记忆" /></div>
          {message && <p className="text-sm leading-6 text-ink-muted" role="status">{message}</p>}
          <button type="submit" className="button-primary w-full">保存为 Editorial Draft</button>
        </fieldset>
      </form>
    </section>
  );
}
