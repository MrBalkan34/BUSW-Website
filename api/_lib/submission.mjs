import { createRequire } from "module";
// \0rolldown/runtime.js
var __commonJSMin = (cb, mod) => () => (mod || (cb((mod = { exports: {} }).exports, mod, mod.exports), cb = null), mod.exports);
// src/pricing/catalogue.ts
/** Bump when any price or scope changes. It is recorded on every submission. */
var CATALOGUE_VERSION = "2026-10.1";
var ITEM_IDS = [
	"base-website",
	"additional-page",
	"additional-section",
	"custom-page-layout",
	"copywriting-page",
	"image-preparation-batch",
	"photo-gallery",
	"advanced-inquiry-form",
	"booking-integration",
	"blog-cms-setup",
	"extra-language-setup",
	"extra-language-page",
	"analytics-setup",
	"business-email-setup",
	"content-migration-page",
	"extra-revision-round",
	"out-of-scope-hour",
	"managed-hosting-month",
	"website-care-month"
];
var item = (id, label, unit, billing, scope, us, tr, intl) => ({
	id,
	label,
	unit,
	billing,
	scope,
	prices: {
		us,
		tr,
		intl
	}
});
var CATALOGUE = {
	"base-website": item("base-website", "Base website", "website", "one-time", "One template-based page with up to six sections, your text and images, responsive desktop and mobile layouts, one standard contact form, basic page titles and descriptions, deployment to one hosting account, and two consolidated revision rounds. Mobile support, HTTPS, basic accessibility and correction of defects in delivered work are included.", 39900, 199e4, 35900),
	"additional-page": item("additional-page", "Additional page", "page", "one-time", "Up to six sections using the selected design.", 7500, 375e3, 6900),
	"additional-section": item("additional-section", "Additional section", "section", "one-time", "A section beyond the six included on each standard page.", 2500, 125e3, 2500),
	"custom-page-layout": item("custom-page-layout", "Custom page layout", "page", "one-time", "Replaces the additional-page charge for that page. It is never charged together with it.", 15e3, 75e4, 13500),
	"copywriting-page": item("copywriting-page", "Copywriting", "page", "one-time", "Up to 500 words per page, with one revision.", 7500, 375e3, 6900),
	"image-preparation-batch": item("image-preparation-batch", "Image preparation", "batch", "one-time", "Up to 20 supplied images per batch.", 4e3, 2e5, 3500),
	"photo-gallery": item("photo-gallery", "Photo gallery", "gallery", "one-time", "Up to 30 supplied images.", 6e3, 3e5, 5500),
	"advanced-inquiry-form": item("advanced-inquiry-form", "Advanced inquiry form", "form", "one-time", "Up to 12 fields, conditional questions and email delivery. Upgrading the included contact form adds this fee once.", 9e3, 45e4, 8e3),
	"booking-integration": item("booking-integration", "Booking integration", "integration", "one-time", "Configure and embed one existing booking service.", 1e4, 5e5, 9e3),
	"blog-cms-setup": item("blog-cms-setup", "Blog/CMS setup", "setup", "one-time", "One article template and three client-supplied articles.", 2e4, 1e6, 18e3),
	"extra-language-setup": item("extra-language-setup", "Extra language setup", "language", "one-time", "Setup for each additional language. You supply the translations.", 15e3, 75e4, 13500),
	"extra-language-page": item("extra-language-page", "Extra language, translated pages", "page per language", "one-time", "Per translated page, for each additional language. You supply the translations.", 4e3, 2e5, 3500),
	"analytics-setup": item("analytics-setup", "Analytics setup", "setup", "one-time", "One analytics service. Consent tooling is quoted separately if needed.", 6e3, 3e5, 5500),
	"business-email-setup": item("business-email-setup", "Business email setup", "setup", "one-time", "Configure one mailbox provider.", 4e3, 2e5, 3500),
	"content-migration-page": item("content-migration-page", "Content migration", "page", "one-time", "Transfer supplied content from an existing site.", 3e3, 15e4, 2900),
	"extra-revision-round": item("extra-revision-round", "Additional revision round", "round", "one-time", "One consolidated list of changes within the agreed scope.", 6e3, 3e5, 5500),
	"out-of-scope-hour": item("out-of-scope-hour", "Out-of-scope work", "hour", "hourly", "Work outside the agreed scope. BUSW agrees any hours with you before doing the work.", 4e3, 2e5, 3500),
	"managed-hosting-month": item("managed-hosting-month", "Managed static-site hosting", "month", "monthly", "Hosting for your finished static site.", 1500, 75e3, 1500),
	"website-care-month": item("website-care-month", "Website care including hosting", "month", "monthly", "Hosting plus up to 30 minutes of content edits each month. Unused time does not roll over.", 4900, 245e3, 4500)
};
/** Work that is never priced automatically. Requesting it adds no amount to the estimate. */
var QUOTE_ITEMS = [
	{
		id: "online-store",
		label: "Online store",
		hint: "Selling products or services on the site."
	},
	{
		id: "customer-accounts",
		label: "Customer accounts",
		hint: "Visitors signing in to a personal area."
	},
	{
		id: "payment-system",
		label: "Payment system",
		hint: "Taking payments on the site."
	},
	{
		id: "custom-database",
		label: "Custom database",
		hint: "Storing and managing your own data."
	},
	{
		id: "api-integration",
		label: "API integration",
		hint: "Connecting the site to another system."
	},
	{
		id: "complex-animations",
		label: "Complex animations",
		hint: "Animation beyond simple, standard effects."
	},
	{
		id: "base-page-custom-layout",
		label: "Custom redesign of the home page",
		hint: "A bespoke layout for the first page instead of the template."
	}
];
/** Stable English wording. It is stored in submissions for BUSW; the interface shows its own translated text. */
var ESTIMATE_NOTICE = "Estimated price. BUSW confirms scope and price after reviewing your submission, before any work starts.";
var TAX_NOTICE = "Applicable taxes are not included and are itemized in the final quote.";
var EXCLUSIONS = [
	"Domain registration",
	"Email subscriptions",
	"Paid plugins",
	"Stock images and other assets",
	"Translation services",
	"Other third-party fees"
];
`${EXCLUSIONS.map((e) => e.toLowerCase()).join(", ")}`;
// src/pricing/format.ts
/** Formats integer minor units for a region, e.g. "$399", "₺19.900" or "€359.50". */
function formatMoney(minor, region) {
	const whole = minor % 100 === 0;
	return new Intl.NumberFormat(region.locale, {
		style: "currency",
		currency: region.currency,
		minimumFractionDigits: whole ? 0 : 2,
		maximumFractionDigits: 2
	}).format(minor / 100);
}
/** Amount with its currency code beside it: "$399 USD". Used for totals. */
function formatTotal(minor, region) {
	return `${formatMoney(minor, region)} ${region.currency}`;
}
// src/pricing/regions.ts
var REGIONS = {
	us: {
		id: "us",
		label: "United States",
		currency: "USD",
		locale: "en-US"
	},
	tr: {
		id: "tr",
		label: "Türkiye",
		currency: "TRY",
		locale: "tr-TR"
	},
	intl: {
		id: "intl",
		label: "All other countries",
		currency: "EUR",
		locale: "en-IE"
	}
};
/** ISO 3166-1 alpha-2 country codes (249). */
var COUNTRY_CODES = "AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW".split(" ");
var KNOWN = new Set(COUNTRY_CODES);
function isCountryCode(value) {
	return KNOWN.has(value);
}
/**
* The price catalogue for a business, decided only by its selected country:
* the United States uses USD, Türkiye uses TRY, every other country uses EUR.
* Browser language and IP address are deliberately never consulted.
*/
function regionForCountry(country) {
	if (country === null || !KNOWN.has(country)) return null;
	if (country === "US") return REGIONS.us;
	if (country === "TR") return REGIONS.tr;
	return REGIONS.intl;
}
function countryName(code, locale = "en") {
	try {
		return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
	} catch {
		return code;
	}
}
// node_modules/fflate/esm/index.mjs
var require$1 = createRequire("/");
var _a;
try {
	_a = require$1("worker_threads"), _a.Worker, _a.isMarkedAsUntransferable;
} catch (e) {}
var u8 = Uint8Array;
var u16 = Uint16Array;
var i32 = Int32Array;
var fleb = new u8([
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	0,
	1,
	1,
	1,
	1,
	2,
	2,
	2,
	2,
	3,
	3,
	3,
	3,
	4,
	4,
	4,
	4,
	5,
	5,
	5,
	5,
	0,
	0,
	0,
	0
]);
var fdeb = new u8([
	0,
	0,
	0,
	0,
	1,
	1,
	2,
	2,
	3,
	3,
	4,
	4,
	5,
	5,
	6,
	6,
	7,
	7,
	8,
	8,
	9,
	9,
	10,
	10,
	11,
	11,
	12,
	12,
	13,
	13,
	0,
	0
]);
var clim = new u8([
	16,
	17,
	18,
	0,
	8,
	7,
	9,
	6,
	10,
	5,
	11,
	4,
	12,
	3,
	13,
	2,
	14,
	1,
	15
]);
var freb = function(eb, start) {
	var b = new u16(31);
	for (var i = 0; i < 31; ++i) b[i] = start += 1 << eb[i - 1];
	var r = new i32(b[30]);
	for (var i = 1; i < 30; ++i) for (var j = b[i]; j < b[i + 1]; ++j) r[j] = j - b[i] << 5 | i;
	return {
		b,
		r
	};
};
var _a = freb(fleb, 2);
var fl = _a.b;
var revfl = _a.r;
fl[28] = 258, revfl[258] = 28;
var _b = freb(fdeb, 0);
_b.b;
var revfd = _b.r;
var rev = new u16(32768);
for (var i = 0; i < 32768; ++i) {
	var x = (i & 43690) >> 1 | (i & 21845) << 1;
	x = (x & 52428) >> 2 | (x & 13107) << 2;
	x = (x & 61680) >> 4 | (x & 3855) << 4;
	rev[i] = ((x & 65280) >> 8 | (x & 255) << 8) >> 1;
}
var hMap = (function(cd, mb, r) {
	var s = cd.length;
	var i = 0;
	var l = new u16(mb);
	for (; i < s; ++i) if (cd[i]) ++l[cd[i] - 1];
	var le = new u16(mb);
	for (i = 1; i < mb; ++i) le[i] = le[i - 1] + l[i - 1] << 1;
	var co;
	if (r) {
		co = new u16(1 << mb);
		var rvb = 15 - mb;
		for (i = 0; i < s; ++i) if (cd[i]) {
			var sv = i << 4 | cd[i];
			var r_1 = mb - cd[i];
			var v = le[cd[i] - 1]++ << r_1;
			for (var m = v | (1 << r_1) - 1; v <= m; ++v) co[rev[v] >> rvb] = sv;
		}
	} else {
		co = new u16(s);
		for (i = 0; i < s; ++i) if (cd[i]) co[i] = rev[le[cd[i] - 1]++] >> 15 - cd[i];
	}
	return co;
});
var flt = new u8(288);
for (var i = 0; i < 144; ++i) flt[i] = 8;
for (var i = 144; i < 256; ++i) flt[i] = 9;
for (var i = 256; i < 280; ++i) flt[i] = 7;
for (var i = 280; i < 288; ++i) flt[i] = 8;
var fdt = new u8(32);
for (var i = 0; i < 32; ++i) fdt[i] = 5;
var flm = /*#__PURE__*/ hMap(flt, 9, 0);
var fdm = /*#__PURE__*/ hMap(fdt, 5, 0);
var shft = function(p) {
	return (p + 7) / 8 | 0;
};
var slc = function(v, s, e) {
	if (s == null || s < 0) s = 0;
	if (e == null || e > v.length) e = v.length;
	return new u8(v.subarray(s, e));
};
var ec = [
	"unexpected EOF",
	"invalid block type",
	"invalid length/literal",
	"invalid distance",
	"stream finished",
	"no stream handler",
	,
	"no callback",
	"invalid UTF-8 data",
	"extra field too long",
	"date not in range 1980-2099",
	"filename too long",
	"stream finishing",
	"invalid zip data"
];
var err = function(ind, msg, nt) {
	var e = new Error(msg || ec[ind]);
	e.code = ind;
	if (Error.captureStackTrace) Error.captureStackTrace(e, err);
	if (!nt) throw e;
	return e;
};
var wbits = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
};
var wbits16 = function(d, p, v) {
	v <<= p & 7;
	var o = p / 8 | 0;
	d[o] |= v;
	d[o + 1] |= v >> 8;
	d[o + 2] |= v >> 16;
};
var hTree = function(d, mb) {
	var t = [];
	for (var i = 0; i < d.length; ++i) if (d[i]) t.push({
		s: i,
		f: d[i]
	});
	var s = t.length;
	var t2 = t.slice();
	if (!s) return {
		t: et,
		l: 0
	};
	if (s == 1) {
		var v = new u8(t[0].s + 1);
		v[t[0].s] = 1;
		return {
			t: v,
			l: 1
		};
	}
	t.sort(function(a, b) {
		return a.f - b.f;
	});
	t.push({
		s: -1,
		f: 25001
	});
	var l = t[0], r = t[1], i0 = 0, i1 = 1, i2 = 2;
	t[0] = {
		s: -1,
		f: l.f + r.f,
		l,
		r
	};
	while (i1 != s - 1) {
		l = t[t[i0].f < t[i2].f ? i0++ : i2++];
		r = t[i0 != i1 && t[i0].f < t[i2].f ? i0++ : i2++];
		t[i1++] = {
			s: -1,
			f: l.f + r.f,
			l,
			r
		};
	}
	var maxSym = t2[0].s;
	for (var i = 1; i < s; ++i) if (t2[i].s > maxSym) maxSym = t2[i].s;
	var tr = new u16(maxSym + 1);
	var mbt = ln(t[i1 - 1], tr, 0);
	if (mbt > mb) {
		var i = 0, dt = 0;
		var lft = mbt - mb, cst = 1 << lft;
		t2.sort(function(a, b) {
			return tr[b.s] - tr[a.s] || a.f - b.f;
		});
		for (; i < s; ++i) {
			var i2_1 = t2[i].s;
			if (tr[i2_1] > mb) {
				dt += cst - (1 << mbt - tr[i2_1]);
				tr[i2_1] = mb;
			} else break;
		}
		dt >>= lft;
		while (dt > 0) {
			var i2_2 = t2[i].s;
			if (tr[i2_2] < mb) dt -= 1 << mb - tr[i2_2]++ - 1;
			else ++i;
		}
		for (; i >= 0 && dt; --i) {
			var i2_3 = t2[i].s;
			if (tr[i2_3] == mb) {
				--tr[i2_3];
				++dt;
			}
		}
		mbt = mb;
	}
	return {
		t: new u8(tr),
		l: mbt
	};
};
var ln = function(n, l, d) {
	return n.s == -1 ? Math.max(ln(n.l, l, d + 1), ln(n.r, l, d + 1)) : l[n.s] = d;
};
var lc = function(c) {
	var s = c.length;
	while (s && !c[--s]);
	var cl = new u16(++s);
	var cli = 0, cln = c[0], cls = 1;
	var w = function(v) {
		cl[cli++] = v;
	};
	for (var i = 1; i <= s; ++i) if (c[i] == cln && i != s) ++cls;
	else {
		if (!cln && cls > 2) {
			for (; cls > 138; cls -= 138) w(32754);
			if (cls > 2) {
				w(cls > 10 ? cls - 11 << 5 | 28690 : cls - 3 << 5 | 12305);
				cls = 0;
			}
		} else if (cls > 3) {
			w(cln), --cls;
			for (; cls > 6; cls -= 6) w(8304);
			if (cls > 2) w(cls - 3 << 5 | 8208), cls = 0;
		}
		while (cls--) w(cln);
		cls = 1;
		cln = c[i];
	}
	return {
		c: cl.subarray(0, cli),
		n: s
	};
};
var clen = function(cf, cl) {
	var l = 0;
	for (var i = 0; i < cl.length; ++i) l += cf[i] * cl[i];
	return l;
};
var wfblk = function(out, pos, dat) {
	var s = dat.length;
	var o = shft(pos + 2);
	out[o] = s & 255;
	out[o + 1] = s >> 8;
	out[o + 2] = out[o] ^ 255;
	out[o + 3] = out[o + 1] ^ 255;
	for (var i = 0; i < s; ++i) out[o + i + 4] = dat[i];
	return (o + 4 + s) * 8;
};
var wblk = function(dat, out, final, syms, lf, df, eb, li, bs, bl, p) {
	wbits(out, p++, final);
	++lf[256];
	var _a = hTree(lf, 15), dlt = _a.t, mlb = _a.l;
	var _b = hTree(df, 15), ddt = _b.t, mdb = _b.l;
	var _c = lc(dlt), lclt = _c.c, nlc = _c.n;
	var _d = lc(ddt), lcdt = _d.c, ndc = _d.n;
	var lcfreq = new u16(19);
	for (var i = 0; i < lclt.length; ++i) ++lcfreq[lclt[i] & 31];
	for (var i = 0; i < lcdt.length; ++i) ++lcfreq[lcdt[i] & 31];
	var _e = hTree(lcfreq, 7), lct = _e.t, mlcb = _e.l;
	var nlcc = 19;
	for (; nlcc > 4 && !lct[clim[nlcc - 1]]; --nlcc);
	var flen = bl + 5 << 3;
	var ftlen = clen(lf, flt) + clen(df, fdt) + eb;
	var dtlen = clen(lf, dlt) + clen(df, ddt) + eb + 14 + 3 * nlcc + clen(lcfreq, lct) + 2 * lcfreq[16] + 3 * lcfreq[17] + 7 * lcfreq[18];
	if (bs >= 0 && flen <= ftlen && flen <= dtlen) return wfblk(out, p, dat.subarray(bs, bs + bl));
	var lm, ll, dm, dl;
	wbits(out, p, 1 + (dtlen < ftlen)), p += 2;
	if (dtlen < ftlen) {
		lm = hMap(dlt, mlb, 0), ll = dlt, dm = hMap(ddt, mdb, 0), dl = ddt;
		var llm = hMap(lct, mlcb, 0);
		wbits(out, p, nlc - 257);
		wbits(out, p + 5, ndc - 1);
		wbits(out, p + 10, nlcc - 4);
		p += 14;
		for (var i = 0; i < nlcc; ++i) wbits(out, p + 3 * i, lct[clim[i]]);
		p += 3 * nlcc;
		var lcts = [lclt, lcdt];
		for (var it = 0; it < 2; ++it) {
			var clct = lcts[it];
			for (var i = 0; i < clct.length; ++i) {
				var len = clct[i] & 31;
				wbits(out, p, llm[len]), p += lct[len];
				if (len > 15) wbits(out, p, clct[i] >> 5 & 127), p += clct[i] >> 12;
			}
		}
	} else lm = flm, ll = flt, dm = fdm, dl = fdt;
	for (var i = 0; i < li; ++i) {
		var sym = syms[i];
		if (sym > 255) {
			var len = sym >> 18 & 31;
			wbits16(out, p, lm[len + 257]), p += ll[len + 257];
			if (len > 7) wbits(out, p, sym >> 23 & 31), p += fleb[len];
			var dst = sym & 31;
			wbits16(out, p, dm[dst]), p += dl[dst];
			if (dst > 3) wbits16(out, p, sym >> 5 & 8191), p += fdeb[dst];
		} else wbits16(out, p, lm[sym]), p += ll[sym];
	}
	wbits16(out, p, lm[256]);
	return p + ll[256];
};
var deo = /*#__PURE__*/ new i32([
	65540,
	131080,
	131088,
	131104,
	262176,
	1048704,
	1048832,
	2114560,
	2117632
]);
var et = /*#__PURE__*/ new u8(0);
var dflt = function(dat, lvl, plvl, pre, post, st) {
	var s = st.z || dat.length;
	var o = new u8(pre + s + 5 * (1 + Math.ceil(s / 7e3)) + post);
	var w = o.subarray(pre, o.length - post);
	var lst = st.l;
	var pos = (st.r || 0) & 7;
	if (lvl) {
		if (pos) w[0] = st.r >> 3;
		var opt = deo[lvl - 1];
		var n = opt >> 13, c = opt & 8191;
		var msk_1 = (1 << plvl) - 1;
		var prev = st.p || new u16(32768), head = st.h || new u16(msk_1 + 1);
		var bs1_1 = Math.ceil(plvl / 3), bs2_1 = 2 * bs1_1;
		var hsh = function(i) {
			return (dat[i] ^ dat[i + 1] << bs1_1 ^ dat[i + 2] << bs2_1) & msk_1;
		};
		var syms = new i32(25e3);
		var lf = new u16(288), df = new u16(32);
		var lc_1 = 0, eb = 0, i = st.i || 0, li = 0, wi = st.w || 0, bs = 0;
		for (; i + 2 < s; ++i) {
			var hv = hsh(i);
			var imod = i & 32767, pimod = head[hv];
			prev[imod] = pimod;
			head[hv] = imod;
			if (wi <= i) {
				var rem = s - i;
				if ((lc_1 > 7e3 || li > 24576) && (rem > 423 || !lst)) {
					pos = wblk(dat, w, 0, syms, lf, df, eb, li, bs, i - bs, pos);
					li = lc_1 = eb = 0, bs = i;
					for (var j = 0; j < 286; ++j) lf[j] = 0;
					for (var j = 0; j < 30; ++j) df[j] = 0;
				}
				var l = 2, d = 0, ch_1 = c, dif = imod - pimod & 32767;
				if (rem > 2 && hv == hsh(i - dif)) {
					var maxn = Math.min(n, rem) - 1;
					var maxd = Math.min(32767, i);
					var ml = Math.min(258, rem);
					while (dif <= maxd && --ch_1 && imod != pimod) {
						if (dat[i + l] == dat[i + l - dif]) {
							var nl = 0;
							for (; nl < ml && dat[i + nl] == dat[i + nl - dif]; ++nl);
							if (nl > l) {
								l = nl, d = dif;
								if (nl > maxn) break;
								var mmd = Math.min(dif, nl - 2);
								var md = 0;
								for (var j = 0; j < mmd; ++j) {
									var ti = i - dif + j & 32767;
									var cd = ti - prev[ti] & 32767;
									if (cd > md) md = cd, pimod = ti;
								}
							}
						}
						imod = pimod, pimod = prev[imod];
						dif += imod - pimod & 32767;
					}
				}
				if (d) {
					syms[li++] = 268435456 | revfl[l] << 18 | revfd[d];
					var lin = revfl[l] & 31, din = revfd[d] & 31;
					eb += fleb[lin] + fdeb[din];
					++lf[257 + lin];
					++df[din];
					wi = i + l;
					++lc_1;
				} else {
					syms[li++] = dat[i];
					++lf[dat[i]];
				}
			}
		}
		for (i = Math.max(i, wi); i < s; ++i) {
			syms[li++] = dat[i];
			++lf[dat[i]];
		}
		pos = wblk(dat, w, lst, syms, lf, df, eb, li, bs, i - bs, pos);
		if (!lst) {
			st.r = pos & 7 | w[pos / 8 | 0] << 3;
			pos -= 7;
			st.h = head, st.p = prev, st.i = i, st.w = wi;
		}
	} else {
		for (var i = st.w || 0; i < s + lst; i += 65535) {
			var e = i + 65535;
			if (e >= s) {
				w[pos / 8 | 0] = lst;
				e = s;
			}
			pos = wfblk(w, pos + 1, dat.subarray(i, e));
		}
		st.i = s;
	}
	return slc(o, 0, pre + shft(pos) + post);
};
var crct = /*#__PURE__*/ (function() {
	var t = /* @__PURE__ */ new Int32Array(256);
	for (var i = 0; i < 256; ++i) {
		var c = i, k = 9;
		while (--k) c = (c & 1 && -306674912) ^ c >>> 1;
		t[i] = c;
	}
	return t;
})();
var crc = function() {
	var c = -1;
	return {
		p: function(d) {
			var cr = c;
			for (var i = 0; i < d.length; ++i) cr = crct[cr & 255 ^ d[i]] ^ cr >>> 8;
			c = cr;
		},
		d: function() {
			return ~c;
		}
	};
};
var dopt = function(dat, opt, pre, post, st) {
	if (!st) {
		st = { l: 1 };
		if (opt.dictionary) {
			var dict = opt.dictionary.subarray(-32768);
			var newDat = new u8(dict.length + dat.length);
			newDat.set(dict);
			newDat.set(dat, dict.length);
			dat = newDat;
			st.w = dict.length;
		}
	}
	return dflt(dat, opt.level == null ? 6 : opt.level, opt.mem == null ? st.l ? Math.ceil(Math.max(8, Math.min(13, Math.log(dat.length))) * 1.5) : 20 : 12 + opt.mem, pre, post, st);
};
var mrg = function(a, b) {
	var o = {};
	for (var k in a) o[k] = a[k];
	for (var k in b) o[k] = b[k];
	return o;
};
var wbytes = function(d, b, v) {
	for (; v; ++b) d[b] = v, v >>>= 8;
};
/**
* Compresses data with DEFLATE without any wrapper
* @param data The data to compress
* @param opts The compression options
* @returns The deflated version of the data
*/
function deflateSync(data, opts) {
	return dopt(data, opts || {}, 0, 0);
}
var fltn = function(d, p, t, o) {
	for (var k in d) {
		var val = d[k], n = p + k, op = o;
		if (Array.isArray(val)) op = mrg(o, val[1]), val = val[0];
		if (ArrayBuffer.isView(val)) t[n] = [val, op];
		else {
			t[n += "/"] = [new u8(0), op];
			fltn(val, n, t, o);
		}
	}
};
var te = typeof TextEncoder != "undefined" && /*#__PURE__*/ new TextEncoder();
var td = typeof TextDecoder != "undefined" && /*#__PURE__*/ new TextDecoder();
try {
	td.decode(et, { stream: true });
} catch (e) {}
/**
* Converts a string into a Uint8Array for use with compression/decompression methods
* @param str The string to encode
* @param latin1 Whether or not to interpret the data as Latin-1. This should
*               not need to be true unless decoding a binary string.
* @returns The string encoded in UTF-8/Latin-1 binary
*/
function strToU8(str, latin1) {
	if (latin1) {
		var ar_1 = new u8(str.length);
		for (var i = 0; i < str.length; ++i) ar_1[i] = str.charCodeAt(i);
		return ar_1;
	}
	if (te) return te.encode(str);
	var l = str.length;
	var ar = new u8(str.length + (str.length >> 1));
	var ai = 0;
	var w = function(v) {
		ar[ai++] = v;
	};
	for (var i = 0; i < l; ++i) {
		if (ai + 5 > ar.length) {
			var n = new u8(ai + 8 + (l - i << 1));
			n.set(ar);
			ar = n;
		}
		var c = str.charCodeAt(i);
		if (c < 128 || latin1) w(c);
		else if (c < 2048) w(192 | c >> 6), w(128 | c & 63);
		else if (c > 55295 && c < 57344) c = 65536 + (c & 1047552) | str.charCodeAt(++i) & 1023, w(240 | c >> 18), w(128 | c >> 12 & 63), w(128 | c >> 6 & 63), w(128 | c & 63);
		else w(224 | c >> 12), w(128 | c >> 6 & 63), w(128 | c & 63);
	}
	return slc(ar, 0, ai);
}
var exfl = function(ex) {
	var le = 0;
	if (ex) for (var k in ex) {
		var l = ex[k].length;
		if (l > 65535) err(9);
		le += l + 4;
	}
	return le;
};
var wzh = function(d, b, f, fn, u, c, ce, co) {
	var fl = fn.length, ex = f.extra, col = co && co.length;
	var exl = exfl(ex);
	wbytes(d, b, ce != null ? 33639248 : 67324752), b += 4;
	if (ce != null) d[b++] = 20, d[b++] = f.os;
	d[b] = 20, b += 2;
	d[b++] = f.flag << 1 | (c < 0 && 8), d[b++] = u && 8;
	d[b++] = f.compression & 255, d[b++] = f.compression >> 8;
	var dt = new Date(f.mtime == null ? Date.now() : f.mtime), y = dt.getFullYear() - 1980;
	if (y < 0 || y > 119) err(10);
	wbytes(d, b, y << 25 | dt.getMonth() + 1 << 21 | dt.getDate() << 16 | dt.getHours() << 11 | dt.getMinutes() << 5 | dt.getSeconds() >> 1), b += 4;
	if (c != -1) {
		wbytes(d, b, f.crc);
		wbytes(d, b + 4, c < 0 ? -c - 2 : c);
		wbytes(d, b + 8, f.size);
	}
	wbytes(d, b + 12, fl);
	wbytes(d, b + 14, exl), b += 16;
	if (ce != null) {
		wbytes(d, b, col);
		wbytes(d, b + 6, f.attrs);
		wbytes(d, b + 10, ce), b += 14;
	}
	d.set(fn, b);
	b += fl;
	if (exl) for (var k in ex) {
		var exf = ex[k], l = exf.length;
		wbytes(d, b, +k);
		wbytes(d, b + 2, l);
		d.set(exf, b + 4), b += 4 + l;
	}
	if (col) d.set(co, b), b += col;
	return b;
};
var wzf = function(o, b, c, d, e) {
	wbytes(o, b, 101010256);
	wbytes(o, b + 8, c);
	wbytes(o, b + 10, c);
	wbytes(o, b + 12, d);
	wbytes(o, b + 16, e);
};
/**
* Synchronously creates a ZIP file. Prefer using `zip` for better performance
* with more than one file.
* @param data The directory structure for the ZIP archive
* @param opts The main options, merged with per-file options
* @returns The generated ZIP archive
*/
function zipSync(data, opts) {
	if (!opts) opts = {};
	var r = {};
	var files = [];
	fltn(data, "", r, opts);
	var o = 0;
	var tot = 0;
	for (var fn in r) {
		var _a = r[fn], file = _a[0], p = _a[1];
		var compression = p.level == 0 ? 0 : 8;
		var f = strToU8(fn), s = f.length;
		var com = p.comment, m = com && strToU8(com), ms = m && m.length;
		var exl = exfl(p.extra);
		if (s > 65535) err(11);
		var d = compression ? deflateSync(file, p) : file, l = d.length;
		var c = crc();
		c.p(file);
		files.push(mrg(p, {
			size: file.length,
			crc: c.d(),
			c: d,
			f,
			m,
			u: s != fn.length || m && com.length != ms,
			o,
			compression
		}));
		o += 30 + s + exl + l;
		tot += 76 + 2 * (s + exl) + (ms || 0) + l;
	}
	var out = new u8(tot + 22), oe = o, cdl = tot - o;
	for (var i = 0; i < files.length; ++i) {
		var f = files[i];
		wzh(out, f.o, f, f.f, f.u, f.c.length);
		var badd = 30 + f.f.length + exfl(f.extra);
		out.set(f.c, f.o + badd);
		wzh(out, o, f, f.f, f.u, f.c.length, f.o, f.m), o += 16 + badd + (f.m ? f.m.length : 0);
	}
	wzf(out, o, files.length, cdl, oe);
	return out;
}
// src/export/escape.ts
/** Escapes text for use in HTML. It sits on its own so the brief can use it without pulling in the site renderer. */
function escapeHtml(text) {
	return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
// src/i18n/labels.ts
/**
* Visible names for things that have stable ids in the data (price list items, regions, palettes and so on).
* The data keeps its English wording for submissions to BUSW; the interface shows these translated names.
*/
var itemLabel = (t, id) => t(`catalogue.${id}.label`);
var itemUnit = (t, id) => t(`catalogue.${id}.unit`);
var quoteLabel = (t, id) => t(`quote.${id}.label`);
var regionLabel = (t, id) => t(`region.${id}.label`);
var paletteLabel = (t, id) => t(`palette.${id}`);
var fontLabel = (t, id) => t(`font.${id}`);
var templateName = (t, id) => t(`template.${id}.name`);
var BUILT_IN = [
	"studio",
	"local-business",
	"personal"
];
/** The name of whatever the project started from: a built-in template, a blank page, or a custom design. */
function startingPointLabel(t, id) {
	if (id === null) return t("template.notChosen");
	if (BUILT_IN.includes(id)) return templateName(t, id);
	return t(id === "blank" ? "template.blank" : "template.custom");
}
/** The work an estimate never includes, in display order (`estimate.exclusion.<name>` in the translation files). */
var EXCLUSION_KEYS = [
	"domain",
	"email",
	"plugins",
	"stock",
	"translation",
	"thirdParty"
];
// node_modules/react/cjs/react.production.js
/**
* @license React
* react.production.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_production = /* @__PURE__ */ __commonJSMin(((exports) => {
	var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element");
	var REACT_PORTAL_TYPE = Symbol.for("react.portal");
	var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
	var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
	var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
	var REACT_CONSUMER_TYPE = Symbol.for("react.consumer");
	var REACT_CONTEXT_TYPE = Symbol.for("react.context");
	var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
	var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
	var REACT_MEMO_TYPE = Symbol.for("react.memo");
	var REACT_LAZY_TYPE = Symbol.for("react.lazy");
	var REACT_ACTIVITY_TYPE = Symbol.for("react.activity");
	var REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition");
	var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
	function getIteratorFn(maybeIterable) {
		if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
		maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
		return "function" === typeof maybeIterable ? maybeIterable : null;
	}
	var ReactNoopUpdateQueue = {
		isMounted: function() {
			return !1;
		},
		enqueueForceUpdate: function() {},
		enqueueReplaceState: function() {},
		enqueueSetState: function() {}
	};
	var assign = Object.assign;
	var emptyObject = {};
	function Component(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	Component.prototype.isReactComponent = {};
	Component.prototype.setState = function(partialState, callback) {
		if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
		this.updater.enqueueSetState(this, partialState, callback, "setState");
	};
	Component.prototype.forceUpdate = function(callback) {
		this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
	};
	function ComponentDummy() {}
	ComponentDummy.prototype = Component.prototype;
	function PureComponent(props, context, updater) {
		this.props = props;
		this.context = context;
		this.refs = emptyObject;
		this.updater = updater || ReactNoopUpdateQueue;
	}
	var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
	pureComponentPrototype.constructor = PureComponent;
	assign(pureComponentPrototype, Component.prototype);
	pureComponentPrototype.isPureReactComponent = !0;
	var isArrayImpl = Array.isArray;
	function noop() {}
	var ReactSharedInternals = {
		H: null,
		A: null,
		T: null,
		S: null
	};
	var hasOwnProperty = Object.prototype.hasOwnProperty;
	function ReactElement(type, key, props) {
		var refProp = props.ref;
		return {
			$$typeof: REACT_ELEMENT_TYPE,
			type,
			key,
			ref: void 0 !== refProp ? refProp : null,
			props
		};
	}
	function cloneAndReplaceKey(oldElement, newKey) {
		return ReactElement(oldElement.type, newKey, oldElement.props);
	}
	function isValidElement(object) {
		return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
	}
	function escape(key) {
		var escaperLookup = {
			"=": "=0",
			":": "=2"
		};
		return "$" + key.replace(/[=:]/g, function(match) {
			return escaperLookup[match];
		});
	}
	var userProvidedKeyEscapeRegex = /\/+/g;
	function getElementKey(element, index) {
		return "object" === typeof element && null !== element && null != element.key ? escape("" + element.key) : index.toString(36);
	}
	function resolveThenable(thenable) {
		switch (thenable.status) {
			case "fulfilled": return thenable.value;
			case "rejected": throw thenable.reason;
			default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
				"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
			}, function(error) {
				"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			})), thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
			}
		}
		throw thenable;
	}
	function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
		var type = typeof children;
		if ("undefined" === type || "boolean" === type) children = null;
		var invokeCallback = !1;
		if (null === children) invokeCallback = !0;
		else switch (type) {
			case "bigint":
			case "string":
			case "number":
				invokeCallback = !0;
				break;
			case "object": switch (children.$$typeof) {
				case REACT_ELEMENT_TYPE:
				case REACT_PORTAL_TYPE:
					invokeCallback = !0;
					break;
				case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
			}
		}
		if (invokeCallback) return callback = callback(children), invokeCallback = "" === nameSoFar ? "." + getElementKey(children, 0) : nameSoFar, isArrayImpl(callback) ? (escapedPrefix = "", null != invokeCallback && (escapedPrefix = invokeCallback.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
			return c;
		})) : null != callback && (isValidElement(callback) && (callback = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || children && children.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + invokeCallback)), array.push(callback)), 1;
		invokeCallback = 0;
		var nextNamePrefix = "" === nameSoFar ? "." : nameSoFar + ":";
		if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = nextNamePrefix + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if (i = getIteratorFn(children), "function" === typeof i) for (children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = nextNamePrefix + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
		else if ("object" === type) {
			if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
			array = String(children);
			throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
		}
		return invokeCallback;
	}
	function mapChildren(children, func, context) {
		if (null == children) return children;
		var result = [], count = 0;
		mapIntoArray(children, result, "", "", function(child) {
			return func.call(context, child, count++);
		});
		return result;
	}
	function lazyInitializer(payload) {
		if (-1 === payload._status) {
			var ctor = payload._result, thenable = ctor();
			thenable.then(function(moduleObject) {
				if (0 === payload._status || -1 === payload._status) payload._status = 1, payload._result = moduleObject, void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
			}, function(error) {
				if (0 === payload._status || -1 === payload._status) payload._status = 2, payload._result = error, void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
			});
			-1 === payload._status && (payload._status = 0, payload._result = thenable);
		}
		if (1 === payload._status) return payload._result.default;
		throw payload._result;
	}
	var reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
		if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
			var event = new window.ErrorEvent("error", {
				bubbles: !0,
				cancelable: !0,
				message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
				error
			});
			if (!window.dispatchEvent(event)) return;
		} else if ("object" === typeof process && "function" === typeof process.emit) {
			process.emit("uncaughtException", error);
			return;
		}
		console.error(error);
	};
	function startTransition(scope) {
		var prevTransition = ReactSharedInternals.T, currentTransition = {};
		currentTransition.types = null !== prevTransition ? prevTransition.types : null;
		ReactSharedInternals.T = currentTransition;
		try {
			var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
			null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
			"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && returnValue.then(noop, reportGlobalError);
		} catch (error) {
			reportGlobalError(error);
		} finally {
			null !== prevTransition && null !== currentTransition.types && (prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
		}
	}
	function addTransitionType(type) {
		var transition = ReactSharedInternals.T;
		if (null !== transition) {
			var transitionTypes = transition.types;
			null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
		} else startTransition(addTransitionType.bind(null, type));
	}
	var Children = {
		map: mapChildren,
		forEach: function(children, forEachFunc, forEachContext) {
			mapChildren(children, function() {
				forEachFunc.apply(this, arguments);
			}, forEachContext);
		},
		count: function(children) {
			var n = 0;
			mapChildren(children, function() {
				n++;
			});
			return n;
		},
		toArray: function(children) {
			return mapChildren(children, function(child) {
				return child;
			}) || [];
		},
		only: function(children) {
			if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
			return children;
		}
	};
	exports.Activity = REACT_ACTIVITY_TYPE;
	exports.Children = Children;
	exports.Component = Component;
	exports.Fragment = REACT_FRAGMENT_TYPE;
	exports.Profiler = REACT_PROFILER_TYPE;
	exports.PureComponent = PureComponent;
	exports.StrictMode = REACT_STRICT_MODE_TYPE;
	exports.Suspense = REACT_SUSPENSE_TYPE;
	exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
	exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
	exports.__COMPILER_RUNTIME = {
		__proto__: null,
		c: function(size) {
			return ReactSharedInternals.H.useMemoCache(size);
		}
	};
	exports.addTransitionType = addTransitionType;
	exports.cache = function(fn) {
		return function() {
			return fn.apply(null, arguments);
		};
	};
	exports.cacheSignal = function() {
		return null;
	};
	exports.cloneElement = function(element, config, children) {
		if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
		var props = assign({}, element.props), key = element.key;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
		var propName = arguments.length - 2;
		if (1 === propName) props.children = children;
		else if (1 < propName) {
			for (var childArray = Array(propName), i = 0; i < propName; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		return ReactElement(element.type, key, props);
	};
	exports.createContext = function(defaultValue) {
		defaultValue = {
			$$typeof: REACT_CONTEXT_TYPE,
			_currentValue: defaultValue,
			_currentValue2: defaultValue,
			_threadCount: 0,
			Provider: null,
			Consumer: null
		};
		defaultValue.Provider = defaultValue;
		defaultValue.Consumer = {
			$$typeof: REACT_CONSUMER_TYPE,
			_context: defaultValue
		};
		return defaultValue;
	};
	exports.createElement = function(type, config, children) {
		var propName, props = {}, key = null;
		if (null != config) for (propName in void 0 !== config.key && (key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (props[propName] = config[propName]);
		var childrenLength = arguments.length - 2;
		if (1 === childrenLength) props.children = children;
		else if (1 < childrenLength) {
			for (var childArray = Array(childrenLength), i = 0; i < childrenLength; i++) childArray[i] = arguments[i + 2];
			props.children = childArray;
		}
		if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === props[propName] && (props[propName] = childrenLength[propName]);
		return ReactElement(type, key, props);
	};
	exports.createRef = function() {
		return { current: null };
	};
	exports.forwardRef = function(render) {
		return {
			$$typeof: REACT_FORWARD_REF_TYPE,
			render
		};
	};
	exports.isValidElement = isValidElement;
	exports.lazy = function(ctor) {
		return {
			$$typeof: REACT_LAZY_TYPE,
			_payload: {
				_status: -1,
				_result: ctor
			},
			_init: lazyInitializer
		};
	};
	exports.memo = function(type, compare) {
		return {
			$$typeof: REACT_MEMO_TYPE,
			type,
			compare: void 0 === compare ? null : compare
		};
	};
	exports.startTransition = startTransition;
	exports.unstable_useCacheRefresh = function() {
		return ReactSharedInternals.H.useCacheRefresh();
	};
	exports.use = function(usable) {
		return ReactSharedInternals.H.use(usable);
	};
	exports.useActionState = function(action, initialState, permalink) {
		return ReactSharedInternals.H.useActionState(action, initialState, permalink);
	};
	exports.useCallback = function(callback, deps) {
		return ReactSharedInternals.H.useCallback(callback, deps);
	};
	exports.useContext = function(Context) {
		return ReactSharedInternals.H.useContext(Context);
	};
	exports.useDebugValue = function() {};
	exports.useDeferredValue = function(value, initialValue) {
		return ReactSharedInternals.H.useDeferredValue(value, initialValue);
	};
	exports.useEffect = function(create, deps) {
		return ReactSharedInternals.H.useEffect(create, deps);
	};
	exports.useEffectEvent = function(callback) {
		return ReactSharedInternals.H.useEffectEvent(callback);
	};
	exports.useId = function() {
		return ReactSharedInternals.H.useId();
	};
	exports.useImperativeHandle = function(ref, create, deps) {
		return ReactSharedInternals.H.useImperativeHandle(ref, create, deps);
	};
	exports.useInsertionEffect = function(create, deps) {
		return ReactSharedInternals.H.useInsertionEffect(create, deps);
	};
	exports.useLayoutEffect = function(create, deps) {
		return ReactSharedInternals.H.useLayoutEffect(create, deps);
	};
	exports.useMemo = function(create, deps) {
		return ReactSharedInternals.H.useMemo(create, deps);
	};
	exports.useOptimistic = function(passthrough, reducer) {
		return ReactSharedInternals.H.useOptimistic(passthrough, reducer);
	};
	exports.useReducer = function(reducer, initialArg, init) {
		return ReactSharedInternals.H.useReducer(reducer, initialArg, init);
	};
	exports.useRef = function(initialValue) {
		return ReactSharedInternals.H.useRef(initialValue);
	};
	exports.useState = function(initialState) {
		return ReactSharedInternals.H.useState(initialState);
	};
	exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
		return ReactSharedInternals.H.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
	};
	exports.useTransition = function() {
		return ReactSharedInternals.H.useTransition();
	};
	exports.version = "19.3.1";
}));
// node_modules/react/cjs/react.development.js
/**
* @license React
* react.development.js
*
* Copyright (c) Meta Platforms, Inc. and affiliates.
*
* This source code is licensed under the MIT license found in the
* LICENSE file in the root directory of this source tree.
*/
var require_react_development = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	"production" !== process.env.NODE_ENV && (function() {
		function defineDeprecationWarning(methodName, info) {
			Object.defineProperty(Component.prototype, methodName, { get: function() {
				console.warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
			} });
		}
		function getIteratorFn(maybeIterable) {
			if (null === maybeIterable || "object" !== typeof maybeIterable) return null;
			maybeIterable = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable["@@iterator"];
			return "function" === typeof maybeIterable ? maybeIterable : null;
		}
		function warnNoop(publicInstance, callerName) {
			publicInstance = (publicInstance = publicInstance.constructor) && (publicInstance.displayName || publicInstance.name) || "ReactClass";
			var warningKey = publicInstance + "." + callerName;
			didWarnStateUpdateForUnmountedComponent[warningKey] || (console.error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, publicInstance), didWarnStateUpdateForUnmountedComponent[warningKey] = !0);
		}
		function Component(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		function ComponentDummy() {}
		function PureComponent(props, context, updater) {
			this.props = props;
			this.context = context;
			this.refs = emptyObject;
			this.updater = updater || ReactNoopUpdateQueue;
		}
		function noop() {}
		function testStringCoercion(value) {
			return "" + value;
		}
		function checkKeyStringCoercion(value) {
			try {
				testStringCoercion(value);
				var JSCompiler_inline_result = !1;
			} catch (e) {
				JSCompiler_inline_result = !0;
			}
			if (JSCompiler_inline_result) {
				JSCompiler_inline_result = console;
				var JSCompiler_temp_const = JSCompiler_inline_result.error;
				var JSCompiler_inline_result$jscomp$0 = "function" === typeof Symbol && Symbol.toStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
				JSCompiler_temp_const.call(JSCompiler_inline_result, "The provided key is an unsupported type %s. This value must be coerced to a string before using it here.", JSCompiler_inline_result$jscomp$0);
				return testStringCoercion(value);
			}
		}
		function getComponentNameFromType(type) {
			if (null == type) return null;
			if ("function" === typeof type) return type.$$typeof === REACT_CLIENT_REFERENCE ? null : type.displayName || type.name || null;
			if ("string" === typeof type) return type;
			switch (type) {
				case REACT_FRAGMENT_TYPE: return "Fragment";
				case REACT_PROFILER_TYPE: return "Profiler";
				case REACT_STRICT_MODE_TYPE: return "StrictMode";
				case REACT_SUSPENSE_TYPE: return "Suspense";
				case REACT_SUSPENSE_LIST_TYPE: return "SuspenseList";
				case REACT_ACTIVITY_TYPE: return "Activity";
				case REACT_VIEW_TRANSITION_TYPE: return "ViewTransition";
			}
			if ("object" === typeof type) switch ("number" === typeof type.tag && console.error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue."), type.$$typeof) {
				case REACT_PORTAL_TYPE: return "Portal";
				case REACT_CONTEXT_TYPE: return type.displayName || "Context";
				case REACT_CONSUMER_TYPE: return (type._context.displayName || "Context") + ".Consumer";
				case REACT_FORWARD_REF_TYPE:
					var innerType = type.render;
					type = type.displayName;
					type || (type = innerType.displayName || innerType.name || "", type = "" !== type ? "ForwardRef(" + type + ")" : "ForwardRef");
					return type;
				case REACT_MEMO_TYPE: return innerType = type.displayName || null, null !== innerType ? innerType : getComponentNameFromType(type.type) || "Memo";
				case REACT_LAZY_TYPE:
					innerType = type._payload;
					type = type._init;
					try {
						return getComponentNameFromType(type(innerType));
					} catch (x) {}
			}
			return null;
		}
		function getTaskName(type) {
			if (type === REACT_FRAGMENT_TYPE) return "<>";
			if ("object" === typeof type && null !== type && type.$$typeof === REACT_LAZY_TYPE) return "<...>";
			try {
				var name = getComponentNameFromType(type);
				return name ? "<" + name + ">" : "<...>";
			} catch (x) {
				return "<...>";
			}
		}
		function getOwner() {
			var dispatcher = ReactSharedInternals.A;
			return null === dispatcher ? null : dispatcher.getOwner();
		}
		function UnknownOwner() {
			return Error("react-stack-top-frame");
		}
		function hasValidKey(config) {
			if (hasOwnProperty.call(config, "key")) {
				var getter = Object.getOwnPropertyDescriptor(config, "key").get;
				if (getter && getter.isReactWarning) return !1;
			}
			return void 0 !== config.key;
		}
		function defineKeyPropWarningGetter(props, displayName) {
			function warnAboutAccessingKey() {
				specialPropKeyWarningShown || (specialPropKeyWarningShown = !0, console.error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://react.dev/link/special-props)", displayName));
			}
			warnAboutAccessingKey.isReactWarning = !0;
			Object.defineProperty(props, "key", {
				get: warnAboutAccessingKey,
				configurable: !0
			});
		}
		function elementRefGetterWithDeprecationWarning() {
			var componentName = getComponentNameFromType(this.type);
			didWarnAboutElementRef[componentName] || (didWarnAboutElementRef[componentName] = !0, console.error("Accessing element.ref was removed in React 19. ref is now a regular prop. It will be removed from the JSX Element type in a future release."));
			componentName = this.props.ref;
			return void 0 !== componentName ? componentName : null;
		}
		function ReactElement(type, key, props, owner, debugStack, debugTask) {
			var refProp = props.ref;
			type = {
				$$typeof: REACT_ELEMENT_TYPE,
				type,
				key,
				props,
				_owner: owner
			};
			null !== (void 0 !== refProp ? refProp : null) ? Object.defineProperty(type, "ref", {
				enumerable: !1,
				get: elementRefGetterWithDeprecationWarning
			}) : Object.defineProperty(type, "ref", {
				enumerable: !1,
				value: null
			});
			type._store = {};
			Object.defineProperty(type._store, "validated", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: 0
			});
			Object.defineProperty(type, "_debugInfo", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: null
			});
			Object.defineProperty(type, "_debugStack", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: debugStack
			});
			Object.defineProperty(type, "_debugTask", {
				configurable: !1,
				enumerable: !1,
				writable: !0,
				value: debugTask
			});
			Object.freeze && (Object.freeze(type.props), Object.freeze(type));
			return type;
		}
		function cloneAndReplaceKey(oldElement, newKey) {
			newKey = ReactElement(oldElement.type, newKey, oldElement.props, oldElement._owner, oldElement._debugStack, oldElement._debugTask);
			oldElement._store && (newKey._store.validated = oldElement._store.validated);
			return newKey;
		}
		function validateChildKeys(node) {
			isValidElement(node) ? node._store && (node._store.validated = 1) : "object" === typeof node && null !== node && node.$$typeof === REACT_LAZY_TYPE && ("fulfilled" === node._payload.status ? isValidElement(node._payload.value) && node._payload.value._store && (node._payload.value._store.validated = 1) : node._store && (node._store.validated = 1));
		}
		function isValidElement(object) {
			return "object" === typeof object && null !== object && object.$$typeof === REACT_ELEMENT_TYPE;
		}
		function escape(key) {
			var escaperLookup = {
				"=": "=0",
				":": "=2"
			};
			return "$" + key.replace(/[=:]/g, function(match) {
				return escaperLookup[match];
			});
		}
		function getElementKey(element, index) {
			return "object" === typeof element && null !== element && null != element.key ? (checkKeyStringCoercion(element.key), escape("" + element.key)) : index.toString(36);
		}
		function resolveThenable(thenable) {
			switch (thenable.status) {
				case "fulfilled": return thenable.value;
				case "rejected": throw thenable.reason;
				default: switch ("string" === typeof thenable.status ? thenable.then(noop, noop) : (thenable.status = "pending", thenable.then(function(fulfilledValue) {
					"pending" === thenable.status && (thenable.status = "fulfilled", thenable.value = fulfilledValue);
				}, function(error) {
					"pending" === thenable.status && (thenable.status = "rejected", thenable.reason = error);
				})), thenable.status) {
					case "fulfilled": return thenable.value;
					case "rejected": throw thenable.reason;
				}
			}
			throw thenable;
		}
		function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
			var type = typeof children;
			if ("undefined" === type || "boolean" === type) children = null;
			var invokeCallback = !1;
			if (null === children) invokeCallback = !0;
			else switch (type) {
				case "bigint":
				case "string":
				case "number":
					invokeCallback = !0;
					break;
				case "object": switch (children.$$typeof) {
					case REACT_ELEMENT_TYPE:
					case REACT_PORTAL_TYPE:
						invokeCallback = !0;
						break;
					case REACT_LAZY_TYPE: return invokeCallback = children._init, mapIntoArray(invokeCallback(children._payload), array, escapedPrefix, nameSoFar, callback);
				}
			}
			if (invokeCallback) {
				invokeCallback = children;
				callback = callback(invokeCallback);
				var childKey = "" === nameSoFar ? "." + getElementKey(invokeCallback, 0) : nameSoFar;
				isArrayImpl(callback) ? (escapedPrefix = "", null != childKey && (escapedPrefix = childKey.replace(userProvidedKeyEscapeRegex, "$&/") + "/"), mapIntoArray(callback, array, escapedPrefix, "", function(c) {
					return c;
				})) : null != callback && (isValidElement(callback) && (null != callback.key && (invokeCallback && invokeCallback.key === callback.key || checkKeyStringCoercion(callback.key)), escapedPrefix = cloneAndReplaceKey(callback, escapedPrefix + (null == callback.key || invokeCallback && invokeCallback.key === callback.key ? "" : ("" + callback.key).replace(userProvidedKeyEscapeRegex, "$&/") + "/") + childKey), "" !== nameSoFar && null != invokeCallback && isValidElement(invokeCallback) && null == invokeCallback.key && invokeCallback._store && !invokeCallback._store.validated && (escapedPrefix._store.validated = 2), callback = escapedPrefix), array.push(callback));
				return 1;
			}
			invokeCallback = 0;
			childKey = "" === nameSoFar ? "." : nameSoFar + ":";
			if (isArrayImpl(children)) for (var i = 0; i < children.length; i++) nameSoFar = children[i], type = childKey + getElementKey(nameSoFar, i), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if (i = getIteratorFn(children), "function" === typeof i) for (i === children.entries && (didWarnAboutMaps || console.warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead."), didWarnAboutMaps = !0), children = i.call(children), i = 0; !(nameSoFar = children.next()).done;) nameSoFar = nameSoFar.value, type = childKey + getElementKey(nameSoFar, i++), invokeCallback += mapIntoArray(nameSoFar, array, escapedPrefix, type, callback);
			else if ("object" === type) {
				if ("function" === typeof children.then) return mapIntoArray(resolveThenable(children), array, escapedPrefix, nameSoFar, callback);
				array = String(children);
				throw Error("Objects are not valid as a React child (found: " + ("[object Object]" === array ? "object with keys {" + Object.keys(children).join(", ") + "}" : array) + "). If you meant to render a collection of children, use an array instead.");
			}
			return invokeCallback;
		}
		function mapChildren(children, func, context) {
			if (null == children) return children;
			var result = [], count = 0;
			mapIntoArray(children, result, "", "", function(child) {
				return func.call(context, child, count++);
			});
			return result;
		}
		function lazyInitializer(payload) {
			if (-1 === payload._status) {
				var resolveDebugValue = null, rejectDebugValue = null, ioInfo = payload._ioInfo;
				null != ioInfo && (ioInfo.start = ioInfo.end = performance.now(), ioInfo.value = new Promise(function(resolve, reject) {
					resolveDebugValue = resolve;
					rejectDebugValue = reject;
				}));
				ioInfo = payload._result;
				var thenable = ioInfo();
				thenable.then(function(moduleObject) {
					if (0 === payload._status || -1 === payload._status) {
						payload._status = 1;
						payload._result = moduleObject;
						var _ioInfo = payload._ioInfo;
						if (null != _ioInfo) {
							_ioInfo.end = performance.now();
							var debugValue = null == moduleObject ? void 0 : moduleObject.default;
							resolveDebugValue(debugValue);
							_ioInfo.value.status = "fulfilled";
							_ioInfo.value.value = debugValue;
						}
						void 0 === thenable.status && (thenable.status = "fulfilled", thenable.value = moduleObject);
					}
				}, function(error) {
					if (0 === payload._status || -1 === payload._status) {
						payload._status = 2;
						payload._result = error;
						var _ioInfo2 = payload._ioInfo;
						null != _ioInfo2 && (_ioInfo2.end = performance.now(), _ioInfo2.value.then(noop, noop), rejectDebugValue(error), _ioInfo2.value.status = "rejected", _ioInfo2.value.reason = error);
						void 0 === thenable.status && (thenable.status = "rejected", thenable.reason = error);
					}
				});
				ioInfo = payload._ioInfo;
				if (null != ioInfo) {
					var displayName = thenable.displayName;
					"string" === typeof displayName && (ioInfo.name = displayName);
				}
				-1 === payload._status && (payload._status = 0, payload._result = thenable);
			}
			if (1 === payload._status) return ioInfo = payload._result, void 0 === ioInfo && console.error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", ioInfo), "default" in ioInfo || console.error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", ioInfo), ioInfo.default;
			throw payload._result;
		}
		function resolveDispatcher() {
			var dispatcher = ReactSharedInternals.H;
			null === dispatcher && console.error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://react.dev/link/invalid-hook-call for tips about how to debug and fix this problem.");
			return dispatcher;
		}
		function releaseAsyncTransition() {
			ReactSharedInternals.asyncTransitions--;
		}
		function startTransition(scope) {
			var prevTransition = ReactSharedInternals.T, currentTransition = {};
			currentTransition.types = null !== prevTransition ? prevTransition.types : null;
			currentTransition._updatedFibers = /* @__PURE__ */ new Set();
			ReactSharedInternals.T = currentTransition;
			try {
				var returnValue = scope(), onStartTransitionFinish = ReactSharedInternals.S;
				null !== onStartTransitionFinish && onStartTransitionFinish(currentTransition, returnValue);
				"object" === typeof returnValue && null !== returnValue && "function" === typeof returnValue.then && (ReactSharedInternals.asyncTransitions++, returnValue.then(releaseAsyncTransition, releaseAsyncTransition), returnValue.then(noop, reportGlobalError));
			} catch (error) {
				reportGlobalError(error);
			} finally {
				null === prevTransition && currentTransition._updatedFibers && (scope = currentTransition._updatedFibers.size, currentTransition._updatedFibers.clear(), 10 < scope && console.warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.")), null !== prevTransition && null !== currentTransition.types && (null !== prevTransition.types && prevTransition.types !== currentTransition.types && console.error("We expected inner Transitions to have transferred the outer types set and that you cannot add to the outer Transition while inside the inner.This is a bug in React."), prevTransition.types = currentTransition.types), ReactSharedInternals.T = prevTransition;
			}
		}
		function addTransitionType(type) {
			var transition = ReactSharedInternals.T;
			if (null !== transition) {
				var transitionTypes = transition.types;
				null === transitionTypes ? transition.types = [type] : -1 === transitionTypes.indexOf(type) && transitionTypes.push(type);
			} else 0 === ReactSharedInternals.asyncTransitions && console.error("addTransitionType can only be called inside a `startTransition()` callback. It must be associated with a specific Transition."), startTransition(addTransitionType.bind(null, type));
		}
		function enqueueTask(task) {
			if (null === enqueueTaskImpl) try {
				var requireString = ("require" + Math.random()).slice(0, 7);
				enqueueTaskImpl = (module && module[requireString]).call(module, "timers").setImmediate;
			} catch (_err) {
				enqueueTaskImpl = function(callback) {
					!1 === didWarnAboutMessageChannel && (didWarnAboutMessageChannel = !0, "undefined" === typeof MessageChannel && console.error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning."));
					var channel = new MessageChannel();
					channel.port1.onmessage = callback;
					channel.port2.postMessage(void 0);
				};
			}
			return enqueueTaskImpl(task);
		}
		function aggregateErrors(errors) {
			return 1 < errors.length && "function" === typeof AggregateError ? new AggregateError(errors) : errors[0];
		}
		function popActScope(prevActQueue, prevActScopeDepth) {
			prevActScopeDepth !== actScopeDepth - 1 && console.error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
			actScopeDepth = prevActScopeDepth;
		}
		function recursivelyFlushAsyncActWork(returnValue, resolve, reject) {
			var queue = ReactSharedInternals.actQueue;
			if (null !== queue) if (0 !== queue.length) try {
				flushActQueue(queue);
				enqueueTask(function() {
					return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
				});
				return;
			} catch (error) {
				ReactSharedInternals.thrownErrors.push(error);
			}
			else ReactSharedInternals.actQueue = null;
			0 < ReactSharedInternals.thrownErrors.length ? (queue = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(queue)) : resolve(returnValue);
		}
		function flushActQueue(queue) {
			if (!isFlushing) {
				isFlushing = !0;
				var i = 0;
				try {
					for (; i < queue.length; i++) {
						var callback = queue[i];
						do {
							ReactSharedInternals.didUsePromise = !1;
							var continuation = callback(!1);
							if (null !== continuation) {
								if (ReactSharedInternals.didUsePromise) {
									queue[i] = callback;
									queue.splice(0, i);
									return;
								}
								callback = continuation;
							} else break;
						} while (1);
					}
					queue.length = 0;
				} catch (error) {
					queue.splice(0, i + 1), ReactSharedInternals.thrownErrors.push(error);
				} finally {
					isFlushing = !1;
				}
			}
		}
		"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(Error());
		var REACT_ELEMENT_TYPE = Symbol.for("react.transitional.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_CONSUMER_TYPE = Symbol.for("react.consumer"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_ACTIVITY_TYPE = Symbol.for("react.activity"), REACT_VIEW_TRANSITION_TYPE = Symbol.for("react.view_transition"), MAYBE_ITERATOR_SYMBOL = Symbol.iterator, didWarnStateUpdateForUnmountedComponent = {}, ReactNoopUpdateQueue = {
			isMounted: function() {
				return !1;
			},
			enqueueForceUpdate: function(publicInstance) {
				warnNoop(publicInstance, "forceUpdate");
			},
			enqueueReplaceState: function(publicInstance) {
				warnNoop(publicInstance, "replaceState");
			},
			enqueueSetState: function(publicInstance) {
				warnNoop(publicInstance, "setState");
			}
		}, assign = Object.assign, emptyObject = {};
		Object.freeze(emptyObject);
		Component.prototype.isReactComponent = {};
		Component.prototype.setState = function(partialState, callback) {
			if ("object" !== typeof partialState && "function" !== typeof partialState && null != partialState) throw Error("takes an object of state variables to update or a function which returns an object of state variables.");
			this.updater.enqueueSetState(this, partialState, callback, "setState");
		};
		Component.prototype.forceUpdate = function(callback) {
			this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
		};
		var deprecatedAPIs = {
			isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
			replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
		};
		for (fnName in deprecatedAPIs) deprecatedAPIs.hasOwnProperty(fnName) && defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
		ComponentDummy.prototype = Component.prototype;
		deprecatedAPIs = PureComponent.prototype = new ComponentDummy();
		deprecatedAPIs.constructor = PureComponent;
		assign(deprecatedAPIs, Component.prototype);
		deprecatedAPIs.isPureReactComponent = !0;
		var isArrayImpl = Array.isArray, REACT_CLIENT_REFERENCE = Symbol.for("react.client.reference"), ReactSharedInternals = {
			H: null,
			A: null,
			T: null,
			S: null,
			actQueue: null,
			asyncTransitions: 0,
			isBatchingLegacy: !1,
			didScheduleLegacyUpdate: !1,
			didUsePromise: !1,
			thrownErrors: [],
			getCurrentStack: null,
			recentlyCreatedOwnerStacks: 0
		}, hasOwnProperty = Object.prototype.hasOwnProperty, createTask = console.createTask ? console.createTask : function() {
			return null;
		};
		deprecatedAPIs = { react_stack_bottom_frame: function(callStackForError) {
			return callStackForError();
		} };
		var specialPropKeyWarningShown, didWarnAboutOldJSXRuntime;
		var didWarnAboutElementRef = {};
		var unknownOwnerDebugStack = deprecatedAPIs.react_stack_bottom_frame.bind(deprecatedAPIs, UnknownOwner)();
		var unknownOwnerDebugTask = createTask(getTaskName(UnknownOwner));
		var didWarnAboutMaps = !1, userProvidedKeyEscapeRegex = /\/+/g, reportGlobalError = "function" === typeof reportError ? reportError : function(error) {
			if ("object" === typeof window && "function" === typeof window.ErrorEvent) {
				var event = new window.ErrorEvent("error", {
					bubbles: !0,
					cancelable: !0,
					message: "object" === typeof error && null !== error && "string" === typeof error.message ? String(error.message) : String(error),
					error
				});
				if (!window.dispatchEvent(event)) return;
			} else if ("object" === typeof process && "function" === typeof process.emit) {
				process.emit("uncaughtException", error);
				return;
			}
			console.error(error);
		}, didWarnAboutMessageChannel = !1, enqueueTaskImpl = null, actScopeDepth = 0, didWarnNoAwaitAct = !1, isFlushing = !1, queueSeveralMicrotasks = "function" === typeof queueMicrotask ? function(callback) {
			queueMicrotask(function() {
				return queueMicrotask(callback);
			});
		} : enqueueTask;
		deprecatedAPIs = Object.freeze({
			__proto__: null,
			c: function(size) {
				return resolveDispatcher().useMemoCache(size);
			}
		});
		var fnName = {
			map: mapChildren,
			forEach: function(children, forEachFunc, forEachContext) {
				mapChildren(children, function() {
					forEachFunc.apply(this, arguments);
				}, forEachContext);
			},
			count: function(children) {
				var n = 0;
				mapChildren(children, function() {
					n++;
				});
				return n;
			},
			toArray: function(children) {
				return mapChildren(children, function(child) {
					return child;
				}) || [];
			},
			only: function(children) {
				if (!isValidElement(children)) throw Error("React.Children.only expected to receive a single React element child.");
				return children;
			}
		};
		exports.Activity = REACT_ACTIVITY_TYPE;
		exports.Children = fnName;
		exports.Component = Component;
		exports.Fragment = REACT_FRAGMENT_TYPE;
		exports.Profiler = REACT_PROFILER_TYPE;
		exports.PureComponent = PureComponent;
		exports.StrictMode = REACT_STRICT_MODE_TYPE;
		exports.Suspense = REACT_SUSPENSE_TYPE;
		exports.ViewTransition = REACT_VIEW_TRANSITION_TYPE;
		exports.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE = ReactSharedInternals;
		exports.__COMPILER_RUNTIME = deprecatedAPIs;
		exports.act = function(callback) {
			var prevActQueue = ReactSharedInternals.actQueue, prevActScopeDepth = actScopeDepth;
			actScopeDepth++;
			var queue = ReactSharedInternals.actQueue = null !== prevActQueue ? prevActQueue : [], didAwaitActCall = !1;
			try {
				var result = callback();
			} catch (error) {
				ReactSharedInternals.thrownErrors.push(error);
			}
			if (0 < ReactSharedInternals.thrownErrors.length) throw popActScope(prevActQueue, prevActScopeDepth), callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
			if (null !== result && "object" === typeof result && "function" === typeof result.then) {
				var thenable = result;
				queueSeveralMicrotasks(function() {
					didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = !0, console.error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);"));
				});
				return { then: function(resolve, reject) {
					didAwaitActCall = !0;
					thenable.then(function(returnValue) {
						popActScope(prevActQueue, prevActScopeDepth);
						if (0 === prevActScopeDepth) {
							try {
								flushActQueue(queue), enqueueTask(function() {
									return recursivelyFlushAsyncActWork(returnValue, resolve, reject);
								});
							} catch (error$0) {
								ReactSharedInternals.thrownErrors.push(error$0);
							}
							if (0 < ReactSharedInternals.thrownErrors.length) {
								var _thrownError = aggregateErrors(ReactSharedInternals.thrownErrors);
								ReactSharedInternals.thrownErrors.length = 0;
								reject(_thrownError);
							}
						} else resolve(returnValue);
					}, function(error) {
						popActScope(prevActQueue, prevActScopeDepth);
						0 < ReactSharedInternals.thrownErrors.length ? (error = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, reject(error)) : reject(error);
					});
				} };
			}
			var returnValue$jscomp$0 = result;
			popActScope(prevActQueue, prevActScopeDepth);
			0 === prevActScopeDepth && (flushActQueue(queue), 0 !== queue.length && queueSeveralMicrotasks(function() {
				didAwaitActCall || didWarnNoAwaitAct || (didWarnNoAwaitAct = !0, console.error("A component suspended inside an `act` scope, but the `act` call was not awaited. When testing React components that depend on asynchronous data, you must await the result:\n\nawait act(() => ...)"));
			}), ReactSharedInternals.actQueue = null);
			if (0 < ReactSharedInternals.thrownErrors.length) throw callback = aggregateErrors(ReactSharedInternals.thrownErrors), ReactSharedInternals.thrownErrors.length = 0, callback;
			return { then: function(resolve, reject) {
				didAwaitActCall = !0;
				0 === prevActScopeDepth ? (ReactSharedInternals.actQueue = queue, enqueueTask(function() {
					return recursivelyFlushAsyncActWork(returnValue$jscomp$0, resolve, reject);
				})) : resolve(returnValue$jscomp$0);
			} };
		};
		exports.addTransitionType = addTransitionType;
		exports.cache = function(fn) {
			return function() {
				return fn.apply(null, arguments);
			};
		};
		exports.cacheSignal = function() {
			return null;
		};
		exports.captureOwnerStack = function() {
			var getCurrentStack = ReactSharedInternals.getCurrentStack;
			return null === getCurrentStack ? null : getCurrentStack();
		};
		exports.cloneElement = function(element, config, children) {
			if (null === element || void 0 === element) throw Error("The argument must be a React element, but you passed " + element + ".");
			var props = assign({}, element.props), key = element.key, owner = element._owner;
			if (null != config) {
				var JSCompiler_inline_result;
				a: {
					if (hasOwnProperty.call(config, "ref") && (JSCompiler_inline_result = Object.getOwnPropertyDescriptor(config, "ref").get) && JSCompiler_inline_result.isReactWarning) {
						JSCompiler_inline_result = !1;
						break a;
					}
					JSCompiler_inline_result = void 0 !== config.ref;
				}
				JSCompiler_inline_result && (owner = getOwner());
				hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key);
				for (propName in config) !hasOwnProperty.call(config, propName) || "key" === propName || "__self" === propName || "__source" === propName || "ref" === propName && void 0 === config.ref || (props[propName] = config[propName]);
			}
			var propName = arguments.length - 2;
			if (1 === propName) props.children = children;
			else if (1 < propName) {
				JSCompiler_inline_result = Array(propName);
				for (var i = 0; i < propName; i++) JSCompiler_inline_result[i] = arguments[i + 2];
				props.children = JSCompiler_inline_result;
			}
			props = ReactElement(element.type, key, props, owner, element._debugStack, element._debugTask);
			for (key = 2; key < arguments.length; key++) validateChildKeys(arguments[key]);
			return props;
		};
		exports.createContext = function(defaultValue) {
			defaultValue = {
				$$typeof: REACT_CONTEXT_TYPE,
				_currentValue: defaultValue,
				_currentValue2: defaultValue,
				_threadCount: 0,
				Provider: null,
				Consumer: null
			};
			defaultValue.Provider = defaultValue;
			defaultValue.Consumer = {
				$$typeof: REACT_CONSUMER_TYPE,
				_context: defaultValue
			};
			defaultValue._currentRenderer = null;
			defaultValue._currentRenderer2 = null;
			return defaultValue;
		};
		exports.createElement = function(type, config, children) {
			for (var i = 2; i < arguments.length; i++) validateChildKeys(arguments[i]);
			var propName;
			i = {};
			var key = null;
			if (null != config) for (propName in didWarnAboutOldJSXRuntime || !("__self" in config) || "key" in config || (didWarnAboutOldJSXRuntime = !0, console.warn("Your app (or one of its dependencies) is using an outdated JSX transform. Update to the modern JSX transform for faster performance: https://react.dev/link/new-jsx-transform")), hasValidKey(config) && (checkKeyStringCoercion(config.key), key = "" + config.key), config) hasOwnProperty.call(config, propName) && "key" !== propName && "__self" !== propName && "__source" !== propName && (i[propName] = config[propName]);
			var childrenLength = arguments.length - 2;
			if (1 === childrenLength) i.children = children;
			else if (1 < childrenLength) {
				for (var childArray = Array(childrenLength), _i = 0; _i < childrenLength; _i++) childArray[_i] = arguments[_i + 2];
				Object.freeze && Object.freeze(childArray);
				i.children = childArray;
			}
			if (type && type.defaultProps) for (propName in childrenLength = type.defaultProps, childrenLength) void 0 === i[propName] && (i[propName] = childrenLength[propName]);
			key && defineKeyPropWarningGetter(i, "function" === typeof type ? type.displayName || type.name || "Unknown" : type);
			(propName = 1e4 > ReactSharedInternals.recentlyCreatedOwnerStacks++) ? (childArray = Error.stackTraceLimit, Error.stackTraceLimit = 10, childrenLength = Error("react-stack-top-frame"), Error.stackTraceLimit = childArray) : childrenLength = unknownOwnerDebugStack;
			return ReactElement(type, key, i, getOwner(), childrenLength, propName ? createTask(getTaskName(type)) : unknownOwnerDebugTask);
		};
		exports.createRef = function() {
			var refObject = { current: null };
			Object.seal(refObject);
			return refObject;
		};
		exports.forwardRef = function(render) {
			null != render && render.$$typeof === REACT_MEMO_TYPE ? console.error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).") : "function" !== typeof render ? console.error("forwardRef requires a render function but was given %s.", null === render ? "null" : typeof render) : 0 !== render.length && 2 !== render.length && console.error("forwardRef render functions accept exactly two parameters: props and ref. %s", 1 === render.length ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
			null != render && null != render.defaultProps && console.error("forwardRef render functions do not support defaultProps. Did you accidentally pass a React component?");
			var elementType = {
				$$typeof: REACT_FORWARD_REF_TYPE,
				render
			}, ownName;
			Object.defineProperty(elementType, "displayName", {
				enumerable: !1,
				configurable: !0,
				get: function() {
					return ownName;
				},
				set: function(name) {
					ownName = name;
					render.name || render.displayName || (Object.defineProperty(render, "name", { value: name }), render.displayName = name);
				}
			});
			return elementType;
		};
		exports.isValidElement = isValidElement;
		exports.lazy = function(ctor) {
			ctor = {
				_status: -1,
				_result: ctor
			};
			var lazyType = {
				$$typeof: REACT_LAZY_TYPE,
				_payload: ctor,
				_init: lazyInitializer
			}, ioInfo = {
				name: "lazy",
				start: -1,
				end: -1,
				value: null,
				owner: null,
				debugStack: Error("react-stack-top-frame"),
				debugTask: console.createTask ? console.createTask("lazy()") : null
			};
			ctor._ioInfo = ioInfo;
			lazyType._debugInfo = [{ awaited: ioInfo }];
			return lazyType;
		};
		exports.memo = function(type, compare) {
			type ?? console.error("memo: The first argument must be a component. Instead received: %s", null === type ? "null" : typeof type);
			compare = {
				$$typeof: REACT_MEMO_TYPE,
				type,
				compare: void 0 === compare ? null : compare
			};
			var ownName;
			Object.defineProperty(compare, "displayName", {
				enumerable: !1,
				configurable: !0,
				get: function() {
					return ownName;
				},
				set: function(name) {
					ownName = name;
					type.name || type.displayName || (Object.defineProperty(type, "name", { value: name }), type.displayName = name);
				}
			});
			return compare;
		};
		exports.startTransition = startTransition;
		exports.unstable_useCacheRefresh = function() {
			return resolveDispatcher().useCacheRefresh();
		};
		exports.use = function(usable) {
			return resolveDispatcher().use(usable);
		};
		exports.useActionState = function(action, initialState, permalink) {
			return resolveDispatcher().useActionState(action, initialState, permalink);
		};
		exports.useCallback = function(callback, deps) {
			return resolveDispatcher().useCallback(callback, deps);
		};
		exports.useContext = function(Context) {
			var dispatcher = resolveDispatcher();
			Context.$$typeof === REACT_CONSUMER_TYPE && console.error("Calling useContext(Context.Consumer) is not supported and will cause bugs. Did you mean to call useContext(Context) instead?");
			return dispatcher.useContext(Context);
		};
		exports.useDebugValue = function(value, formatterFn) {
			return resolveDispatcher().useDebugValue(value, formatterFn);
		};
		exports.useDeferredValue = function(value, initialValue) {
			return resolveDispatcher().useDeferredValue(value, initialValue);
		};
		exports.useEffect = function(create, deps) {
			create ?? console.warn("React Hook useEffect requires an effect callback. Did you forget to pass a callback to the hook?");
			return resolveDispatcher().useEffect(create, deps);
		};
		exports.useEffectEvent = function(callback) {
			return resolveDispatcher().useEffectEvent(callback);
		};
		exports.useId = function() {
			return resolveDispatcher().useId();
		};
		exports.useImperativeHandle = function(ref, create, deps) {
			return resolveDispatcher().useImperativeHandle(ref, create, deps);
		};
		exports.useInsertionEffect = function(create, deps) {
			create ?? console.warn("React Hook useInsertionEffect requires an effect callback. Did you forget to pass a callback to the hook?");
			return resolveDispatcher().useInsertionEffect(create, deps);
		};
		exports.useLayoutEffect = function(create, deps) {
			create ?? console.warn("React Hook useLayoutEffect requires an effect callback. Did you forget to pass a callback to the hook?");
			return resolveDispatcher().useLayoutEffect(create, deps);
		};
		exports.useMemo = function(create, deps) {
			return resolveDispatcher().useMemo(create, deps);
		};
		exports.useOptimistic = function(passthrough, reducer) {
			return resolveDispatcher().useOptimistic(passthrough, reducer);
		};
		exports.useReducer = function(reducer, initialArg, init) {
			return resolveDispatcher().useReducer(reducer, initialArg, init);
		};
		exports.useRef = function(initialValue) {
			return resolveDispatcher().useRef(initialValue);
		};
		exports.useState = function(initialState) {
			return resolveDispatcher().useState(initialState);
		};
		exports.useSyncExternalStore = function(subscribe, getSnapshot, getServerSnapshot) {
			return resolveDispatcher().useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
		};
		exports.useTransition = function() {
			return resolveDispatcher().useTransition();
		};
		exports.version = "19.3.1";
		"undefined" !== typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ && "function" === typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop && __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(Error());
	})();
}));
// src/i18n/messages/en.ts
var import_react = (/* @__PURE__ */ __commonJSMin(((exports, module) => {
	if (process.env.NODE_ENV === "production") module.exports = require_react_production();
	else module.exports = require_react_development();
})))();
// src/i18n/catalogues.ts
/** One dictionary per language. English is complete; every other language may omit keys and falls back to English. */
var CATALOGUES = {
	en: {
		"app.title": "BUSW Website Builder (early preview)",
		"app.loading": "Loading…",
		"lang.switcher": "Interface language",
		"common.close": "Close",
		"common.back": "Back",
		"common.next": "Next",
		"common.dismiss": "Dismiss",
		"common.remove": "Remove",
		"common.undo": "Undo",
		"common.redo": "Redo",
		"common.untitledPage": "Untitled page",
		"common.notEntered": "Not entered",
		"common.notChosen": "Not chosen",
		"common.required": "(required)",
		"wizard.brandTag": "Early preview",
		"wizard.skip": "Skip to content",
		"wizard.stepsNav": "Steps",
		"wizard.goToStep": "Go to step",
		"wizard.needsAttentionDetail": " (needs attention: {issue})",
		"wizard.stepOption": "{n}. {label}",
		"wizard.stepOptionAttention": "{n}. {label} (needs attention)",
		"wizard.stepNav": "Step navigation",
		"wizard.backTo": "← Back: {label}",
		"wizard.back": "← Back",
		"wizard.nextTo": "Next: {label} →",
		"wizard.restored": "Welcome back. Your draft was restored from this device, so you can carry on where you left off.",
		"wizard.unreadable": "Your saved draft could not be opened ({detail}). It has been left untouched until you change something.",
		"wizard.estimate": "Estimate",
		"wizard.chooseCountry": "Choose country",
		"wizard.needsTemplate.title": "Choose a template first",
		"wizard.needsTemplate.edit": "There is nothing to edit yet. Pick a template, or start from a blank page, and your design will appear here.",
		"wizard.needsTemplate.preview": "There is nothing to preview yet. Pick a template, or start from a blank page, and your design will appear here.",
		"wizard.needsTemplate.button": "Choose a template",
		"wizard.save.saved": "Draft saved on this device",
		"wizard.save.saving": "Saving draft…",
		"wizard.save.error": "Could not save a draft on this device",
		"step.eyebrow": "Step {n} of {total}",
		"step.start": "Country and template",
		"step.design": "Design",
		"step.preview": "Preview",
		"step.addons": "Add-ons and estimate",
		"step.details": "Your details",
		"step.review": "Review and submit",
		"issue.start.both": "Choose a business country and a template.",
		"issue.start.country": "Choose a business country.",
		"issue.start.template": "Choose a template.",
		"issue.addons.languageName": "Give each additional language a name.",
		"issue.details.many": "{count} details need fixing.",
		"field.businessName": "Business name",
		"field.contactName": "Contact name",
		"field.email": "Email",
		"field.notes": "Project notes",
		"validation.businessName.required": "Enter your business name.",
		"validation.contactName.required": "Enter the name of the person we should contact.",
		"validation.email.required": "Enter an email address so BUSW can reply.",
		"validation.email.invalid": "Enter a valid email address, such as name@example.com.",
		"validation.tooLong": "Use {max} characters or fewer.",
		"start.title": "Start your website",
		"start.lede": "Choose your country and a template, edit it, preview it, pick any extras, and send it to BUSW. BUSW reviews your design and confirms the scope and price with you before any work begins.",
		"start.savedHint": "Your work is saved automatically on this device, in this browser only. Use “Save project file” in the Design step for a backup.",
		"start.countryHeading": "Where is your business based?",
		"start.countryLabel": "Business country",
		"start.countryPlaceholder": "Choose a country…",
		"start.countryRequired": "Choose a country to continue.",
		"start.regionHint": "Your country decides which price list and currency apply. It never changes your design.",
		"start.regionNote": "Prices will be shown in {currency} ({label} price list). You can change the country at any time and your design stays exactly as it is.",
		"start.templatesHeading": "Choose a template",
		"start.otherHeading": "Other ways to start",
		"start.keepBlank": "Keep my blank page",
		"start.startBlank": "Start from a blank page",
		"start.openFile": "Open a project file",
		"start.confirmReplace": "This replaces your current design with a new one. Your country and contact details are kept. Continue?",
		"start.confirmOpenFile": "Opening a project file replaces your current project, including its country and details. Continue?",
		"start.fileError": "Could not open that file. {reason}",
		"start.fileTooLarge": "That file is too large to be a project.",
		"start.fileNotProject": "That file is not a BUSW Website Builder project.",
		"template.studio.name": "Studio",
		"template.studio.description": "A bold intro, a gallery of your work, a short about section and a way to get in touch.",
		"template.local-business.name": "Local business",
		"template.local-business.description": "Services, a short story, and your address and opening details up front.",
		"template.personal.name": "Personal page",
		"template.personal.description": "A calm single page to introduce yourself, share what you do and invite contact.",
		"template.previewTitle": "{name} template preview",
		"template.selected": "Selected",
		"template.summary": "{pages} page, {sections} sections · {palette} colours",
		"template.keep": "Keep {name}",
		"template.use": "Use {name}",
		"template.notChosen": "Not chosen",
		"template.blank": "Blank page",
		"template.custom": "Custom design",
		"palette.paper": "Paper",
		"palette.ink": "Ink",
		"palette.sand": "Sand",
		"palette.forest": "Forest",
		"font.system": "Modern sans",
		"font.humanist": "Humanist sans",
		"font.serif": "Classic serif",
		"section.hero.label": "Hero",
		"section.hero.description": "Headline, short description, a button and an image.",
		"section.textImage.label": "Text and image",
		"section.textImage.description": "A heading and paragraphs next to a picture.",
		"section.features.label": "Feature cards",
		"section.features.description": "A row of short cards, for services or highlights.",
		"section.gallery.label": "Image gallery",
		"section.gallery.description": "A grid of pictures with optional captions.",
		"section.contact.label": "Contact",
		"section.contact.description": "Email, phone and address. No form: visitors use your email link.",
		"region.us.label": "United States",
		"region.tr.label": "Türkiye",
		"region.intl.label": "All other countries",
		"editor.title": "Design your website",
		"editor.undoRedo": "Undo and redo",
		"editor.previewWidth": "Preview width",
		"editor.saveFile": "Save project file",
		"editor.sidebar": "Pages and sections",
		"editor.properties": "Properties",
		"editor.canvasLabel": "Editable preview of {title}",
		"device.desktop": "Desktop",
		"device.tablet": "Tablet",
		"device.phone": "Phone",
		"device.mobile": "Mobile",
		"canvas.frameEditable": "Editable preview of {title}, {device} width",
		"canvas.frameReadOnly": "Read-only preview of {title}, {device} width",
		"canvas.thePage": "the page",
		"canvas.imagePlaceholder": "Image placeholder. Choose an image in the panel on the right.",
		"canvas.ph.siteName": "Site name",
		"canvas.ph.link": "Link",
		"canvas.ph.footerText": "Footer text",
		"canvas.ph.headline": "Headline",
		"canvas.ph.shortDescription": "Short description",
		"canvas.ph.buttonLabel": "Button label",
		"canvas.ph.heading": "Heading",
		"canvas.ph.body": "Write your text here. Leave a blank line between paragraphs.",
		"canvas.ph.intro": "Short introduction",
		"canvas.ph.title": "Title",
		"canvas.ph.description": "Description",
		"canvas.ph.caption": "Caption",
		"canvas.ph.shortText": "Short text",
		"canvas.ph.email": "Email",
		"canvas.ph.phone": "Phone",
		"canvas.ph.address": "Address",
		"list.pages": "Pages",
		"list.homePage": "Home page",
		"list.sections_one": "{count} section",
		"list.sections_other": "{count} sections",
		"list.pageActions": "{title} page actions",
		"list.movePageUp": "Move page up",
		"list.movePageDown": "Move page down",
		"list.deletePage": "Delete page",
		"list.deletePageTitle": "Delete page (you can undo)",
		"list.addPage": "+ Add a page",
		"list.contentOf": "Content of {title}",
		"list.thisPage": "this page",
		"list.onThisPage": "On this page",
		"list.pageSettings": "Page settings",
		"list.pageSettingsDetail": "Title, address, options",
		"list.siteSettings": "Site settings",
		"list.siteSettingsDetail": "Title, colours, font",
		"list.header": "Header",
		"list.footer": "Footer",
		"list.addHeader": "+ Add header",
		"list.addFooter": "+ Add footer",
		"list.sectionActions": "{label} actions",
		"list.moveUp": "Move up",
		"list.moveDown": "Move down",
		"list.duplicate": "Duplicate",
		"list.delete": "Delete",
		"list.deleteTitle": "Delete (you can undo)",
		"list.addSection": "Add a section",
		"inspector.homeSettings": "Home page settings",
		"inspector.pageSettings": "Page settings",
		"inspector.pageTitle": "Page title",
		"inspector.pageTitleHint": "Used for the menu and the browser tab.",
		"inspector.pageAddress": "Page address",
		"inspector.homeAddressHint": "The home page always uses this address.",
		"inspector.pageAddressHint": "This page will be {slug}.html. Lowercase letters, numbers and hyphens.",
		"inspector.pageDescription": "Page description",
		"inspector.pageDescriptionHint": "Shown under the page title in search results.",
		"inspector.options": "Options",
		"inspector.homeCustomHint": "A custom redesign of the home page is a quote request. You can ask for one in the Add-ons step.",
		"inspector.customLayout": "Custom page layout",
		"inspector.customHint": "BUSW designs this page's layout instead of using the selected design.",
		"inspector.customHintPrice": " It replaces the additional-page price ({pagePrice}) with {customPrice}. The two are never added together.",
		"inspector.copywriting": "BUSW writes the text for this page",
		"inspector.copywritingHint": "Copywriting: up to 500 words per page, with one revision.",
		"inspector.copywritingPrice": " {price} per page.",
		"inspector.sections": "Sections",
		"inspector.sectionCount_one": "This page has {count} section. {included} are included on every page.",
		"inspector.sectionCount_other": "This page has {count} sections. {included} are included on every page.",
		"inspector.extraSections_one": " {count} extra section is added to the estimate.",
		"inspector.extraSections_other": " {count} extra sections are added to the estimate.",
		"inspector.extraSectionsPrice_one": " {count} extra section is added to the estimate at {price}.",
		"inspector.extraSectionsPrice_other": " {count} extra sections are added to the estimate at {price} each.",
		"inspector.deletePage": "Delete this page",
		"inspector.canUndo": "You can undo this.",
		"inspector.siteSettings": "Site settings",
		"inspector.siteHint": "Select a block in the list or in the preview to edit it. Text can be edited directly in the preview.",
		"inspector.siteTitle": "Site title",
		"inspector.siteTitleHint": "Shown in the browser tab and search results.",
		"inspector.siteDescription": "Short description",
		"inspector.siteDescriptionHint": "Used by search engines and when the link is shared.",
		"inspector.siteLang": "Website language code",
		"inspector.siteLangHint": "The language your website is written in, for example en, de, fr or tr. Helps screen readers pronounce your text. It does not change the language of this builder.",
		"inspector.colours": "Colours",
		"inspector.font": "Font",
		"inspector.fontHint": "Fonts are already on your visitors' devices, so nothing is downloaded.",
		"inspector.addHeader": "Add header",
		"inspector.addFooter": "Add footer",
		"inspector.header": "Header",
		"inspector.siteName": "Site name",
		"inspector.menuLinks": "Menu links",
		"inspector.linkText": "Link {n} text",
		"inspector.linkAddress": "Link {n} address",
		"inspector.linkPlaceholder": "#about or https://…",
		"inspector.linkHint": "Use a page address like about.html, #name to jump to a section, or a full web address.",
		"inspector.removeLink": "Remove link {n}",
		"inspector.addLink": "Add menu link",
		"inspector.removeHeader": "Remove header",
		"inspector.footer": "Footer",
		"inspector.footerText": "Footer text",
		"inspector.removeFooter": "Remove footer",
		"inspector.anchorLabel": "Link name (optional)",
		"inspector.anchorHint": "Lets menu links and buttons jump here, using #{anchor}. Lowercase letters, numbers and hyphens.",
		"inspector.anchorInvalid": "Use lowercase letters, numbers and hyphens, starting with a letter.",
		"inspector.anchorName": "name",
		"inspector.headline": "Headline",
		"inspector.description": "Description",
		"inspector.buttonText": "Button text",
		"inspector.buttonTextHint": "Leave empty for no button.",
		"inspector.buttonAddress": "Button address",
		"inspector.buttonPlaceholder": "#contact or https://…",
		"inspector.image": "Image",
		"inspector.heading": "Heading",
		"inspector.text": "Text",
		"inspector.textHint": "Leave a blank line between paragraphs.",
		"inspector.imagePosition": "Image position",
		"inspector.right": "Right",
		"inspector.left": "Left",
		"inspector.introduction": "Introduction",
		"inspector.cards": "Cards",
		"inspector.cardTitle": "Card {n} title",
		"inspector.cardText": "Card {n} text",
		"inspector.removeCard": "Remove card {n}",
		"inspector.addCard": "Add card",
		"inspector.pictures": "Pictures",
		"inspector.picture": "Picture {n}",
		"inspector.pictureCaption": "Picture {n} caption",
		"inspector.removePicture": "Remove picture {n}",
		"inspector.addPicture": "Add picture",
		"inspector.contactEmail": "Email",
		"inspector.contactEmailHint": "Becomes a link visitors can click to write to you. There is no contact form.",
		"inspector.phone": "Phone",
		"inspector.address": "Address",
		"control.imageNone": "No image chosen. Empty image slots are left out of the finished site.",
		"control.processing": "Processing…",
		"control.replaceImage": "Replace image",
		"control.chooseImage": "Choose image",
		"control.alt": "Image description (alt text)",
		"control.altNeeded": "Describe the image for people who cannot see it, or mark it decorative.",
		"control.altHint": "Describe what the image shows. Screen readers read this aloud.",
		"control.decorative": "This image is decorative (no description needed)",
		"control.fewer": "Fewer {unit}",
		"control.more": "More {unit}",
		"image.badType": "Choose a JPEG, PNG or WebP image.",
		"image.tooLarge": "That image is larger than 25 MB. Choose a smaller one.",
		"image.unreadable": "That image could not be read. It may be damaged.",
		"image.noCanvas": "Your browser could not process that image.",
		"image.stillTooLarge": "That image is still too large after shrinking. Try a smaller one.",
		"preview.title": "Preview your site",
		"preview.lede": "This is your design as visitors will see it, on a desktop and on a phone. Links work between your pages. Add-ons you select later are delivered by BUSW and do not appear here.",
		"preview.toolbar": "Preview options",
		"preview.page": "Page",
		"preview.screenSize": "Screen size",
		"preview.backToEditing": "Back to editing",
		"preview.checkHeading": "Design check",
		"preview.checkBody": "Things worth fixing before you send your design to BUSW. They never stop you from sending it.",
		"preview.noProblems": "No problems found.",
		"warn.noTitle": "The site has no title. Add one in Site settings.",
		"warn.noHeading": "The page \"{page}\" has no section with a heading, so it has no main title.",
		"warn.emptyImages_one": "{count} empty image slot is left out of the finished site.",
		"warn.emptyImages_other": "{count} empty image slots are left out of the finished site.",
		"warn.noAlt_one": "{count} image has no description. Add one, or mark it decorative.",
		"warn.noAlt_other": "{count} images have no description. Add one, or mark them decorative.",
		"warn.menuInvalid": "The menu link \"{label}\" has no valid address and is left out.",
		"warn.menuMissing": "The menu link \"{label}\" points to {href}, which does not exist.",
		"warn.buttonInvalid": "The button \"{label}\" has no valid address and is left out.",
		"warn.buttonMissing": "The button \"{label}\" points to {href}, which does not exist on its page.",
		"warn.badEmail": "\"{email}\" does not look like an email address, so it will not be a link.",
		"addons.title": "Add-ons and estimate",
		"addons.lede": "Your design sets the base price. Choose anything extra you want BUSW to deliver. Selecting an add-on records the work you are asking for. It does not add that feature to your preview.",
		"addons.noRegion": "Prices are hidden until you choose your business country, because it decides the price list and currency.",
		"addons.chooseCountry": "Choose country",
		"addons.countedHeading": "Counted from your design",
		"addons.countedHint": "These are calculated automatically, so there is nothing to enter twice.",
		"addons.baseWebsite": "Base website",
		"addons.baseWebsiteValue": "1 home page with up to {sections} sections",
		"addons.additionalPages": "Additional pages",
		"addons.customLayouts": "Custom page layouts",
		"addons.extraSectionsLabel": "Sections beyond {included} on a page",
		"addons.copywritingPages": "Pages BUSW writes the text for",
		"addons.customReplaces": "A custom layout replaces the additional-page price for that page. They are never charged together.",
		"addons.changePages": "Change pages or sections",
		"addons.contentHeading": "Content and media",
		"addons.batchesLabel": "Batches: {scope}",
		"addons.galleriesLabel": "Galleries: {scope}",
		"addons.galleryNudge": " Your design has a gallery section. Add this if you want a full photo gallery.",
		"addons.pagesLabel": "Pages: {scope}",
		"addons.unit.batches": "image batches",
		"addons.unit.galleries": "galleries",
		"addons.unit.migrate": "pages to migrate",
		"addons.unit.rounds": "revision rounds",
		"addons.unit.pages": "pages",
		"addons.featuresHeading": "Features",
		"addons.contactFormNote": "Your base website already includes one standard contact form. The preview shows your contact details only.",
		"addons.languagesHeading": "Additional languages",
		"addons.languagesScope": "These are languages for your website. They do not change the language of this builder.",
		"addons.languagesPrice": "{setup} setup for each language, plus {page} for each page translated into it.",
		"addons.supplyTranslations": "You supply the translations.",
		"addons.languageN": "Language {n}",
		"addons.languagePlaceholder": "For example German",
		"addons.translateAll_one": "Translate all {count} page",
		"addons.translateAll_other": "Translate all {count} pages",
		"addons.pagesToTranslate": "Pages to translate into {language}",
		"addons.languageFallback": "language {n}",
		"addons.removeLanguage": "Remove language {n}",
		"addons.addLanguage": "Add a language",
		"addons.supportHeading": "Revisions and support",
		"addons.revisionsHint": "Two consolidated rounds are included. Rounds: {scope}",
		"addons.hostingLegend": "Hosting and website care (optional, billed monthly)",
		"addons.hostingHint": "Neither is needed to submit your website. You can choose one, not both.",
		"addons.hosting.none": "No hosting from BUSW",
		"addons.hosting.noneHint": "I will arrange hosting myself, or decide later.",
		"addons.perMonthSuffix": ": {price} per month",
		"addons.priced": "{name} ({price} per {unit})",
		"addons.pricedMonthly": "{name} ({price} per month)",
		"addons.quoteHeading": "Request a quote",
		"addons.quoteHint": "BUSW does not price these automatically. Ticking one asks BUSW for a quote. It adds nothing to your estimate, and the totals will say they exclude it.",
		"addons.asideLabel": "Estimate",
		"addons.itemAdvanced": "Advanced inquiry form",
		"addons.itemBooking": "Booking integration",
		"addons.itemBlog": "Blog/CMS setup",
		"addons.itemAnalytics": "Analytics setup",
		"addons.itemEmail": "Business email setup",
		"addons.itemImagePrep": "Image preparation",
		"addons.itemGallery": "Photo gallery",
		"addons.itemMigration": "Content migration",
		"addons.itemRevisions": "Additional revision rounds",
		"selection.gallery": "Photo gallery × {count}",
		"selection.imagePrep": "Image preparation × {count} batches",
		"selection.migration": "Content migration × {count} pages",
		"selection.revisions": "Additional revision rounds × {count}",
		"selection.language": "Additional language: {name} ({scope})",
		"selection.languageUnnamed": "(unnamed)",
		"selection.allPages": "all pages",
		"selection.nPages": "{count} pages",
		"selection.hostingMonthly": "Managed static-site hosting (monthly)",
		"selection.careMonthly": "Website care including hosting (monthly)",
		"catalogue.base-website.label": "Base website",
		"catalogue.base-website.unit": "website",
		"catalogue.base-website.scope": "One template-based page with up to six sections, your text and images, responsive desktop and mobile layouts, one standard contact form, basic page titles and descriptions, deployment to one hosting account, and two consolidated revision rounds. Mobile support, HTTPS, basic accessibility and correction of defects in delivered work are included.",
		"catalogue.additional-page.label": "Additional page",
		"catalogue.additional-page.unit": "page",
		"catalogue.additional-page.scope": "Up to six sections using the selected design.",
		"catalogue.additional-section.label": "Additional section",
		"catalogue.additional-section.unit": "section",
		"catalogue.additional-section.scope": "A section beyond the six included on each standard page.",
		"catalogue.custom-page-layout.label": "Custom page layout",
		"catalogue.custom-page-layout.unit": "page",
		"catalogue.custom-page-layout.scope": "Replaces the additional-page charge for that page. It is never charged together with it.",
		"catalogue.copywriting-page.label": "Copywriting",
		"catalogue.copywriting-page.unit": "page",
		"catalogue.copywriting-page.scope": "Up to 500 words per page, with one revision.",
		"catalogue.image-preparation-batch.label": "Image preparation",
		"catalogue.image-preparation-batch.unit": "batch",
		"catalogue.image-preparation-batch.scope": "Up to 20 supplied images per batch.",
		"catalogue.photo-gallery.label": "Photo gallery",
		"catalogue.photo-gallery.unit": "gallery",
		"catalogue.photo-gallery.scope": "Up to 30 supplied images.",
		"catalogue.advanced-inquiry-form.label": "Advanced inquiry form",
		"catalogue.advanced-inquiry-form.unit": "form",
		"catalogue.advanced-inquiry-form.scope": "Up to 12 fields, conditional questions and email delivery. Upgrading the included contact form adds this fee once.",
		"catalogue.booking-integration.label": "Booking integration",
		"catalogue.booking-integration.unit": "integration",
		"catalogue.booking-integration.scope": "Configure and embed one existing booking service.",
		"catalogue.blog-cms-setup.label": "Blog/CMS setup",
		"catalogue.blog-cms-setup.unit": "setup",
		"catalogue.blog-cms-setup.scope": "One article template and three client-supplied articles.",
		"catalogue.extra-language-setup.label": "Extra language setup",
		"catalogue.extra-language-setup.unit": "language",
		"catalogue.extra-language-setup.scope": "Setup for each additional language. You supply the translations.",
		"catalogue.extra-language-page.label": "Extra language, translated pages",
		"catalogue.extra-language-page.unit": "page per language",
		"catalogue.extra-language-page.scope": "Per translated page, for each additional language. You supply the translations.",
		"catalogue.analytics-setup.label": "Analytics setup",
		"catalogue.analytics-setup.unit": "setup",
		"catalogue.analytics-setup.scope": "One analytics service. Consent tooling is quoted separately if needed.",
		"catalogue.business-email-setup.label": "Business email setup",
		"catalogue.business-email-setup.unit": "setup",
		"catalogue.business-email-setup.scope": "Configure one mailbox provider.",
		"catalogue.content-migration-page.label": "Content migration",
		"catalogue.content-migration-page.unit": "page",
		"catalogue.content-migration-page.scope": "Transfer supplied content from an existing site.",
		"catalogue.extra-revision-round.label": "Additional revision round",
		"catalogue.extra-revision-round.unit": "round",
		"catalogue.extra-revision-round.scope": "One consolidated list of changes within the agreed scope.",
		"catalogue.out-of-scope-hour.label": "Out-of-scope work",
		"catalogue.out-of-scope-hour.unit": "hour",
		"catalogue.out-of-scope-hour.scope": "Work outside the agreed scope. BUSW agrees any hours with you before doing the work.",
		"catalogue.managed-hosting-month.label": "Managed static-site hosting",
		"catalogue.managed-hosting-month.unit": "month",
		"catalogue.managed-hosting-month.scope": "Hosting for your finished static site.",
		"catalogue.website-care-month.label": "Website care including hosting",
		"catalogue.website-care-month.unit": "month",
		"catalogue.website-care-month.scope": "Hosting plus up to 30 minutes of content edits each month. Unused time does not roll over.",
		"quote.online-store.label": "Online store",
		"quote.online-store.hint": "Selling products or services on the site.",
		"quote.customer-accounts.label": "Customer accounts",
		"quote.customer-accounts.hint": "Visitors signing in to a personal area.",
		"quote.payment-system.label": "Payment system",
		"quote.payment-system.hint": "Taking payments on the site.",
		"quote.custom-database.label": "Custom database",
		"quote.custom-database.hint": "Storing and managing your own data.",
		"quote.api-integration.label": "API integration",
		"quote.api-integration.hint": "Connecting the site to another system.",
		"quote.complex-animations.label": "Complex animations",
		"quote.complex-animations.hint": "Animation beyond simple, standard effects.",
		"quote.base-page-custom-layout.label": "Custom redesign of the home page",
		"quote.base-page-custom-layout.hint": "A bespoke layout for the first page instead of the template.",
		"estimate.heading": "Estimate",
		"estimate.chooseCountryText": "Choose your business country to see prices. The country decides which price list and currency apply.",
		"estimate.regionLine": "Prices for {country} in {currency} ({label} price list).",
		"estimate.changeCountry": "Change country",
		"estimate.oneTime": "One-time work",
		"estimate.oneTimeTotal": "Estimated one-time total",
		"estimate.monthly": "Optional monthly",
		"estimate.monthlyTotal": "Optional monthly total",
		"estimate.perMonth": "{amount} / month",
		"estimate.noneMonthly": "None selected. Hosting and website care are optional and are not needed to submit.",
		"estimate.at": "at {price}",
		"estimate.fromDesign": "from your design",
		"estimate.quoteHeading": "Request a quote",
		"estimate.quoteExcluded": "The totals above exclude this work.",
		"estimate.quoteSeparately": "BUSW will quote it separately.",
		"estimate.notice": "Estimated price. BUSW confirms scope and price after reviewing your submission, before any work starts.",
		"estimate.tax": "Applicable taxes are not included and are itemized in the final quote.",
		"estimate.exclusions": "Not included, and quoted separately if needed: {list}.",
		"estimate.exclusion.domain": "domain registration",
		"estimate.exclusion.email": "email subscriptions",
		"estimate.exclusion.plugins": "paid plugins",
		"estimate.exclusion.stock": "stock images and other assets",
		"estimate.exclusion.translation": "translation services",
		"estimate.exclusion.thirdParty": "other third-party fees",
		"estimate.hourly": "Work outside the agreed scope is {rate} {currency} per hour, and BUSW agrees any hours with you before starting.",
		"estimate.addonsNote": "Selected add-ons record the work you are asking BUSW to deliver. They are not active in your preview.",
		"details.title": "Your details",
		"details.lede": "BUSW uses these to reply about your project and to confirm the scope and price with you.",
		"details.hint": "Nothing is sent anywhere while you fill this in. It is saved on this device, in this browser, until you submit or download your project.",
		"details.contactHint": "The person BUSW should speak to.",
		"details.emailHint": "BUSW replies to this address.",
		"details.notesHint": "Anything BUSW should know: deadlines, the content you will supply, examples you like. {used} of {max} characters used.",
		"review.title": "Review and submit",
		"review.lede": "Check everything below. BUSW reviews your submission and confirms the scope and price with you before any work starts.",
		"review.todoHeading": "Before you can submit",
		"review.goStep1": "Go to step 1",
		"review.goAddons": "Go to add-ons",
		"review.fix": "Fix",
		"review.countryHeading": "Business country and currency",
		"review.countryLabel": "Business country",
		"review.priceList": "Price list: {label} · Currency: {currency} · Catalogue version {version}",
		"review.designHeading": "Your design",
		"review.template": "Template",
		"review.style": "Style",
		"review.styleValue": "{palette} colours, {font} font",
		"review.pages": "Pages",
		"review.pageLine": "{file}: {sections}",
		"review.customLayoutSuffix": ", custom layout",
		"review.copywritingSuffix": ", BUSW writes the text",
		"review.editDesign": "Edit design",
		"review.previewButton": "Preview",
		"review.addonsHeading": "Add-ons",
		"review.noAddons": "No add-ons selected.",
		"review.quoteFor": "Quote requested for: {list}.",
		"review.editAddons": "Edit add-ons",
		"review.clientHeading": "Your details",
		"review.business": "Business",
		"review.contact": "Contact",
		"review.email": "Email",
		"review.country": "Country",
		"review.notes": "Notes",
		"review.editDetails": "Edit details",
		"review.asideLabel": "Estimate and submission",
		"review.sendHeading": "Send to BUSW",
		"review.sentTitle": "Submitted to BUSW",
		"review.sentBody": "BUSW received your project on {date}. Your reference is {reference}.",
		"review.sentNext": "BUSW will review it and email {email} to confirm the scope and price. Nothing is started before you agree.",
		"review.sentEarlier": "You submitted an earlier version on {date} (reference {reference}). ",
		"review.sentEarlierStrong": "Changes you have made since then have not been sent.",
		"review.sentEarlierTail": " Submit again to send the updated version.",
		"review.ack": "I understand this is an estimate. BUSW will confirm the scope and price after reviewing it.",
		"review.ackHint": "Taxes are not included and are itemized in the final quote. Questions? {email}",
		"review.failedTitle": "Your project was not sent",
		"review.failedSaved": "Your work is still saved on this device.",
		"review.sending": "Sending…",
		"review.tryAgain": "Try again",
		"review.submitUpdated": "Submit updated version",
		"review.submit": "Submit to BUSW",
		"review.interimTitle": "Nothing is sent to BUSW from this page",
		"review.interimBody": "Online submission is not connected yet. Downloading the project brief does not send anything to BUSW: you must email the downloaded file to {email} yourself. BUSW only learns about your project when that email arrives. The brief contains your design, add-ons, estimate and images.",
		"review.interimButton": "Download project brief",
		"review.submitUnavailable": "Submit to BUSW (not available yet)",
		"review.keepCopy": "Prefer to keep a copy? {link}.",
		"review.downloadBrief": "Download the project brief",
		"review.fixItems": "Fix the items listed above to continue.",
		"review.tickBox": "Tick the box above to continue.",
		"review.briefSaved": "Brief saved to your device as {filename}.",
		"review.briefNotSent": "It has NOT been sent to BUSW.",
		"review.briefEmail": " To start your project, email this file to {email} as an attachment. BUSW will not receive it any other way.",
		"submit.notConfigured": "Online submission is not connected yet.",
		"submit.timeout": "BUSW did not respond in time. Nothing has been confirmed as sent.",
		"submit.network": "Could not reach BUSW. Check your connection and try again. Nothing has been sent.",
		"submit.unconfirmed": "BUSW's server replied without confirming it stored your submission, so it is not counted as sent. Try again, or download the brief instead.",
		"submit.rejected": "BUSW could not accept the submission as it is.",
		"submit.tooLarge": "This project is too large to send online, mostly because of its images. Nothing has been sent. Download the project brief and email it to BUSW instead.",
		"submit.unavailable": "BUSW's submission service is not available right now. Nothing has been sent. Try again shortly, or download the brief instead.",
		"brief.title": "Project brief: {business}",
		"brief.h1": "Website project brief",
		"brief.notice": "Interim brief. Not yet submitted.",
		"brief.noticeBody": " This file was created on the client's device, and downloading it sends nothing. BUSW has not received it unless the client emails it, for example to {email}.",
		"brief.client": "Client",
		"brief.business": "Business",
		"brief.contact": "Contact",
		"brief.email": "Email",
		"brief.notes": "Notes",
		"brief.none": "None",
		"brief.project": "Project",
		"brief.projectId": "Project ID",
		"brief.created": "Created",
		"brief.country": "Business country",
		"brief.catalogue": "Price catalogue",
		"brief.catalogueValue": "{label}, {currency}, version {version}",
		"brief.template": "Template",
		"brief.style": "Style",
		"brief.pages": "Pages",
		"brief.pageLine": "{file}, {sections}",
		"brief.customLayoutRequested": ", custom layout requested",
		"brief.copywritingRequested": ", BUSW to write the copy",
		"brief.addons": "Selected add-ons",
		"brief.noneSelected": "None selected.",
		"brief.quoteRequests": "Quote requests",
		"brief.quoteNotIncluded": "These are not included in the totals below.",
		"brief.quoteSeparately": " BUSW will quote them separately.",
		"brief.estimate": "Estimate",
		"brief.colItem": "Item",
		"brief.colQuantity": "Quantity",
		"brief.colUnitPrice": "Unit price",
		"brief.colTotal": "Total",
		"brief.notIncluded": "Not included: {list}.",
		"brief.hourly": "Out-of-scope work, if agreed in advance: {rate} {currency} per hour.",
		"brief.addonsNote": "Selected add-ons record the work the client has asked BUSW to deliver. They are not working in the design preview."
	},
	tr: {
		"app.title": "BUSW Website Builder (erken önizleme)",
		"app.loading": "Yükleniyor…",
		"lang.switcher": "Arayüz dili",
		"common.close": "Kapat",
		"common.back": "Geri",
		"common.next": "İleri",
		"common.dismiss": "Gizle",
		"common.remove": "Kaldır",
		"common.undo": "Geri al",
		"common.redo": "Yinele",
		"common.untitledPage": "Adsız sayfa",
		"common.notEntered": "Girilmedi",
		"common.notChosen": "Seçilmedi",
		"common.required": "(zorunlu)",
		"wizard.brandTag": "Erken önizleme",
		"wizard.skip": "İçeriğe geç",
		"wizard.stepsNav": "Adımlar",
		"wizard.goToStep": "Adıma git",
		"wizard.needsAttentionDetail": " (dikkat gerekiyor: {issue})",
		"wizard.stepOption": "{n}. {label}",
		"wizard.stepOptionAttention": "{n}. {label} (dikkat gerekiyor)",
		"wizard.stepNav": "Adım gezintisi",
		"wizard.backTo": "← Geri: {label}",
		"wizard.back": "← Geri",
		"wizard.nextTo": "İleri: {label} →",
		"wizard.restored": "Tekrar hoş geldiniz. Taslağınız bu cihazdan geri yüklendi; kaldığınız yerden devam edebilirsiniz.",
		"wizard.unreadable": "Kayıtlı taslağınız açılamadı ({detail}). Siz bir değişiklik yapana kadar olduğu gibi bırakıldı.",
		"wizard.estimate": "Tahmini fiyat",
		"wizard.chooseCountry": "Ülke seçin",
		"wizard.needsTemplate.title": "Önce bir şablon seçin",
		"wizard.needsTemplate.edit": "Henüz düzenlenecek bir şey yok. Bir şablon seçin ya da boş bir sayfayla başlayın; tasarımınız burada görünecek.",
		"wizard.needsTemplate.preview": "Henüz önizlenecek bir şey yok. Bir şablon seçin ya da boş bir sayfayla başlayın; tasarımınız burada görünecek.",
		"wizard.needsTemplate.button": "Şablon seçin",
		"wizard.save.saved": "Taslak bu cihaza kaydedildi",
		"wizard.save.saving": "Taslak kaydediliyor…",
		"wizard.save.error": "Taslak bu cihaza kaydedilemedi",
		"step.eyebrow": "Adım {n} / {total}",
		"step.start": "Ülke ve şablon",
		"step.design": "Tasarım",
		"step.preview": "Önizleme",
		"step.addons": "Ek hizmetler ve tahmini fiyat",
		"step.details": "Bilgileriniz",
		"step.review": "Gözden geçir ve gönder",
		"issue.start.both": "Bir işletme ülkesi ve bir şablon seçin.",
		"issue.start.country": "Bir işletme ülkesi seçin.",
		"issue.start.template": "Bir şablon seçin.",
		"issue.addons.languageName": "Her ek dile bir ad verin.",
		"issue.details.many": "{count} bilginin düzeltilmesi gerekiyor.",
		"field.businessName": "İşletme adı",
		"field.contactName": "İletişim kişisi",
		"field.email": "E-posta",
		"field.notes": "Proje notları",
		"validation.businessName.required": "İşletme adınızı girin.",
		"validation.contactName.required": "İletişim kurmamız gereken kişinin adını girin.",
		"validation.email.required": "Size yanıt verebilmemiz için bir e-posta adresi girin.",
		"validation.email.invalid": "ad@ornek.com gibi geçerli bir e-posta adresi girin.",
		"validation.tooLong": "En fazla {max} karakter kullanın.",
		"start.title": "Web sitenizi başlatın",
		"start.lede": "Ülkenizi ve bir şablon seçin, düzenleyin, önizleyin, isterseniz ek hizmetler ekleyin ve BUSW'ya gönderin. BUSW tasarımınızı inceler; işe başlamadan önce kapsamı ve fiyatı sizinle netleştirir.",
		"start.savedHint": "Çalışmanız yalnızca bu cihazda ve bu tarayıcıda otomatik olarak kaydedilir. Yedek almak için Tasarım adımındaki “Proje dosyasını kaydet” düğmesini kullanın.",
		"start.countryHeading": "İşletmeniz nerede bulunuyor?",
		"start.countryLabel": "İşletme ülkesi",
		"start.countryPlaceholder": "Bir ülke seçin…",
		"start.countryRequired": "Devam etmek için bir ülke seçin.",
		"start.regionHint": "Ülkeniz, hangi fiyat listesinin ve para biriminin geçerli olacağını belirler. Tasarımınızı hiçbir zaman değiştirmez.",
		"start.regionNote": "Fiyatlar {currency} cinsinden gösterilecek ({label} fiyat listesi). Ülkeyi istediğiniz zaman değiştirebilirsiniz; tasarımınız olduğu gibi kalır.",
		"start.templatesHeading": "Bir şablon seçin",
		"start.otherHeading": "Başlamanın diğer yolları",
		"start.keepBlank": "Boş sayfamı koru",
		"start.startBlank": "Boş bir sayfayla başla",
		"start.openFile": "Proje dosyası aç",
		"start.confirmReplace": "Bu işlem mevcut tasarımınızın yerine yenisini koyar. Ülkeniz ve iletişim bilgileriniz korunur. Devam edilsin mi?",
		"start.confirmOpenFile": "Bir proje dosyası açmak, ülkesi ve bilgileri dahil mevcut projenizin yerine geçer. Devam edilsin mi?",
		"start.fileError": "Dosya açılamadı. {reason}",
		"start.fileTooLarge": "Bu dosya bir proje olamayacak kadar büyük.",
		"start.fileNotProject": "Bu dosya bir BUSW Web Sitesi Oluşturucu projesi değil.",
		"template.studio.name": "Stüdyo",
		"template.studio.description": "Etkileyici bir giriş, çalışmalarınızın galerisi, kısa bir hakkında bölümü ve iletişim kurma yolu.",
		"template.local-business.name": "Yerel işletme",
		"template.local-business.description": "Hizmetler, kısa bir hikâye; adresiniz ve çalışma saatleriniz en başta.",
		"template.personal.name": "Kişisel sayfa",
		"template.personal.description": "Kendinizi tanıtmak, yaptığınız işi paylaşmak ve iletişime davet etmek için sakin, tek sayfalık bir tasarım.",
		"template.previewTitle": "{name} şablonu önizlemesi",
		"template.selected": "Seçili",
		"template.summary": "{pages} sayfa, {sections} bölüm · {palette} renkleri",
		"template.keep": "{name} şablonunu koru",
		"template.use": "{name} şablonunu kullan",
		"template.notChosen": "Seçilmedi",
		"template.blank": "Boş sayfa",
		"template.custom": "Özel tasarım",
		"palette.paper": "Kağıt",
		"palette.ink": "Mürekkep",
		"palette.sand": "Kum",
		"palette.forest": "Orman",
		"font.system": "Modern sans-serif",
		"font.humanist": "Hümanist sans-serif",
		"font.serif": "Klasik serif",
		"section.hero.label": "Giriş alanı (hero)",
		"section.hero.description": "Ana başlık, kısa açıklama, bir düğme ve bir görsel.",
		"section.textImage.label": "Metin ve görsel",
		"section.textImage.description": "Bir görselin yanında başlık ve paragraflar.",
		"section.features.label": "Özellik kartları",
		"section.features.description": "Hizmetler veya öne çıkanlar için kısa kartlardan oluşan bir sıra.",
		"section.gallery.label": "Görsel galerisi",
		"section.gallery.description": "İsteğe bağlı alt yazılı görsellerden oluşan bir ızgara.",
		"section.contact.label": "İletişim",
		"section.contact.description": "E-posta, telefon ve adres. Form yok: ziyaretçiler e-posta bağlantınızı kullanır.",
		"region.us.label": "Amerika Birleşik Devletleri",
		"region.tr.label": "Türkiye",
		"region.intl.label": "Diğer tüm ülkeler",
		"editor.title": "Web sitenizi tasarlayın",
		"editor.undoRedo": "Geri al ve yinele",
		"editor.previewWidth": "Önizleme genişliği",
		"editor.saveFile": "Proje dosyasını kaydet",
		"editor.sidebar": "Sayfalar ve bölümler",
		"editor.properties": "Özellikler",
		"editor.canvasLabel": "{title} sayfasının düzenlenebilir önizlemesi",
		"device.desktop": "Masaüstü",
		"device.tablet": "Tablet",
		"device.phone": "Telefon",
		"device.mobile": "Mobil",
		"canvas.frameEditable": "{title} sayfasının düzenlenebilir önizlemesi, {device} genişliği",
		"canvas.frameReadOnly": "{title} sayfasının salt okunur önizlemesi, {device} genişliği",
		"canvas.thePage": "sayfa",
		"canvas.imagePlaceholder": "Görsel alanı. Sağdaki panelden bir görsel seçin.",
		"canvas.ph.siteName": "Site adı",
		"canvas.ph.link": "Bağlantı",
		"canvas.ph.footerText": "Alt bilgi metni",
		"canvas.ph.headline": "Ana başlık",
		"canvas.ph.shortDescription": "Kısa açıklama",
		"canvas.ph.buttonLabel": "Düğme metni",
		"canvas.ph.heading": "Başlık",
		"canvas.ph.body": "Metninizi buraya yazın. Paragraflar arasında boş bir satır bırakın.",
		"canvas.ph.intro": "Kısa giriş",
		"canvas.ph.title": "Başlık",
		"canvas.ph.description": "Açıklama",
		"canvas.ph.caption": "Alt yazı",
		"canvas.ph.shortText": "Kısa metin",
		"canvas.ph.email": "E-posta",
		"canvas.ph.phone": "Telefon",
		"canvas.ph.address": "Adres",
		"list.pages": "Sayfalar",
		"list.homePage": "Ana sayfa",
		"list.sections_one": "{count} bölüm",
		"list.sections_other": "{count} bölüm",
		"list.pageActions": "{title} sayfası işlemleri",
		"list.movePageUp": "Sayfayı yukarı taşı",
		"list.movePageDown": "Sayfayı aşağı taşı",
		"list.deletePage": "Sayfayı sil",
		"list.deletePageTitle": "Sayfayı sil (geri alabilirsiniz)",
		"list.addPage": "+ Sayfa ekle",
		"list.contentOf": "{title} içeriği",
		"list.thisPage": "bu sayfa",
		"list.onThisPage": "Bu sayfada",
		"list.pageSettings": "Sayfa ayarları",
		"list.pageSettingsDetail": "Başlık, adres, seçenekler",
		"list.siteSettings": "Site ayarları",
		"list.siteSettingsDetail": "Başlık, renkler, yazı tipi",
		"list.header": "Üst bilgi",
		"list.footer": "Alt bilgi",
		"list.addHeader": "+ Üst bilgi ekle",
		"list.addFooter": "+ Alt bilgi ekle",
		"list.sectionActions": "{label} işlemleri",
		"list.moveUp": "Yukarı taşı",
		"list.moveDown": "Aşağı taşı",
		"list.duplicate": "Çoğalt",
		"list.delete": "Sil",
		"list.deleteTitle": "Sil (geri alabilirsiniz)",
		"list.addSection": "Bölüm ekle",
		"inspector.homeSettings": "Ana sayfa ayarları",
		"inspector.pageSettings": "Sayfa ayarları",
		"inspector.pageTitle": "Sayfa başlığı",
		"inspector.pageTitleHint": "Menüde ve tarayıcı sekmesinde kullanılır.",
		"inspector.pageAddress": "Sayfa adresi",
		"inspector.homeAddressHint": "Ana sayfa her zaman bu adresi kullanır.",
		"inspector.pageAddressHint": "Bu sayfanın adresi {slug}.html olacak. Küçük harf, rakam ve tire kullanın.",
		"inspector.pageDescription": "Sayfa açıklaması",
		"inspector.pageDescriptionHint": "Arama sonuçlarında sayfa başlığının altında gösterilir.",
		"inspector.options": "Seçenekler",
		"inspector.homeCustomHint": "Ana sayfa için özel tasarım bir teklif talebidir. Bunu Ek hizmetler adımında isteyebilirsiniz.",
		"inspector.customLayout": "Özel sayfa düzeni",
		"inspector.customHint": "BUSW, seçili tasarımı kullanmak yerine bu sayfanın düzenini sizin için tasarlar.",
		"inspector.customHintPrice": " Ek sayfa ücretinin ({pagePrice}) yerine {customPrice} uygulanır. İkisi hiçbir zaman birlikte eklenmez.",
		"inspector.copywriting": "Bu sayfanın metnini BUSW yazsın",
		"inspector.copywritingHint": "Metin yazımı: sayfa başına en fazla 500 kelime ve bir revizyon.",
		"inspector.copywritingPrice": " Sayfa başına {price}.",
		"inspector.sections": "Bölümler",
		"inspector.sectionCount_one": "Bu sayfada {count} bölüm var. Her sayfada {included} bölüm dahildir.",
		"inspector.sectionCount_other": "Bu sayfada {count} bölüm var. Her sayfada {included} bölüm dahildir.",
		"inspector.extraSections_one": " {count} ek bölüm tahmini fiyata eklenir.",
		"inspector.extraSections_other": " {count} ek bölüm tahmini fiyata eklenir.",
		"inspector.extraSectionsPrice_one": " {count} ek bölüm, {price} üzerinden tahmini fiyata eklenir.",
		"inspector.extraSectionsPrice_other": " {count} ek bölüm, her biri {price} üzerinden tahmini fiyata eklenir.",
		"inspector.deletePage": "Bu sayfayı sil",
		"inspector.canUndo": "Bunu geri alabilirsiniz.",
		"inspector.siteSettings": "Site ayarları",
		"inspector.siteHint": "Düzenlemek için listeden veya önizlemeden bir blok seçin. Metni doğrudan önizlemede düzenleyebilirsiniz.",
		"inspector.siteTitle": "Site başlığı",
		"inspector.siteTitleHint": "Tarayıcı sekmesinde ve arama sonuçlarında gösterilir.",
		"inspector.siteDescription": "Kısa açıklama",
		"inspector.siteDescriptionHint": "Arama motorları tarafından ve bağlantı paylaşıldığında kullanılır.",
		"inspector.siteLang": "Web sitesi dil kodu",
		"inspector.siteLangHint": "Web sitenizin yazıldığı dil; örneğin en, de, fr veya tr. Ekran okuyucuların metninizi doğru seslendirmesine yardımcı olur. Bu oluşturucunun dilini değiştirmez.",
		"inspector.colours": "Renkler",
		"inspector.font": "Yazı tipi",
		"inspector.fontHint": "Yazı tipleri ziyaretçilerinizin cihazlarında zaten bulunur, bu yüzden hiçbir şey indirilmez.",
		"inspector.addHeader": "Üst bilgi ekle",
		"inspector.addFooter": "Alt bilgi ekle",
		"inspector.header": "Üst bilgi",
		"inspector.siteName": "Site adı",
		"inspector.menuLinks": "Menü bağlantıları",
		"inspector.linkText": "{n}. bağlantı metni",
		"inspector.linkAddress": "{n}. bağlantı adresi",
		"inspector.linkPlaceholder": "#hakkimizda veya https://…",
		"inspector.linkHint": "hakkimizda.html gibi bir sayfa adresi, bir bölüme atlamak için #ad ya da tam bir web adresi kullanın.",
		"inspector.removeLink": "{n}. bağlantıyı kaldır",
		"inspector.addLink": "Menü bağlantısı ekle",
		"inspector.removeHeader": "Üst bilgiyi kaldır",
		"inspector.footer": "Alt bilgi",
		"inspector.footerText": "Alt bilgi metni",
		"inspector.removeFooter": "Alt bilgiyi kaldır",
		"inspector.anchorLabel": "Bağlantı adı (isteğe bağlı)",
		"inspector.anchorHint": "Menü bağlantılarının ve düğmelerin buraya atlamasını sağlar; #{anchor} biçiminde kullanılır. Küçük harf, rakam ve tire kullanın.",
		"inspector.anchorInvalid": "Küçük harf, rakam ve tire kullanın; bir harfle başlayın.",
		"inspector.anchorName": "ad",
		"inspector.headline": "Ana başlık",
		"inspector.description": "Açıklama",
		"inspector.buttonText": "Düğme metni",
		"inspector.buttonTextHint": "Düğme istemiyorsanız boş bırakın.",
		"inspector.buttonAddress": "Düğme adresi",
		"inspector.buttonPlaceholder": "#iletisim veya https://…",
		"inspector.image": "Görsel",
		"inspector.heading": "Başlık",
		"inspector.text": "Metin",
		"inspector.textHint": "Paragraflar arasında boş bir satır bırakın.",
		"inspector.imagePosition": "Görsel konumu",
		"inspector.right": "Sağ",
		"inspector.left": "Sol",
		"inspector.introduction": "Giriş",
		"inspector.cards": "Kartlar",
		"inspector.cardTitle": "{n}. kart başlığı",
		"inspector.cardText": "{n}. kart metni",
		"inspector.removeCard": "{n}. kartı kaldır",
		"inspector.addCard": "Kart ekle",
		"inspector.pictures": "Görseller",
		"inspector.picture": "{n}. görsel",
		"inspector.pictureCaption": "{n}. görsel alt yazısı",
		"inspector.removePicture": "{n}. görseli kaldır",
		"inspector.addPicture": "Görsel ekle",
		"inspector.contactEmail": "E-posta",
		"inspector.contactEmailHint": "Ziyaretçilerin size yazmak için tıklayabileceği bir bağlantıya dönüşür. İletişim formu yoktur.",
		"inspector.phone": "Telefon",
		"inspector.address": "Adres",
		"control.imageNone": "Görsel seçilmedi. Boş görsel alanları tamamlanan siteye eklenmez.",
		"control.processing": "İşleniyor…",
		"control.replaceImage": "Görseli değiştir",
		"control.chooseImage": "Görsel seç",
		"control.alt": "Görsel açıklaması (alt metin)",
		"control.altNeeded": "Görseli göremeyenler için görseli tanımlayın ya da süs amaçlı olarak işaretleyin.",
		"control.altHint": "Görselin ne gösterdiğini anlatın. Ekran okuyucular bunu sesli okur.",
		"control.decorative": "Bu görsel süs amaçlıdır (açıklama gerekmez)",
		"control.fewer": "Daha az {unit}",
		"control.more": "Daha fazla {unit}",
		"image.badType": "JPEG, PNG veya WebP biçiminde bir görsel seçin.",
		"image.tooLarge": "Bu görsel 25 MB'tan büyük. Daha küçük bir görsel seçin.",
		"image.unreadable": "Bu görsel okunamadı. Dosya bozuk olabilir.",
		"image.noCanvas": "Tarayıcınız bu görseli işleyemedi.",
		"image.stillTooLarge": "Bu görsel küçültüldükten sonra bile çok büyük. Daha küçük bir görsel deneyin.",
		"preview.title": "Sitenizi önizleyin",
		"preview.lede": "Ziyaretçilerin tasarımınızı masaüstünde ve telefonda göreceği hali budur. Sayfalarınız arasındaki bağlantılar çalışır. Daha sonra seçtiğiniz ek hizmetleri BUSW teslim eder ve burada görünmez.",
		"preview.toolbar": "Önizleme seçenekleri",
		"preview.page": "Sayfa",
		"preview.screenSize": "Ekran boyutu",
		"preview.backToEditing": "Düzenlemeye dön",
		"preview.checkHeading": "Tasarım kontrolü",
		"preview.checkBody": "Tasarımınızı BUSW'ya göndermeden önce düzeltmeye değer şeyler. Göndermenizi hiçbir zaman engellemezler.",
		"preview.noProblems": "Sorun bulunamadı.",
		"warn.noTitle": "Sitenin başlığı yok. Site ayarlarından bir başlık ekleyin.",
		"warn.noHeading": "“{page}” sayfasında başlığı olan bir bölüm yok, bu yüzden ana başlığı da yok.",
		"warn.emptyImages_one": "{count} boş görsel alanı tamamlanan siteye eklenmeyecek.",
		"warn.emptyImages_other": "{count} boş görsel alanı tamamlanan siteye eklenmeyecek.",
		"warn.noAlt_one": "{count} görselin açıklaması yok. Bir açıklama ekleyin ya da süs amaçlı olarak işaretleyin.",
		"warn.noAlt_other": "{count} görselin açıklaması yok. Birer açıklama ekleyin ya da süs amaçlı olarak işaretleyin.",
		"warn.menuInvalid": "“{label}” menü bağlantısının geçerli bir adresi yok ve dışarıda bırakılacak.",
		"warn.menuMissing": "“{label}” menü bağlantısı, var olmayan {href} adresine gidiyor.",
		"warn.buttonInvalid": "“{label}” düğmesinin geçerli bir adresi yok ve dışarıda bırakılacak.",
		"warn.buttonMissing": "“{label}” düğmesi, kendi sayfasında var olmayan {href} adresine gidiyor.",
		"warn.badEmail": "“{email}” bir e-posta adresine benzemiyor, bu yüzden bağlantı olmayacak.",
		"addons.title": "Ek hizmetler ve tahmini fiyat",
		"addons.lede": "Tasarımınız temel fiyatı belirler. BUSW'nun teslim etmesini istediğiniz ek şeyleri seçin. Bir ek hizmeti seçmek, istediğiniz işi kaydeder; bu özelliği önizlemenize eklemez.",
		"addons.noRegion": "İşletme ülkenizi seçene kadar fiyatlar gizlidir, çünkü fiyat listesini ve para birimini ülke belirler.",
		"addons.chooseCountry": "Ülke seçin",
		"addons.countedHeading": "Tasarımınızdan hesaplananlar",
		"addons.countedHint": "Bunlar otomatik hesaplanır, yani aynı bilgiyi iki kez girmenize gerek yok.",
		"addons.baseWebsite": "Temel web sitesi",
		"addons.baseWebsiteValue": "{sections} bölüme kadar 1 ana sayfa",
		"addons.additionalPages": "Ek sayfalar",
		"addons.customLayouts": "Özel sayfa düzenleri",
		"addons.extraSectionsLabel": "Bir sayfada {included} bölümü aşan bölümler",
		"addons.copywritingPages": "Metnini BUSW'nun yazdığı sayfalar",
		"addons.customReplaces": "Özel düzen, o sayfa için ek sayfa ücretinin yerine geçer. İkisi hiçbir zaman birlikte ücretlendirilmez.",
		"addons.changePages": "Sayfaları veya bölümleri değiştir",
		"addons.contentHeading": "İçerik ve medya",
		"addons.batchesLabel": "Paketler: {scope}",
		"addons.galleriesLabel": "Galeriler: {scope}",
		"addons.galleryNudge": " Tasarımınızda bir galeri bölümü var. Tam bir fotoğraf galerisi istiyorsanız bunu ekleyin.",
		"addons.pagesLabel": "Sayfalar: {scope}",
		"addons.unit.batches": "görsel paketi",
		"addons.unit.galleries": "galeri",
		"addons.unit.migrate": "taşınacak sayfa",
		"addons.unit.rounds": "revizyon turu",
		"addons.unit.pages": "sayfa",
		"addons.featuresHeading": "Özellikler",
		"addons.contactFormNote": "Temel web siteniz zaten bir standart iletişim formu içerir. Önizlemede yalnızca iletişim bilgileriniz görünür.",
		"addons.languagesHeading": "Ek diller",
		"addons.languagesScope": "Bunlar web siteniz için dillerdir. Bu oluşturucunun dilini değiştirmezler.",
		"addons.languagesPrice": "Her dil için {setup} kurulum ücreti; o dile çevrilen her sayfa için ayrıca {page}.",
		"addons.supplyTranslations": "Çevirileri siz sağlarsınız.",
		"addons.languageN": "{n}. dil",
		"addons.languagePlaceholder": "Örneğin Almanca",
		"addons.translateAll_one": "{count} sayfanın tamamını çevir",
		"addons.translateAll_other": "{count} sayfanın tamamını çevir",
		"addons.pagesToTranslate": "{language} diline çevrilecek sayfalar",
		"addons.languageFallback": "{n}. dil",
		"addons.removeLanguage": "{n}. dili kaldır",
		"addons.addLanguage": "Dil ekle",
		"addons.supportHeading": "Revizyonlar ve destek",
		"addons.revisionsHint": "İki birleştirilmiş tur dahildir. Turlar: {scope}",
		"addons.hostingLegend": "Barındırma ve web sitesi bakımı (isteğe bağlı, aylık faturalanır)",
		"addons.hostingHint": "Web sitenizi göndermek için ikisine de gerek yok. Birini seçebilirsiniz, ikisini birden değil.",
		"addons.hosting.none": "BUSW'dan barındırma yok",
		"addons.hosting.noneHint": "Barındırmayı kendim ayarlayacağım ya da sonra karar vereceğim.",
		"addons.perMonthSuffix": ": ayda {price}",
		"addons.priced": "{name} ({price} / {unit})",
		"addons.pricedMonthly": "{name} (ayda {price})",
		"addons.quoteHeading": "Teklif isteyin",
		"addons.quoteHint": "BUSW bunları otomatik fiyatlandırmaz. Birini işaretlemek BUSW'dan teklif istemek anlamına gelir. Tahmini fiyatınıza hiçbir şey eklemez; toplamlar bunu hariç tuttuğunu belirtir.",
		"addons.asideLabel": "Tahmini fiyat",
		"addons.itemAdvanced": "Gelişmiş talep formu",
		"addons.itemBooking": "Rezervasyon entegrasyonu",
		"addons.itemBlog": "Blog/CMS kurulumu",
		"addons.itemAnalytics": "Analitik kurulumu",
		"addons.itemEmail": "Kurumsal e-posta kurulumu",
		"addons.itemImagePrep": "Görsel hazırlama",
		"addons.itemGallery": "Fotoğraf galerisi",
		"addons.itemMigration": "İçerik taşıma",
		"addons.itemRevisions": "Ek revizyon turları",
		"selection.gallery": "Fotoğraf galerisi × {count}",
		"selection.imagePrep": "Görsel hazırlama × {count} paket",
		"selection.migration": "İçerik taşıma × {count} sayfa",
		"selection.revisions": "Ek revizyon turları × {count}",
		"selection.language": "Ek dil: {name} ({scope})",
		"selection.languageUnnamed": "(adsız)",
		"selection.allPages": "tüm sayfalar",
		"selection.nPages": "{count} sayfa",
		"selection.hostingMonthly": "Yönetilen statik site barındırma (aylık)",
		"selection.careMonthly": "Barındırma dahil web sitesi bakımı (aylık)",
		"catalogue.base-website.label": "Temel web sitesi",
		"catalogue.base-website.unit": "web sitesi",
		"catalogue.base-website.scope": "Altı bölüme kadar, şablona dayalı tek sayfa; metinleriniz ve görselleriniz, duyarlı masaüstü ve mobil düzenler, bir standart iletişim formu, temel sayfa başlıkları ve açıklamaları, tek bir barındırma hesabına yayına alma ve iki birleştirilmiş revizyon turu. Mobil uyumluluk, HTTPS, temel erişilebilirlik ve teslim edilen işteki hataların düzeltilmesi dahildir.",
		"catalogue.additional-page.label": "Ek sayfa",
		"catalogue.additional-page.unit": "sayfa",
		"catalogue.additional-page.scope": "Seçili tasarımı kullanan, altı bölüme kadar sayfa.",
		"catalogue.additional-section.label": "Ek bölüm",
		"catalogue.additional-section.unit": "bölüm",
		"catalogue.additional-section.scope": "Her standart sayfaya dahil olan altı bölümün ötesindeki bölüm.",
		"catalogue.custom-page-layout.label": "Özel sayfa düzeni",
		"catalogue.custom-page-layout.unit": "sayfa",
		"catalogue.custom-page-layout.scope": "O sayfa için ek sayfa ücretinin yerine geçer. İkisi hiçbir zaman birlikte ücretlendirilmez.",
		"catalogue.copywriting-page.label": "Metin yazımı",
		"catalogue.copywriting-page.unit": "sayfa",
		"catalogue.copywriting-page.scope": "Sayfa başına en fazla 500 kelime ve bir revizyon.",
		"catalogue.image-preparation-batch.label": "Görsel hazırlama",
		"catalogue.image-preparation-batch.unit": "paket",
		"catalogue.image-preparation-batch.scope": "Paket başına, sizin sağladığınız en fazla 20 görsel.",
		"catalogue.photo-gallery.label": "Fotoğraf galerisi",
		"catalogue.photo-gallery.unit": "galeri",
		"catalogue.photo-gallery.scope": "Sizin sağladığınız en fazla 30 görsel.",
		"catalogue.advanced-inquiry-form.label": "Gelişmiş talep formu",
		"catalogue.advanced-inquiry-form.unit": "form",
		"catalogue.advanced-inquiry-form.scope": "En fazla 12 alan, koşullu sorular ve e-posta ile iletim. Dahil olan iletişim formunu yükseltmek bu ücreti bir kez ekler.",
		"catalogue.booking-integration.label": "Rezervasyon entegrasyonu",
		"catalogue.booking-integration.unit": "entegrasyon",
		"catalogue.booking-integration.scope": "Mevcut bir rezervasyon hizmetini yapılandırma ve siteye gömme.",
		"catalogue.blog-cms-setup.label": "Blog/CMS kurulumu",
		"catalogue.blog-cms-setup.unit": "kurulum",
		"catalogue.blog-cms-setup.scope": "Bir makale şablonu ve sizin sağladığınız üç makale.",
		"catalogue.extra-language-setup.label": "Ek dil kurulumu",
		"catalogue.extra-language-setup.unit": "dil",
		"catalogue.extra-language-setup.scope": "Her ek dil için kurulum. Çevirileri siz sağlarsınız.",
		"catalogue.extra-language-page.label": "Ek dil, çevrilen sayfalar",
		"catalogue.extra-language-page.unit": "dil başına sayfa",
		"catalogue.extra-language-page.scope": "Her ek dil için çevrilen sayfa başına. Çevirileri siz sağlarsınız.",
		"catalogue.analytics-setup.label": "Analitik kurulumu",
		"catalogue.analytics-setup.unit": "kurulum",
		"catalogue.analytics-setup.scope": "Bir analitik hizmeti. Gerekirse çerez onayı araçları ayrıca teklif edilir.",
		"catalogue.business-email-setup.label": "Kurumsal e-posta kurulumu",
		"catalogue.business-email-setup.unit": "kurulum",
		"catalogue.business-email-setup.scope": "Bir e-posta sağlayıcısını yapılandırma.",
		"catalogue.content-migration-page.label": "İçerik taşıma",
		"catalogue.content-migration-page.unit": "sayfa",
		"catalogue.content-migration-page.scope": "Sağladığınız içeriği mevcut bir siteden aktarma.",
		"catalogue.extra-revision-round.label": "Ek revizyon turu",
		"catalogue.extra-revision-round.unit": "tur",
		"catalogue.extra-revision-round.scope": "Kararlaştırılan kapsam içinde tek bir birleştirilmiş değişiklik listesi.",
		"catalogue.out-of-scope-hour.label": "Kapsam dışı iş",
		"catalogue.out-of-scope-hour.unit": "saat",
		"catalogue.out-of-scope-hour.scope": "Kararlaştırılan kapsamın dışındaki iş. BUSW, işe başlamadan önce saatleri sizinle kararlaştırır.",
		"catalogue.managed-hosting-month.label": "Yönetilen statik site barındırma",
		"catalogue.managed-hosting-month.unit": "ay",
		"catalogue.managed-hosting-month.scope": "Tamamlanan statik siteniz için barındırma.",
		"catalogue.website-care-month.label": "Barındırma dahil web sitesi bakımı",
		"catalogue.website-care-month.unit": "ay",
		"catalogue.website-care-month.scope": "Barındırma ve her ay en fazla 30 dakikalık içerik düzenlemesi. Kullanılmayan süre sonraki aya devretmez.",
		"quote.online-store.label": "Online mağaza",
		"quote.online-store.hint": "Sitede ürün veya hizmet satışı.",
		"quote.customer-accounts.label": "Müşteri hesapları",
		"quote.customer-accounts.hint": "Ziyaretçilerin kişisel bir alana giriş yapması.",
		"quote.payment-system.label": "Ödeme sistemi",
		"quote.payment-system.hint": "Sitede ödeme alma.",
		"quote.custom-database.label": "Özel veritabanı",
		"quote.custom-database.hint": "Kendi verilerinizi saklama ve yönetme.",
		"quote.api-integration.label": "API entegrasyonu",
		"quote.api-integration.hint": "Siteyi başka bir sisteme bağlama.",
		"quote.complex-animations.label": "Karmaşık animasyonlar",
		"quote.complex-animations.hint": "Basit, standart efektlerin ötesinde animasyon.",
		"quote.base-page-custom-layout.label": "Ana sayfanın özel yeniden tasarımı",
		"quote.base-page-custom-layout.hint": "İlk sayfa için şablon yerine size özel bir düzen.",
		"estimate.heading": "Tahmini fiyat",
		"estimate.chooseCountryText": "Fiyatları görmek için işletme ülkenizi seçin. Hangi fiyat listesinin ve para biriminin geçerli olacağını ülke belirler.",
		"estimate.regionLine": "{country} için fiyatlar {currency} cinsinden ({label} fiyat listesi).",
		"estimate.changeCountry": "Ülkeyi değiştir",
		"estimate.oneTime": "Tek seferlik işler",
		"estimate.oneTimeTotal": "Tahmini tek seferlik toplam",
		"estimate.monthly": "İsteğe bağlı aylık",
		"estimate.monthlyTotal": "İsteğe bağlı aylık toplam",
		"estimate.perMonth": "{amount} / ay",
		"estimate.noneMonthly": "Hiçbiri seçilmedi. Barındırma ve web sitesi bakımı isteğe bağlıdır; göndermek için gerekmez.",
		"estimate.at": "{price} üzerinden",
		"estimate.fromDesign": "tasarımınızdan",
		"estimate.quoteHeading": "Teklif isteyin",
		"estimate.quoteExcluded": "Yukarıdaki toplamlar bu işi içermez.",
		"estimate.quoteSeparately": "BUSW bunun için ayrıca teklif verecek.",
		"estimate.notice": "Tahmini fiyattır. BUSW, gönderiminizi inceledikten sonra, işe başlamadan önce kapsamı ve fiyatı onaylar.",
		"estimate.tax": "Geçerli vergiler dahil değildir; nihai teklifte kalem kalem gösterilir.",
		"estimate.exclusions": "Dahil değildir, gerekirse ayrıca teklif edilir: {list}.",
		"estimate.exclusion.domain": "alan adı kaydı",
		"estimate.exclusion.email": "e-posta abonelikleri",
		"estimate.exclusion.plugins": "ücretli eklentiler",
		"estimate.exclusion.stock": "stok görseller ve diğer materyaller",
		"estimate.exclusion.translation": "çeviri hizmetleri",
		"estimate.exclusion.thirdParty": "diğer üçüncü taraf ücretleri",
		"estimate.hourly": "Kararlaştırılan kapsamın dışındaki işin saatlik ücreti: {rate} {currency}. BUSW, başlamadan önce saatleri sizinle kararlaştırır.",
		"estimate.addonsNote": "Seçtiğiniz ek hizmetler, BUSW'dan istediğiniz işi kaydeder. Önizlemenizde etkin değildirler.",
		"details.title": "Bilgileriniz",
		"details.lede": "BUSW bunları projeniz hakkında size yanıt vermek ve kapsamı ile fiyatı sizinle onaylamak için kullanır.",
		"details.hint": "Bunları doldururken hiçbir yere bir şey gönderilmez. Projenizi gönderene veya indirene kadar bu cihazda, bu tarayıcıda saklanır.",
		"details.contactHint": "BUSW'nun görüşmesi gereken kişi.",
		"details.emailHint": "BUSW yanıtlarını bu adrese gönderir.",
		"details.notesHint": "BUSW'nun bilmesi gereken her şey: teslim tarihleri, sağlayacağınız içerik, beğendiğiniz örnekler. {max} karakterin {used} kadarı kullanıldı.",
		"review.title": "Gözden geçir ve gönder",
		"review.lede": "Aşağıdaki her şeyi kontrol edin. BUSW gönderiminizi inceler; işe başlamadan önce kapsamı ve fiyatı sizinle onaylar.",
		"review.todoHeading": "Göndermeden önce",
		"review.goStep1": "1. adıma git",
		"review.goAddons": "Ek hizmetlere git",
		"review.fix": "Düzelt",
		"review.countryHeading": "İşletme ülkesi ve para birimi",
		"review.countryLabel": "İşletme ülkesi",
		"review.priceList": "Fiyat listesi: {label} · Para birimi: {currency} · Fiyat listesi sürümü {version}",
		"review.designHeading": "Tasarımınız",
		"review.template": "Şablon",
		"review.style": "Stil",
		"review.styleValue": "{palette} renkleri, {font} yazı tipi",
		"review.pages": "Sayfalar",
		"review.pageLine": "{file}: {sections}",
		"review.customLayoutSuffix": ", özel düzen",
		"review.copywritingSuffix": ", metni BUSW yazıyor",
		"review.editDesign": "Tasarımı düzenle",
		"review.previewButton": "Önizleme",
		"review.addonsHeading": "Ek hizmetler",
		"review.noAddons": "Ek hizmet seçilmedi.",
		"review.quoteFor": "Teklif istenen işler: {list}.",
		"review.editAddons": "Ek hizmetleri düzenle",
		"review.clientHeading": "Bilgileriniz",
		"review.business": "İşletme",
		"review.contact": "İletişim kişisi",
		"review.email": "E-posta",
		"review.country": "Ülke",
		"review.notes": "Notlar",
		"review.editDetails": "Bilgileri düzenle",
		"review.asideLabel": "Tahmini fiyat ve gönderim",
		"review.sendHeading": "BUSW'ya gönder",
		"review.sentTitle": "BUSW'ya gönderildi",
		"review.sentBody": "BUSW projenizi {date} tarihinde aldı. Referans numaranız: {reference}.",
		"review.sentNext": "BUSW projeyi inceleyecek ve kapsamı ile fiyatı onaylamak için {email} adresine e-posta gönderecek. Siz onaylamadan hiçbir işe başlanmaz.",
		"review.sentEarlier": "Daha önceki bir sürümü {date} tarihinde gönderdiniz (referans: {reference}). ",
		"review.sentEarlierStrong": "O tarihten sonra yaptığınız değişiklikler gönderilmedi.",
		"review.sentEarlierTail": " Güncel sürümü göndermek için tekrar gönderin.",
		"review.ack": "Bunun bir tahmin olduğunu anlıyorum. BUSW, projeyi inceledikten sonra kapsamı ve fiyatı onaylayacak.",
		"review.ackHint": "Vergiler dahil değildir ve nihai teklifte kalem kalem gösterilir. Sorularınız için: {email}",
		"review.failedTitle": "Projeniz gönderilemedi",
		"review.failedSaved": "Çalışmanız bu cihazda hâlâ kayıtlı.",
		"review.sending": "Gönderiliyor…",
		"review.tryAgain": "Tekrar dene",
		"review.submitUpdated": "Güncel sürümü gönder",
		"review.submit": "BUSW'ya gönder",
		"review.interimTitle": "Bu sayfadan BUSW'ya hiçbir şey gönderilmez",
		"review.interimBody": "Çevrim içi gönderim henüz bağlı değil. Proje özetini indirmek BUSW'ya hiçbir şey göndermez: indirdiğiniz dosyayı {email} adresine kendiniz e-postayla göndermeniz gerekir. BUSW projenizden yalnızca bu e-posta ulaştığında haberdar olur. Özet; tasarımınızı, ek hizmetlerinizi, tahmini fiyatı ve görsellerinizi içerir.",
		"review.interimButton": "Proje özetini indir",
		"review.submitUnavailable": "BUSW'ya gönder (henüz kullanılamıyor)",
		"review.keepCopy": "Bir kopyasını saklamak ister misiniz? {link}.",
		"review.downloadBrief": "Proje özetini indirin",
		"review.fixItems": "Devam etmek için yukarıda listelenen maddeleri düzeltin.",
		"review.tickBox": "Devam etmek için yukarıdaki kutuyu işaretleyin.",
		"review.briefSaved": "Özet cihazınıza {filename} adıyla kaydedildi.",
		"review.briefNotSent": "BUSW'ya GÖNDERİLMEDİ.",
		"review.briefEmail": " Projenize başlamak için bu dosyayı {email} adresine ek olarak e-postayla gönderin. BUSW dosyayı başka bir yolla almaz.",
		"submit.notConfigured": "Çevrim içi gönderim henüz bağlı değil.",
		"submit.timeout": "BUSW zamanında yanıt vermedi. Gönderildiği doğrulanmadı.",
		"submit.network": "BUSW'ya ulaşılamadı. Bağlantınızı kontrol edip tekrar deneyin. Hiçbir şey gönderilmedi.",
		"submit.unconfirmed": "BUSW sunucusu, gönderiminizi kaydettiğini doğrulamadan yanıt verdi; bu yüzden gönderilmiş sayılmaz. Tekrar deneyin ya da bunun yerine proje özetini indirin.",
		"submit.tooLarge": "Bu proje, çoğunlukla görselleri nedeniyle çevrim içi gönderilemeyecek kadar büyük. Hiçbir şey gönderilmedi. Proje özetini indirip bunun yerine BUSW'ya e-postayla gönderin.",
		"submit.rejected": "BUSW gönderimi bu haliyle kabul edemedi.",
		"submit.unavailable": "BUSW'nun gönderim hizmeti şu anda kullanılamıyor. Hiçbir şey gönderilmedi. Biraz sonra tekrar deneyin ya da bunun yerine proje özetini indirin.",
		"brief.title": "Proje özeti: {business}",
		"brief.h1": "Web sitesi proje özeti",
		"brief.notice": "Geçici özet. Henüz gönderilmedi.",
		"brief.noticeBody": " Bu dosya müşterinin cihazında oluşturuldu ve indirilmesi hiçbir şey göndermez. Müşteri, örneğin {email} adresine e-postayla göndermedikçe BUSW bu dosyayı almış değildir.",
		"brief.client": "Müşteri",
		"brief.business": "İşletme",
		"brief.contact": "İletişim kişisi",
		"brief.email": "E-posta",
		"brief.notes": "Notlar",
		"brief.none": "Yok",
		"brief.project": "Proje",
		"brief.projectId": "Proje kimliği",
		"brief.created": "Oluşturulma",
		"brief.country": "İşletme ülkesi",
		"brief.catalogue": "Fiyat listesi",
		"brief.catalogueValue": "{label}, {currency}, sürüm {version}",
		"brief.template": "Şablon",
		"brief.style": "Stil",
		"brief.pages": "Sayfalar",
		"brief.pageLine": "{file}, {sections}",
		"brief.customLayoutRequested": ", özel düzen istendi",
		"brief.copywritingRequested": ", metni BUSW yazacak",
		"brief.addons": "Seçilen ek hizmetler",
		"brief.noneSelected": "Hiçbiri seçilmedi.",
		"brief.quoteRequests": "Teklif talepleri",
		"brief.quoteNotIncluded": "Bunlar aşağıdaki toplamlara dahil değildir.",
		"brief.quoteSeparately": " BUSW bunlar için ayrıca teklif verecek.",
		"brief.estimate": "Tahmini fiyat",
		"brief.colItem": "Kalem",
		"brief.colQuantity": "Miktar",
		"brief.colUnitPrice": "Birim fiyat",
		"brief.colTotal": "Toplam",
		"brief.notIncluded": "Dahil değildir: {list}.",
		"brief.hourly": "Kapsam dışı iş, önceden kararlaştırılırsa: saatlik {rate} {currency}.",
		"brief.addonsNote": "Seçilen ek hizmetler, müşterinin BUSW'dan teslim etmesini istediği işi kaydeder. Tasarım önizlemesinde çalışmazlar."
	}
};
// src/i18n/locales.ts
/**
* The interface languages BUSW supports for this app. This is separate from the language of a client's
* own website (`project.site.lang`) and from the paid "additional language" add-on.
*
* To add a language: add an entry here, add a `messages/<code>.ts` dictionary, and register it in `catalogues.ts`.
*/
var LOCALES = [{
	code: "en",
	name: "English",
	intl: "en"
}, {
	code: "tr",
	name: "Türkçe",
	intl: "tr-TR"
}];
function intlLocale(code) {
	return LOCALES.find((l) => l.code === code)?.intl ?? "en";
}
// src/i18n/translate.ts
var TOKEN = /\{(\w+)\}/g;
/**
* Finds the message for a key: the current language first, then English. A key that exists in neither
* (impossible while the types hold) yields an empty string, never the raw key.
*/
function resolve(locale, key, count) {
	const candidates = [];
	if (count !== void 0) {
		const category = new Intl.PluralRules(intlLocale(locale)).select(count);
		candidates.push(`${key}_${category}`, `${key}_other`);
	}
	candidates.push(key);
	const order = locale === "en" ? ["en"] : [locale, "en"];
	for (const code of order) {
		const table = CATALOGUES[code];
		for (const candidate of candidates) {
			const found = table[candidate];
			if (found !== void 0) return found;
		}
	}
	return "";
}
function createTranslator(locale) {
	const tag = intlLocale(locale);
	const numberFormat = new Intl.NumberFormat(tag);
	const collator = new Intl.Collator(tag);
	const format = (value) => typeof value === "number" ? numberFormat.format(value) : value;
	const t = (key, params) => {
		return resolve(locale, key, typeof params?.count === "number" ? params.count : void 0).replace(TOKEN, (match, name) => params && name in params ? format(params[name]) : match);
	};
	const rich = (key, parts) => {
		const template = resolve(locale, key, void 0);
		const out = [];
		let last = 0;
		let n = 0;
		for (const match of template.matchAll(TOKEN)) {
			const index = match.index ?? 0;
			if (index > last) out.push(template.slice(last, index));
			const name = match[1];
			out.push(name in parts ? (0, import_react.createElement)(import_react.Fragment, { key: n }, parts[name]) : match[0]);
			n += 1;
			last = index + match[0].length;
		}
		if (last < template.length) out.push(template.slice(last));
		return (0, import_react.createElement)(import_react.Fragment, null, ...out);
	};
	return {
		locale,
		t,
		rich,
		formatNumber: (value, options) => new Intl.NumberFormat(tag, options).format(value),
		formatDate: (value, options = {
			dateStyle: "medium",
			timeStyle: "short"
		}) => new Intl.DateTimeFormat(tag, options).format(new Date(value)),
		collate: (a, b) => collator.compare(a, b)
	};
}
/** English, for code that runs outside the interface: tests, the server-side verifier and default arguments. */
var english = createTranslator("en");
// src/model/order.ts
function defaultAddons() {
	return {
		advancedForm: false,
		booking: false,
		blog: false,
		analytics: false,
		businessEmail: false,
		photoGalleries: 0,
		imagePrepBatches: 0,
		migrationPages: 0,
		extraRevisions: 0,
		languages: [],
		hosting: "none",
		quoteRequests: []
	};
}
function defaultClient() {
	return {
		businessName: "",
		contactName: "",
		email: "",
		notes: ""
	};
}
function defaultOrder() {
	return {
		country: null,
		addons: defaultAddons(),
		client: defaultClient()
	};
}
var HOME_SLUG = "index";
/** Ids of every asset the pages refer to (assets nothing refers to are not part of the design). */
function referencedAssetIds(pages) {
	const used = /* @__PURE__ */ new Set();
	const visit = (value) => {
		if (Array.isArray(value)) value.forEach(visit);
		else if (value && typeof value === "object") {
			const record = value;
			if (typeof record.assetId === "string") used.add(record.assetId);
			Object.values(record).forEach(visit);
		}
	};
	visit(pages);
	return used;
}
// src/model/types.ts
/** Work that BUSW cannot price from the catalogue. It is recorded as a quote request. */
var QUOTE_IDS = [
	"online-store",
	"customer-accounts",
	"payment-system",
	"custom-database",
	"api-integration",
	"complex-animations",
	"base-page-custom-layout"
];
var LIMITS = {
	title: 120,
	heading: 160,
	short: 200,
	text: 2e3,
	body: 6e3,
	description: 300,
	notes: 3e3,
	name: 120,
	pages: 20,
	sections: 40,
	navLinks: 8,
	features: 6,
	gallery: 12,
	assets: 60,
	assetBytes: 4e6,
	languages: 5,
	quantity: 99
};
// src/model/reducer.ts
/** Drops assets nothing refers to. Used when saving or exporting, never on the live state. */
function pruneAssets(project) {
	const assets = {};
	for (const id of referencedAssetIds(project.pages)) {
		const asset = project.assets[id];
		if (asset) assets[id] = asset;
	}
	return {
		...project,
		assets
	};
}
// src/model/ids.ts
var counter = 0;
/** A full-length unique id for a project. It is sent with a submission. */
function newProjectId() {
	return globalThis.crypto?.randomUUID?.() ?? `${newId("proj")}-${Date.now().toString(36)}`;
}
/** Short unique id. Uses crypto.randomUUID when available, with a safe fallback. */
function newId(prefix = "id") {
	const uuid = globalThis.crypto?.randomUUID?.();
	if (uuid) return `${prefix}-${uuid.slice(0, 8)}`;
	counter += 1;
	return `${prefix}-${Date.now().toString(36)}${counter.toString(36)}`;
}
// src/sections/registry.ts
var emptyImage = () => ({
	assetId: null,
	alt: "",
	decorative: false
});
var SECTION_INFO = {
	hero: {
		label: "Hero",
		description: "Headline, short description, a button and an image.",
		defaults: () => ({
			heading: "A short headline about what you do",
			subheading: "One or two sentences that explain it.",
			buttonLabel: "",
			buttonHref: "",
			image: emptyImage()
		})
	},
	textImage: {
		label: "Text and image",
		description: "A heading and paragraphs next to a picture.",
		defaults: () => ({
			heading: "About",
			body: "Write a few sentences here.\n\nLeave a blank line to start a new paragraph.",
			image: emptyImage(),
			imageSide: "right"
		})
	},
	features: {
		label: "Feature cards",
		description: "A row of short cards, for services or highlights.",
		defaults: () => ({
			heading: "What I offer",
			intro: "",
			items: [
				{
					title: "First item",
					text: "A sentence describing it."
				},
				{
					title: "Second item",
					text: "A sentence describing it."
				},
				{
					title: "Third item",
					text: "A sentence describing it."
				}
			]
		})
	},
	gallery: {
		label: "Image gallery",
		description: "A grid of pictures with optional captions.",
		defaults: () => ({
			heading: "Gallery",
			items: [
				{
					image: emptyImage(),
					caption: ""
				},
				{
					image: emptyImage(),
					caption: ""
				},
				{
					image: emptyImage(),
					caption: ""
				}
			]
		})
	},
	contact: {
		label: "Contact",
		description: "Email, phone and address. No form: visitors use your email link.",
		defaults: () => ({
			heading: "Contact",
			text: "The best way to reach me is by email.",
			email: "",
			phone: "",
			address: ""
		})
	}
};
Object.keys(SECTION_INFO);
function createSection(type, anchor = "") {
	return {
		id: newId("s"),
		type,
		anchor,
		props: SECTION_INFO[type].defaults()
	};
}
// src/templates/templates.ts
function section$1(type, anchor, props) {
	const base = createSection(type, anchor);
	return {
		...base,
		props: {
			...base.props,
			...props
		}
	};
}
var year = (/* @__PURE__ */ new Date()).getFullYear();
function project(t, parts) {
	const { sections, ...rest } = parts;
	return {
		version: 2,
		id: newProjectId(),
		templateId: t.id,
		theme: {
			palette: t.palette,
			font: t.font
		},
		assets: {},
		order: defaultOrder(),
		pages: [{
			id: newId("pg"),
			title: "Home",
			slug: HOME_SLUG,
			description: rest.site.description,
			customLayout: false,
			copywriting: false,
			sections
		}],
		...rest
	};
}
var TEMPLATES = [
	{
		id: "studio",
		name: "Studio",
		description: "A bold intro, a gallery of your work, a short about section and a way to get in touch.",
		palette: "ink",
		font: "system",
		build() {
			return project(this, {
				site: {
					title: "Your Studio",
					description: "A short description of your studio and the work you do.",
					lang: "en"
				},
				header: {
					brand: "Your Studio",
					links: [
						{
							label: "Work",
							href: "#work"
						},
						{
							label: "About",
							href: "#about"
						},
						{
							label: "Contact",
							href: "#contact"
						}
					]
				},
				footer: { text: `© ${year} Your Studio` },
				sections: [
					section$1("hero", "", {
						heading: "We make things that are worth looking at",
						subheading: "Replace this with one or two sentences about what you do and who it is for.",
						buttonLabel: "See our work",
						buttonHref: "#work"
					}),
					section$1("gallery", "work", { heading: "Selected work" }),
					section$1("textImage", "about", {
						heading: "About the studio",
						body: "Tell visitors who you are and what you care about.\n\nA short second paragraph works well for how you work."
					}),
					section$1("contact", "contact", {
						heading: "Let's talk",
						text: "Tell us about your project."
					})
				]
			});
		}
	},
	{
		id: "local-business",
		name: "Local business",
		description: "Services, a short story, and your address and opening details up front.",
		palette: "paper",
		font: "humanist",
		build() {
			return project(this, {
				site: {
					title: "Your Business",
					description: "What your business offers and where to find it.",
					lang: "en"
				},
				header: {
					brand: "Your Business",
					links: [
						{
							label: "Services",
							href: "#services"
						},
						{
							label: "About",
							href: "#about"
						},
						{
							label: "Visit us",
							href: "#contact"
						}
					]
				},
				footer: { text: `© ${year} Your Business` },
				sections: [
					section$1("hero", "", {
						heading: "Friendly, reliable service in your area",
						subheading: "Say in a sentence what you offer and who you help.",
						buttonLabel: "Contact us",
						buttonHref: "#contact"
					}),
					section$1("features", "services", {
						heading: "Our services",
						intro: "",
						items: [
							{
								title: "Service one",
								text: "Describe it in a sentence."
							},
							{
								title: "Service two",
								text: "Describe it in a sentence."
							},
							{
								title: "Service three",
								text: "Describe it in a sentence."
							}
						]
					}),
					section$1("textImage", "about", {
						heading: "About us",
						body: "Share how the business started and what you stand for.",
						imageSide: "left"
					}),
					section$1("contact", "contact", {
						heading: "Visit or get in touch",
						text: "Add your opening hours here."
					})
				]
			});
		}
	},
	{
		id: "personal",
		name: "Personal page",
		description: "A calm single page to introduce yourself, share what you do and invite contact.",
		palette: "sand",
		font: "serif",
		build() {
			return project(this, {
				site: {
					title: "Your Name",
					description: "A short introduction to who you are and what you do.",
					lang: "en"
				},
				header: {
					brand: "Your Name",
					links: [{
						label: "About",
						href: "#about"
					}, {
						label: "Contact",
						href: "#contact"
					}]
				},
				footer: { text: `© ${year} Your Name` },
				sections: [
					section$1("hero", "", {
						heading: "Hello, I'm Your Name",
						subheading: "A line about what you do or what you are working on.",
						buttonLabel: "Say hello",
						buttonHref: "#contact"
					}),
					section$1("textImage", "about", {
						heading: "About me",
						body: "Write a few sentences about yourself.\n\nMention what you enjoy working on."
					}),
					section$1("features", "", {
						heading: "Highlights",
						intro: "",
						items: [
							{
								title: "Highlight one",
								text: "A sentence about it."
							},
							{
								title: "Highlight two",
								text: "A sentence about it."
							},
							{
								title: "Highlight three",
								text: "A sentence about it."
							}
						]
					}),
					section$1("contact", "contact", {
						heading: "Contact",
						text: "Email is the best way to reach me."
					})
				]
			});
		}
	}
];
// src/pricing/estimate.ts
function designCounts(project) {
	const additional = project.pages.slice(1);
	const customLayoutPages = additional.filter((p) => p.customLayout).length;
	return {
		pages: project.pages.length,
		additionalStandardPages: additional.length - customLayoutPages,
		customLayoutPages,
		extraSections: project.pages.reduce((sum, p) => sum + Math.max(0, p.sections.length - 6), 0),
		copywritingPages: project.pages.filter((p) => p.copywriting).length
	};
}
var quantity = (value) => Number.isFinite(value) ? Math.min(LIMITS.quantity, Math.max(0, Math.trunc(value))) : 0;
/** Number of translated pages, summed over all additional languages. */
function translatedPages(project) {
	const pages = project.pages.length;
	return project.order.addons.languages.reduce((sum, l) => sum + (l.allPages ? pages : Math.min(pages, quantity(l.pageCount))), 0);
}
function calculateEstimate(project) {
	const region = regionForCountry(project.order.country);
	const empty = {
		catalogueVersion: CATALOGUE_VERSION,
		region,
		lines: [],
		oneTimeTotalMinor: 0,
		monthlyTotalMinor: 0,
		quoteOnly: [],
		hourlyRateMinor: null
	};
	if (!region) return empty;
	const a = project.order.addons;
	const d = designCounts(project);
	const lines = [];
	const add = (id, qty, source, detail) => {
		if (qty <= 0) return;
		const entry = CATALOGUE[id];
		const unitPriceMinor = entry.prices[region.id];
		lines.push({
			id,
			label: entry.label,
			quantity: qty,
			unit: entry.unit,
			unitPriceMinor,
			totalMinor: unitPriceMinor * qty,
			billing: entry.billing === "monthly" ? "monthly" : "one-time",
			source,
			detail
		});
	};
	add("base-website", 1, "included", "Home page with up to six sections");
	add("additional-page", d.additionalStandardPages, "design", "Counted from the pages in your design");
	add("custom-page-layout", d.customLayoutPages, "design", "Replaces the additional-page charge for those pages");
	add("additional-section", d.extraSections, "design", `Sections beyond 6 on a page, counted from your design`);
	add("copywriting-page", d.copywritingPages, "design", "Pages where you asked BUSW to write the text");
	add("image-preparation-batch", quantity(a.imagePrepBatches), "selection", "Batches of up to 20 images");
	add("photo-gallery", quantity(a.photoGalleries), "selection", "Galleries of up to 30 images");
	add("advanced-inquiry-form", a.advancedForm ? 1 : 0, "selection", "Charged once");
	add("booking-integration", a.booking ? 1 : 0, "selection", "One existing booking service");
	add("blog-cms-setup", a.blog ? 1 : 0, "selection", "One article template and three articles");
	add("extra-language-setup", a.languages.length, "selection", "One setup fee for each additional language");
	add("extra-language-page", translatedPages(project), "design", "Pages translated, counted for each additional language");
	add("analytics-setup", a.analytics ? 1 : 0, "selection", "One analytics service");
	add("business-email-setup", a.businessEmail ? 1 : 0, "selection", "One mailbox provider");
	add("content-migration-page", quantity(a.migrationPages), "selection", "Pages moved from your existing site");
	add("extra-revision-round", quantity(a.extraRevisions), "selection", "Beyond the two included rounds");
	if (a.hosting === "hosting") add("managed-hosting-month", 1, "selection", "Billed monthly, optional");
	if (a.hosting === "care") add("website-care-month", 1, "selection", "Billed monthly, includes hosting, optional");
	const sum = (billing) => lines.filter((l) => l.billing === billing).reduce((s, l) => s + l.totalMinor, 0);
	return {
		catalogueVersion: CATALOGUE_VERSION,
		region,
		lines,
		oneTimeTotalMinor: sum("one-time"),
		monthlyTotalMinor: sum("monthly"),
		quoteOnly: QUOTE_ITEMS.filter((q) => a.quoteRequests.includes(q.id)),
		hourlyRateMinor: CATALOGUE["out-of-scope-hour"].prices[region.id]
	};
}
// src/submission/snapshot.ts
/** A readable name for a project that did not start from one of the built-in templates. */
function templateLabel(id) {
	if (id === null) return null;
	return id === "blank" ? "Blank page" : "Custom design";
}
var SUBMISSION_SCHEMA = "busw-website-submission/1";
var EXTENSION = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp"
};
function dataUrlBytes(dataUrl) {
	const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
	const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
	return Math.floor(base64.length * 3 / 4) - padding;
}
function assetFileName(asset) {
	return `assets/${asset.id}.${EXTENSION[asset.mime]}`;
}
function snapshotLines(estimate) {
	return estimate.lines.map(({ id, label, quantity, unit, unitPriceMinor, totalMinor, billing, source }) => ({
		id,
		label,
		quantity,
		unit,
		unitPriceMinor,
		totalMinor,
		billing,
		source
	}));
}
/** Freezes the design, selections and estimate into one self-contained record. */
function buildSubmission(project, options) {
	const estimate = calculateEstimate(project);
	const region = estimate.region;
	if (!region || project.order.country === null) throw new Error("A country must be selected before a submission can be built.");
	const used = referencedAssetIds(project.pages);
	const assets = [];
	const assetData = {};
	for (const id of used) {
		const asset = project.assets[id];
		if (!asset) continue;
		assets.push({
			id,
			name: asset.name,
			mime: asset.mime,
			width: asset.width,
			height: asset.height,
			bytes: dataUrlBytes(asset.dataUrl),
			file: assetFileName(asset)
		});
		assetData[id] = asset.dataUrl;
	}
	const template = TEMPLATES.find((t) => t.id === project.templateId);
	return {
		submission: {
			schema: SUBMISSION_SCHEMA,
			submissionId: options.submissionId,
			projectId: project.id,
			submittedAt: options.now.toISOString(),
			acknowledgedEstimate: options.acknowledgedEstimate,
			client: project.order.client,
			location: {
				country: project.order.country,
				countryName: countryName(project.order.country),
				region: region.id,
				currency: region.currency,
				catalogueVersion: estimate.catalogueVersion
			},
			template: {
				id: project.templateId,
				name: template?.name ?? templateLabel(project.templateId)
			},
			design: {
				site: project.site,
				theme: project.theme,
				header: project.header,
				footer: project.footer,
				pages: project.pages
			},
			assets,
			addons: project.order.addons,
			pricing: {
				lines: snapshotLines(estimate),
				oneTimeTotalMinor: estimate.oneTimeTotalMinor,
				monthlyTotalMinor: estimate.monthlyTotalMinor,
				quoteOnly: estimate.quoteOnly.map(({ id, label }) => ({
					id,
					label
				})),
				hourlyRateMinor: estimate.hourlyRateMinor,
				notices: {
					estimate: ESTIMATE_NOTICE,
					tax: TAX_NOTICE,
					exclusions: [...EXCLUSIONS]
				}
			}
		},
		assetData
	};
}
// src/submission/brief.ts
function decode(dataUrl) {
	const binary = atob(dataUrl.slice(dataUrl.indexOf(",") + 1));
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
	return bytes;
}
var e = escapeHtml;
var isItemId = (id) => ITEM_IDS.includes(id);
var quoteIds = QUOTE_ITEMS.map((q) => q.id);
/** The add-ons the client selected, as plain sentences. Shared by the brief and the review screen. */
function selectionSummary(a, t = english.t) {
	return [
		a.advancedForm && itemLabel(t, "advanced-inquiry-form"),
		a.booking && itemLabel(t, "booking-integration"),
		a.blog && itemLabel(t, "blog-cms-setup"),
		a.analytics && itemLabel(t, "analytics-setup"),
		a.businessEmail && itemLabel(t, "business-email-setup"),
		a.photoGalleries > 0 && t("selection.gallery", { count: a.photoGalleries }),
		a.imagePrepBatches > 0 && t("selection.imagePrep", { count: a.imagePrepBatches }),
		a.migrationPages > 0 && t("selection.migration", { count: a.migrationPages }),
		a.extraRevisions > 0 && t("selection.revisions", { count: a.extraRevisions }),
		...a.languages.map((l) => t("selection.language", {
			name: l.name || t("selection.languageUnnamed"),
			scope: l.allPages ? t("selection.allPages") : t("selection.nPages", { count: l.pageCount })
		})),
		a.hosting === "hosting" && t("selection.hostingMonthly"),
		a.hosting === "care" && t("selection.careMonthly")
	].filter(Boolean);
}
/** A readable, printable summary of the submission for BUSW and for the client's own records. */
function briefHtml(payload, i18n = english) {
	const { t } = i18n;
	const s = payload.submission;
	const region = REGIONS[s.location.region];
	const money = (minor) => formatMoney(minor, region);
	const sectionCount = (n) => t("list.sections", { count: n });
	const oneTime = s.pricing.lines.filter((l) => l.billing === "one-time");
	const monthly = s.pricing.lines.filter((l) => l.billing === "monthly");
	const rows = (lines) => lines.map((l) => `<tr><td>${e(isItemId(l.id) ? itemLabel(t, l.id) : l.label)}</td><td>${i18n.formatNumber(l.quantity)} ${e(isItemId(l.id) ? itemUnit(t, l.id) : l.unit)}</td><td class="n">${money(l.unitPriceMinor)}</td><td class="n">${money(l.totalMinor)}</td></tr>`).join("");
	const pages = s.design.pages.map((p) => `<li><strong>${e(p.title)}</strong> (${e(p.slug)}.html), ${e(sectionCount(p.sections.length))}${p.customLayout ? e(t("brief.customLayoutRequested")) : ""}${p.copywriting ? e(t("brief.copywritingRequested")) : ""}</li>`).join("");
	const selections = selectionSummary(s.addons, t);
	const exclusions = EXCLUSION_KEYS.map((key) => t(`estimate.exclusion.${key}`)).join(", ");
	return `<!doctype html>
<html lang="${i18n.locale}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${e(t("brief.title", { business: s.client.businessName }))}</title>
<style>
body{font:16px/1.55 system-ui,sans-serif;max-width:48rem;margin:2rem auto;padding:0 1rem;color:#16181d}
h1{font-size:1.6rem}h2{font-size:1.1rem;margin-top:2rem;border-bottom:1px solid #d5d8de;padding-bottom:.25rem}
table{border-collapse:collapse;width:100%}td,th{padding:.35rem .5rem;border-bottom:1px solid #e5e7eb;text-align:left;vertical-align:top}
.n{text-align:right;white-space:nowrap}.notice{background:#fff4e5;border:1px solid #f0c27b;padding:.75rem 1rem;border-radius:6px}
dt{color:#4b5260;font-size:.875rem}dd{margin:0 0 .5rem}
</style></head><body>
<h1>${e(t("brief.h1"))}</h1>
<p class="notice"><strong>${e(t("brief.notice"))}</strong>${e(t("brief.noticeBody", { email: "contact@busoftwareworks.com" }))}</p>

<h2>${e(t("brief.client"))}</h2>
<dl><dt>${e(t("brief.business"))}</dt><dd>${e(s.client.businessName)}</dd><dt>${e(t("brief.contact"))}</dt><dd>${e(s.client.contactName)}</dd><dt>${e(t("brief.email"))}</dt><dd>${e(s.client.email)}</dd>
<dt>${e(t("brief.notes"))}</dt><dd>${s.client.notes.trim() ? e(s.client.notes).replace(/\n/g, "<br>") : e(t("brief.none"))}</dd></dl>

<h2>${e(t("brief.project"))}</h2>
<dl><dt>${e(t("brief.projectId"))}</dt><dd>${e(s.projectId)}</dd><dt>${e(t("brief.created"))}</dt><dd>${e(s.submittedAt)}</dd>
<dt>${e(t("brief.country"))}</dt><dd>${e(countryName(s.location.country, i18n.locale))} (${e(s.location.country)})</dd>
<dt>${e(t("brief.catalogue"))}</dt><dd>${e(t("brief.catalogueValue", {
		label: regionLabel(t, region.id),
		currency: s.location.currency,
		version: s.location.catalogueVersion
	}))}</dd>
<dt>${e(t("brief.template"))}</dt><dd>${e(startingPointLabel(t, s.template.id))}</dd><dt>${e(t("brief.style"))}</dt><dd>${e(t("review.styleValue", {
		palette: paletteLabel(t, s.design.theme.palette),
		font: fontLabel(t, s.design.theme.font)
	}))}</dd></dl>

<h2>${e(t("brief.pages"))}</h2><ul>${pages}</ul>

<h2>${e(t("brief.addons"))}</h2>${selections.length ? `<ul>${selections.map((x) => `<li>${e(x)}</li>`).join("")}</ul>` : `<p>${e(t("brief.noneSelected"))}</p>`}
${s.pricing.quoteOnly.length ? `<h2>${e(t("brief.quoteRequests"))}</h2><ul>${s.pricing.quoteOnly.map((q) => `<li>${e(quoteIds.includes(q.id) ? quoteLabel(t, q.id) : q.label)}</li>`).join("")}</ul><p><strong>${e(t("brief.quoteNotIncluded"))}</strong>${e(t("brief.quoteSeparately"))}</p>` : ""}

<h2>${e(t("brief.estimate"))}</h2>
<table><thead><tr><th>${e(t("brief.colItem"))}</th><th>${e(t("brief.colQuantity"))}</th><th class="n">${e(t("brief.colUnitPrice"))}</th><th class="n">${e(t("brief.colTotal"))}</th></tr></thead><tbody>${rows(oneTime)}</tbody>
<tfoot><tr><th colspan="3">${e(t("estimate.oneTimeTotal"))}</th><th class="n">${formatTotal(s.pricing.oneTimeTotalMinor, region)}</th></tr></tfoot></table>
${monthly.length ? `<table style="margin-top:1rem"><tbody>${rows(monthly)}</tbody><tfoot><tr><th colspan="3">${e(t("estimate.monthlyTotal"))}</th><th class="n">${formatTotal(s.pricing.monthlyTotalMinor, region)}</th></tr></tfoot></table>` : ""}
<p>${e(t("estimate.notice"))} ${e(t("estimate.tax"))}</p>
<p>${e(t("brief.notIncluded", { list: exclusions }))}</p>
${s.pricing.hourlyRateMinor !== null ? `<p>${e(t("brief.hourly", {
		rate: money(s.pricing.hourlyRateMinor),
		currency: s.location.currency
	}))}</p>` : ""}
<p>${e(t("brief.addonsNote"))}</p>
</body></html>
`;
}
/** Everything BUSW needs, in one file: the brief, the machine-readable submission, the design and the images. */
function buildBriefPackage(project, payload, i18n = english) {
	const files = {
		"brief.html": strToU8(briefHtml(payload, i18n)),
		"submission.json": strToU8(JSON.stringify(payload.submission, null, 2)),
		"design.busw-site.json": strToU8(JSON.stringify(pruneAssets(project)))
	};
	for (const ref of payload.submission.assets) {
		const data = payload.assetData[ref.id];
		if (data) files[assetFileName(ref)] = decode(data);
	}
	return {
		filename: `busw-brief-${payload.submission.client.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "website"}-${payload.submission.submittedAt.slice(0, 10)}.zip`,
		zip: zipSync(files, { level: 6 })
	};
}
// src/model/urls.ts
var EMAIL_PATTERN = "[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(?:\\.[A-Za-z0-9-]+)+";
var EMAIL = new RegExp(`^${EMAIL_PATTERN}$`);
new RegExp(`^mailto:${EMAIL_PATTERN}$`, "i");
function isEmail(value) {
	return EMAIL.test(value.trim());
}
function isAnchorSlug(value) {
	return value === "" || /^[a-z][a-z0-9-]{0,39}$/.test(value);
}
// src/model/validate.ts
var ValidationError = class extends Error {};
function fail(path, message) {
	throw new ValidationError(`${path}: ${message}`);
}
var str = (max) => (value, path) => {
	if (typeof value !== "string") fail(path, "expected text");
	if (value.length > max) fail(path, `longer than ${max} characters`);
	return value;
};
var bool = (value, path) => {
	if (typeof value !== "boolean") fail(path, "expected true or false");
	return value;
};
var count = (max) => (value, path) => {
	if (typeof value !== "number" || !Number.isInteger(value) || value < 0 || value > max) fail(path, `expected a whole number from 0 to ${max}`);
	return value;
};
var oneOf = (options) => (value, path) => {
	if (typeof value !== "string" || !options.includes(value)) fail(path, `expected one of ${options.join(", ")}`);
	return value;
};
var arr = (item, max) => (value, path) => {
	if (!Array.isArray(value)) fail(path, "expected a list");
	if (value.length > max) fail(path, `more than ${max} items`);
	return value.map((entry, i) => item(entry, `${path}[${i}]`));
};
function obj(shape) {
	return (value, path) => {
		if (typeof value !== "object" || value === null || Array.isArray(value)) fail(path, "expected an object");
		const record = value;
		const out = {};
		for (const key of Object.keys(shape)) out[key] = shape[key](record[key], `${path}.${String(key)}`);
		return out;
	};
}
var image = obj({
	assetId: (value, path) => value === null ? null : str(80)(value, path),
	alt: str(LIMITS.short),
	decorative: bool
});
var header = obj({
	brand: str(LIMITS.short),
	links: arr(obj({
		label: str(60),
		href: str(LIMITS.short)
	}), LIMITS.navLinks)
});
var footer = obj({ text: str(LIMITS.short) });
var SECTION_SCHEMAS = {
	hero: obj({
		heading: str(LIMITS.heading),
		subheading: str(LIMITS.text),
		buttonLabel: str(60),
		buttonHref: str(LIMITS.short),
		image
	}),
	textImage: obj({
		heading: str(LIMITS.heading),
		body: str(LIMITS.body),
		image,
		imageSide: oneOf(["left", "right"])
	}),
	features: obj({
		heading: str(LIMITS.heading),
		intro: str(LIMITS.text),
		items: arr(obj({
			title: str(LIMITS.short),
			text: str(LIMITS.text)
		}), LIMITS.features)
	}),
	gallery: obj({
		heading: str(LIMITS.heading),
		items: arr(obj({
			image,
			caption: str(LIMITS.short)
		}), LIMITS.gallery)
	}),
	contact: obj({
		heading: str(LIMITS.heading),
		text: str(LIMITS.text),
		email: str(LIMITS.short),
		phone: str(60),
		address: str(LIMITS.short)
	})
};
var SECTION_TYPES = Object.keys(SECTION_SCHEMAS);
var section = (value, path) => {
	if (typeof value !== "object" || value === null) fail(path, "expected an object");
	const record = value;
	const type = oneOf(SECTION_TYPES)(record.type, `${path}.type`);
	const anchor = str(40)(record.anchor, `${path}.anchor`);
	if (!isAnchorSlug(anchor)) fail(`${path}.anchor`, "use lowercase letters, numbers and hyphens");
	return {
		id: str(80)(record.id, `${path}.id`),
		type,
		anchor,
		props: SECTION_SCHEMAS[type](record.props, `${path}.props`)
	};
};
var SLUG = /^[a-z][a-z0-9-]{0,39}$/;
var page = obj({
	id: str(80),
	title: str(LIMITS.title),
	slug: (value, path) => {
		const slug = str(40)(value, path);
		if (slug !== "index" && !SLUG.test(slug)) fail(path, "use lowercase letters, numbers and hyphens, starting with a letter");
		return slug;
	},
	description: str(LIMITS.description),
	customLayout: bool,
	copywriting: bool,
	sections: arr(section, LIMITS.sections)
});
var DATA_URL$1 = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
var dimension = (v, p) => {
	if (typeof v !== "number" || !Number.isInteger(v) || v < 1 || v > 1e4) fail(p, "invalid size");
	return v;
};
var asset = obj({
	id: str(80),
	name: str(LIMITS.short),
	mime: oneOf([
		"image/jpeg",
		"image/png",
		"image/webp"
	]),
	width: dimension,
	height: dimension,
	dataUrl: (v, p) => {
		const text = str(LIMITS.assetBytes * 2)(v, p);
		if (!DATA_URL$1.test(text)) fail(p, "not a supported embedded image");
		return text;
	}
});
var language = obj({
	id: str(80),
	name: str(60),
	allPages: bool,
	pageCount: count(LIMITS.pages)
});
var order = obj({
	country: (value, path) => {
		if (value === null) return null;
		const code = str(2)(value, path);
		if (!isCountryCode(code)) fail(path, "unknown country");
		return code;
	},
	addons: obj({
		advancedForm: bool,
		booking: bool,
		blog: bool,
		analytics: bool,
		businessEmail: bool,
		photoGalleries: count(LIMITS.quantity),
		imagePrepBatches: count(LIMITS.quantity),
		migrationPages: count(LIMITS.quantity),
		extraRevisions: count(LIMITS.quantity),
		languages: arr(language, LIMITS.languages),
		hosting: oneOf([
			"none",
			"hosting",
			"care"
		]),
		quoteRequests: arr(oneOf(QUOTE_IDS), QUOTE_IDS.length)
	}),
	client: obj({
		businessName: str(LIMITS.name),
		contactName: str(LIMITS.name),
		email: str(LIMITS.short),
		notes: str(LIMITS.notes)
	})
});
var projectSchema = (value, path) => {
	if (typeof value !== "object" || value === null) fail(path, "expected an object");
	const r = value;
	if (r.version !== 2) fail(`${path}.version`, `unsupported version (expected 2)`);
	const assetsRaw = r.assets;
	if (typeof assetsRaw !== "object" || assetsRaw === null || Array.isArray(assetsRaw)) fail(`${path}.assets`, "expected an object");
	const assetEntries = Object.entries(assetsRaw);
	if (assetEntries.length > LIMITS.assets) fail(`${path}.assets`, `more than ${LIMITS.assets} images`);
	const assets = {};
	for (const [key, entry] of assetEntries) {
		const parsed = asset(entry, `${path}.assets.${key}`);
		if (parsed.id !== key) fail(`${path}.assets.${key}`, "id does not match its key");
		assets[key] = parsed;
	}
	const pages = arr(page, LIMITS.pages)(r.pages, `${path}.pages`);
	if (pages.length === 0) fail(`${path}.pages`, "a site needs at least one page");
	if (pages[0]?.slug !== "index") fail(`${path}.pages[0].slug`, `the first page must use the slug "${HOME_SLUG}"`);
	const pageIds = /* @__PURE__ */ new Set();
	const slugs = /* @__PURE__ */ new Set();
	const sectionIds = /* @__PURE__ */ new Set();
	pages.forEach((p, i) => {
		if (pageIds.has(p.id)) fail(`${path}.pages`, `duplicate page id ${p.id}`);
		pageIds.add(p.id);
		if (slugs.has(p.slug)) fail(`${path}.pages`, `duplicate page slug ${p.slug}`);
		slugs.add(p.slug);
		if (i > 0 && p.slug === "index") fail(`${path}.pages[${i}].slug`, `"${HOME_SLUG}" is reserved for the home page`);
		if (i === 0 && p.customLayout) fail(`${path}.pages[0].customLayout`, "the home page uses a quote request for a custom layout");
		for (const s of p.sections) {
			if (sectionIds.has(s.id)) fail(`${path}.pages`, `duplicate section id ${s.id}`);
			sectionIds.add(s.id);
		}
	});
	return {
		version: 2,
		id: str(80)(r.id, `${path}.id`),
		templateId: r.templateId === null ? null : str(60)(r.templateId, `${path}.templateId`),
		site: obj({
			title: str(LIMITS.title),
			description: str(LIMITS.description),
			lang: (v, p) => {
				const text = str(20)(v, p);
				if (!/^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/.test(text)) fail(p, "invalid language code");
				return text;
			}
		})(r.site, `${path}.site`),
		theme: obj({
			palette: oneOf([
				"paper",
				"ink",
				"sand",
				"forest"
			]),
			font: oneOf([
				"system",
				"humanist",
				"serif"
			])
		})(r.theme, `${path}.theme`),
		header: r.header === null ? null : header(r.header, `${path}.header`),
		footer: r.footer === null ? null : footer(r.footer, `${path}.footer`),
		pages,
		assets,
		order: order(r.order, `${path}.order`)
	};
};
/** Version 1 projects had one list of sections. They become the home page of a version 2 project. */
function migrate(input) {
	if (typeof input !== "object" || input === null) return input;
	const record = input;
	if (record.version !== 1) return input;
	const { sections, ...rest } = record;
	const site = record.site ?? {};
	return {
		...rest,
		version: 2,
		id: newProjectId(),
		templateId: "custom",
		pages: [{
			id: newId("pg"),
			title: typeof site.title === "string" && site.title ? site.title : "Home",
			slug: HOME_SLUG,
			description: "",
			customLayout: false,
			copywriting: false,
			sections
		}],
		order: defaultOrder()
	};
}
/** Strictly validates untrusted data (an opened file, a stored draft or a submission). */
function parseProject(input) {
	try {
		return {
			ok: true,
			project: projectSchema(migrate(input), "project")
		};
	} catch (error) {
		if (error instanceof ValidationError) return {
			ok: false,
			error: error.message
		};
		throw error;
	}
}
// src/submission/clientDetails.ts
/** The same rules run in the browser and on any server that receives a submission. */
function validateClient(client, t = english.t) {
	const errors = {};
	if (client.businessName.trim() === "") errors.businessName = t("validation.businessName.required");
	else if (client.businessName.length > LIMITS.name) errors.businessName = t("validation.tooLong", { max: LIMITS.name });
	if (client.contactName.trim() === "") errors.contactName = t("validation.contactName.required");
	else if (client.contactName.length > LIMITS.name) errors.contactName = t("validation.tooLong", { max: LIMITS.name });
	if (client.email.trim() === "") errors.email = t("validation.email.required");
	else if (!isEmail(client.email) || client.email.length > LIMITS.short) errors.email = t("validation.email.invalid");
	if (client.notes.length > LIMITS.notes) errors.notes = t("validation.tooLong", { max: LIMITS.notes });
	return errors;
}
// src/submission/verify.ts
/**
* Server-side checks for a submission. This module deliberately has no DOM or React
* dependency so it can run unchanged in a Node function.
*
* Contract: the browser's prices are never trusted. Everything the server stores or quotes comes from
* `trusted`, which is recalculated here from the design and selections using the server's own catalogue.
*/
var isRecord = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
var MIMES = [
	"image/jpeg",
	"image/png",
	"image/webp"
];
var DATA_URL = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
function verifySubmission(input) {
	if (!isRecord(input) || !isRecord(input.submission)) return {
		ok: false,
		errors: ["The request must contain a submission object."]
	};
	const s = input.submission;
	const errors = [];
	if (s.schema !== "busw-website-submission/1") errors.push(`Unsupported schema. Expected ${SUBMISSION_SCHEMA}.`);
	for (const key of ["submissionId", "projectId"]) if (typeof s[key] !== "string" || s[key] === "" || s[key].length > 80) errors.push(`${key} is missing or invalid.`);
	const submittedAt = typeof s.submittedAt === "string" ? Date.parse(s.submittedAt) : NaN;
	if (Number.isNaN(submittedAt)) errors.push("submittedAt is not a valid date.");
	if (s.acknowledgedEstimate !== true) errors.push("The client must confirm they understand the price is an estimate.");
	const location = isRecord(s.location) ? s.location : {};
	const design = isRecord(s.design) ? s.design : null;
	const client = isRecord(s.client) ? s.client : null;
	const template = isRecord(s.template) ? s.template : {};
	if (!design) errors.push("design is missing.");
	if (!client) errors.push("client is missing.");
	if (!isRecord(s.addons)) errors.push("addons is missing.");
	if (!Array.isArray(s.assets)) errors.push("assets is missing.");
	if (errors.length > 0 || !design || !client) return {
		ok: false,
		errors
	};
	const parsed = parseProject({
		...design,
		version: 2,
		id: s.projectId,
		templateId: typeof template.id === "string" ? template.id : null,
		assets: {},
		order: {
			country: location.country ?? null,
			addons: s.addons,
			client
		}
	});
	if (!parsed.ok) return {
		ok: false,
		errors: [parsed.error]
	};
	const project = parsed.project;
	const region = regionForCountry(project.order.country);
	if (!region) errors.push("order.country: a valid country is required.");
	const clientErrors = validateClient(project.order.client);
	for (const message of Object.values(clientErrors)) errors.push(message);
	const refs = s.assets;
	if (refs.length > LIMITS.assets) errors.push(`More than ${LIMITS.assets} images.`);
	const listed = /* @__PURE__ */ new Set();
	for (const ref of refs) {
		if (!isRecord(ref) || typeof ref.id !== "string" || !MIMES.includes(String(ref.mime))) {
			errors.push("An asset reference is malformed.");
			continue;
		}
		listed.add(ref.id);
	}
	const assetData = isRecord(input.assetData) ? input.assetData : {};
	for (const id of referencedAssetIds(project.pages)) if (!listed.has(id)) errors.push(`The design uses image ${id}, which is not listed in assets.`);
	for (const id of listed) {
		const data = assetData[id];
		if (typeof data !== "string" || !DATA_URL.test(data)) errors.push(`Image ${id} is missing or is not a supported image.`);
		else if (dataUrlBytes(data) > LIMITS.assetBytes) errors.push(`Image ${id} is larger than ${LIMITS.assetBytes / 1e6} MB.`);
	}
	if (errors.length > 0) return {
		ok: false,
		errors
	};
	const estimate = calculateEstimate(project);
	const pricing = isRecord(s.pricing) ? s.pricing : {};
	const discrepancies = [];
	if (location.currency !== region?.currency) discrepancies.push(`Currency: browser said ${String(location.currency)}, catalogue says ${region?.currency}.`);
	if (location.region !== region?.id) discrepancies.push(`Region: browser said ${String(location.region)}, catalogue says ${region?.id}.`);
	if (location.catalogueVersion !== estimate.catalogueVersion) discrepancies.push(`Catalogue version: browser used ${String(location.catalogueVersion)}, server uses ${estimate.catalogueVersion}.`);
	if (pricing.oneTimeTotalMinor !== estimate.oneTimeTotalMinor) discrepancies.push(`One-time total: browser said ${String(pricing.oneTimeTotalMinor)}, recalculated ${estimate.oneTimeTotalMinor}.`);
	if (pricing.monthlyTotalMinor !== estimate.monthlyTotalMinor) discrepancies.push(`Monthly total: browser said ${String(pricing.monthlyTotalMinor)}, recalculated ${estimate.monthlyTotalMinor}.`);
	return {
		ok: true,
		trusted: {
			submissionId: s.submissionId,
			projectId: s.projectId,
			submittedAt: new Date(submittedAt).toISOString(),
			project,
			estimate,
			discrepancies
		}
	};
}
// tools/submission-entry.ts
/** Lets a test and the endpoint check that this bundle was built from the current catalogue. */
var catalogueVersion = CATALOGUE_VERSION;
function processSubmission(input) {
	const verified = verifySubmission(input);
	if (!verified.ok) return verified;
	const { trusted } = verified;
	const { submission, assetData } = input;
	const assets = {};
	for (const ref of submission.assets) {
		const dataUrl = assetData[ref.id];
		if (typeof dataUrl !== "string") continue;
		assets[ref.id] = {
			id: ref.id,
			name: typeof ref.name === "string" ? ref.name.slice(0, 200) : ref.id,
			mime: ref.mime,
			width: typeof ref.width === "number" ? ref.width : 0,
			height: typeof ref.height === "number" ? ref.height : 0,
			dataUrl
		};
	}
	const project = {
		...trusted.project,
		assets
	};
	const brief = buildBriefPackage(project, buildSubmission(project, {
		now: new Date(trusted.submittedAt),
		submissionId: trusted.submissionId,
		acknowledgedEstimate: true
	}));
	const { estimate } = trusted;
	const region = estimate.region;
	if (!region) return {
		ok: false,
		errors: ["order.country: a valid country is required."]
	};
	return {
		ok: true,
		submissionId: trusted.submissionId,
		filename: brief.filename,
		zip: brief.zip,
		summary: {
			business: project.order.client.businessName,
			contact: project.order.client.contactName,
			email: project.order.client.email,
			country: countryName(project.order.country ?? ""),
			currency: region.currency,
			oneTime: formatTotal(estimate.oneTimeTotalMinor, region),
			monthly: formatTotal(estimate.monthlyTotalMinor, region),
			pages: project.pages.length,
			images: Object.keys(assets).length,
			quoteOnly: estimate.quoteOnly.map((q) => q.label)
		},
		discrepancies: trusted.discrepancies
	};
}
export { catalogueVersion, processSubmission };
