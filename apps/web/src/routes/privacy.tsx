import { createFileRoute } from "@tanstack/react-router";

import { buildSeo } from "@/lib/seo";

const CONTACT = "support@opentrends.io";
const CONTACT_LINK_CLASS = "text-[var(--accent-blue)] underline";

export const Route = createFileRoute("/privacy")({
	component: PrivacyPage,
	head: () =>
		buildSeo({
			alternates: false,
			description:
				"How OpenTrends handles sign-in, reading preferences, email briefings, and site analytics.",
			path: "/privacy",
			title: "Privacy Policy / 隐私政策",
		}),
});

function PrivacyPage() {
	return (
		<article className="mx-auto w-full max-w-3xl px-6 py-10 text-[var(--text-primary)] sm:px-10 sm:py-14">
			<header className="border-[var(--border-default)] border-b pb-7">
				<h1 className="font-semibold text-3xl tracking-tight">
					Privacy Policy / 隐私政策
				</h1>
				<p className="mt-3 text-[var(--text-secondary)] text-sm">
					Last updated / 最近更新：2026-09-29
				</p>
			</header>

			<section className="space-y-6 py-8 leading-relaxed" lang="en">
				<h2 className="font-semibold text-xl">English</h2>
				<p>
					OpenTrends is independently operated. You can read public news without
					signing in. Contact us about privacy or account data at{" "}
					<a className={CONTACT_LINK_CLASS} href={`mailto:${CONTACT}`}>
						{CONTACT}
					</a>
					.
				</p>
				<h3 className="font-semibold">Information we handle</h3>
				<p>
					If you choose Google or GitHub sign-in, we receive your account
					identifier, name, email address, profile image, and authentication
					information needed to establish a session. Session records can include
					an IP address and browser information. We do not request access to
					your Gmail, Google Drive, or GitHub repositories.
				</p>
				<p>
					Your followed, hidden, pinned, and ordered sources may be saved
					locally in your browser and, when signed in, synchronized with our
					servers. If you subscribe to an email briefing, we store its delivery
					address, selected sources and keywords, schedule, and delivery status.
				</p>
				<h3 className="font-semibold">Use and service providers</h3>
				<p>
					We use this information to provide sign-in, preference sync, briefings
					you request, security, and support. Google and GitHub provide sign-in;
					Cloudflare hosts the site and account data; Forward Email delivers
					opted-in briefings. News content and briefing keywords may be
					processed by our summary-model providers. We do not sell Google
					sign-in data or use it for advertising.
				</p>
				<p>
					We use Google Analytics 4 and Ahrefs Analytics for site statistics.
					Our GA4 loader does not run when it detects a DNT/GPC signal or a
					previously recorded denial. This statement does not claim the same
					behavior for Ahrefs or infrastructure logs.
				</p>
				<h3 className="font-semibold">Retention and your choices</h3>
				<p>
					We keep account records while your account is active. Sessions expire
					under our authentication settings. Briefing subscriptions are removed
					when you unsubscribe and otherwise expire from our briefing store
					within 400 days of their last save; short-lived delivery records
					expire after two days. Service-provider records may follow those
					providers&apos; retention rules. Email{" "}
					<a className={CONTACT_LINK_CLASS} href={`mailto:${CONTACT}`}>
						{CONTACT}
					</a>{" "}
					to request access, correction, or deletion of your account data. We
					will verify the request and explain any information we must retain.
					Every briefing includes an unsubscribe link.
				</p>
			</section>

			<section
				className="space-y-6 border-[var(--border-default)] border-t py-8 leading-relaxed"
				lang="zh-CN"
			>
				<h2 className="font-semibold text-xl">简体中文</h2>
				<p>
					OpenTrends
					由个人独立运营。浏览公开新闻无需登录。隐私或账户数据问题请联系{" "}
					<a className={CONTACT_LINK_CLASS} href={`mailto:${CONTACT}`}>
						{CONTACT}
					</a>
					。
				</p>
				<h3 className="font-semibold">我们处理的信息</h3>
				<p>
					如果你选择使用 Google 或 GitHub
					登录，我们会取得账户标识、姓名、邮箱、头像，以及建立登录会话所需的认证信息。会话记录可能包含
					IP 地址和浏览器信息。我们不会申请读取你的 Gmail、Google Drive 或
					GitHub 仓库。
				</p>
				<p>
					关注、隐藏、置顶及排序来源等偏好可保存在你的浏览器中；登录后也可同步到我们的服务器。如果你主动订阅邮件简报，我们会保存收件地址、所选来源和关键词、发送时间及投递状态。
				</p>
				<h3 className="font-semibold">用途与服务商</h3>
				<p>
					我们使用这些信息提供登录、偏好同步、你请求的简报、安全保障和支持服务。Google
					和 GitHub 提供身份认证；Cloudflare 承载网站与账户数据；Forward Email
					投递主动订阅的简报。新闻内容和简报关键词可能由摘要模型服务商处理。我们不会出售
					Google 登录数据，也不会将其用于广告。
				</p>
				<p>
					网站使用 Google Analytics 4 和 Ahrefs Analytics 统计访问。站点自己的
					GA4 加载器检测到 DNT/GPC
					信号或已记录的拒绝选择时不会运行；这一说明不代表 Ahrefs
					或基础设施日志具有完全相同的行为。
				</p>
				<h3 className="font-semibold">保留与选择</h3>
				<p>
					账户有效期间我们保留账户记录；会话依认证设置到期。邮件简报订阅在退订时删除，否则会在最后一次保存后
					400
					天内从简报存储中到期；短期投递记录在两天后到期。服务商记录可能遵循其各自的保留规则。你可以写信至{" "}
					<a className={CONTACT_LINK_CLASS} href={`mailto:${CONTACT}`}>
						{CONTACT}
					</a>{" "}
					申请查询、更正或删除账户数据；我们会核实请求，并说明依法或出于安全需要必须保留的信息。每封简报都提供退订链接。
				</p>
			</section>
		</article>
	);
}
