import { BookOpenText, Compass, Home, Info, Menu, ScrollText, Search, ShieldCheck, UserRound, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";
import { OnlinePresence } from "./OnlinePresence";

const navigation = [
  { to: "/drift", label: "漂流", icon: Compass },
  { to: "/records", label: "采访记录", icon: BookOpenText },
  { to: "/search", label: "搜索", icon: Search },
];

function AccountLink({ className, children, onClick }: { className?: string; children: React.ReactNode; onClick?: () => void }) {
  return <NavLink to="/studio" className={className} onClick={onClick}>{children}</NavLink>;
}

function DesktopNav() {
  return <nav className="hidden items-center gap-6 tablet:flex" aria-label="主导航">
    {navigation.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `record-label py-2 ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>{label}</NavLink>)}
    <NavLink to="/method" className={({ isActive }) => `record-label py-2 ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>方法</NavLink>
    <NavLink to="/about" className={({ isActive }) => `record-label py-2 ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>关于我们</NavLink>
  </nav>;
}

function MobileTabBar() {
  const publicTabs = [
    { to: "/", label: "首页", icon: Home, end: true },
    { to: "/drift", label: "漂流", icon: Compass },
    { to: "/records", label: "记录", icon: BookOpenText },
    { to: "/search", label: "搜索", icon: Search },
  ];
  const tabClass = "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 text-[10px] transition-colors";
  return <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_24px_rgb(0_0_0/0.06)] backdrop-blur-xl tablet:hidden" aria-label="移动端底部导航">
    <div className="mx-auto flex max-w-lg px-1">
      {publicTabs.map(({ to, label, icon: Icon, end }) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `${tabClass} ${isActive ? "text-seal" : "text-ink-muted"}`}><Icon size={19} aria-hidden="true"/><span>{label}</span></NavLink>)}
      <AccountLink className={`${tabClass} text-ink-muted`}><UserRound size={19} aria-hidden="true"/><span>我的</span></AccountLink>
    </div>
  </nav>;
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  return <div className="min-h-dvh pb-[calc(4rem+env(safe-area-inset-bottom))] tablet:pb-0">
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-xl">
      <div className="page-shell flex h-16 items-center justify-between">
        <NavLink to="/" className="group flex items-center gap-3" aria-label="来过首页"><span className="font-serif text-xl font-semibold">来过</span><span className="record-label text-[9px] text-ink-muted">BEEN HERE</span></NavLink>
        <DesktopNav />
        <div className="flex items-center gap-1">
          <OnlinePresence/>
          <AccountLink className="hidden min-h-11 items-center gap-2 px-3 text-sm text-ink-muted hover:text-ink sm:flex"><UserRound size={16}/>我的记录</AccountLink>
          <ThemeToggle/>
          <button className="grid size-11 place-items-center tablet:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航">{open ? <X/> : <Menu/>}</button>
        </div>
      </div>
      {open && <nav className="border-t border-line bg-canvas px-5 py-4 tablet:hidden" aria-label="更多导航">
        <NavLink to="/about" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><Info size={17}/>关于我们</NavLink>
        <NavLink to="/method" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><BookOpenText size={17}/>记录方法</NavLink>
        <NavLink to="/privacy" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><ShieldCheck size={17}/>隐私政策</NavLink>
        <NavLink to="/terms" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><ScrollText size={17}/>条款与条件</NavLink>
        <NavLink to="/corrections" onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><BookOpenText size={17}/>更正与撤回</NavLink>
        <AccountLink onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><UserRound size={17}/>登录 / 我的记录</AccountLink>
      </nav>}
    </header>
    <main><Outlet/></main>
    <footer className="mt-24 border-t border-line">
      <div className="page-shell grid gap-10 py-12 tablet:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.5fr)] tablet:gap-12">
        <div>
          <p className="font-serif text-lg font-semibold">Project.BeenHere · 来过</p>
          <p className="mt-2 max-w-sm text-xs leading-6 text-ink-muted">认真保存陌生人之间真实发生的采访记录。</p>
          <p className="mt-4 text-xs leading-6 text-ink-muted">本软件不提供任何担保。</p>
        </div>
        <nav aria-label="页脚导航" className="grid grid-cols-2 gap-x-8 gap-y-9 text-sm tablet:grid-cols-3 tablet:gap-x-10">
          <section aria-labelledby="footer-discover">
            <h2 id="footer-discover" className="record-label mb-2 text-[10px] text-ink-muted">了解来过</h2>
            <ul>
              <li><NavLink className="inline-flex min-h-11 items-center" to="/about">About Us</NavLink></li>
              <li><NavLink className="inline-flex min-h-11 items-center" to="/method">记录方法</NavLink></li>
              <li><NavLink className="inline-flex min-h-11 items-center" to="/records">全部记录</NavLink></li>
            </ul>
          </section>
          <section aria-labelledby="footer-rights">
            <h2 id="footer-rights" className="record-label mb-2 text-[10px] text-ink-muted">规则与权利</h2>
            <ul>
              <li><NavLink className="inline-flex min-h-11 items-center" to="/privacy">Privacy</NavLink></li>
              <li><NavLink className="inline-flex min-h-11 items-center" to="/terms">Terms &amp; Conditions</NavLink></li>
              <li><NavLink className="inline-flex min-h-11 items-center" to="/corrections">更正与撤回</NavLink></li>
            </ul>
          </section>
          <section aria-labelledby="footer-project">
            <h2 id="footer-project" className="record-label mb-2 text-[10px] text-ink-muted">项目与账户</h2>
            <ul>
              <li><a className="inline-flex min-h-11 items-center" href="https://github.com/PlutoKeating/Project.BeenHere" target="_blank" rel="noreferrer">开放源代码</a></li>
              <li><a className="inline-flex min-h-11 items-center" href="https://github.com/PlutoKeating/Project.BeenHere/blob/main/LICENCE" target="_blank" rel="noreferrer">AGPLv3</a></li>
              <li><AccountLink className="inline-flex min-h-11 items-center">账户中心</AccountLink></li>
            </ul>
          </section>
        </nav>
      </div>
    </footer>
    <MobileTabBar/>
  </div>;
}
