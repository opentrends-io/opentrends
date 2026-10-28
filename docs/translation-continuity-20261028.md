# 翻译持续消费补齐 · 当批合同

冻结：2026-10-28 22:17（Asia/Shanghai），基线 `c0c35f6` / PR #31。

## 必达 / coverage matrix

| 必达 | 合同与实现 | 定向反例 / 验证 | Owner |
|---|---|---|---|
| 无人访问仍清理积压 | 每分钟调度 + 每语言有界消费批次；durable lane 去重与租约 | 同业务不同投递只一个 lane；崩溃租约到期可恢复；一次唤醒处理超过一批 | Backend |
| 暂停与失联不假装排队 | 显式调度开关、scheduler/consumer 心跳；缺失或过期 fail closed | 关调度、没有消费者、数据库状态失效；已有译文保留 | Backend + Reader |
| 控费且原因准确 | 金额 / 日调用次数 / provider / rate-limit / config 分开；保留三次尝试上限 | 预算耗尽后重复唤醒零模型；429/402；未知费用仍预留 | Backend |
| 补漏不会卡死整条链 | 独立来源失败隔离；只登记公开事件流的有效来源/主题关联；轮转补漏与队列唤醒分离 | 一个来源失败其他继续；已退出公开事件流的旧事件不入队；队列投递失败下轮恢复 | Backend |
| 刷新恢复有界且反馈可见 | 每次手动刷新重置本轮计数，不重置后端预算/尝试 | 30 次后手动刷新重新有限轮询；停机/次数上限文案，暗色/375px | Reader |
| 持续运行的 Preview | ¥1/北京日保留，次数上限 1000；仅翻译调度保持开启 | 实际无访客的连续两次消费进展、公开 API 与浏览器、发布配置读回 | Release |

范围例外：本批同一状态合同跨数据库、服务、共享协议和前端，按 Backend 首片→Reader→Release 串行实现；首片先红绿测，不另建 Agent/Graph。

## 不做 / 阻断边界

不换模型、不增语言、不动摘要/邮件/嵌入、不全量重译、不上线生产、不新增管理后台。只允许数据破坏、秘密泄漏、错误或未授权写入、核心不可用、资源风暴/无界重试及直接违反上述合同阻断；其余记录 known_limits。

用户门禁仍是生产发布另行确认。Preview 金额上限不增加，只解除用于短时探针的 24 次日调用限制；1000 次与 ¥1 双限共同生效。持续调度是产品运行时，不是新的聊天提醒自动化。

收口：受影响定向红绿→冻结候选一次全量测试/改动 lint/API types/前端构建与 E2E→Preview 迁移与发布→真实后台无访客连续进展、实际 UI 状态、预算/调度读回→回执 commit/push 同一 PR。未改变的有效证据复用。

计时：planning 起点 22:11；first-test、implementation、verification、blocked、handoff 与返工记录在本文件补齐。

## Preview 发布检查表（每次发布都要读回）

- 只允许 `opentrends-api-preview` / `opentrends-web-preview` / Preview D1；保留服务绑定、IMAGES、队列和认证秘密。发布前记录当前版本，前端构建地址均为 Preview，不发布 main 的新落地页到生产。
- 先应用 `0006_translation_continuity.sql`；先检查 legacy `d1_migrations` 登记结构，显式写入 `id/name/applied_at`，不重复执行已登记迁移。
- API 配置三开关：`TRANSLATION_JOBS_ENABLED=true`、`TRANSLATION_SCHEDULER_ENABLED=true`、`TRANSLATION_ONLY_SCHEDULED=true`。后一个保证本批定时器不触发摘要、邮件、嵌入任务。
- Preview 双上限：`TRANSLATION_DAILY_BUDGET_CNY=1`、`TRANSLATION_DAILY_CALL_LIMIT=1000`，模型/单价沿用上一批。生产预算仍另行批准发布。
- 独立读取 Cloudflare 实际 cron，必须为每分钟；检查队列消费者仍绑定 API。版本上传不等于 cron 已配置，布尔开关也不证明心跳健康。
- 启用后不手动投递、不访问公开页面，观察至少两次 D1 成功任务/调用进展与 scheduler/consumer 心跳，再检查公开 GET 和浏览器。读取不产生模型请求由测试证明，远端观察证明真实调度接线。
- 验收结束**保留 cron 开启**。如主动暂停，先设 `TRANSLATION_SCHEDULER_ENABLED=false` 再移除 cron；否则最多 3 分钟内心跳过期显示失联，不能一直显示排队。
- 回滚代码不回滚/删除新增数据库表；金额与调用次数仍以同一天账本为准，不清零任务或预算。

## 当前回归结论

- 定向后端、数据库、共享状态与手动刷新：通过。新增反例包含来源失败、投递失败下一 tick 恢复、lane 幂等、过期 owner、公开事件资格、关闭调度零调用、402 不被短 429 覆盖。
- 第一轮全量 sweep 完整结束：370 通过、1 个 blocker——首次观察的响应未计入 30 次读取预算，造成 off-by-one。保持既有阈值与测试不变，修复计数基线；没有放宽门禁。其余本轮结果复用。
- 浏览器 7 项通过；新用例确认 queued → paused → call_limit 的真实状态切换、原文保留、手动操作只发 GET，375px 暗色提示不溢出。

## Known limits

- 不承诺所有积压马上清空：仍受每分钟 12 次、全局并发 2、每任务 3 次及每日双上限控制。Preview 只持续翻译既有内容，其他抓取定时仍关闭。
- 超大输入本轮仍按保守预留计入尝试，未实际调用模型时可能高估站内费用；不会超支，后续可增加按字节拆批与零用量结算。未知供应商用量不按零计。
- 完整账户账单不可由已下线的供应商余额 API 获得；站内成本只是按用量和配置单价估算。
