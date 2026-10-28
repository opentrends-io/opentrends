# 翻译可靠性与可观测状态 · 冻结合同

> 2026-10-28 持续服务验收更正：下面保留的是首轮 canary 的历史证据。关闭定时器后积压不再被消费，因此当时的 `ACCEPTED` 只能证明有界执行链，不能证明“无人访问也持续生成”。用户反馈后已另开同一 PR 的补齐批次，当前合同与持续运行回执见 [translation-continuity-20261028.md](translation-continuity-20261028.md)。

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

## Preview 发布与实接线验收

代码候选：`edbb2160b5b15ab7b7dfc0124d693ad6e4528811`。PR：<https://github.com/opentrends-io/opentrends/pull/31>。本节后续提交只补回执，不改变已验收运行代码。

| 资源 | 本次版本 | 发布前可回退版本 |
|---|---|---|
| `opentrends-api-preview` | `9b4e6ca8-9eaf-4703-985c-05b72fe10c48` | `2d0f8e9c-d0bf-4972-9eb5-fbb84faafc72` |
| `opentrends-web-preview` | `1e0fb583-23b4-48b2-a155-ab302ce4a737` | `4f387401-bb2a-46a3-957c-f271e7136550` |

- Preview 的既有数据库、KV、Queue consumer、认证秘密均保留；Web 仍绑定 Preview API。API 补齐当前前端缩略图需要的 `IMAGES` 绑定，实际截图确认图片恢复。生产 Worker、数据库和流量未修改。
- `0005_translation_lifecycle.sql` 已应用，仅新增三张翻译生命周期表。旧 Alchemy 的 `d1_migrations.applied_at` 没有默认值，Wrangler 标准迁移命令因此失败并完整回滚。确认没有半张新表或错误记录后，使用同一份迁移 SQL 加显式 `applied_at=datetime('now')` 的登记语句一次执行成功；登记名为 `0005_translation_lifecycle.sql`，时间 `2026-10-28 12:50:01 UTC`。生产发布必须预检该登记表，不能照抄失败的标准命令。
- 原定时配置为空。12:52 UTC 短时开启翻译专用定时器；Cloudflare 配置传播后，D1 reconciliation cursor 推进，任务自动登记并由现有队列消费，证明不是靠访客读取生成。另有两次有界队列投递用于消费链路验证。
- 停止 canary 后，写入结果和独立读取均确认 `schedules: []`。已经投递的消息/传播中的触发仍可能收尾，统一受每日 24 次请求和 ¥1 的双上限约束；不清空用户队列、不删除未完成任务。
- 实际模型出现过输出校验失败，进入 `retry_wait`；已观测到第二次尝试成功，且成功任务与缓存译文一起提交。不是用 fixture 代替真实模型与 D1 证据。
- 13:12 UTC 收尾快照：21 次模型请求、已报告用量对应估算 ¥0.020829、未知用量 0、有效执行中调用 0；38 条 `ready` 与 38 条精确版本缓存逐条相符，其中 10 条第二次尝试成功。还有 483 条排队、11 条等待重试；这是有界 canary，不以把全部积压翻完作为本批验收。历史译文不计入新增成功数。Hacker News 实际来源接口返回 30 条 `ready`。
- 实际隔离 Chrome 检查网格、流式、关注空状态、事件页：四页均 HTTP 200，无页面 JavaScript 异常。人工回看网格与流式截图，确认译文保留、排队/未知状态和非模态刷新入口。当前 Preview 事件列表缺少近期事件；另取历史事件详情，实际返回 200 和 `no-store`，有数据的事件列表交互仍仅由隔离测试覆盖。
- 实际来源、主题、事件详情 API 均为 `no-store`；受保护诊断接口无凭据返回 401。带真实凭据的验证停在本机 KeyKeeper 授权，等待后已取消本任务的请求；没有为测试读取、打印或新建密钥。带授权诊断响应由定向测试覆盖，不能记为已完成远端认证验收。

## Known limits / follow-up

- 成本是本系统按公开单价的调用账本，并非硅基流动余额或账单；模型之外的费用不在翻译预算内。供应商价格变更需同步配置；超出预留的报告用量会暂停后续调用。
- 不承诺模型永远正确。任务与缓存生命周期已受控；语义质量、语言识别误判仍需另行评估。
- 事件流自动刷新最多前 3 页，超出后手动刷新；所有视图后台轮询不超过 5 分钟。unknown 不冒充运行中，不触发模型。
- 终止任务本批不自动清零重试计数；未来人工重试/任务账本清理应通过独立、受控运维动作，不开放公开重置接口。
- 浏览器组件 fixture 证据与实际 Preview 队列证据分开记录；生产仍是此前版本。

## 收口结论

`ACCEPTED`：冻结的实现、数据安全、兼容与受影响回归门禁满足；Preview 实接线已证实。生产发布、远端带凭据诊断验收和更长时间的质量/吞吐观察尚未执行，不把它们冒称完成。

本批约 80 分钟（冻结至回执）。planning / implementation / verification / blocked / handoff、time-to-first-test 与 time-to-first-user-visible 未独立打点，不事后猜测；KeyKeeper 等待与其他验证并行，最后取消。可复现的返工类别为模拟时钟测量、旧迁移登记表兼容、Preview 图片绑定缺失；修复均保持同一产品合同，其余有效测试证据复用，没有循环重跑全仓门禁。
