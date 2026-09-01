# ADR 0004：浏览器端聊天截图 OCR

- 状态：Accepted
- 日期：2026-09-01

## 背景

采访通常已经在其他社交平台以少量消息气泡完成。逐字重新输入成本高，但原始聊天截图可能包含私人信息，不应为了辅助录入默认上传、保存或扩展新的服务器基础设施。当前生产是单一 Cloudflare Worker、Workers Assets、D1 与 Durable Object；采访正文的规范模型只有采访者/被采访者两种角色和纯文本。

## 决策

1. 使用精确锁定的 `@paddleocr/paddleocr-js@0.4.2` 与 PP-OCRv6 tiny，在浏览器专用 Web Worker 中执行识别。
2. 不创建新的 Cloudflare Worker、OCR API、D1 表、R2 bucket 或截图附件模型。
3. 构建前从 npm 包复制官方预构建 OCR Worker 到现有 Workers Assets；生成文件不提交 Git。模型从 Paddle BCE 固定路径下载，ONNX Runtime Web 1.24.3 子模块与 WASM 从固定 jsDelivr 路径按需下载。
4. 截图 File、ImageBitmap 和 Object URL 只存在于当前浏览器。服务端与模型/WASM 提供方都不接收截图字节。
5. 布局解析作为纯函数模块：按文字框到左右外边缘的距离推断角色，过滤居中文字，合并同气泡多行，去除连续长截图的重复边界，最多输出 100 条消息。
6. OCR 坐标与置信度是临时校对信息。提交时重建消息对象，只保留 `speakerRole` 与 `body`。
7. 默认右侧为采访者、左侧为被采访者，但用户必须能够一键交换双方、逐条切换角色、编辑或删除文字。OCR 失败时保留纯文本粘贴回退。

## 后果

- 私密截图不进入本站存储、日志或数据库，现有采访模型和部署单元保持不变。
- 首页初始包不携带 OCR；首次实际识别按需下载 11,341,486 字节本站 Worker、合计 6,318,080 字节模型、约 16KB ONNX Runtime 子模块和 4,732,028 字节 WASM，弱网设备等待更久。
- CSP 必须为同源 Worker 开启 WebAssembly，并只在 `connect-src` 放行固定模型/WASM 域名。Workers Assets 会合并多条匹配规则，因此 vendor 路径先用 `! Content-Security-Policy` 脱离页面全局策略。主页面禁止 JavaScript 动态求值和外部脚本；只有固定同源路径的 PaddleOCR Worker 响应因内置 OpenCV 运行时需要而允许 `unsafe-eval`，并允许从固定 jsDelivr 地址加载 ONNX Runtime 子模块。
- 第三方静态资源服务会看到常规请求元数据。固定资源不可用时 OCR 会失败，但不会影响阅读、账户、D1 或纯文本录入。
- 左右位置只能提供建议，不能替代人工确认角色、内容、授权或公开决定。

## 未采用方案

- 在现有 Cloudflare Worker 内运行完整 OCR：Worker 内存、CPU 和静态资源限制不适合该模型运行时。
- 新建 Python/PaddleOCR 服务或第二个 Worker：增加部署、隐私、费用与运维面，不符合当前单部署单元约束。
- 默认把截图上传 Workers AI：会改变隐私承诺并引入调用成本；只有浏览器端在真实设备上证明不可用时才重新评估显式授权的后备方案。
- 把模型和 WASM 二进制提交 Git：显著膨胀仓库，且其中 WASM 超过 Cloudflare 单静态资产边界；改为固定版本按需下载。
