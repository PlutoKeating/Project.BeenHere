import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OcrImportPanel } from "./OcrImportPanel";

describe("OCR screenshot import panel", () => {
  it("offers paste, drop and file selection with an explicit local-processing promise", () => {
    const markup = renderToStaticMarkup(<OcrImportPanel onImport={() => undefined} />);

    expect(markup).toContain("粘贴或拖入聊天截图");
    expect(markup).toContain("选择截图");
    expect(markup).toContain("截图只在当前浏览器中识别，不会上传或保存");
    expect(markup).toContain('accept="image/png,image/jpeg,image/webp"');
  });
});
