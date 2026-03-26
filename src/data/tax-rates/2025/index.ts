// 2025 Canadian Tax Rates — Federal + All 13 Provinces/Territories
// Sources: CRA, TaxTips.ca, provincial finance departments
// Verified: March 2026
//
// IMPORTANT: The lowest federal rate was reduced from 15% to 14% effective
// July 1, 2025 (Bill C-4). For the 2025 tax year, a blended rate of 14.5%
// applies to the first bracket.

export interface TaxBracket {
  min: number;
  max: number; // Use Infinity for the last bracket
  rate: number; // Decimal (0.15 = 15%)
}

export interface ProvinceTaxData {
  name: string;
  slug: string;
  abbreviation: string;
  brackets: TaxBracket[];
  basicPersonalAmount: number;
  surtax?: { threshold: number; rate: number }[];
}

export interface CPPData {
  maxPensionableEarnings: number;
  basicExemption: number;
  employeeRate: number;
  selfEmployedRate: number;
  cpp2MaxEarnings: number;
  cpp2EmployeeRate: number;
  cpp2SelfEmployedRate: number;
}

export interface EIData {
  maxInsurableEarnings: number;
  employeeRate: number;
  employerMultiplier: number;
}

// ─── Federal ────────────────────────────────────────────────────────
// Source: CRA — canada.ca/en/revenue-agency/services/tax/individuals/
//   frequently-asked-questions-individuals/canadian-income-tax-rates-
//   individuals-current-previous-years.html
// Rate change: Bill C-4 reduced lowest rate to 14% effective Jul 1, 2025.
//   Blended 2025 rate = 14.5%.
export const federal = {
  year: 2025,
  brackets: [
    { min: 0, max: 57375, rate: 0.145 },       // Blended: 15% H1 + 14% H2
    { min: 57375, max: 114750, rate: 0.205 },
    { min: 114750, max: 177882, rate: 0.26 },
    { min: 177882, max: 253414, rate: 0.29 },
    { min: 253414, max: Infinity, rate: 0.33 },
  ] as TaxBracket[],
  basicPersonalAmount: 16129,
  // BPA is clawed back for high earners between $177,882 and $253,414
  basicPersonalAmountClawbackStart: 177882,
  basicPersonalAmountReduced: 14538,
};

// ─── CPP (Canada Pension Plan) ──────────────────────────────────────
// Source: CRA — canada.ca/en/revenue-agency/services/tax/businesses/
//   topics/payroll/payroll-deductions-contributions/canada-pension-plan-cpp/
//   cpp-contribution-rates-maximums-exemptions.html
export const cpp: CPPData = {
  maxPensionableEarnings: 71300,
  basicExemption: 3500,
  employeeRate: 0.0595,
  selfEmployedRate: 0.119,
  cpp2MaxEarnings: 81200,
  cpp2EmployeeRate: 0.04,
  cpp2SelfEmployedRate: 0.08,
};

// QPP (Quebec Pension Plan)
// Source: Revenu Quebec — revenuquebec.ca
// QPP base rate 5.40% + first additional 1.00% = 6.40% employee
export const qpp: CPPData = {
  maxPensionableEarnings: 71300,
  basicExemption: 3500,
  employeeRate: 0.064,       // 5.40% base + 1.00% first additional
  selfEmployedRate: 0.128,   // 10.80% base + 2.00% first additional
  cpp2MaxEarnings: 81200,
  cpp2EmployeeRate: 0.04,
  cpp2SelfEmployedRate: 0.08,
};

// ─── EI (Employment Insurance) ──────────────────────────────────────
// Source: CRA — canada.ca/en/revenue-agency/services/tax/businesses/
//   topics/payroll/payroll-deductions-contributions/employment-insurance-ei/
//   ei-premium-rates-maximums.html
export const ei: EIData = {
  maxInsurableEarnings: 65700,
  employeeRate: 0.0164,      // $1.64 per $100
  employerMultiplier: 1.4,
};

// Quebec residents pay reduced EI (because they also pay QPIP)
export const eiQuebec: EIData = {
  maxInsurableEarnings: 65700,
  employeeRate: 0.0131,      // $1.31 per $100 (reduced for QPIP)
  employerMultiplier: 1.4,
};

// QPIP (Quebec Parental Insurance Plan)
// Source: RQAP — rqap.gouv.qc.ca
export const qpip = {
  maxInsurableEarnings: 98000,
  employeeRate: 0.00494,
  selfEmployedRate: 0.00878,
};

// ─── Provincial Tax Data (2025) ─────────────────────────────────────
// Source: TaxTips.ca (derived from Income Tax Act and CRA publications)
// Cross-referenced with KPMG Tax Facts and Fidelity tax tables

export const provinces: ProvinceTaxData[] = [
  // ── Alberta ─────────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/ab.htm
  {
    name: "Alberta",
    slug: "alberta",
    abbreviation: "AB",
    brackets: [
      { min: 0, max: 60000, rate: 0.08 },
      { min: 60000, max: 151234, rate: 0.10 },
      { min: 151234, max: 181481, rate: 0.12 },
      { min: 181481, max: 241974, rate: 0.13 },
      { min: 241974, max: 362961, rate: 0.14 },
      { min: 362961, max: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 22323,
  },

  // ── British Columbia ────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/bc.htm
  {
    name: "British Columbia",
    slug: "bc",
    abbreviation: "BC",
    brackets: [
      { min: 0, max: 49279, rate: 0.0506 },
      { min: 49279, max: 98560, rate: 0.077 },
      { min: 98560, max: 113158, rate: 0.105 },
      { min: 113158, max: 137407, rate: 0.1229 },
      { min: 137407, max: 186306, rate: 0.147 },
      { min: 186306, max: 259829, rate: 0.168 },
      { min: 259829, max: Infinity, rate: 0.205 },
    ],
    basicPersonalAmount: 12932,
  },

  // ── Manitoba ────────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/mb.htm
  // Brackets frozen at 2024 levels (indexation paused)
  {
    name: "Manitoba",
    slug: "manitoba",
    abbreviation: "MB",
    brackets: [
      { min: 0, max: 47000, rate: 0.108 },
      { min: 47000, max: 100000, rate: 0.1275 },
      { min: 100000, max: Infinity, rate: 0.174 },
    ],
    basicPersonalAmount: 15780,
  },

  // ── New Brunswick ───────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/nb.htm
  {
    name: "New Brunswick",
    slug: "new-brunswick",
    abbreviation: "NB",
    brackets: [
      { min: 0, max: 51306, rate: 0.094 },
      { min: 51306, max: 102614, rate: 0.14 },
      { min: 102614, max: 190060, rate: 0.16 },
      { min: 190060, max: Infinity, rate: 0.195 },
    ],
    basicPersonalAmount: 13396,
  },

  // ── Newfoundland and Labrador ───────────────────────────────────
  // Source: taxtips.ca/taxrates/nl.htm
  // 8 brackets — the most of any Canadian province
  {
    name: "Newfoundland and Labrador",
    slug: "newfoundland",
    abbreviation: "NL",
    brackets: [
      { min: 0, max: 44192, rate: 0.087 },
      { min: 44192, max: 88382, rate: 0.145 },
      { min: 88382, max: 157792, rate: 0.158 },
      { min: 157792, max: 220910, rate: 0.178 },
      { min: 220910, max: 282214, rate: 0.198 },
      { min: 282214, max: 564429, rate: 0.208 },
      { min: 564429, max: 1128858, rate: 0.213 },
      { min: 1128858, max: Infinity, rate: 0.218 },
    ],
    basicPersonalAmount: 11067,
  },

  // ── Northwest Territories ───────────────────────────────────────
  // Source: taxtips.ca/taxrates/nt.htm
  {
    name: "Northwest Territories",
    slug: "northwest-territories",
    abbreviation: "NT",
    brackets: [
      { min: 0, max: 51964, rate: 0.059 },
      { min: 51964, max: 103930, rate: 0.086 },
      { min: 103930, max: 168967, rate: 0.122 },
      { min: 168967, max: Infinity, rate: 0.1405 },
    ],
    basicPersonalAmount: 17842,
  },

  // ── Nova Scotia ─────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/ns.htm
  {
    name: "Nova Scotia",
    slug: "nova-scotia",
    abbreviation: "NS",
    brackets: [
      { min: 0, max: 30507, rate: 0.0879 },
      { min: 30507, max: 61015, rate: 0.1495 },
      { min: 61015, max: 95883, rate: 0.1667 },
      { min: 95883, max: 154650, rate: 0.175 },
      { min: 154650, max: Infinity, rate: 0.21 },
    ],
    basicPersonalAmount: 11744,
  },

  // ── Nunavut ─────────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/nu.htm
  // Lowest provincial/territorial rates in Canada
  {
    name: "Nunavut",
    slug: "nunavut",
    abbreviation: "NU",
    brackets: [
      { min: 0, max: 54707, rate: 0.04 },
      { min: 54707, max: 109413, rate: 0.07 },
      { min: 109413, max: 177881, rate: 0.09 },
      { min: 177881, max: Infinity, rate: 0.115 },
    ],
    basicPersonalAmount: 19274,
  },

  // ── Ontario ─────────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/on.htm
  // Ontario surtax: 20% on basic provincial tax > $5,710, 36% on > $7,307
  // Ontario Health Premium is collected separately (not modeled here)
  {
    name: "Ontario",
    slug: "ontario",
    abbreviation: "ON",
    brackets: [
      { min: 0, max: 52886, rate: 0.0505 },
      { min: 52886, max: 105775, rate: 0.0915 },
      { min: 105775, max: 150000, rate: 0.1116 },
      { min: 150000, max: 220000, rate: 0.1216 },
      { min: 220000, max: Infinity, rate: 0.1316 },
    ],
    basicPersonalAmount: 12747,
    surtax: [
      { threshold: 5710, rate: 0.20 },
      { threshold: 7307, rate: 0.36 },
    ],
  },

  // ── Prince Edward Island ────────────────────────────────────────
  // Source: taxtips.ca/taxrates/pe.htm
  // PEI restructured brackets for 2025 — 5 brackets, no surtax
  {
    name: "Prince Edward Island",
    slug: "pei",
    abbreviation: "PE",
    brackets: [
      { min: 0, max: 33328, rate: 0.095 },
      { min: 33328, max: 64656, rate: 0.1347 },
      { min: 64656, max: 105000, rate: 0.166 },
      { min: 105000, max: 140000, rate: 0.1762 },
      { min: 140000, max: Infinity, rate: 0.19 },
    ],
    basicPersonalAmount: 14650,
    // Surtax eliminated — incorporated into new bracket structure
  },

  // ── Quebec ──────────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/qc.htm
  // Quebec has its own tax system: separate return via Revenu Quebec
  // Federal 16.5% abatement applies (handled in tax-engine.ts)
  // QPP replaces CPP, QPIP replaces EI maternity/parental
  {
    name: "Quebec",
    slug: "quebec",
    abbreviation: "QC",
    brackets: [
      { min: 0, max: 53255, rate: 0.14 },
      { min: 53255, max: 106495, rate: 0.19 },
      { min: 106495, max: 129590, rate: 0.24 },
      { min: 129590, max: Infinity, rate: 0.2575 },
    ],
    basicPersonalAmount: 18571,
  },

  // ── Saskatchewan ────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/sk.htm
  {
    name: "Saskatchewan",
    slug: "saskatchewan",
    abbreviation: "SK",
    brackets: [
      { min: 0, max: 53463, rate: 0.105 },
      { min: 53463, max: 152750, rate: 0.125 },
      { min: 152750, max: Infinity, rate: 0.145 },
    ],
    basicPersonalAmount: 19491,
  },

  // ── Yukon ───────────────────────────────────────────────────────
  // Source: taxtips.ca/taxrates/yt.htm
  // Yukon mirrors federal enhanced BPA structure
  // 4th bracket effective rate (12.93%) > 5th bracket (12.80%) due to BPA clawback
  {
    name: "Yukon",
    slug: "yukon",
    abbreviation: "YT",
    brackets: [
      { min: 0, max: 57375, rate: 0.064 },
      { min: 57375, max: 114750, rate: 0.09 },
      { min: 114750, max: 177882, rate: 0.109 },
      { min: 177882, max: 253414, rate: 0.128 },
      { min: 253414, max: 500000, rate: 0.128 },
      { min: 500000, max: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 16129, // Mirrors federal — clawed back for high earners
  },
];
