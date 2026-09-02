import { Link } from "react-router-dom";
import { PolicyPage, PolicySection } from "../components/PolicyPage";

export function PrivacyPage() {
  return <PolicyPage eyebrow="PRIVACY" title="隐私政策" summary="这份政策说明来过处理哪些信息、为什么处理、保存多久，以及你如何行使自己的权利。">
    <PolicySection title="1. 谁在处理信息">
      <p>Project.BeenHere（来过）由个人开发者 PlutoKeating 创建和维护。我们是本服务所处理个人信息的运营者。涉及隐私、身份、同意、更正或删除的请求，请通过<Link className="text-blueprint underline" to="/corrections">更正与撤回</Link>页面联系；为保护你，请不要在公开 GitHub Issue 中提交身份证件、邮箱、私密对话或其他敏感材料。</p>
    </PolicySection>
    <PolicySection title="2. 我们处理的信息与目的">
      <ul className="list-disc space-y-3 pl-5">
        <li><strong className="text-ink">账户信息：</strong>邮箱、显示名、密码的加盐摘要、账户状态及安全事件，用于注册验证、登录、找回密码、账户管理与防滥用。我们不保存明文密码。</li>
        <li><strong className="text-ink">采访与治理内容：</strong>显示名或化名、采访时间、双角色对话、来源、公开版本、所有权、认领申请、更正与撤回请求及必要联系信息，用于保存、展示、版本追踪和处理当事人权利。</li>
        <li><strong className="text-ink">技术信息：</strong>会话 Cookie、浏览器内随机访客标识、请求时间与安全日志，用于维持登录、显示聚合在线人数、排错和保障服务安全。基础设施提供商可能按其规则处理 IP 地址、设备和网络元数据。</li>
        <li><strong className="text-ink">你主动提供的信息：</strong>自动采访中的回答只在当前页面内存中处理，直到你主动整理并保存；聊天截图只在浏览器中识别，截图本身不会上传到本站服务器。</li>
      </ul>
      <p>我们不出售个人信息，不以采访内容投放定向广告，也不使用自动采访对你进行人格评分或作出具有法律效果的自动化决定。</p>
    </PolicySection>
    <PolicySection title="3. 公开范围由你确认">
      <p>新采访首先保存为未公开草稿。记录主人主动发布后，显示名、采访时间、对话正文与必要来源信息会向所有互联网访问者公开，并可能被搜索引擎或第三方缓存。匿名或化名能减少直接识别，但不能保证他人无法从语境重新识别当事人。</p>
      <p>如果你上传他人的采访，请确保你有权提供这些内容并已向被采访者说明用途和公开范围。自动采访保存时，当前登录账户会作为被采访者本人认领记录；系统生成的提问和采访开始时间会作为来源事实锁定。</p>
    </PolicySection>
    <PolicySection title="4. Cookie、本地存储与外部服务">
      <ul className="list-disc space-y-3 pl-5">
        <li><code>bh_session</code> 是 HttpOnly、Secure、SameSite=Lax 的登录 Cookie，最长有效期 30 天。</li>
        <li><code>bh_presence_visitor</code> 是浏览器本地随机标识，只用于同一浏览器多标签页在线人数去重；<code>beenhere-theme</code> 保存明暗主题偏好。</li>
        <li>Cloudflare 提供网站托管、网络传输、D1 数据库与实时连接；Yeah SMTP 接收完成账户事务邮件所必需的邮箱和邮件内容。</li>
        <li>Google Fonts 提供字体文件。只有当你启动截图识别时，浏览器才会从 Paddle BCE 与 jsDelivr 获取固定版本的模型和运行时；这些服务收到静态资源请求与常规网络元数据，但本站代码不会向其发送截图。</li>
      </ul>
    </PolicySection>
    <PolicySection title="5. 保存期限与安全">
      <p>登录会话最长保存 30 天；邮箱验证和重设等一次性凭据通常保存 30 分钟；防滥用计数按 15 分钟或 1 小时窗口处理。账户、草稿、公开版本、所有权和审计记录按记录生命周期保存，以维持版本真实性和处理权利请求。账户删除会撤销登录并匿名化账户资料，但不会自动删除已经公开的采访；你可以另行申请更正、匿名化或撤回。</p>
      <p>我们采用 TLS、HttpOnly Cookie、同源请求校验、输入校验、密码派生、权限检查和审计记录等措施。没有任何互联网服务能保证绝对安全；发生可能影响你权益的事件时，我们会依适用法律采取处置并进行必要通知。</p>
    </PolicySection>
    <PolicySection title="6. 你的权利">
      <p>在适用法律范围内，你可以请求查阅、复制、更正、补充、限制处理、撤回同意或删除自己的个人信息，也可以注销账户。账户设置提供资料、邮箱、密码和删除入口；采访相关请求请使用<Link className="text-blueprint underline" to="/corrections">更正与撤回</Link>页面。为防止冒名操作，我们可能核实你与账户或采访的关系。</p>
    </PolicySection>
    <PolicySection title="7. 未成年人">
      <p>我们不建议未成年人独自公开可识别身份或敏感经历。未满 14 周岁的未成年人使用涉及个人信息的功能，应事先取得父母或其他监护人的同意与指导。监护人发现相关信息后可以联系我们处理。</p>
    </PolicySection>
    <PolicySection title="8. 变更与适用规则">
      <p>功能、数据处理或适用规则发生实质变化时，我们会更新本政策，并在适当位置提示。重大变化不会追溯性扩大已经取得的信息用途；依法需要重新同意的，我们会另行取得。</p>
      <p>本政策依据适用的个人信息与网络数据保护规则制定，包括<a className="text-blueprint underline" href="https://www.npc.gov.cn/WZWSREL25wYy9jMi9jMzA4MzQvMjAyMTA4L3QyMDIxMDgyMF8zMTMwODguaHRtbD9yZWY9aW1i" target="_blank" rel="noreferrer">《中华人民共和国个人信息保护法》</a>与<a className="text-blueprint underline" href="https://app.www.gov.cn/govdata/gov/202409/30/520076/article.html" target="_blank" rel="noreferrer">《网络数据安全管理条例》</a>。</p>
    </PolicySection>
  </PolicyPage>;
}
