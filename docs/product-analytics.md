# 产品行为统计（Preview 验收批）

## 冻结范围

交付：页面分类、首页入口、摘要阅读与失败/重试、事件阅读、关注与来源操作、显示偏好、站内搜索、分享和登录漏斗；独立行为开关；只允许枚举参数；DNT/GPC/已有拒绝优先；去重和限流；Preview 实际交互验收。

不做：广告、画像、录屏、输入原文、账户标识、文章标题/URL、关注清单、后台成本监控、自动向生产发布。Preview 仅在当前标签页内存记录脱敏诊断事件，不连接正式统计服务。

阻断条件：隐私泄漏、错误/重复统计、无界上报、核心交互或已有回归损坏、Preview 污染正式数据、冻结范围未接线。其余改进记后续项。

用户门禁：Preview 验收后才可生产发布。机械收口：定向测试 → 冻结候选全量检查 → Web Preview 发布 → 实际页面验收 → 事件字典/回执。API 和模型配置不变。

## Coverage matrix

| 当前必达 | 合同 / 验证 | 实现位置 |
| --- | --- | --- |
| 安全参数、页面分类 | 枚举白名单、动态路由模板、恶意参数单测 | analytics-model / analytics |
| 隐私选择、Preview 隔离 | DNT/GPC/拒绝/存储异常、无第三方请求 | analytics / 浏览器验收 |
| 摘要/事件 | 手动操作与实际完成状态；禁止轮询逐次上报 | trends-summary / event-feed-page |
| 关注/来源/排版 | 操作计数，无来源 ID 或用户列表 | followed-sources / display-settings / source-preferences |
| 搜索/分享/登录 | 无原文；成功事件只能由成功结果触发 | search-command / summary-share-dialog / social-sign-in |
| 首页/导航/阅读入口 | 只收入口类型，不读 DOM 文本和外链地址 | Analytics / 显式 data 属性 |

## 事件字典

所有事件带 `page_path`、`page_group`、`topic`、`language`；动作细分使用枚举 `action`。GA 另外使用安全页面标题、无查询参数的分类地址，以及枚举 `referrer_group`，不发送原始 referrer。动态事件/来源/归档日地址按模板合并，私人简报不携带名称、关键词或 ID。

| 事件 | 含义 / action |
| --- | --- |
| `page_view` | 首次加载与 SPA 页面切换；主题与语言可区分，query/hash 不重复计数，events 的公开 topic 筛选计一次 |
| `landing_click` / `navigation_click` | 首页 hero/brief/events/sources/closing 的链接；header/footer 导航入口 |
| `article_open` | 原文入口：source/flow/event/citation；只计打开意图，不证明外部网页阅读完成 |
| `summary_expand` / `summary_collapse` | 摘要手动展开/折叠；自动生成与恢复不会记成点击 |
| `summary_window` | today/week/month 选择 |
| `summary_result` | ready/empty/pending/failed/stale；同次组件访问每个主题、窗口、状态只报一次，不按轮询次数计 |
| `summary_retry` / `summary_share_open` | 手动重试 / 打开分享 |
| `share_result` | image_copied 是复制成功；image_download 是下载链接点击（不能证明文件已落盘）；failed 是复制失败 |
| `event_open` / `event_briefs` / `event_load_more` | 打开事件时间线 / 展开快讯 / 点击更多 |
| `source_follow` | follow/unfollow 操作；无来源 ID、列表或用户 ID |
| `source_action` | pin/unpin/hide/show/show_all/reorder/expand/collapse/manage 操作；不是跨设备持久化成功回执 |
| `layout_change` | sourceGrid/sourceSections/flow，真实变化且本地保存后才记 |
| `display_change` / `theme_change` / `language_change` | 显示选项名称 / light、dark、system / 白名单语言；不读其他用户设置 |
| `search_open` / `search_completed` / `search_result` | 打开搜索；停止输入 800ms 后结果数分组；点击 source/headline。无搜索原文或结果正文 |
| `login_open` / `login_start` / `login` / `login_failed` / `logout` | 登录入口、选择 provider、站内会话建立、启动失败、退出成功。只有本标签页 10 分钟内发起过登录，才可能记录一次 `login`；不把恢复会话当新登录，不猜测注册 |
| `view_change` | sources/events 入口点击 |

## 开关与流量边界

- `VITE_PRODUCT_ANALYTICS_ENABLED=false` 构建时关闭新增产品事件，保留页面统计；默认开启。没有新增 Cookie/统计弹窗，也没有写入 `consent granted`。
- 只有 `opentrends.io` 和 `www.opentrends.io` 可以加载 GA/Ahrefs。Preview/本地默认不加载二者。
- Preview 加 `?analytics_debug=1` 后，在 `window.otAnalyticsDebug.events` 查看最近 200 条安全事件。开关保存在该标签页 sessionStorage，事件只在内存；刷新清空事件、同标签导航继续调试，关闭标签结束。不提供用户标识，也不往正式 GA 发送。
- 自有 GA/产品统计每次发送前检查 DNT/GPC/已有拒绝；读取拒绝状态出错也关闭。已有 Ahrefs 仅在生产首次加载且信号允许时加载，不宣称能撤回第三方已经执行的请求。
- 同事件/页面/主题/action 在 750ms 内去重；最多 60 条/分钟、600 条/文档生命周期。没有自建网络重试；GA 被拦截时 dataLayer 上限 1000，统计异常不影响产品操作。
- 原公共 `dc-analytics.js` 不再由站点加载；统一 route observer 负责 GA 页面统计，防止双重上报。

## 验证与上线门禁

- 本地：407 单测 / 4007 断言；22 项浏览器回归（其中新增 12 项）；Web/Server 类型检查及 lint。隐私拦截、无正文/参数泄漏、排版真正变化并持久化、Preview 无外部统计、登录失败与恢复会话、摘要保留、重复与上限均已覆盖。
- Preview 发布及实际页面结果见下方发布回执。页面内存事件是前端接线证据，不等于 GA 后台入库。
- **生产仍需用户验收**。批准后构建正式地址，并核对 GA4 数据流的 Enhanced measurement（尤其 history pageview、site search、outbound/form）保持关闭，否则第三方自动采集会绕过本实现的脱敏与去重。Google 明确说明仅 `send_page_view: false` 不会关闭 history 增强统计：[官方页面统计文档](https://developers.google.com/analytics/devguides/collection/ga4/views)。
- 生产验收还需验证一个实际事件入库，并将 `page_group`、`topic`、`action`、`referrer_group` 注册为事件维度，配置首页→阅读→关注/登录报表。不会因 Preview 内存测试通过就宣称正式数据已可用。
- 原始 URL/标题/搜索不进入事件，遵循 [Google PII 指南](https://support.google.com/analytics/answer/6366371)。没有提交 GA 用户 ID，也没有新增 Google signals 或广告个性化。

## 已知限制 / follow-up

- 广告拦截、离线和关闭页面可能丢事件；这是一套有界产品统计，不是计费审计。超出上限会丢弃，不补发。
- OAuth 外部授权页被关闭/取消无法可靠辨别，保留为有 start 无 login，不猜成失败；没有实际创建新账号的证据就不报 sign_up。本批不再授权真人账号做登录。
- 搜索 completed 指停止输入后的结果数，不是搜索提交；重复相同结果分组会受 750ms 去重影响。
- 分析当前不做每个来源/文章的排行榜，不收私人来源列表。滚动深度、性能指标、服务端成本统计和自定义看板为后续批次。
- 测试期间模拟整个 localStorage 不可用时，既有排版组件的读取会报错；它不由新增统计触发。统计自身 fail closed 已单独验证，整站存储不可用兼容另列后续。

## Preview 发布回执 · 2026-11-11

**技术验收 ACCEPTED；等待用户验收，未合并或发布生产。**

- Web 源码 `889cd89`，Preview Worker `fb5fd3fd-dbfb-4134-b7cf-80ab8111978b`，100% 流量；回滚版本 `83f28ed1-c633-4018-8488-bc51af1d8780`。
- Preview API 仍为 `2c30b96b-95d9-4842-b59b-4a1a1d7d68b9`；生产 Web/API 仍为 `fec6b44f-8bcc-452e-8391-5c36555706bd` / `71dfbdfd-f48a-4524-a4ac-78aac9064f5c`。Web 服务绑定、站点/API 地址、兼容性配置切流前后相同；没有改队列、定时任务或模型。
- 正常 Preview 首页真实浏览器加载成功，无诊断事件、无旧 GA loader、无 GA/Ahrefs 请求。
- 调试页面实际完成首页 CTA 导航、摘要展开、网格→流式→刷新→网格（界面与 localStorage 一致）、关注来源、无结果搜索、打开登录。记录到对应事件；搜索中的合成隐私标记未进入事件。
- 手机实际打开多源事件时间线、Escape 关闭、展开快讯；`event_open`、`event_briefs` 已记录。截图亲自回看，375px 无横向溢出，排版菜单贴边与 hover 正常。
- 三个真实浏览器用例均通过、无页面运行错误、统计服务请求均为 0；每例分别保存响应时间、首次绘制、DOM、未完成资源路径及结果。约 7.7–15.3 秒是整个交互用例耗时，不冒充页面响应耗时。
- 另外在完全拦截外网的浏览器夹具验证了生产分支：gtag Arguments 格式正确、`send_page_view:false`、单次 pageview、安全上下文和 action 参数。没有向生产 GA 发送测试数据，也没有以此声称 GA 后台入库。
- 全部 407 单测、22 浏览器回归、lint、Web/Server 类型检查及 Preview 构建通过。格式门禁发现的测试 HTML 排版问题已修正；未变的代码回归证据复用，提交钩子的重复检查也通过。

验收链接：[Preview 精选](https://opentrends-web-preview.opentrends.workers.dev/zh/trends/featured?analytics_debug=1)。开发者工具控制台读取 `window.otAnalyticsDebug.events` 即可查看本标签页事件；不要在正式站期待这个调试对象。
