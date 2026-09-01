import type { OcrImageResult } from "./ocr-conversation";

const supportedImageTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
const maxFiles = 5;
const maxFileBytes = 15 * 1024 * 1024;
const modelBase = "https://paddle-model-ecology.bj.bcebos.com/paddlex/official_inference_model/paddle3.0.0";
const wasmBase = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.24.3/dist/";

export interface OcrProgress {
  phase: "loading" | "recognizing";
  completed: number;
  total: number;
}

interface OcrRunner {
  predict(input: unknown, params?: Record<string, unknown>): Promise<Array<{
    image: { width: number; height: number };
    items: Array<{ poly: [number, number][]; text: string; score: number }>;
  }>>;
  dispose(): Promise<void>;
}

interface PendingRequest {
  resolve: (value: unknown) => void;
  reject: (reason: unknown) => void;
}

interface TransportResponse {
  kind?: unknown;
  status?: unknown;
  requestId?: unknown;
  payload?: unknown;
  error?: { name?: unknown; message?: unknown; stack?: unknown };
}

const pipelineConfig = {
  pipelineName: "OCR",
  raw: {},
  warnings: [],
  unsupportedFeatures: [],
  modelSelection: {
    textDetectionModelName: "PP-OCRv6_tiny_det",
    textRecognitionModelName: "PP-OCRv6_tiny_rec",
  },
  assets: {
    det: { url: `${modelBase}/PP-OCRv6_tiny_det_onnx_infer.tar` },
    rec: { url: `${modelBase}/PP-OCRv6_tiny_rec_onnx_infer.tar` },
  },
  runtimeDefaults: {
    text_det_limit_side_len: 1600,
    text_det_limit_type: "max",
    text_det_max_side_limit: 4000,
    text_det_thresh: 0.3,
    text_det_box_thresh: 0.6,
    text_det_unclip_ratio: 1.5,
    text_rec_score_thresh: 0.1,
  },
  pipelineBatchSize: 1,
  textDetectionBatchSize: 1,
  textRecognitionBatchSize: 6,
};

class BrowserOcrWorker implements OcrRunner {
  private readonly worker = new Worker("/vendor/paddleocr-worker-0.4.2.js", { type: "module", name: "beenhere-ocr" });
  private readonly pending = new Map<number, PendingRequest>();
  private nextRequestId = 1;
  private disposed = false;

  constructor() {
    this.worker.onmessage = (event: MessageEvent<TransportResponse>) => {
      const response = event.data;
      if (response.kind !== "worker-transport-response" || typeof response.requestId !== "number") return;
      const pending = this.pending.get(response.requestId);
      if (!pending) return;
      this.pending.delete(response.requestId);
      if (response.status === "success") {
        pending.resolve(response.payload);
      } else {
        const error = new Error(typeof response.error?.message === "string" ? response.error.message : "OCR worker failed.");
        if (typeof response.error?.name === "string") error.name = response.error.name;
        if (typeof response.error?.stack === "string") error.stack = response.error.stack;
        pending.reject(error);
      }
    };
    this.worker.onerror = (event) => this.failAll(new Error(event.message || "OCR worker failed."));
  }

  async initialize(): Promise<void> {
    await this.request("init", {
      options: {
        pipelineConfig,
        ortOptions: { backend: "wasm", wasmPaths: wasmBase, numThreads: 1, simd: true, disableWasmProxy: true },
      },
    });
  }

  async predict(input: unknown, params: Record<string, unknown> = {}) {
    if (!(input instanceof Blob)) throw new Error("OCR input must be an image file.");
    const imageBitmap = await createImageBitmap(input);
    return this.request("predict", {
      sources: [{ kind: "imageBitmap", imageBitmap }],
      params,
    }, [imageBitmap]) as Promise<Array<{
      image: { width: number; height: number };
      items: Array<{ poly: [number, number][]; text: string; score: number }>;
    }>>;
  }

  async dispose(): Promise<void> {
    if (this.disposed) return;
    this.disposed = true;
    this.failAll(new Error("OCR worker has been disposed."));
    this.worker.terminate();
  }

  private request(type: string, payload: unknown, transferables: Transferable[] = []): Promise<unknown> {
    if (this.disposed) return Promise.reject(new Error("OCR worker has been disposed."));
    const requestId = this.nextRequestId++;
    return new Promise((resolve, reject) => {
      this.pending.set(requestId, { resolve, reject });
      try {
        this.worker.postMessage({ kind: "worker-transport-request", type, payload, requestId }, transferables);
      } catch (error) {
        this.pending.delete(requestId);
        reject(error);
      }
    });
  }

  private failAll(error: Error) {
    for (const request of this.pending.values()) request.reject(error);
    this.pending.clear();
  }
}

let runnerPromise: Promise<OcrRunner> | null = null;
let runnerInstance: OcrRunner | null = null;

export function validateOcrFiles(files: File[]): string | null {
  if (!files.length) return "请先选择至少一张聊天截图。";
  if (files.length > maxFiles) return `一次最多识别 ${maxFiles} 张截图。`;
  if (files.some((file) => !supportedImageTypes.has(file.type))) return "只支持 PNG、JPEG 和 WebP 聊天截图。";
  if (files.some((file) => file.size > maxFileBytes)) return "单张截图不能超过 15 MB。";
  return null;
}

async function createRunner(): Promise<OcrRunner> {
  const active = new BrowserOcrWorker();
  runnerInstance = active;
  try {
    await active.initialize();
    return active;
  } catch (error) {
    if (runnerInstance === active) runnerInstance = null;
    throw error;
  }
}

async function runner(): Promise<OcrRunner> {
  if (!runnerPromise) {
    const created = createRunner();
    runnerPromise = created;
    void created.catch(() => {
      if (runnerPromise === created) runnerPromise = null;
    });
  }
  return runnerPromise;
}

function abortError(): DOMException {
  return new DOMException("截图识别已取消。", "AbortError");
}

export async function disposeOcrEngine(): Promise<void> {
  const active = runnerInstance;
  runnerPromise = null;
  runnerInstance = null;
  if (active) await active.dispose();
}

export async function recognizeScreenshots(
  files: File[],
  options: { signal?: AbortSignal; onProgress?: (progress: OcrProgress) => void } = {},
): Promise<OcrImageResult[]> {
  const validationError = validateOcrFiles(files);
  if (validationError) throw new Error(validationError);
  if (options.signal?.aborted) throw abortError();

  options.onProgress?.({ phase: "loading", completed: 0, total: files.length });
  const activeRunner = await runner();
  if (options.signal?.aborted) throw abortError();

  const results: OcrImageResult[] = [];
  for (const [index, file] of files.entries()) {
    options.onProgress?.({ phase: "recognizing", completed: index, total: files.length });
    const [result] = await activeRunner.predict(file, {
      textDetLimitSideLen: 1600,
      textDetLimitType: "max",
      textDetMaxSideLimit: 4000,
      textRecScoreThresh: 0.1,
    });
    if (options.signal?.aborted) throw abortError();
    if (result) results.push(result);
    options.onProgress?.({ phase: "recognizing", completed: index + 1, total: files.length });
  }
  return results;
}
