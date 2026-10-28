# 翻译可靠性与可观测状态 · 冻结合同

## 授权与边界

2026-10-28 用户批准方案实施。生产翻译预算 ¥50/北京时间自然日，不含摘要。只部署 Preview，生产另行确认。保留历史译文、现有模型与生产未发布功能边界；不全量重译、不扩大语言、不新建大型管理后台。

必须交付：无人访问也可生成；读取不调用模型；持久化任务与执行租约；总共最多 3 次模型请求；成功落库才算完成；来源/关注/流式/事件统一状态；有限刷新；原文版本保护；全局并发/速率/预算预留；受保护的诊断读取。

只有数据破坏/丢失、秘密泄漏、错误或未授权写入、核心不可用、无界重试/资源风暴，以及直接违反以上合同能阻断。供应商语义准确率、跨供应商自动切换、大型可视化后台为后续项。未知费用不是 0；保守预留是站内预算，不冒称供应商账单。

## Coverage matrix / 包划分

| 当批必达 | 合同/实现 | 定向门禁 | Owner |
|---|---|---|---|
| 同内容共享、原文变更另算 | subject+hash+lang+policy | 相同内容不同 message ID；旧版本迟到/删除后完成 | Backend |
| 状态真实，成功先落库 | job/lease/result 原子提交 | 保存失败、租约过期、部分完成 | Backend |
| 有限调用、控费 | durable attempts/reservations | 第 4 次拒绝；并发抢占；日切；未知用量 | Backend |
| 无访客生成、访客只读 | source refresh + bounded reconcile + queue | ingest→queue→D1；100 次 GET 零模型请求 | Backend |
| 全视图状态、保留有效译文 | shared status protocol/version | page/source/event/stream；错语言/旧响应 | Reader |
| 有限刷新与中断 | server nextPollAt + 5min session | 终态/隐藏/失败/超时停止；手动只读 | Reader |
| Preview 实接线 | 迁移→API→queue→web | 实际 D1/队列/浏览器，保留回滚版本 | Release |

先 Backend 的最小纵向切片和定向红绿测，再 Reader。最终候选冻结后一次全量测试/lint/types/build；部署前保留版本/绑定，Preview 有界模型验证，生产不切流量。不会把合成 UI 测试冒称真实队列验收。

## 策略与防反例

- D1 任务行是 durable outbox，队列只负责唤醒。发送失败可被后台再次发现，不从页面补生成。
- 使用数据库原子领取而非 KV get/put 锁。租约到期可以恢复；写结果须匹配租约和当前原文，删除/旧结果不得复活内容。
- SDK 自动重试关闭，格式纠错和批次恢复也消耗同一持久化次数；终态不因 source 刷新重置。
- 预算在调用前原子预留；用量未知保留预留，预算服务失败关闭新生成而非已有译文读取。
- 新任务仅 zh/en；历史其他语言缓存可读。不靠“有无中文字符”判定任务是否运行。
- 缺状态显示 unknown/unavailable，不制造 queued；running 需要尚有效租约。停止读取不停止共享任务。

## 执行记录

- 本地 worktree Admission：显式 source/common-dir/parent/target 物理路径均纯本地，祖先 File Provider 属性检查通过，父目录可用 174 GiB。
- 基线 origin/main `7f60cee`。生产基线另保留，不部署 main 中未批准落地页到生产。
- 后台定向：同业务不同投递去重、跨语言全局并发/分钟/日次数、原文修改与删除、数据库回滚、3 次失败终止、402 暂停、429 Retry-After 全局暂停、事件复用来源译文、受保护诊断均通过。
- 冻结候选全量门禁：362 tests / 3865 assertions 通过；服务端 tsc 通过；Preview 前端构建通过；6 项 headless Chrome E2E 通过（包含已有摘要保留、重试上限、主题切换、译文落 localStorage 后重开、失败时租约过期停止 spinner、手动 GET 刷新、375px 移动端）。
- 全仓既有门禁问题，不由本轮引入：`event-flow-page.tsx:379` 使用未声明的 `EventFeedItem.signals`，导致 Web tsc 报错；`packages/infra/wrangler-www.production.jsonc` 格式检查不通过。改动文件 lint 已通过，不改这些无关逻辑。
- E2E 首次失败是模拟时钟测量方式：`fastForward` 每个计时器只触发一次，跳过了 React Query 的中间退避；改为逐段 `runFor` 执行真实的重试计时器后，原停止/最多 9 次 HTTP 请求门禁通过，未放宽产品门禁。
- 价格于 2026-10-28 从 [硅基流动官方定价页](https://www.siliconflow.cn/pricing) 核验：Qwen/Qwen3-30B-A3B-Instruct-2507 输入 ¥0.7 / 百万 token、输出 ¥2.8 / 百万 token。每次预留 32768 输入 + 4096 输出，最多 16000 UTF-8 prompt bytes，SDK 重试关闭。价格配置须精确匹配模型，否则拒绝调用。
- Preview canary 配置：¥1 / 北京日、最多 24 次调用；`TRANSLATION_ONLY_SCHEDULED=true` 让试运行定时器只补翻译，不运行摘要/嵌入/邮件。正式环境 ¥50 配置仅待后续批准，不在本轮发布。

## Known limits / follow-up

- 成本是本系统按公开单价的调用账本，并非硅基流动余额或账单；模型之外的费用不在翻译预算内。供应商价格变更需同步配置；超出预留的报告用量会暂停后续调用。
- 不承诺模型永远正确。任务与缓存生命周期已受控；语义质量、语言识别误判仍需另行评估。
- 事件流自动刷新最多前 3 页，超出后手动刷新；所有视图后台轮询不超过 5 分钟。unknown 不冒充运行中，不触发模型。
- 终止任务本批不自动清零重试计数；未来人工重试/任务账本清理应通过独立、受控运维动作，不开放公开重置接口。
- 浏览器组件 fixture 证据与实际 Preview 队列证据分开记录；生产仍是此前版本。
