import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecordForm } from "./RecordForm";

describe("quick interview form", () => {
  it("leads with pasted text and omits derived metadata fields", () => {
    const markup = renderToStaticMarkup(<RecordForm submitLabel="保存" onSubmit={async () => undefined} />);
    expect(markup).toContain("导入采访对话");
    expect(markup).toContain("粘贴或拖入聊天截图");
    expect(markup).toContain("没有截图？粘贴纯文本");
    expect(markup).toContain("识别为消息气泡");
    expect(markup).not.toContain("公开路径标识");
    expect(markup).not.toContain("采访记录标题");
    expect(markup).not.toContain("故事视图");
    expect(markup).not.toContain("话题（逗号分隔）");
  });

  it("locks automatic interview provenance while leaving the participant editable", () => {
    const markup = renderToStaticMarkup(<RecordForm submitLabel="保存" onSubmit={async () => undefined} initial={{
      ingestionMethod: "automated_interview",
      participant: { displayName: "小林", identityMode: "pseudonym" },
      conductedAt: "2026-09-02T08:00:00.000Z",
      messages: [
        { speakerRole: "interviewer", body: "你最近怎么样？" },
        { speakerRole: "participant", body: "正在慢慢来。" },
      ],
      source: { sourceType: "direct", platformName: "来过 · 自动采访" },
    }}/>);
    expect(markup).toContain("当前登录账户会被认领为被采访者本人");
    expect(markup).toContain("自动提问不可删除");
    expect(markup).toContain("readOnly");
    expect(markup).toContain('id="conductedAt"');
    expect(markup).toContain("disabled");
    expect(markup).not.toContain("交换双方");
    expect(markup).not.toContain("粘贴或拖入聊天截图");
  });
});
