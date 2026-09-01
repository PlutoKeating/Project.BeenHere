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
});
