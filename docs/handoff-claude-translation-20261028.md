# 给另一台机器上 Claude 的交接：翻译可靠性与 UI 收口

交接日期：2026-10-28。本文是当前入口，历史过程文档不能覆盖本文标明的最新状态。**本次交接只补文档，不合并、不重新部署。**

## 0. 2026-10-29 吞吐修复（Claude，第二台 Mac）

Preview 数据库读回：2376 个任务全部 ready、没有积压，但从登记到完成的耗时分布很差（zh 986 条超过 1 小时、406 条 15–60 分钟），实测一次模型调用 6 条要 15–25 秒，而每条 lane 串行、只靠每分钟一次的队列唤醒，读者请求触发的来源刷新又不登记任务（要等 16 个/分钟的轮转扫到）。提交 `d7be597`：

- `get-trends-page.ts`：请求触发的来源刷新也 `translationJobs: true`，新条目立刻登记并唤醒。
- `translation-prewarm-jobs.ts`：每轮先串行 claim 最多 3 批（互不重叠），再并行调模型；每次投递最多 6 轮 / 90 秒；结束时若还有活，自己再唤醒一次；新增 `drainTranslationJobs`，`scheduled` 每分钟直接对两条 lane 各消费最多 50 秒，不再只依赖与摘要共用的队列；补漏轮转 16→32 个来源；最近 2 小时更新过的事件每 tick 都登记，不受游标位置影响。
- `translation-job-store.ts`：批大小 6→8，按文本 11 KB 预算截断；重试按 3 条一组而不是 1 条一调（`selectTranslationBatch`，有单测）。
- `translation-policy.ts`：全局并发 2→6、每分钟 12→36；日预算/日调用次数上限不变。
- `translation-worker.ts`：拆成 `claimTranslationWork` + `runClaimedTranslationBatch`。

Preview API 版本 `a0a0ff65-c54e-4021-b7b8-74de3aa2896c`（上一版 `b8efafd4-…` 可回滚），用 `apps/server/wrangler.preview.jsonc`（未入库，无秘密，`keep_vars`，不含 consumer/cron）`versions upload` → `versions deploy`。发布后一分钟内看到同一分钟 13 次调用、6 个并发（两条 lane 各 3），新登记条目 25–60 秒内 ready。生产仍未发布；生产预算 ¥50 时建议同样保留这组并发/频率上限。

### 生产发布（2026-10-29 11:00–11:25，用户口头批准「发到生产」）

| 项目 | 值 |
|---|---|
| 代码 | `main = 90e4f53`（PR #31 快进合并） |
| 生产 D1 | 迁移 `0005`、`0006` 以显式 `applied_at` 登记为 `00006`、`00007`；执行前 Time Travel 书签 `0000454f-00000102-00005113-3cd044a9c784b55e9cfcc243f994e9ea` |
| 生产 API | 版本 `011ba879-19ad-4bcd-af2f-78b8ed64fe4a`（tag `translation-90e4f53`）100%；上一版 `c4a114bb-8986-4101-b499-e4e5a7de43b4` 可用 `wrangler versions deploy c4a114bb…@100%` 回滚（回滚不删新表） |
| 生产变量 | 在原有变量上新增 `TRANSLATION_JOBS_ENABLED=true`、`TRANSLATION_SCHEDULER_ENABLED=true`、`TRANSLATION_ONLY_SCHEDULED=false`、`TRANSLATION_DAILY_BUDGET_CNY=50`、`TRANSLATION_DAILY_CALL_LIMIT=6000`、`TRANSLATION_PRICE_MODEL=Qwen/Qwen3-30B-A3B-Instruct-2507`、输入 0.7 / 输出 2.8 CNY/M；秘密与 DB/KV/IMAGES/队列绑定沿用 |
| 生产 cron | **发布前生产 Worker 没有任何 cron**（10 分钟内 `scheduler_seen_at` 一直为 0，来源刷新全靠读者请求触发）。11:21 用 `wrangler triggers deploy`（配置含自定义域 `api.opentrends.io` 与 `* * * * *`）加上每分钟调度，约 8 分钟后生效。**注意：`alchemy.run.ts` 默认 cron 是 `*/5 * * * *`，下次用 Alchemy 发布前把 infra 的 `TRENDS_REFRESH_CRON` 设为 `* * * * *`，否则会被改回 5 分钟。** |
| 生产观测 | cron 生效后每分钟 10–16 次模型调用、两条 lane 并行；补漏扫描把存量未译条目登记了 154 条，几分钟内消完；新条目登记后约 1 分钟 ready |
| 配置文件 | `apps/server/wrangler.production.jsonc`（未入库，无秘密）；网页端 `apps/web/wrangler.production.jsonc` + `vite.production-cf.config.ts`（未入库） |
| 网页端 | 已构建（API 服务绑定 → `opentrends-api-production`），**等用户确认后再发**：网页一发会带上 main 的新落地页（`/` 不再 301） |

## 1. 先接对代码，不要从旧目录发布

- 仓库：<https://github.com/opentrends-io/opentrends>
- 分支：`feat/translation-lifecycle-20261028`
- PR：[#31 · durable translation jobs, truthful status and daily budget](https://github.com/opentrends-io/opentrends/pull/31)，交接时 OPEN、非草稿、可合并；尚未合并。
- 已部署的最新前端代码：`9d77893`；其后的 `462985e` 只补回执。本文会再增加一个文档提交，拉取远端分支即可，不要停在上面的旧 HEAD。
- 持续消费 API 的代码候选：`e81e215`。分支基线/交接时远端 main：`7f60cee6e3317d7224bb9877b1f8f3d67333d2ca`。后续 main 可能变化，先重新核对，不覆盖别人新增的功能。
- 原机器代码 worktree 是纯本地 `translation-lifecycle-20261028`，但**不依赖复制该目录**。从 Git 获取源码；不要复制 node_modules、`.env`、凭据、Alchemy 状态或私有截图。

新机器先选纯本地开发目录（不在 Desktop/Documents/iCloud/CloudStorage），确认 Git common-dir、依赖/产物路径也纯本地且空间充足；先读仓库 `AGENTS.md`。若另建 worktree，按本机规则检查至少 10 GiB 可用空间。可在已确认的父目录克隆：

```sh
git clone --branch feat/translation-lifecycle-20261028 https://github.com/opentrends-io/opentrends.git opentrends
```

进入新 checkout 后核对 `git status`、分支和 HEAD，再安装依赖；不要在旧的、带大量本地改动的 checkout 上直接 `bun run deploy`。

## 2. 用户决定与授权边界

1. 目标：翻译由后台共享生成，不因每个读者打开页面重复调用；已完成译文及时显示，失败不丢现有内容，状态真实、重试有限、费用受控。
2. 生产翻译预算已获用户确认：**¥50 / 北京时间自然日，仅翻译，不含 AI 摘要**。预算确认不等于本轮已获生产发布许可。
3. **当前这一轮只允许 Preview，生产等用户看完另行确认。PR 也未合并。**
4. 最新 UI 要求：删除来源工具栏下整行“部分条目保留原文……刷新只检查进度……”和右侧“刷新翻译状态”按钮。已经从组件与所有调用点真正删除，不是 CSS 隐藏。不要再加回来，也不要换成横幅/弹窗。
5. 条目上的状态图标/tooltip、后台消费及有限自动轮询保留。摘要自己的失败恢复按钮不在删除范围。
6. 不换模型、不增加语言、不全量重译、不清空历史译文/任务/费用账本、不顺手发布其他未获批准功能。

## 3. 云端状态：最后验证值，不冒充实时监控

以下来自 10 月 28 日发布回执；接手后先只读核对是否有人继续发布。

| 资源 | 最后验证的在线版本 | 说明 |
|---|---|---|
| Preview Web | `72fcfefa-8473-48fb-b991-e7b7720eed0e`，100% | 已移除提示栏；上一版 `53bdd372-51f0-4d94-b74c-a5a59534b171` 可作前端回滚 |
| Preview API | `b8efafd4-6f6e-4868-bae2-df90d58f8d02`，100% | 连续消费/心跳/有限重试；UI 收口没有重发 API |
| Preview 调度 | `* * * * *`，保持开启 | 不要像最初 canary 那样验收后关掉，否则无人访问就不再补译 |
| Preview 费用 | ¥1 / 北京日 + 1000 次/日双上限 | 不是生产 ¥50；保持原有模型、价格与凭据 |
| Preview 开关 | `TRANSLATION_JOBS_ENABLED=true`、`TRANSLATION_SCHEDULER_ENABLED=true`、`TRANSLATION_ONLY_SCHEDULED=true` | 最后一个只允许翻译定时工作，避免开启摘要/邮件/嵌入费用 |
| Preview 队列 consumer | batch 2、concurrency 1、retry 3 | 仍绑定 Preview API；本轮未重建队列 |
| Preview 数据库 | `0005_translation_lifecycle.sql`、`0006_translation_continuity.sql` 已应用 | 不重复执行、不回滚删除表 |
| 生产 | 本可靠性分支没有发布 | 之前的“摘要保留/有限重试 + 翻译缓存刷新”修复已另批上线；不是整个分支都已上线 |

页面：[硬件来源视图](https://opentrends-web-preview.opentrends.workers.dev/zh/trends/hardware)、[精选](https://opentrends-web-preview.opentrends.workers.dev/zh/trends/featured)、[流式](https://opentrends-web-preview.opentrends.workers.dev/zh/feed?topic=featured)、[关注](https://opentrends-web-preview.opentrends.workers.dev/zh/trends/mine)、[事件](https://opentrends-web-preview.opentrends.workers.dev/zh/events?topic=ai)。

## 4. 实现入口与不要破坏的约束

| 入口 | 职责 |
|---|---|
| `packages/api/src/translation-contract.ts` | 共用原文规范化、状态、有效期判定；状态不能由“标题还是英文”猜测 |
| `apps/server/src/trends/services/translation-identity.ts` | 任务键：subject/source/item/lang/原文 hash/policy；原文改动是新版本，不复用旧结果 |
| 同目录 `translation-job-store.ts` | D1 持久任务、租约、尝试次数、费用预留与结算、lane 去重 |
| 同目录 `translation-worker.ts` / `translation-policy.ts` | 真实模型调用、输出校验、失败分类；SDK `maxRetries: 0`，调用计入持久次数 |
| 同目录 `translation-prewarm-jobs.ts` / `refresh-scheduler.ts` | 来源写入登记 + 后台补漏 + 队列唤醒；D1 是任务真相，队列不是唯一任务存储 |
| 同目录 `translation-service.ts` | 只读状态/结果覆盖；访客 GET 不负责生成或重置任务 |
| `apps/server/src/routes/translation-health.ts` | `/api/internal/translation-health`：受保护、只读、聚合诊断；沿用 `EVENT_PAGES_ADMIN_TOKEN` |
| `apps/web/src/components/trends/translation-status.ts` / `trends-query.ts` | 最多 5 分钟的有界查询，结束/失联停止转圈；刷新不是再生成 |
| 同目录 `translation-state.tsx` | 现在只提供条目级 `TranslationIndicator`，没有页面级 Notice |
| `packages/db/src/d1-migrations/0005*` / `0006*` | 生命周期表、调度心跳、语言 lane |

硬边界：每任务最多 3 次尝试；全局模型并发 2、每分钟 12 次；每次消费者唤醒最多 6 批且 90 秒内；只有成功落库后才 ready。新任务只 zh/en，历史其他语言缓存仍可读。任务 key 与租约保护原文变化、删除及重复投递，不能通过清零状态“加速”。

金额预留是站内保守上限，不是供应商实际扣款；未知用量保留预留，不按 0 结算。`TRANSLATION_PRICE_MODEL` 必须精确匹配运行时 `LLM_TRANSLATION_MODEL`，价格字段必须配置。**不要从历史文档或源码默认值推断当前供应商/模型 ID**：接手时只读核对 Worker 中的模型、base URL 与单价，沿用已批准值；不要为探测新模型消耗真实额度。

## 5. 已验收证据与当前缺口

最新候选：371 项单测 / 3912 assertions 通过；8 项 headless Chrome E2E 通过；改动文件 lint、Preview Web 构建通过。UI 删除先跑了红测：旧代码按钮数量 1、预期 0；删除后通过，且英文真实组件仍自动变中文、落缓存、停止轮询。失败时原文保留、租约到期转圈消失，调用次数有界。

实际 Preview 五页均 200，无错误边界、`pageErrors=[]`，提示文本/按钮均为 0。硬件页仍有 running/queued、事件页仍有 queued，证明不是因“全翻完”才不显示。桌面和 375px 暗色截图已人工回看，工具栏直接接卡片，无占位；最后一轮没有打开真实事件详情弹窗，详情改动由共享组件删除与构建覆盖。

连续后台链路不是仅靠 fixture：不手工投递、不访问公开页面的观察窗口，ready 从 40→76→112，新增 12 次真实模型调用全部成功；112 条 ready 与精确版本缓存匹配、缺失 0。详见 [连续消费验收](translation-continuity-20261028.md)，这些是当时快照，不是当前积压数量。

已知限制，不冒充已完成：

- 补漏轮转 246 个来源、每 tick 16 个，完整一轮约 16 分钟；不是每个漏登记项都能在浏览器 5 分钟窗口内完成。正常 ingest 直接登记。Preview 没开完整抓取定时器，独立来源 GET 的新快照可能先等待后台登记。
- 不承诺积压马上清空或模型永不出错。超大 prompt 的保守预留可能高估费用，暂未做更精细拆批；未知用量仍按预留保守处理。
- 事件流自动查询最多前 3 页。已移除翻译手动按钮，后续重新进入/刷新页面可开启新的读取周期，但不能重新生成或清空后台尝试次数。
- 带真实管理员凭据的远端 health 尚未验证；无凭据 401 + no-store 已验证，授权路径有单测。接手时走安全凭据注入，不打印 token、不新建/轮换来绕过权限。
- Web tsc 仍有基线错误：`event-flow-page.tsx:379` 的 `EventFeedItem.signals` 未声明。全仓 lint 有既有 www 配置格式问题，生成的 Paraglide `.meta.json` 也可能被报格式；改动 lint 通过。不得说“全仓所有门禁全绿”。
- 供应商账户账单不可由已下线的 `/user/info` 获取；只报告站内调用证据/估算，不把缺接口说成余额 0。

## 6. 新机器复验与发布注意

上轮环境：Bun 1.3.9、Wrangler 4.88.0、headless Chrome；仓库 packageManager 标的是 Bun 1.3.2。使用锁文件安装，若版本差异失败，先记录环境原因，不通过无限重试碰绿。

```sh
# 仓库根目录；源码改动后才跑格式修复
bun install --frozen-lockfile
bun test
bun x ultracite check
bun x tsc --noEmit -p apps/server/tsconfig.json
bun x tsc --noEmit -p apps/web/tsconfig.json
# 切换到 apps/web；此 fixture 不调用真实模型，默认无头
PLAYWRIGHT_CHANNEL=chrome bun x playwright test --config e2e/summary-recovery.config.ts
```

这些测试脚本已入 Git。本机 `.tmp` 探针/截图、`.alchemy/local/wrangler.jsonc` 和 `dist` **没有入 Git**。新机器不能认为 clone 后已具备发布配置。`apps/web/vite.config.ts` 只有发现 `.alchemy/local/wrangler.jsonc` 才启用 Worker 构建插件；单纯 `vite build` 成功不证明产出了正确 Worker。

若后续获准继续发 Preview Web，核对云端现状后可在 `apps/web/.alchemy/local/wrangler.jsonc` 重建下面这个**无秘密的 Preview 前端构建配置**，不要套用到 API 或生产：

```json
{
  "name": "opentrends-web-preview",
  "main": "../../src/server.ts",
  "compatibility_date": "2026-03-10",
  "compatibility_flags": ["nodejs_compat", "nodejs_compat_populate_process_env"],
  "services": [{"binding": "API", "service": "opentrends-api-preview", "environment": "production"}],
  "vars": {
    "VITE_SERVER_URL": "https://opentrends-api-preview.opentrends.workers.dev",
    "VITE_SITE_URL": "https://opentrends-web-preview.opentrends.workers.dev"
  },
  "assets": {
    "binding": "ASSETS", "directory": "../../dist/client",
    "html_handling": "auto-trailing-slash", "not_found_handling": "none",
    "run_worker_first": false
  }
}
```

在 `apps/web` 构建：

```sh
VITE_SITE_URL=https://opentrends-web-preview.opentrends.workers.dev VITE_SERVER_URL=https://opentrends-api-preview.opentrends.workers.dev bun run build
# 构建会改 tracked sitemap；恢复源文件的正式域名生成值，保留 dist 内的 Preview 产物
VITE_SITE_URL=https://opentrends.io bun run scripts/generate-sitemap.ts
git diff --exit-code -- public/sitemap.xml
```

发布前逐项核对 `dist/server/wrangler.json` 中 Worker 名称、Preview 地址及 API service binding；再用已认证、非交互的 Wrangler `versions upload` → `versions deploy <上传返回版本>@100%`，显式 `--config dist/server/wrangler.json`。保留当前版本作为回滚，发布后用真实页面验证；不在交接时执行这些写操作。

API 发布不能用以上前端模板：先安全读回现有 DB/KV/IMAGES/队列/模型变量与 secret 名称并保留，不输出秘密值。代码上传不等于 cron 更新，cron、consumer 和三开关必须分别核对。原 Alchemy 生产 state 曾过期，**不要直接照旧文档跑根目录 `bun run deploy`**，更不要 reset state 或接管资源。

数据库特别注意：既有 `d1_migrations.applied_at` 没默认值，标准 Wrangler migration 曾因登记失败完整回滚；Preview 用同一 SQL 加显式时间戳一次登记成功。生产必须先只读检查 schema/迁移记录，预先保留可恢复副本与映射；`0006` 有 ALTER TABLE，不能盲目重放。不删除已新增表来回滚代码。

## 7. 接下来最短路径

1. 拉取上述分支，先读本文和 [连续消费验收](translation-continuity-20261028.md)，确认 Preview 当前版本/调度/预算与状态没有被其他人改动。
2. 让用户看 Preview；用户尚未指定下一项功能时，不自行扩大重构或重新部署。剩余性能/语义优化按上面的 known limits 另开小批。
3. 用户确认生产后再独立验收、整合生产现有基线、迁移、合并/发布。预算改成已批准 ¥50，但仍保留速率/次数上限；生产有正常抓取/摘要/邮件，**不能把 Preview 的 `TRANSLATION_ONLY_SCHEDULED=true` 原样搬过去而停掉它们**。
4. main 中还有此前只给 Preview 的落地页等改动，不能因为合了 PR #31 就把所有 main 内容带上生产。先核对实际已上线源码和用户批准的范围。
5. 生产验收至少覆盖无人访问的连续进展、已译文读取、失败有界与预算、五种视图、登录 providers、图片绑定、生产原有调度。发布后记录版本与回滚方案；不承诺“以后绝不失败”。

历史参考：[生命周期首轮记录](translation-lifecycle-20261028.md)（canary 后停 cron 的历史已被连续消费批次替代）、[早先缓存修复](translation-recovery-release-20261028.md)、[摘要恢复](summary-recovery-20261028.md)。冲突时以本文的最新范围和云端重新读回的事实为准。
