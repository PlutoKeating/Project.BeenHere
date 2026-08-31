import { BookOpenText, Compass, Menu, Search, UserRound, X } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [{ to: "/drift", label: "漂流", icon: Compass }, { to: "/records", label: "采访记录", icon: BookOpenText }, { to: "/search", label: "搜索", icon: Search }];
function DesktopNav() { return <nav className="hidden items-center gap-6 tablet:flex" aria-label="主导航">{navigation.map(({ to, label }) => <NavLink key={to} to={to} className={({ isActive }) => `record-label py-2 ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>{label}</NavLink>)}<NavLink to="/method" className={({ isActive }) => `record-label py-2 ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>关于</NavLink></nav>; }
export function AppShell() {
  const [open, setOpen] = useState(false);
  return <div className="min-h-dvh">
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/90 backdrop-blur-xl"><div className="page-shell flex h-16 items-center justify-between">
      <NavLink to="/" className="group flex items-center gap-3" aria-label="来过首页"><span className="font-serif text-xl font-semibold">来过</span><span className="record-label text-[9px] text-ink-muted">BEEN HERE</span></NavLink>
      <DesktopNav />
      <div className="flex items-center gap-1"><NavLink to="/studio" className="hidden min-h-11 items-center gap-2 px-3 text-sm text-ink-muted hover:text-ink sm:flex"><UserRound size={16}/>我的记录</NavLink><ThemeToggle/><button className="grid size-11 place-items-center tablet:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="打开导航">{open ? <X/> : <Menu/>}</button></div>
    </div>{open && <nav className="border-t border-line bg-canvas px-5 py-4 tablet:hidden">{[...navigation,{to:"/method",label:"关于",icon:BookOpenText},{to:"/studio",label:"登录 / 我的记录",icon:UserRound}].map(({to,label,icon:Icon}) => <NavLink key={to} to={to} onClick={() => setOpen(false)} className="flex min-h-12 items-center gap-3 border-b border-line/60 text-sm"><Icon size={17}/>{label}</NavLink>)}</nav>}</header>
    <main><Outlet/></main>
    <footer className="mt-24 border-t border-line"><div className="page-shell grid gap-8 py-12 tablet:grid-cols-2"><div><p className="font-serif text-lg font-semibold">Project.BeenHere · 来过</p><p className="mt-2 text-xs leading-6 text-ink-muted">认真保存陌生人之间真实发生的采访记录。</p></div><div className="flex flex-wrap gap-5 text-sm tablet:justify-end"><NavLink to="/records">全部记录</NavLink><NavLink to="/corrections">更正与撤回</NavLink><NavLink to="/studio">账户中心</NavLink></div></div></footer>
  </div>;
}
