import { getSourcePreset } from "../config/sources";
import { sourceFamilyId } from "./event-source-family";
import { normalizeEventText } from "./event-text";

// Shopping posts: coupons, discount codes, sales and price cuts.
const SHOPPING_PROMO_RE =
	/\b(?:promo code|coupon code|discount code|voucher code|coupon|coupons|promo codes?|discount codes?|voucher codes?|limited-time offer|limited time offer|today only|deal alert|daily deals?|best deals?|early access sale|flash sale|clearance sale|price drop|price drops|lowest price|record low|save (?:up to )?(?:\$|£|€|\d)|\d{1,2}%\s*off|amazon deals?|(?:good|great|solid|excellent|killer) deal|prime (?:big )?deal days|prime day|black friday|cyber monday)\b|(?:优惠码|促销码|折扣码|折扣券|优惠券|领券|用码|限时优惠|限时折扣|限时特价|特价|好价|降价|史低|包邮|满减|立减|省钱)/i;
// "$1000 off" starts with a symbol, so it cannot sit inside the \b group above.
const PRICE_OFF_RE = /[$£€]\d[\d,]*(?:\.\d+)?\s*off\b/i;
const DEAL_TITLE_RE = /\bdeals?\b/i;
// Paid placements.
const SPONSORED_RE =
	/\b(?:sponsored (?:article|post|content|story)|(?:article|post|content|story) is sponsored|brought to you by|partner content|paid (?:post|content|partnership)|advertorial)\b/i;
// Selling seats at a conference: tickets, passes, exhibit tables.
const EVENT_SALES_RE =
	/\b(?:(?:get|grab|buy|book|secure|claim) (?:your|a|an|one)\b[^.!?]{0,40}?\b(?:tickets?|pass(?:es)?|exhibit tables?|seats?)|prices? (?:go|goes|going) up|early[- ]bird (?:pricing|tickets?|rates?)|exhibit(?:or)? tables?|exhibitor program|apply to host|side events?|reasons? \d+ of \d+ to (?:attend|be at))\b/i;
const SOURCE_NAME_SECTION_SEPARATOR = " · ";
const REGEX_SPECIAL_CHARACTERS_RE = /[.*+?^${}()|[\]\\]/g;
// Families whose feeds are mostly shopping posts, where "deal" alone is
// enough to call a title promotional.
const DEAL_HEAVY_SOURCE_FAMILIES = new Set([
	"9to5mac",
	"appleinsider",
	"cult-of-mac",
	"macrumors",
]);

const ownEventPatterns = new Map<string, RegExp | null>();

// A publisher advertising its own conference names it with its brand and a
// year ("TechCrunch Disrupt 2026"). Reports about someone else's event
// ("Snapdragon Summit", "IFA 2026") do not carry the publisher's brand.
function ownEventPattern(sourceId: string): RegExp | null {
	const cached = ownEventPatterns.get(sourceId);
	if (cached !== undefined) {
		return cached;
	}
	const brand = getSourcePreset(sourceId)
		?.name.split(SOURCE_NAME_SECTION_SEPARATOR)[0]
		?.trim();
	const pattern = brand
		? new RegExp(
				`(?:${escapeRegExp(brand)}|${escapeRegExp(brand.toUpperCase())})(?:\\s+\\p{Lu}[\\p{L}\\p{N}+&'’-]*){1,3}\\s+20\\d{2}\\b`,
				"u"
			)
		: null;
	ownEventPatterns.set(sourceId, pattern);
	return pattern;
}

function escapeRegExp(value: string): string {
	return value.replace(REGEX_SPECIAL_CHARACTERS_RE, "\\$&");
}

export function isLowValuePromotionText(
	text: string,
	sourceId?: string | null
): boolean {
	if (SHOPPING_PROMO_RE.test(text) || PRICE_OFF_RE.test(text)) {
		return true;
	}
	return Boolean(
		sourceId &&
			DEAL_HEAVY_SOURCE_FAMILIES.has(sourceFamilyId(sourceId)) &&
			DEAL_TITLE_RE.test(text)
	);
}

export interface PromotionCheckInput {
	description?: string | null;
	sourceId: string;
	title: string;
}

// Posts that sell something (a product, a sponsor, the publisher's own
// conference) are not news events and must not merge into one.
export function isPromotionalItem(item: PromotionCheckInput): boolean {
	const title = normalizeEventText(item.title);
	const text = `${title}\n${normalizeEventText(item.description)}`;
	if (isLowValuePromotionText(text, item.sourceId)) {
		return true;
	}
	if (SPONSORED_RE.test(text) || EVENT_SALES_RE.test(text)) {
		return true;
	}
	return ownEventPattern(item.sourceId)?.test(title) ?? false;
}
