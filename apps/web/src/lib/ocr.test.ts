import { describe, expect, it } from "vitest";
import { validateOcrFiles, validateOcrImageDimensions } from "./ocr";

const screenshot = (name: string, type = "image/png", size = 32) => new File([new Uint8Array(size)], name, { type });

describe("OCR screenshot input", () => {
  it("accepts up to five supported screenshots and rejects unsafe input", () => {
    expect(validateOcrFiles([screenshot("one.png"), screenshot("two.webp", "image/webp")])).toBeNull();
    expect(validateOcrFiles([])).toBe("请先选择至少一张聊天截图。");
    expect(validateOcrFiles(Array.from({ length: 6 }, (_, index) => screenshot(`${index}.png`)))).toBe("一次最多识别 5 张截图。");
    expect(validateOcrFiles([screenshot("notes.txt", "text/plain")])).toBe("只支持 PNG、JPEG 和 WebP 聊天截图。");
    expect(validateOcrFiles([screenshot("large.png", "image/png", 15 * 1024 * 1024 + 1)])).toBe("单张截图不能超过 15 MB。");
  });

  it("rejects invalid or excessively large decoded images", () => {
    expect(validateOcrImageDimensions(1080, 30_000)).toBeNull();
    expect(validateOcrImageDimensions(10_000, 5_000)).toBe("单张截图像素过大，请裁切后分多张识别。");
    expect(validateOcrImageDimensions(0, 100)).toBe("截图尺寸无效，请重新导出后再试。");
  });
});
