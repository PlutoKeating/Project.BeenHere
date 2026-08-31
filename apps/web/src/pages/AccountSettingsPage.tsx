import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { useApi } from "../lib/use-api";

function Panel({title,description,children}:{title:string;description:string;children:React.ReactNode}){return <section className="paper-card p-6"><h2 className="font-serif text-2xl font-semibold">{title}</h2><p className="mt-2 text-sm leading-6 text-ink-muted">{description}</p><div className="mt-6">{children}</div></section>}
export function AccountSettingsPage(){
  const me=useApi(api.me),[notice,setNotice]=useState(""),[error,setError]=useState("");
  async function run(task:()=>Promise<unknown>,message:string){setError("");setNotice("");try{await task();setNotice(message);}catch(e){setError(e instanceof Error?e.message:"操作失败。");}}
  const submit=(fn:(data:FormData)=>Promise<unknown>,message:string)=>(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();void run(()=>fn(new FormData(event.currentTarget)),message);};
  return <section className="page-shell py-12 tablet:py-20"><header className="mb-10"><p className="record-label text-blueprint">ACCOUNT SETTINGS</p><h1 className="mt-4 font-serif text-4xl font-semibold tablet:text-5xl">账户设置</h1><p className="mt-3 text-sm text-ink-muted">{me.data?.email}</p></header>
    {(notice||error)&&<p className={`mb-6 border p-4 text-sm ${error?"border-danger/30 bg-danger-surface text-danger":"border-blueprint/30 bg-subtle"}`}>{error||notice}</p>}
    <div className="grid gap-5 tablet:grid-cols-2">
      <Panel title="用户名" description="公开展示的称呼，修改无需验证。"><form className="space-y-4" onSubmit={submit((d)=>api.updateProfile(String(d.get("displayName"))),"用户名已更新。")}><label><span className="field-label">用户名</span><input className="field" name="displayName" defaultValue={me.data?.displayName} minLength={2} maxLength={40} required/></label><button className="button-secondary">保存用户名</button></form></Panel>
      <Panel title="登录邮箱" description="输入当前密码；确认邮件会发往新邮箱。"><form className="space-y-4" onSubmit={submit((d)=>api.changeEmail(String(d.get("currentPassword")),String(d.get("newEmail"))),"验证邮件已发送到新邮箱。")}><label><span className="field-label">新邮箱</span><input className="field" name="newEmail" type="email" autoComplete="email" required/></label><label><span className="field-label">当前密码</span><input className="field" name="currentPassword" type="password" autoComplete="current-password" required/></label><button className="button-secondary">验证新邮箱</button></form></Panel>
      <Panel title="密码" description="修改需要当前密码；其他设备会退出登录。"><form className="space-y-4" onSubmit={submit((d)=>api.changePassword(String(d.get("currentPassword")),String(d.get("newPassword"))),"密码已更新。")}><label><span className="field-label">当前密码</span><input className="field" name="currentPassword" type="password" autoComplete="current-password" required/></label><label><span className="field-label">新密码（至少 12 个字符）</span><input className="field" name="newPassword" type="password" minLength={12} maxLength={128} autoComplete="new-password" required/></label><button className="button-secondary">修改密码</button></form></Panel>
      <Panel title="删除账户" description="确认邮件会发送到当前邮箱。删除后资料和凭据移除，已发布采访记录保留。"><button className="button-secondary text-danger" onClick={()=>void run(api.requestDeletion,"删除确认邮件已发送。")} >发送删除确认邮件</button></Panel>
    </div><Link to="/studio" className="mt-8 inline-block text-sm text-blueprint">← 返回账户中心</Link>
  </section>;
}
