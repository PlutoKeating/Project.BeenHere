import { ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { PolicyPage, PolicySection } from "../components/PolicyPage";

export function AboutPage() {
  return <PolicyPage eyebrow="ABOUT US" title="关于来过" summary="来过想做的事很朴素：不把普通人的话加工成热搜，也不让它们轻易消失。">
    <PolicySection title="我们为什么创立这个网站">
      <p>Project.BeenHere（来过）是一个保存真实采访对话的开放记录馆。我们相信，一个人不需要先成为名人、专家或新闻事件的主角，才值得被认真听见。网站以双角色原始对话为中心，尽量保留提问与回答发生时的语气、停顿和边界。</p>
      <p>这里不以流量排名决定谁更重要。公开记录会保留版本、来源、认领、更正和撤回路径；自动采访也只帮助人开始表达，不能代替人的判断，更不会替当事人决定公开。</p>
    </PolicySection>
    <PolicySection title="网站提供什么">
      <p>你可以漂流阅读一段公开采访、按编号检索记录，也可以登录后整理已有对话或完成一次浏览器内自动采访。新内容默认先成为未公开草稿，只有记录主人主动确认后才公开。</p>
      <p>网站的产品方法、技术实现与治理约束持续公开。你可以阅读<Link className="text-blueprint underline" to="/method">记录方法</Link>，或在发现事实、身份、隐私与同意问题时使用<Link className="text-blueprint underline" to="/corrections">更正与撤回</Link>入口。</p>
    </PolicySection>
    <PolicySection title="创作者与灵感">
      <p>本站由创作者 <a className="text-blueprint underline" href="https://github.com/PlutoKeating" target="_blank" rel="noreferrer">PlutoKeating <ExternalLink className="inline" size={13}/></a> 发起并维护。</p>
      <p>项目的最初灵感来自抖音博主 <strong className="font-medium text-ink">@长得好笑</strong> 对陌生人的提问，也来自广大网友同志们留下的回答、讨论与再创造。我们在此郑重致谢。除非另有明确说明，本站与该创作者及抖音平台不存在隶属、授权、代言或合作关系。</p>
    </PolicySection>
    <PolicySection title="开放但不轻率">
      <p>项目源代码以 AGPLv3 公开，但开放源代码不等于采访内容可以被任意复制或脱离语境传播。程序许可、用户内容权利与个人信息保护是不同层面的规则。使用内容前，请同时尊重当事人的人格、隐私、著作权和这段表达原本的边界。</p>
    </PolicySection>
  </PolicyPage>;
}
