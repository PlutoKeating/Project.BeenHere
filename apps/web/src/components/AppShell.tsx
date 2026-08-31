import { Archive, Compass, Menu, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const navigation = [
  { to: "/archives", label: "档案", icon: Archive },
  { to: "/drift", label: "漂流", icon: Compass },
  { to: "/search", label: "寻找", icon: Search },
];

function DesktopNavigation() {
  return (
    <nav className="hidden items-center gap-8 tablet:flex" aria-label="主导航">
      {navigation.map(({ to, label }) => (
        <NavLink key={to} to={to} className={({ isActive }) => `archive-label py-2 transition-colors ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>
          {label}
        </NavLink>
      ))}
      <NavLink to="/method" className={({ isActive }) => `archive-label py-2 transition-colors ${isActive ? "text-seal" : "text-ink-muted hover:text-ink"}`}>关于</NavLink>
    </nav>
  );
}

export function AppShell() {
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [location.pathname]);

  return (
    <div className="min-h-dvh pb-20 tablet:pb-0">
      <a href="#main-content" className="fixed left-3 top-3 z-50 -translate-y-20 bg-strong px-4 py-2 text-sm text-inverse focus:translate-y-0">跳到正文</a>
      <header className="sticky top-0 z-40 border-b border-line bg-canvas/92 backdrop-blur-sm">
        <div className="page-shell flex h-16 items-center justify-between tablet:h-20">
          <Link to="/" className="group flex items-baseline gap-2" aria-label="Project BeenHere 首页">
            <span className="font-serif text-lg font-semibold tracking-tight">来过</span>
            <span className="archive-label text-[9px] text-ink-muted group-hover:text-seal">BEEN HERE</span>
          </Link>
          <DesktopNavigation />
          <div className="flex items-center">
            <ThemeToggle />
            <button type="button" className="flex size-11 items-center justify-center tablet:hidden" onClick={() => setMenuOpen((value) => !value)} aria-expanded={menuOpen} aria-controls="mobile-menu" aria-label={menuOpen ? "关闭菜单" : "打开菜单"}>
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav id="mobile-menu" className="border-t border-line bg-card px-5 py-5 tablet:hidden" aria-label="展开导航">
            <div className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line">
              {[...navigation, { to: "/method", label: "关于", icon: Archive }].map(({ to, label }) => (
                <NavLink key={to} to={to} className="bg-card px-4 py-4 font-serif text-sm">{label}</NavLink>
              ))}
            </div>
          </nav>
        )}
      </header>

      <main id="main-content" className="page-enter min-h-[70dvh]" key={location.pathname}>
        <Outlet />
      </main>

      <footer className="mt-20 border-t border-line py-12 tablet:mt-28">
        <div className="page-shell flex flex-col justify-between gap-8 tablet:flex-row tablet:items-end">
          <div>
            <p className="font-serif text-xl">你曾经来过。</p>
            <p className="mt-2 text-xs leading-6 text-ink-muted">一座记录普通人存在痕迹的开放互联网档案馆。</p>
          </div>
          <div className="flex gap-5 text-xs text-ink-muted">
            <Link to="/method" className="hover:text-ink">方法</Link>
            <Link to="/corrections" className="hover:text-ink">更正与撤回</Link>
            <Link to="/admin" className="hover:text-ink">编辑入口</Link>
          </div>
        </div>
      </footer>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur tablet:hidden" aria-label="移动端主导航">
        <div className="grid grid-cols-3">
          {navigation.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `flex min-h-16 flex-col items-center justify-center gap-1 text-[10px] ${isActive ? "text-seal" : "text-ink-muted"}`}>
              <Icon size={19} strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
