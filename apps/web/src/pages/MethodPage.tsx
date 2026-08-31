import { Link } from "react-router-dom";

const principles = [
  ["01", "相遇发生在抖音", "采访、传播与社区互动留在它们真实发生的平台；这里不复制信息流。"],
  ["02", "档案独立保存", "网站保存结构化公开版本、来源说明与修订历史，平台变化不会抹去已经获准保存的记录。"],
  ["03", "受访者先于档案", "不可变指不能静默改写，不指拒绝更正与撤回。公开始终服从授权与人的尊严。"],
  ["04", "随机不判断价值", "漂流使用均匀随机，不读取热度、点赞、身份或用户画像。"],
];

export function MethodPage() {
  return (
    <div className="page-shell py-14 tablet:py-20">
      <header className="reading-column">
        <p className="archive-label text-blueprint">OUR METHOD</p>
        <h1 className="mt-4 font-serif text-4xl font-semibold leading-tight tablet:text-6xl">我们怎样保存<br />一个普通时刻</h1>
        <p className="mt-8 font-serif text-lg leading-9 text-ink-muted">这不是“证明普通人也很有趣”。这是承认普通本身值得留下。</p>
      </header>

      <section className="mx-auto mt-16 max-w-4xl border-y border-line">
        {principles.map(([number, title, body]) => (
          <article key={number} className="grid gap-4 border-b border-line py-8 last:border-b-0 tablet:grid-cols-[80px_1fr_1.4fr] tablet:gap-8">
            <p className="archive-label text-seal">{number}</p>
            <h2 className="font-serif text-xl font-semibold">{title}</h2>
            <p className="text-sm leading-7 text-ink-muted">{body}</p>
          </article>
        ))}
      </section>

      <section className="reading-column mt-20 space-y-12">
        <div>
          <h2 className="font-serif text-2xl font-semibold">从现场到入馆</h2>
          <ol className="mt-7 grid gap-3">
            {["采集原始材料并记录来源", "人工转录、整理与隐私检查", "受访者确认固定内容与授权范围", "编辑复核并发布编号 Edition", "接受更正、补充、遮蔽与撤回"].map((item, index) => (
              <li key={item} className="paper-card flex items-center gap-4 px-4 py-4"><span className="font-mono text-xs text-seal">{String(index + 1).padStart(2, "0")}</span><span className="text-sm">{item}</span></li>
            ))}
          </ol>
        </div>
        <div className="border-l-2 border-seal pl-6">
          <h2 className="font-serif text-2xl font-semibold">AI 使用声明</h2>
          <p className="mt-4 text-sm leading-8 text-ink-muted">OCR、转录与 AI 只能生成工作草稿。机器不能代表受访者授权，不能自动合并人物，不能独立决定删改，也不能自动出版。</p>
        </div>
        <Link to="/corrections" className="button-secondary w-full">提出更正、认领或撤回请求</Link>
      </section>
    </div>
  );
}
