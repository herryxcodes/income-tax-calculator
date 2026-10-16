// Every outbound partner link lives here so it can be swapped in one place.
// Links that can earn us money keep rel="sponsored" and a disclosure next to them
// (Wealthsimple requires per-placement disclosure, not just a site-wide page).

export interface Partner {
  name: string;
  url: string;
  /** "affiliate" (network-tracked), "referral" (personal invite code) or "none" (plain link). */
  kind: "affiliate" | "referral" | "none";
  /** One-line disclosure shown beside the link. */
  disclosure: string;
}

// Wealthsimple's personal referral pays only when the person opens and funds an
// eligible investing or chequing account; filing a tax return alone earns nothing.
const WEALTHSIMPLE_REFERRAL = "https://www.wealthsimple.com/invite/P9UCSW";
const referralDisclosure =
  "Referral link: if you open and fund an eligible Wealthsimple account through it, we may both receive a bonus.";

/** Shown after tax results: where to file. */
export const filingPartner: Partner = {
  name: "Wealthsimple Tax",
  url: WEALTHSIMPLE_REFERRAL,
  kind: "referral",
  disclosure: referralDisclosure,
};

/** Shown after RRSP/FHSA results: where to open the account. */
export const investingPartner: Partner = {
  name: "Wealthsimple",
  url: WEALTHSIMPLE_REFERRAL,
  kind: "referral",
  disclosure: referralDisclosure,
};

export function partnerRel(partner: Partner): string {
  return partner.kind === "none" ? "noopener" : "noopener sponsored";
}
