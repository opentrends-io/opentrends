# www 域名

`WEB_CUSTOM_DOMAIN=opentrends.io` 时，现有 Alchemy 部署会额外创建 `www-redirect`
Worker，把 `www.opentrends.io` 注册为 Cloudflare Custom Domain。Cloudflare 会为该
入口创建 DNS 记录和 TLS 证书，Worker 以 308 跳转到 `https://opentrends.io`，
保留路径、编码和查询参数。主域仍由原来的 web Worker 服务。

此声明不接管已有的 www 绑定；若部署发现冲突，应先核对资源归属，不开启自动 adopt。
未配置主域或使用其他域名的本地/预览环境不会创建 www 入口。只改源码或合并 PR
不会创建线上 DNS，也不证明 HTTPS 已通过验收。

## 验证

本地运行 `bun test packages/infra/src/www-redirect.test.ts` 和
`bun run --filter @opentrends/infra check-types`。

仅在获准部署后，沿用现有生产 Alchemy stage、状态存储及安全注入配置运行部署；
不要在空白状态的 checkout 直接部署整套资源。部署账户需要 Workers 和域名区域权限，
`WEB_CUSTOM_DOMAIN=opentrends.io`，`CLOUDFLARE_ZONE_ID` 对应已有权威区域。
不需要改注册商、名称服务器、主域/API 的 DNS 或 CORS。

待 DNS 与证书就绪后，用以下检查验收，不使用 `-k` 绕过 TLS：

```sh
curl --max-time 20 -I https://www.opentrends.io/
curl --max-time 20 -I 'https://www.opentrends.io/zh/trends/ai?from=www&tag=a%2Fb'
curl --max-time 20 -I http://www.opentrends.io/
curl --max-time 30 -IL --max-redirs 5 https://www.opentrends.io/
```

HTTPS www 必须返回 308，Location 分别为 `https://opentrends.io/` 和同路径、同查询的
主域 URL；HTTP 必须最终到 HTTPS 主域（区域级 HTTPS 规则可能先升级到 HTTPS www）。
主域首页原有跳转到 `/trends/featured` 属正常行为，最终页面应返回 200。
在浏览器打开 HTTPS www 首页及带路径链接，确认无证书警告、地址栏进入主域且页面可用。

证据范围：本地 Worker 测试不证明线上 DNS、证书签发或区域规则兼容；这三项只能在
实际部署后验收。Cloudflare 的行为依据见
[Custom Domains 文档](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)。
