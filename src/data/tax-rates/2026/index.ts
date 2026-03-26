// 2026 Canadian Tax Rates — Federal + All 13 Provinces/Territories
// Sources: CRA, provincial finance departments
// Last updated: March 2026

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
  healthPremium?: { min: number; max: number; rate: number; base: number }[];
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
export const federal = {
  year: 2026,
  brackets: [
    { min: 0, max: 57375, rate: 0.15 },
    { min: 57375, max: 114750, rate: 0.205 },
    { min: 114750, max: 158468, rate: 0.26 },
    { min: 158468, max: 221708, rate: 0.29 },
    { min: 221708, max: Infinity, rate: 0.33 },
  ] as TaxBracket[],
  basicPersonalAmount: 16129,
  basicPersonalAmountClawbackStart: 173205,
  basicPersonalAmountReduced: 14156,
};

// ─── CPP / QPP ──────────────────────────────────────────────────────
export const cpp: CPPData = {
  maxPensionableEarnings: 71300,
  basicExemption: 3500,
  employeeRate: 0.0595,
  selfEmployedRate: 0.119,
  cpp2MaxEarnings: 81200,
  cpp2EmployeeRate: 0.04,
  cpp2SelfEmployedRate: 0.08,
};

export const qpp: CPPData = {
  maxPensionableEarnings: 71300,
  basicExemption: 3500,
  employeeRate: 0.064,
  selfEmployedRate: 0.128,
  cpp2MaxEarnings: 81200,
  cpp2EmployeeRate: 0.04,
  cpp2SelfEmployedRate: 0.08,
};

// ─── EI ─────────────────────────────────────────────────────────────
export const ei: EIData = {
  maxInsurableEarnings: 65700,
  employeeRate: 0.0164,
  employerMultiplier: 1.4,
};

export const eiQuebec: EIData = {
  maxInsurableEarnings: 65700,
  employeeRate: 0.01280, // Reduced rate for Quebec (QPIP)
  employerMultiplier: 1.4,
};

// QPIP (Quebec Parental Insurance Plan)
export const qpip = {
  maxInsurableEarnings: 98000,
  employeeRate: 0.00494,
  selfEmployedRate: 0.00878,
};

// ─── Provincial Tax Data ────────────────────────────────────────────

export const provinces: ProvinceTaxData[] = [
  {
    name: "Alberta",
    slug: "alberta",
    abbreviation: "AB",
    brackets: [
      { min: 0, max: 148269, rate: 0.10 },
      { min: 148269, max: 177922, rate: 0.12 },
      { min: 177922, max: 237230, rate: 0.13 },
      { min: 237230, max: 355845, rate: 0.14 },
      { min: 355845, max: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 22323,
  },
  {
    name: "British Columbia",
    slug: "bc",
    abbreviation: "BC",
    brackets: [
      { min: 0, max: 47937, rate: 0.0506 },
      { min: 47937, max: 95875, rate: 0.077 },
      { min: 95875, max: 110076, rate: 0.105 },
      { min: 110076, max: 133664, rate: 0.1229 },
      { min: 133664, max: 181232, rate: 0.147 },
      { min: 181232, max: 252752, rate: 0.168 },
      { min: 252752, max: Infinity, rate: 0.205 },
    ],
    basicPersonalAmount: 12580,
  },
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
  {
    name: "New Brunswick",
    slug: "new-brunswick",
    abbreviation: "NB",
    brackets: [
      { min: 0, max: 49958, rate: 0.094 },
      { min: 49958, max: 99916, rate: 0.14 },
      { min: 99916, max: 185064, rate: 0.16 },
      { min: 185064, max: Infinity, rate: 0.195 },
    ],
    basicPersonalAmount: 13044,
  },
  {
    name: "Newfoundland and Labrador",
    slug: "newfoundland",
    abbreviation: "NL",
    brackets: [
      { min: 0, max: 43198, rate: 0.087 },
      { min: 43198, max: 86395, rate: 0.145 },
      { min: 86395, max: 154244, rate: 0.158 },
      { min: 154244, max: 215943, rate: 0.178 },
      { min: 215943, max: 275870, rate: 0.198 },
      { min: 275870, max: 551739, rate: 0.208 },
      { min: 551739, max: 1103478, rate: 0.213 },
      { min: 1103478, max: Infinity, rate: 0.218 },
    ],
    basicPersonalAmount: 10818,
  },
  {
    name: "Northwest Territories",
    slug: "northwest-territories",
    abbreviation: "NT",
    brackets: [
      { min: 0, max: 50597, rate: 0.059 },
      { min: 50597, max: 101198, rate: 0.086 },
      { min: 101198, max: 164525, rate: 0.122 },
      { min: 164525, max: Infinity, rate: 0.1405 },
    ],
    basicPersonalAmount: 17373,
  },
  {
    name: "Nova Scotia",
    slug: "nova-scotia",
    abbreviation: "NS",
    brackets: [
      { min: 0, max: 29590, rate: 0.0879 },
      { min: 29590, max: 59180, rate: 0.1495 },
      { min: 59180, max: 93000, rate: 0.1667 },
      { min: 93000, max: 150000, rate: 0.175 },
      { min: 150000, max: Infinity, rate: 0.21 },
    ],
    basicPersonalAmount: 8481,
  },
  {
    name: "Nunavut",
    slug: "nunavut",
    abbreviation: "NU",
    brackets: [
      { min: 0, max: 53268, rate: 0.04 },
      { min: 53268, max: 106537, rate: 0.07 },
      { min: 106537, max: 173205, rate: 0.09 },
      { min: 173205, max: Infinity, rate: 0.115 },
    ],
    basicPersonalAmount: 18767,
  },
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
    basicPersonalAmount: 11865,
    surtax: [
      { threshold: 4991, rate: 0.20 },
      { threshold: 6387, rate: 0.36 },
    ],
  },
  {
    name: "Prince Edward Island",
    slug: "pei",
    abbreviation: "PE",
    brackets: [
      { min: 0, max: 32656, rate: 0.0965 },
      { min: 32656, max: 64313, rate: 0.1363 },
      { min: 64313, max: Infinity, rate: 0.1665 },
    ],
    basicPersonalAmount: 13500,
    surtax: [
      { threshold: 12500, rate: 0.10 },
    ],
  },
  {
    name: "Quebec",
    slug: "quebec",
    abbreviation: "QC",
    brackets: [
      { min: 0, max: 51780, rate: 0.14 },
      { min: 51780, max: 103545, rate: 0.19 },
      { min: 103545, max: 126000, rate: 0.24 },
      { min: 126000, max: Infinity, rate: 0.2575 },
    ],
    basicPersonalAmount: 18056,
  },
  {
    name: "Saskatchewan",
    slug: "saskatchewan",
    abbreviation: "SK",
    brackets: [
      { min: 0, max: 52057, rate: 0.105 },
      { min: 52057, max: 148734, rate: 0.125 },
      { min: 148734, max: Infinity, rate: 0.145 },
    ],
    basicPersonalAmount: 18491,
  },
  {
    name: "Yukon",
    slug: "yukon",
    abbreviation: "YT",
    brackets: [
      { min: 0, max: 57375, rate: 0.064 },
      { min: 57375, max: 114750, rate: 0.09 },
      { min: 114750, max: 158468, rate: 0.109 },
      { min: 158468, max: 500000, rate: 0.128 },
      { min: 500000, max: Infinity, rate: 0.15 },
    ],
    basicPersonalAmount: 16129,
  },
];
