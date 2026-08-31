import { Link } from "react-router-dom";

const principles = [
  ["01", "相遇发生在真实现场", "采访可以发生在抖音、其他公开平台、线上直接对话或线下；这里不复制信息流。"],
  ["02", "采访记录独立保存", "网站保存结构化公开版本、来源说明与修订历史，平台变化不会抹去已经获准保存的记录。"],
  ["03", "受访者先于采访记录", "不可变指不能静默改写，不指拒绝更正与撤回。公开始终服从授权与人的尊严。"],
  ["04", "随机不判断价值", "漂流使用均匀随机，不读取热度、点赞、身份或用户画像。"],
];

export function MethodPage() {
  return (
    <div className="page-shell py-14 tablet:py-20">
      <header className="reading-column">
        <p className="record-label text-blueprint">OUR METHOD</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tablet:text-6xl">我们怎样保存<br />一个普通时刻</h1>
        <p className="mt-8 font-serif text-lg leading-9 text-ink-muted">这不是“证明普通人也很有趣”。这是承认普通本身值得留下。</p>
      </header>

      <section className="mx-auto mt-16 max-w-4xl border-y border-line">
        {principles.map(([number, title, body]) => (
          <article key={number} className="grid gap-4 border-b border-line py-8 last:border-b-0 tablet:grid-cols-[80px_1fr_1.4fr] tablet:gap-8">
            <p className="record-label text-seal">{number}</p>
            <h2 className="font-serif text-xl font-semibold">{title}</h2>
            <p className="text-sm leading-7 text-ink-muted">{body}</p>
          </article>
        ))}
      </section>

      <section className="reading-column mt-20 space-y-12">
        <div>
          <h2 className="font-serif text-2xl font-semibold">从现场到公开</h2>
          <ol className="mt-7 grid gap-3">
            {["记录主人选择合适的录入方式", "按真实顺序整理对话并说明来源", "保存为未公开采访记录并检查隐私", "记录主人直接公开，系统生成编号与版本", "被采访者可申请认领并共同维护"].map((item, index) => (
              <li key={item} className="paper-card flex items-center gap-4 px-4 py-4"><span className="font-mono text-xs text-seal">{String(index + 1).padStart(2, "0")}</span><span className="text-sm">{item}</span></li>
            ))}
          </ol>
        </div>
        <div className="border-l-2 border-seal pl-6">
          <h2 className="font-serif text-2xl font-semibold">AI 使用声明</h2>
          <p className="mt-4 text-sm leading-8 text-ink-muted">OCR、转录与 AI 只能帮助录入。机器不能代表被采访者授权，不能自动认领，也不能替记录主人决定公开或删除。</p>
        </div>
        <Link to="/corrections" className="button-secondary w-full">提出更正、隐私或撤回请求</Link>
      </section>
    </div>
  );
}
