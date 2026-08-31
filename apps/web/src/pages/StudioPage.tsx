import { FilePlus2, LogOut, MessagesSquare, PencilLine, Settings, ShieldCheck } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { ErrorState, LoadingState } from "../components/AsyncState";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

const visibilityLabel = {private:"未公开",public:"已公开",unlisted:"持链接可见",deleted:"已删除"};
export function StudioPage() {
  const navigate=useNavigate();
  const me=useApi(api.me),records=useApi(api.managedRecords);
  if(me.loading||records.loading)return <div className="page-shell py-20"><LoadingState label="正在打开账户中心…"/></div>;
  if(me.error||records.error)return <div className="page-shell py-20"><ErrorState message={me.error??records.error??"加载失败。"}/></div>;
  return <section className="page-shell py-14 tablet:py-20">
    <header className="grid gap-6 border-b border-line pb-10 tablet:grid-cols-12 tablet:items-end"><div className="tablet:col-span-8"><p className="record-label text-blueprint">ACCOUNT STUDIO</p><h1 className="mt-4 font-serif text-4xl font-semibold tablet:text-6xl">你好，{me.data?.displayName}</h1><p className="mt-4 text-sm text-ink-muted">{me.data?.email} · {me.data?.role==="director"?"馆长":"成员"}</p></div><div className="flex flex-wrap gap-3 tablet:col-span-4 tablet:justify-end"><Link to="/account/settings" className="button-secondary"><Settings size={16}/>账户设置</Link><button className="button-secondary" onClick={()=>void api.logout().finally(()=>navigate("/auth/login",{replace:true}))}><LogOut size={16}/>退出</button><Link to="/studio/claims" className="button-secondary"><MessagesSquare size={16}/>认领申请</Link><Link to="/studio/new" className="button-primary"><FilePlus2 size={16}/>录入采访记录</Link></div></header>
    {me.data?.role==="director"&&<Link to="/director/accounts" className="mt-6 flex items-center gap-3 border border-seal/30 bg-seal/5 p-4 text-sm text-seal"><ShieldCheck size={18}/>进入馆长账户管理</Link>}
    <div className="mt-10 space-y-3">{records.data?.map(record=><article key={record.id} className="paper-card grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-3"><span className="record-label text-blueprint">{record.record_number??"尚未编号"}</span><span className="rounded-full bg-subtle px-2 py-1 text-xs text-ink-muted">{visibilityLabel[record.visibility]}</span></div><h2 className="mt-3 font-serif text-xl font-semibold">{record.title}</h2><p className="mt-2 text-xs text-ink-muted">修订 {record.revision} · {new Date(record.updated_at).toLocaleString("zh-CN")}</p></div>{record.visibility!=="deleted"&&<Link to={`/studio/records/${record.id}`} className="button-secondary"><PencilLine size={15}/>编辑</Link>}</article>)}{records.data?.length===0&&<div className="py-20 text-center"><p className="font-serif text-xl">还没有上传过采访记录</p><Link to="/studio/new" className="button-primary mt-6">录入第一条</Link></div>}</div>
  </section>;
}
