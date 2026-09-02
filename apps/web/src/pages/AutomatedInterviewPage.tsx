import { ArrowRight, CircleStop, CornerDownLeft, LockKeyhole, MessageCircleQuestion, SkipForward } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { beginInterview, finishInterview, interviewToDraft, submitInterviewAnswer, type AutomatedInterviewState } from "../lib/automated-interview";

export function AutomatedInterviewPage() {
  const navigate = useNavigate();
  const [consented, setConsented] = useState(false);
  const [state, setState] = useState<AutomatedInterviewState | null>(null);
  const [answer, setAnswer] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [state?.messages.length]);

  function submit() {
    if (!state || !answer.trim()) return;
    setState(submitInterviewAnswer(state, answer));
    setAnswer("");
  }

  function moveToDraft() {
    if (!state || state.completionReason === "safety") return;
    navigate("/studio/new", { state: { automatedInterviewDraft: interviewToDraft(state) } });
  }

  if (!state) {
    return <section className="page-shell py-14 tablet:py-20">
      <div className="mx-auto grid max-w-5xl gap-10 tablet:grid-cols-[minmax(0,1fr)_minmax(280px,0.7fr)] tablet:items-start">
        <header>
          <p className="record-label text-blueprint">GUIDED INTERVIEW</p>
          <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tablet:text-6xl">把此刻的话，慢慢说下来</h1>
          <p className="mt-6 max-w-2xl font-serif text-lg leading-9 text-ink-muted">这是一个基于固定提纲与简单规则的自动采访程序。它不会真正理解或感受，只负责给出克制的提问，把表达的空间留给你。</p>
        </header>
        <div className="paper-card space-y-6 p-5 tablet:p-7">
          <div className="flex items-start gap-3"><MessageCircleQuestion className="mt-1 shrink-0 text-seal" size={20}/><div><h2 className="font-serif text-xl font-semibold">开始之前</h2><ul className="mt-3 space-y-2 text-sm leading-7 text-ink-muted"><li>通常需要回答 6 个问题，每个话题最多追问一次。</li><li>你可以随时跳过或结束，不需要解释原因。</li><li>对话只留在当前页面；主动整理后才进入未公开草稿。</li><li>它不是心理咨询或危机支持，也不会假装拥有人的经历。</li></ul></div></div>
          <label className="flex min-h-12 cursor-pointer items-start gap-3 border-t border-line pt-5 text-sm leading-6"><input type="checkbox" className="mt-1 size-4 accent-[var(--accent-seal)]" checked={consented} onChange={(event) => setConsented(event.target.checked)}/><span>我知道正在和自动程序对话，并愿意开始；我也知道可以随时退出。</span></label>
          <button type="button" className="button-primary w-full" disabled={!consented} onClick={() => setState(beginInterview())}>开始采访<ArrowRight size={17}/></button>
        </div>
      </div>
    </section>;
  }

  const latestInterviewerMessage = [...state.messages].reverse().find((message) => message.speakerRole === "interviewer")?.body;
  const progress = Math.min(state.questionIndex + 1, 6);
  return <section className="page-shell py-8 tablet:py-14">
    <div className="mx-auto max-w-3xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-line pb-5">
        <div><p className="record-label text-blueprint">AUTOMATED INTERVIEW</p><h1 className="mt-2 font-serif text-3xl font-semibold">自动采访</h1></div>
        <div className="text-right"><p className="record-label text-ink-muted">{state.phase === "active" ? `${progress} / 6` : "已结束"}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-ink-muted"><LockKeyhole size={13}/>尚未保存</p></div>
      </header>

      <p className="sr-only" aria-live="polite" aria-atomic="true">{latestInterviewerMessage}</p>
      <ol className="space-y-5" aria-label="采访对话">
        {state.messages.map((message, index) => <li key={`${index}-${message.body}`} className={`flex ${message.speakerRole === "participant" ? "justify-end" : "justify-start"}`}>
          <div className={`max-w-[88%] tablet:max-w-[72%] ${message.speakerRole === "participant" ? "border-r-2 border-seal bg-subtle" : "paper-card"} px-4 py-3`}>
            <p className={`record-label mb-2 text-[9px] ${message.speakerRole === "participant" ? "text-seal" : "text-blueprint"}`}>{message.speakerRole === "participant" ? "你" : "来过 · 自动提问"}</p>
            <p className="whitespace-pre-wrap font-serif text-base leading-8">{message.body}</p>
          </div>
        </li>)}
      </ol>
      <div ref={endRef}/>

      {state.phase === "active" ? <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] mt-8 border border-line bg-canvas/95 p-3 shadow-[0_-8px_30px_rgb(0_0_0/0.07)] backdrop-blur-xl tablet:bottom-4">
        <label className="sr-only" htmlFor="interview-answer">你的回答</label>
        <textarea id="interview-answer" className="field min-h-24 resize-y px-2" value={answer} maxLength={2000} placeholder="写下你愿意留下的话……" onChange={(event) => setAnswer(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); submit(); } }}/>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2"><button type="button" className="button-secondary" onClick={() => setState(submitInterviewAnswer(state, "跳过"))}><SkipForward size={16}/>跳过</button><button type="button" className="button-secondary" onClick={() => setState(finishInterview(state))}><CircleStop size={16}/>结束</button></div>
          <button type="button" className="button-primary" disabled={!answer.trim()} onClick={submit}>发送<CornerDownLeft size={16}/></button>
        </div>
        <p className="mt-3 text-xs leading-5 text-ink-muted">Enter 发送，Shift + Enter 换行。当前内容尚未写入账户或公开记录。</p>
      </div> : <div className="paper-card mt-10 p-5 tablet:p-7">
        {state.completionReason === "safety" ? <><h2 className="font-serif text-xl font-semibold">采访已经停止</h2><p className="mt-3 text-sm leading-7 text-ink-muted">这段对话不会提供“整理为记录”的入口。请优先联系能够在现实中陪伴或帮助你的人。</p></> : <><h2 className="font-serif text-xl font-semibold">接下来由你决定</h2><p className="mt-3 text-sm leading-7 text-ink-muted">进入整理页后，你可以修改或删除任何一句话，并补充显示名和来源信息。下一步只会保存为未公开记录，不会自动发布。</p><button type="button" className="button-primary mt-6 w-full sm:w-auto" onClick={moveToDraft}>整理为未公开记录<ArrowRight size={17}/></button></>}
      </div>}
    </div>
  </section>;
}
