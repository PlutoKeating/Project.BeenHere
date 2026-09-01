import { ImagePlus, LoaderCircle, LockKeyhole, ScanText, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { conversationFromOcr, type OcrConversationResult } from "../lib/ocr-conversation";
import { disposeOcrEngine, recognizeScreenshots, validateOcrFiles, type OcrProgress } from "../lib/ocr";

interface ScreenshotPreview {
  file: File;
  url: string;
}

export function OcrImportPanel({ onImport }: { onImport: (result: OcrConversationResult) => void }) {
  const [screenshots, setScreenshots] = useState<ScreenshotPreview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const objectUrls = useRef(new Set<string>());
  const busy = progress !== null;

  useEffect(() => () => {
    if (abortRef.current) {
      abortRef.current.abort();
      void disposeOcrEngine().catch(() => undefined);
    }
    for (const url of objectUrls.current) URL.revokeObjectURL(url);
  }, []);

  const addScreenshots = useCallback((files: File[]) => {
    if (busy) return;
    const mergedFiles = [...screenshots.map(({ file }) => file), ...files]
      .filter((file, index, all) => all.findIndex((candidate) => candidate.name === file.name && candidate.size === file.size && candidate.lastModified === file.lastModified) === index);
    const validationError = validateOcrFiles(mergedFiles);
    if (validationError) {
      setError(validationError);
      return;
    }
    const known = new Set(screenshots.map(({ file }) => `${file.name}:${file.size}:${file.lastModified}`));
    const additions = files.filter((file) => {
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (known.has(key)) return false;
      known.add(key);
      return true;
    }).map((file) => {
      const url = URL.createObjectURL(file);
      objectUrls.current.add(url);
      return { file, url };
    });
    setScreenshots((current) => [...current, ...additions]);
    setError(null);
    setNotice(null);
  }, [busy, screenshots]);

  useEffect(() => {
    const pasteImages = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"));
      if (!files.length) return;
      event.preventDefault();
      addScreenshots(files);
    };
    document.addEventListener("paste", pasteImages);
    return () => document.removeEventListener("paste", pasteImages);
  }, [addScreenshots]);

  function removeScreenshot(index: number) {
    setScreenshots((current) => current.filter((preview, currentIndex) => {
      if (currentIndex !== index) return true;
      URL.revokeObjectURL(preview.url);
      objectUrls.current.delete(preview.url);
      return false;
    }));
  }

  async function recognize() {
    const files = screenshots.map(({ file }) => file);
    const validationError = validateOcrFiles(files);
    if (validationError) {
      setError(validationError);
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setError(null);
    setNotice(null);
    try {
      const images = await recognizeScreenshots(files, { signal: controller.signal, onProgress: setProgress });
      const result = conversationFromOcr(images);
      if (!result.messages.length) throw new Error("没有识别到可用的对话文字，请换一张更清晰的截图。");
      onImport(result);
      setNotice(`已从 ${files.length} 张截图识别 ${result.messages.length} 条消息，请在下一步校对。`);
    } catch (cause) {
      if (controller.signal.aborted || (cause instanceof DOMException && cause.name === "AbortError")) {
        setNotice("已取消截图识别。");
      } else if (cause instanceof Error && (
        cause.message.startsWith("没有识别到")
        || cause.message.startsWith("单张截图像素过大")
        || cause.message.startsWith("截图尺寸无效")
      )) {
        setError(cause.message);
      } else {
        setError("识别模型加载或运行失败。请检查网络后重试，或改用下方的纯文本录入。");
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = null;
      setProgress(null);
    }
  }

  function cancel() {
    abortRef.current?.abort();
    void disposeOcrEngine().catch(() => undefined);
  }

  const progressText = progress?.phase === "loading"
    ? "首次使用正在加载本地识别模型…"
    : progress
      ? `正在识别第 ${Math.min(progress.completed + 1, progress.total)} / ${progress.total} 张…`
      : null;

  return <div className="space-y-4">
    <div
      className="grid min-h-40 place-items-center border border-dashed border-line-strong bg-subtle/35 p-5 text-center transition-colors hover:bg-subtle/60"
      aria-label="粘贴或拖入聊天截图"
      aria-busy={busy}
      aria-disabled={busy}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => { event.preventDefault(); addScreenshots(Array.from(event.dataTransfer.files)); }}
    >
      <div>
        <ImagePlus className="mx-auto text-blueprint" size={28} aria-hidden="true" />
        <p className="mt-3 font-medium">粘贴或拖入聊天截图</p>
        <p className="mt-2 text-sm leading-6 text-ink-muted">支持 PNG、JPEG、WebP，按对话顺序最多 5 张；每张不超过 15 MB、4000 万像素。</p>
        <p className="mt-1 text-xs leading-6 text-ink-muted">默认右侧为采访者、左侧为被采访者；识别后可以一键交换。</p>
        <label className={`button-secondary mt-4 focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-seal ${busy ? "pointer-events-none opacity-50" : "cursor-pointer"}`}>
          选择截图
          <input
            className="sr-only"
            type="file"
            multiple
            accept="image/png,image/jpeg,image/webp"
            disabled={busy}
            onChange={(event) => { addScreenshots(Array.from(event.currentTarget.files ?? [])); event.currentTarget.value = ""; }}
          />
        </label>
      </div>
    </div>

    <p className="flex items-start gap-2 text-xs leading-6 text-ink-muted"><LockKeyhole className="mt-1 shrink-0" size={14} aria-hidden="true" />截图只在当前浏览器中识别，不会上传或保存；首次使用需要联网下载识别模型。</p>

    {screenshots.length > 0 && <ol className="grid grid-cols-2 gap-3 tablet:grid-cols-5" aria-label="待识别截图">
      {screenshots.map((preview, index) => <li key={preview.url} className="relative border border-line bg-subtle p-2">
        <img src={preview.url} alt={`第 ${index + 1} 张聊天截图`} className="aspect-[9/16] w-full object-cover object-top" />
        <span className="mt-2 block truncate text-xs text-ink-muted">{index + 1} · {preview.file.name}</span>
        <button type="button" className="absolute right-1 top-1 grid size-11 place-items-center bg-canvas/90 text-ink hover:text-danger disabled:opacity-50" disabled={busy} onClick={() => removeScreenshot(index)} aria-label={`移除第 ${index + 1} 张截图`}><X size={17} /></button>
      </li>)}
    </ol>}

    <div className="flex flex-wrap gap-3">
      <button type="button" className="button-primary" disabled={busy || !screenshots.length} onClick={() => void recognize()}>
        {busy ? <LoaderCircle className="animate-spin motion-reduce:animate-none" size={16} aria-hidden="true" /> : <ScanText size={16} aria-hidden="true" />}
        {busy ? "正在识别…" : "识别截图为消息"}
      </button>
      {busy && <button type="button" className="button-secondary" onClick={cancel}>取消识别</button>}
    </div>
    {progressText && <p className="text-sm text-ink-muted" role="status" aria-live="polite">{progressText}</p>}
    {error && <p className="text-sm text-danger" role="alert">{error}</p>}
    {notice && <p className="text-sm text-ink-muted" role="status">{notice}</p>}
  </div>;
}
