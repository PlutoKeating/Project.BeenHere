import { ArrowRight, KeyRound, Mail, UserRound } from "lucide-react";
import { FormEvent, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";

type Mode="login"|"register"|"forgot"|"reset"|"verify"|"email-change"|"delete";
const copy:Record<Mode,{eyebrow:string;title:string;description:string}>={
  login:{eyebrow:"ACCOUNT",title:"回到你的记录",description:"登录后，可以录入、维护和认领采访记录。"},
  register:{eyebrow:"NEW ACCOUNT",title:"成为记录者",description:"验证邮箱后，账户才会正式启用。"},
  forgot:{eyebrow:"RECOVERY",title:"找回密码",description:"我们会把一次性重设链接发到注册邮箱。"},
  reset:{eyebrow:"NEW PASSWORD",title:"设置新密码",description:"完成后，其他设备上的登录会全部失效。"},
  verify:{eyebrow:"EMAIL CHECK",title:"确认你的邮箱",description:"点击确认，完成注册并自动登录。"},
  "email-change":{eyebrow:"EMAIL CHANGE",title:"确认新邮箱",description:"确认后旧登录会失效，请使用新邮箱重新登录。"},
  delete:{eyebrow:"ACCOUNT DELETION",title:"确认删除账户",description:"账户资料和登录凭据会被移除；已发布采访记录仍会保留。"},
};

export function AuthPage({mode}:{mode:Mode}) {
  const [params]=useSearchParams(),navigate=useNavigate(),location=useLocation();
  const [busy,setBusy]=useState(false),[error,setError]=useState(""),[message,setMessage]=useState("");
  const token=params.get("token")??"", info=copy[mode];
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError("");setMessage("");
    const form=event.currentTarget,data=new FormData(form),email=String(data.get("email")??""),password=String(data.get("password")??"");
    try{
      if(mode==="login"){await api.login(email,password);const next=params.get("next");navigate(next?.startsWith("/")&&!next.startsWith("//")?next:"/studio",{replace:true});}
      if(mode==="register"){if(data.get("legalAccepted")!=="yes")throw new Error("请先阅读并同意条款与条件和隐私政策。");const result=await api.register({email,displayName:String(data.get("displayName")??""),password});form.reset();setMessage(result.message);}
      if(mode==="forgot"){const result=await api.forgotPassword(email);setMessage(result.message);}
      if(mode==="reset"){await api.resetPassword(token,password);navigate("/studio",{replace:true});}
    }catch(cause){setError(cause instanceof Error?cause.message:"暂时无法完成请求。");}finally{setBusy(false);}
  }
  async function confirm(){setBusy(true);setError("");try{
    if(!token)throw new Error("链接缺少验证凭据。");
    if(mode==="verify"){await api.verifyEmail(token);navigate("/studio",{replace:true});}
    if(mode==="email-change"){await api.confirmEmailChange(token);setMessage("新邮箱已确认，请重新登录。");}
    if(mode==="delete"){await api.confirmDeletion(token);setMessage("账户已删除。你仍可继续浏览所有公开采访记录。");}
  }catch(cause){setError(cause instanceof Error?cause.message:"验证失败。");}finally{setBusy(false);}}
  const confirmation=["verify","email-change","delete"].includes(mode);
  return <section className="page-shell py-12 tablet:py-20"><div className="mx-auto grid max-w-4xl overflow-hidden border border-line bg-card shadow-paper tablet:grid-cols-[0.9fr_1.1fr]">
    <aside className="bg-strong p-8 text-inverse tablet:p-12"><p className="record-label opacity-70">{info.eyebrow}</p><h1 className="mt-5 font-serif text-4xl font-semibold leading-tight">{info.title}</h1><p className="mt-5 text-sm leading-7 opacity-75">{info.description}</p><div className="mt-16 font-serif text-2xl">来过</div></aside>
    <div className="p-7 tablet:p-12">
      {location.state&&<p className="mb-5 text-sm text-ink-muted">请先登录，再继续刚才的操作。</p>}
      {message?<div className="border border-blueprint/30 bg-subtle p-5 text-sm leading-7">{message}<div className="mt-4"><Link to={mode==="delete"?"/":"/auth/login"} className="text-blueprint underline">{mode==="delete"?"返回首页":"去登录"}</Link></div></div>:confirmation?<div><button className={mode==="delete"?"button-secondary w-full text-danger":"button-primary w-full"} disabled={busy} onClick={confirm}>{busy?"正在确认…":"确认并继续"}<ArrowRight size={16}/></button></div>:<form className="space-y-6" onSubmit={submit}>
        {(mode==="login"||mode==="register"||mode==="forgot")&&<label><span className="field-label">邮箱</span><div className="flex items-center gap-2"><Mail size={17}/><input className="field" name="email" type="email" autoComplete="email" required/></div></label>}
        {mode==="register"&&<label><span className="field-label">用户名</span><div className="flex items-center gap-2"><UserRound size={17}/><input className="field" name="displayName" minLength={2} maxLength={40} autoComplete="nickname" required/></div></label>}
        {(mode==="login"||mode==="register"||mode==="reset")&&<label><span className="field-label">{mode==="reset"?"新密码":"密码"}</span><div className="flex items-center gap-2"><KeyRound size={17}/><input className="field" name="password" type="password" minLength={mode==="login"?1:12} maxLength={128} autoComplete={mode==="login"?"current-password":"new-password"} required/></div>{mode!=="login"&&<small className="mt-2 block text-xs text-ink-muted">至少 12 个字符</small>}</label>}
        {mode==="register"&&<label className="flex cursor-pointer items-start gap-3 text-sm leading-6 text-ink-muted"><input className="mt-1 size-4 shrink-0 accent-[var(--accent-seal)]" name="legalAccepted" type="checkbox" value="yes" required/><span>我已阅读并同意<Link className="text-blueprint underline" to="/terms">条款与条件</Link>和<Link className="text-blueprint underline" to="/privacy">隐私政策</Link>。</span></label>}
        <button className="button-primary w-full" disabled={busy}>{busy?"请稍候…":mode==="login"?"登录":mode==="register"?"注册并发送验证邮件":mode==="forgot"?"发送重设邮件":"保存新密码"}<ArrowRight size={16}/></button>
      </form>}
      {error&&<p className="mt-5 border border-danger/30 bg-danger-surface p-3 text-sm text-danger" role="alert">{error}</p>}
      {!confirmation&&!message&&<nav className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-ink-muted">{mode!=="login"&&<Link to="/auth/login">已有账户</Link>}{mode!=="register"&&<Link to="/auth/register">注册</Link>}{mode!=="forgot"&&<Link to="/auth/forgot-password">忘记密码</Link>}</nav>}
    </div>
  </div></section>;
}
