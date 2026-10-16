// 2025 Canadian tax data — federal + all 13 provinces/territories.
// Verified against the CRA 2025 T1 return, Schedule 1 and the provincial 428
// forms and worksheets, plus Revenu Québec's 2025 TP-1 guide and schedules.

import type { TaxYearData } from "../types";

const data: TaxYearData = {
  year: 2025,
  status: "final",
  federal: {
    // Lowest rate cut from 15% to 14% on July 1, 2025 (Bill C-4): 14.5% for the full year.
    brackets: [
      { min: 0, max: 57375, rate: 0.145 },
      { min: 57375, max: 114750, rate: 0.205 },
      { min: 114750, max: 177882, rate: 0.26 },
      { min: 177882, max: 253414, rate: 0.29 },
      { min: 253414, max: Infinity, rate: 0.33 },
    ],
    creditRate: 0.145,
    bpa: { max: 16129, min: 14538, phaseOutStart: 177882, phaseOutEnd: 253414 },
    canadaEmploymentAmount: 1471,
    dividendCredit: { eligible: 0.150198, nonEligible: 0.090301 },
    quebecAbatement: 0.165,
  },
  dividendGrossUp: { eligible: 0.38, nonEligible: 0.15 },
  capitalGainsInclusionRate: 0.5,
  cpp: { ympe: 71300, yampe: 81200, basicExemption: 3500, baseRate: 0.0495, firstAdditionalRate: 0.01, secondAdditionalRate: 0.04 },
  qpp: { ympe: 71300, yampe: 81200, basicExemption: 3500, baseRate: 0.054, firstAdditionalRate: 0.01, secondAdditionalRate: 0.04 },
  ei: { maxInsurableEarnings: 65700, employeeRate: 0.0164 },
  eiQuebec: { maxInsurableEarnings: 65700, employeeRate: 0.0131 },
  qpip: { maxInsurableEarnings: 98000, employeeRate: 0.00494, employerRate: 0.00692, selfEmployedRate: 0.00878 },
  limits: { rrsp: 32490, tfsa: 7000, fhsaAnnual: 8000, fhsaCarryForwardMax: 8000, fhsaLifetime: 40000 },
  dates: {
    rrspDeadline: "2026-03-02", // 60th day is Sunday, March 1
    filingDeadline: "2026-04-30",
    selfEmployedDeadline: "2026-06-15",
    balanceDue: "2026-04-30",
  },
  provinces: [
    {
      name: "Alberta",
      slug: "alberta",
      abbreviation: "AB",
      brackets: [
        { min: 0, max: 60000, rate: 0.08 },
        { min: 60000, max: 151234, rate: 0.1 },
        { min: 151234, max: 181481, rate: 0.12 },
        { min: 181481, max: 241974, rate: 0.13 },
        { min: 241974, max: 362961, rate: 0.14 },
        { min: 362961, max: Infinity, rate: 0.15 },
      ],
      creditRate: 0.08, // AB428 line 53: all credits at 8% from 2025
      basicPersonalAmount: 22323,
      payrollCredits: true,
      dividendCredit: { eligible: 0.0812, nonEligible: 0.0218 },
    },
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
      creditRate: 0.0506,
      basicPersonalAmount: 12932,
      payrollCredits: true,
      dividendCredit: { eligible: 0.12, nonEligible: 0.0196 },
      lowIncomeReduction: { base: 562, threshold: 25020, phaseOutRate: 0.0356 }, // BC428 lines 73–79
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
      creditRate: 0.108,
      basicPersonalAmount: 15780,
      bpaPhaseOut: { start: 200000, end: 400000, reducedAmount: 0 },
      incomeTestedCreditAmount: { label: "Family Tax Benefit", base: 2065, threshold: 0, phaseOutRate: 0.09 },
      payrollCredits: true,
      dividendCredit: { eligible: 0.08, nonEligible: 0.007835 },
    },
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
      creditRate: 0.094,
      basicPersonalAmount: 13396,
      payrollCredits: true,
      dividendCredit: { eligible: 0.14, nonEligible: 0.0275 },
      lowIncomeReduction: { base: 802, threshold: 21920, phaseOutRate: 0.03 }, // NB428 lines 77–86
    },
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
      creditRate: 0.087,
      basicPersonalAmount: 11067,
      payrollCredits: true,
      dividendCredit: { eligible: 0.063, nonEligible: 0.032 },
      lowIncomeReduction: { base: 997, threshold: 23928, phaseOutRate: 0.16 }, // NL428 lines 94–104
    },
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
      creditRate: 0.059,
      basicPersonalAmount: 17842,
      payrollCredits: true,
      dividendCredit: { eligible: 0.115, nonEligible: 0.06 },
    },
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
      creditRate: 0.0879,
      basicPersonalAmount: 11744,
      payrollCredits: true,
      // Non-eligible rate cut to 1.5% from 2025 (NS Bill 68).
      dividendCredit: { eligible: 0.0885, nonEligible: 0.015 },
      lowIncomeReduction: { base: 300, threshold: 15000, phaseOutRate: 0.05 }, // NS428 lines 71–84
    },
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
      creditRate: 0.04,
      basicPersonalAmount: 19274,
      payrollCredits: true,
      dividendCredit: { eligible: 0.0551, nonEligible: 0.0261 },
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
      creditRate: 0.0505,
      basicPersonalAmount: 12747,
      payrollCredits: true,
      surtax: [
        { threshold: 5710, rate: 0.2 },
        { threshold: 7307, rate: 0.36 },
      ],
      dividendCredit: { eligible: 0.1, nonEligible: 0.029863 },
      ontario: {
        taxReductionBasic: 294,
        lift: { max: 875, employmentRate: 0.0505, threshold: 32500, phaseOutRate: 0.05 },
      },
    },
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
      creditRate: 0.095,
      basicPersonalAmount: 14650,
      payrollCredits: true,
      dividendCredit: { eligible: 0.105, nonEligible: 0.013 },
      lowIncomeReduction: { base: 350, threshold: 22650, phaseOutRate: 0.05 }, // PE428 lines 75–87
    },
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
      creditRate: 0.14,
      basicPersonalAmount: 18571,
      payrollCredits: false,
      dividendCredit: { eligible: 0.117, nonEligible: 0.0342 },
      quebec: {
        workerDeduction: { rate: 0.06, max: 1420 }, // TP-1 line 201
        healthServicesFund: {
          threshold: 18130,
          tiers: [
            { upTo: 63060, rate: 0.01, maxContribution: 150 },
            { upTo: Infinity, rate: 0.01, maxContribution: 1000 },
          ],
        },
      },
    },
    {
      name: "Saskatchewan",
      slug: "saskatchewan",
      abbreviation: "SK",
      brackets: [
        { min: 0, max: 53463, rate: 0.105 },
        { min: 53463, max: 152750, rate: 0.125 },
        { min: 152750, max: Infinity, rate: 0.145 },
      ],
      creditRate: 0.105,
      basicPersonalAmount: 19491,
      payrollCredits: true,
      dividendCredit: { eligible: 0.11, nonEligible: 0.02519 },
    },
    {
      name: "Yukon",
      slug: "yukon",
      abbreviation: "YT",
      brackets: [
        { min: 0, max: 57375, rate: 0.064 },
        { min: 57375, max: 114750, rate: 0.09 },
        { min: 114750, max: 177882, rate: 0.109 },
        { min: 177882, max: 500000, rate: 0.128 },
        { min: 500000, max: Infinity, rate: 0.15 },
      ],
      creditRate: 0.064,
      basicPersonalAmount: 16129,
      bpaPhaseOut: { start: 177882, end: 253414, reducedAmount: 14538 },
      employmentAmount: 1471,
      payrollCredits: true,
      dividendCredit: { eligible: 0.1202, nonEligible: 0.0067 },
    },
  ],
  sources: [
    "https://www.canada.ca/en/revenue-agency/services/tax/individuals/frequently-asked-questions-individuals/canadian-income-tax-rates-individuals-current-previous-years.html",
    "https://www.canada.ca/en/revenue-agency/services/forms-publications/tax-packages-years/general-income-tax-benefit-package.html",
    "https://www.canada.ca/content/dam/cra-arc/formspubs/pub/t4127-jan/t4127-01-26e.pdf",
    "https://www.revenuquebec.ca/documents/en/formulaires/tp/2025-12/TP-1.G-V(2025-12).pdf",
  ],
};

export default data;
