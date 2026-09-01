import { copyFile, mkdir, readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const packageRoot = path.resolve(webRoot, "../../node_modules/@paddleocr/paddleocr-js");
const packageJson = JSON.parse(await readFile(path.join(packageRoot, "package.json"), "utf8"));
if (packageJson.version !== "0.4.2") throw new Error(`Expected PaddleOCR.js 0.4.2, received ${String(packageJson.version)}.`);

const assetsDirectory = path.join(packageRoot, "dist/assets");
const workerFiles = (await readdir(assetsDirectory)).filter((name) => /^worker-entry-.*\.js$/.test(name));
if (workerFiles.length !== 1) throw new Error(`Expected one PaddleOCR worker entry, received ${workerFiles.length}.`);

const targetDirectory = path.join(webRoot, "public/vendor");
await mkdir(targetDirectory, { recursive: true });
await copyFile(path.join(assetsDirectory, workerFiles[0]), path.join(targetDirectory, "paddleocr-worker-0.4.2.js"));
