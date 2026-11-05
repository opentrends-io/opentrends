# OpenTrends 统一版本发布检查清单

本轮候选范围和实际版本见 `unreleased-preview-20261105.md`。落地页、流式、SEO 第五轮与事件改动先在 Preview 验收；用户确认前不发布生产。

## 固定候选

- [ ] 纯本地、干净 worktree，记录完整源码 SHA；与当前线上代码比较，不从陈旧主目录或旧 `.env` 发布。
- [ ] 分别记录 API 与 Web 当前 100% 版本、绑定、兼容日期/flags、计划任务与队列配置。仅记录秘密名称，不导出值。
- [ ] API/Web 来自同一验收候选；现有登录、翻译预算、有限重试、保留已有摘要/译文、关注空状态和图片兜底均保留。
- [ ] Preview 验收结论与生产批准明确。生产从同一源码按生产环境重建，不能直接复制 Preview bundle。

## 构建与门禁

- [ ] 定向测试覆盖布局保存、摘要十条 SSR 与折叠、404、静态来源目录、事件聚类反例、翻译缓存及重试。
- [ ] 候选冻结后一次 `bun test`、`bun x ultracite check`、Web/Server `tsc --noEmit`、前后端构建与浏览器回归。
- [ ] 核对 `.env.local` 等没有覆盖构建变量；不打印凭据。
- [ ] Web 构建使用 `VITE_SITE_URL=https://opentrends.io`、`VITE_SERVER_URL=https://api.opentrends.io`，Worker 为 `opentrends-web-production`、API 绑定为 `opentrends-api-production`。
- [ ] 生产模型必须匹配 `packages/infra/src/production-model-policy.ts`；摘要与翻译为批准的 Qwen3-30B，不从 Preview 或历史配置盲拷贝。
- [ ] 上传不等于上线。API 上传后先运行 `bun run deploy:production:api <candidate-version>`；获授权后用 `--deploy --expected-current <active-version>` 切流量并读回。不得绕过校验使用裸部署命令。
- [ ] 不运行未经核对的全栈 Alchemy 部署，不重新创建资源、不改变 cron/queue/Secrets；Web 独立上传与切换。

## 正式域名与真实交互

- [ ] `/` 和 `/zh` 为 200 落地页，回访 cookie 不自动跳转；H1、来源和可用摘要存在于服务端 HTML。
- [ ] 生产可索引页面为 `index, follow`；事件工具页、404 和 Preview 保持 noindex。同时检查 meta 与响应头。
- [ ] canonical、hreflang 指向正式域名及自身裸路径；`?landing=` 等检查参数不进入 canonical/sitemap。
- [ ] RSS 指向 `api.opentrends.io`；两份 sitemap 为有效 XML。归档读取失败保留旧结果或返回 503，不伪造空成功。
- [ ] 首页来源来自同提交公开 presets，不依赖健康 API；默认墙最多 32 个、每领域最多 8 个，完整目录在 `/sources`。配置变化需重建前端。
- [ ] 摘要不可用时显示明确标记的示例，不冒充实时结果；已有摘要遇到网络失败仍保留，自动重试有界。
- [ ] 网格→流式→刷新→分区：先证明初始不同，核对实际内容和 localStorage；关注空状态与旧链接正常，普通导航不出现日历入口。
- [ ] 多源事件与单源简讯分开，报道按媒体去重、时间线可打开/关闭；中英文、翻译状态与已有译文保留正常。旧无 view API 仍可用。
- [ ] 桌面/375px 手机亲自回看：偏好菜单、来源筛选、FAQ、详情弹窗、长文本与滚动无核心遮挡或溢出。
- [ ] 仅有界读取验证；不为了展示开启完整 Preview 定时流水线或全量重译。

## 回滚与回执

- [ ] 核心不可用、错误环境/绑定、秘密暴露、资源风暴或明确验收失败时，按实际失败组件回滚到记录版本；不回滚数据或另一个正常组件。
- [ ] API 回滚仍通过模型策略校验：旧代码带 Kimi 不能直接恢复，需保留批准模型后再切换。
- [ ] 回执区分源码、API 版本、Web 版本、模型配置、流量比例、验证时间，以及仍待生产的功能。

Google 收录速度和排名不属于部署成功判据。
