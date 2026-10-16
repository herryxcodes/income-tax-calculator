// 2027 Canadian tax data — PROJECTED.
//
// As of October 2026 most 2027 thresholds aren't published: the CRA announces
// federal indexation in November, Quebec in late November, and the provinces
// through the winter. Projections use each government's statutory indexation
// rule with Statistics Canada CPI to August 2026 (September 2026 assumed equal
// to August), indexing the prior year's unrounded amounts:
//   federal, SK, NB, NT, NU, YT: 1.026   ON: 1.021 (Ontario CPI)   AB: 1.020 (2% cap)
//   NL: 1.032 (NL CPI)   NS: 1.035 (NS CPI, Sep–Aug)   QC: 1.0311 (Quebec CPI)
//   BC: frozen 2027–2030   MB: frozen   PEI: not indexed
//
// Already set in law or officially announced for 2027:
//   federal rates (14/20.5/26/29/33%), EI (1.64%, Quebec 1.29%, on $70,800),
//   CPP base rate cut to 4.75% (Bill C-30), RRSP limit $35,390, BC freeze,
//   Ontario non-eligible dividend credit 1.9863% (Bill 97), FHSA limits.
// Update this file when the official figures are released.

import type { TaxYearData } from "../types";

const data: TaxYearData = {
  year: 2027,
  status: "projected",
  statusNote:
    "Most 2027 brackets and credit amounts won't be published until November or December 2026, so we've estimated them from inflation data using each government's indexation rule. Already confirmed: federal tax rates, EI premiums, the $35,390 RRSP limit and the cut to the CPP base rate. Expect small changes when the official numbers are released.",
  projectedFields: [
    "federal brackets, basic personal amount and Canada employment amount",
    "CPP/QPP maximum pensionable earnings",
    "QPP and QPIP rates (2026 rates carried forward)",
    "TFSA limit",
    "provincial brackets and credit amounts (except BC, Manitoba and PEI, which are frozen or not indexed)",
  ],
  federal: {
    brackets: [
      { min: 0, max: 60044, rate: 0.14 },
      { min: 60044, max: 120088, rate: 0.205 },
      { min: 120088, max: 186157, rate: 0.26 },
      { min: 186157, max: 265203, rate: 0.29 },
      { min: 265203, max: Infinity, rate: 0.33 },
    ],
    creditRate: 0.14,
    bpa: { max: 16879, min: 15215, phaseOutStart: 186157, phaseOutEnd: 265203 },
    canadaEmploymentAmount: 1540,
    dividendCredit: { eligible: 0.150198, nonEligible: 0.090301 },
    quebecAbatement: 0.165,
  },
  dividendGrossUp: { eligible: 0.38, nonEligible: 0.15 },
  capitalGainsInclusionRate: 0.5,
  // Base rate cut from 4.95% to 4.75% (Bill C-30, S.C. 2026 c. 22). YMPE projected from wage growth.
  cpp: { ympe: 76700, yampe: 87400, basicExemption: 3500, baseRate: 0.0475, firstAdditionalRate: 0.01, secondAdditionalRate: 0.04 },
  qpp: { ympe: 76700, yampe: 87400, basicExemption: 3500, baseRate: 0.053, firstAdditionalRate: 0.01, secondAdditionalRate: 0.04 },
  ei: { maxInsurableEarnings: 70800, employeeRate: 0.0164 },
  eiQuebec: { maxInsurableEarnings: 70800, employeeRate: 0.0129 },
  qpip: { maxInsurableEarnings: 103000, employeeRate: 0.0043, employerRate: 0.00602, selfEmployedRate: 0.00764 },
  limits: { rrsp: 35390, tfsa: 7500, fhsaAnnual: 8000, fhsaCarryForwardMax: 8000, fhsaLifetime: 40000 },
  dates: {
    rrspDeadline: "2028-02-29",
    filingDeadline: "2028-05-01", // April 30, 2028 is a Sunday
    selfEmployedDeadline: "2028-06-15",
    balanceDue: "2028-05-01",
  },
  provinces: [
    {
      name: "Alberta",
      slug: "alberta",
      abbreviation: "AB",
      brackets: [
        { min: 0, max: 62424, rate: 0.08 },
        { min: 62424, max: 157344, rate: 0.1 },
        { min: 157344, max: 188813, rate: 0.12 },
        { min: 188813, max: 251749, rate: 0.13 },
        { min: 251749, max: 377624, rate: 0.14 },
        { min: 377624, max: Infinity, rate: 0.15 },
      ],
      creditRate: 0.08,
      basicPersonalAmount: 23224,
      payrollCredits: true,
      dividendCredit: { eligible: 0.0812, nonEligible: 0.0218 },
    },
    {
      name: "British Columbia",
      slug: "bc",
      abbreviation: "BC",
      // Indexation paused for 2027–2030 (BC Budget 2026), so 2027 equals 2026.
      brackets: [
        { min: 0, max: 50363, rate: 0.056 },
        { min: 50363, max: 100728, rate: 0.077 },
        { min: 100728, max: 115648, rate: 0.105 },
        { min: 115648, max: 140430, rate: 0.1229 },
        { min: 140430, max: 190405, rate: 0.147 },
        { min: 190405, max: 265545, rate: 0.168 },
        { min: 265545, max: Infinity, rate: 0.205 },
      ],
      creditRate: 0.056,
      basicPersonalAmount: 13216,
      payrollCredits: true,
      dividendCredit: { eligible: 0.12, nonEligible: 0.0196 },
      lowIncomeReduction: { base: 690, threshold: 25570, phaseOutRate: 0.0356 },
      notes: [
        "BC froze its brackets and basic personal amount for 2027 to 2030. The October 24, 2026 provincial election could change 2027 rates.",
      ],
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
      notes: ["Manitoba's brackets and basic personal amount stay frozen."],
    },
    {
      name: "New Brunswick",
      slug: "new-brunswick",
      abbreviation: "NB",
      brackets: [
        { min: 0, max: 53693, rate: 0.094 },
        { min: 53693, max: 107388, rate: 0.14 },
        { min: 107388, max: 198902, rate: 0.16 },
        { min: 198902, max: Infinity, rate: 0.195 },
      ],
      creditRate: 0.094,
      basicPersonalAmount: 14019,
      payrollCredits: true,
      dividendCredit: { eligible: 0.14, nonEligible: 0.0275 },
      lowIncomeReduction: { base: 839, threshold: 22939, phaseOutRate: 0.03 },
    },
    {
      name: "Newfoundland and Labrador",
      slug: "newfoundland",
      abbreviation: "NL",
      brackets: [
        { min: 0, max: 46108, rate: 0.087 },
        { min: 46108, max: 92213, rate: 0.145 },
        { min: 92213, max: 164633, rate: 0.158 },
        { min: 164633, max: 230487, rate: 0.178 },
        { min: 230487, max: 294449, rate: 0.198 },
        { min: 294449, max: 588898, rate: 0.208 },
        { min: 588898, max: 1177796, rate: 0.213 },
        { min: 1177796, max: Infinity, rate: 0.218 },
      ],
      creditRate: 0.087,
      // $15,000 indexed by NL CPI from 2027 (Bill 16).
      basicPersonalAmount: 15480,
      payrollCredits: true,
      dividendCredit: { eligible: 0.063, nonEligible: 0.032 },
      // The reduction amount is set each year by regulation. This assumes NL again
      // offsets the higher basic personal amount, as it did for 2026.
      lowIncomeReduction: { base: 698, threshold: 24965, phaseOutRate: 0.16 },
      notes: ["The 2027 low-income reduction is an estimate; Newfoundland and Labrador sets it by regulation each year."],
    },
    {
      name: "Northwest Territories",
      slug: "northwest-territories",
      abbreviation: "NT",
      brackets: [
        { min: 0, max: 54381, rate: 0.059 },
        { min: 54381, max: 108765, rate: 0.086 },
        { min: 108765, max: 176827, rate: 0.122 },
        { min: 176827, max: Infinity, rate: 0.1405 },
      ],
      creditRate: 0.059,
      basicPersonalAmount: 18671,
      payrollCredits: true,
      dividendCredit: { eligible: 0.115, nonEligible: 0.06 },
    },
    {
      name: "Nova Scotia",
      slug: "nova-scotia",
      abbreviation: "NS",
      brackets: [
        { min: 0, max: 32080, rate: 0.0879 },
        { min: 32080, max: 64160, rate: 0.1495 },
        { min: 64160, max: 100827, rate: 0.1667 },
        { min: 100827, max: 162624, rate: 0.175 },
        { min: 162624, max: Infinity, rate: 0.21 },
      ],
      creditRate: 0.0879,
      basicPersonalAmount: 12350,
      payrollCredits: true,
      dividendCredit: { eligible: 0.0885, nonEligible: 0.015 },
      lowIncomeReduction: { base: 300, threshold: 15000, phaseOutRate: 0.05 },
    },
    {
      name: "Nunavut",
      slug: "nunavut",
      abbreviation: "NU",
      brackets: [
        { min: 0, max: 57252, rate: 0.04 },
        { min: 57252, max: 114504, rate: 0.07 },
        { min: 114504, max: 186156, rate: 0.09 },
        { min: 186156, max: Infinity, rate: 0.115 },
      ],
      creditRate: 0.04,
      basicPersonalAmount: 20170,
      payrollCredits: true,
      dividendCredit: { eligible: 0.0551, nonEligible: 0.0261 },
    },
    {
      name: "Ontario",
      slug: "ontario",
      abbreviation: "ON",
      brackets: [
        { min: 0, max: 55023, rate: 0.0505 },
        { min: 55023, max: 110048, rate: 0.0915 },
        { min: 110048, max: 150000, rate: 0.1116 },
        { min: 150000, max: 220000, rate: 0.1216 },
        { min: 220000, max: Infinity, rate: 0.1316 },
      ],
      creditRate: 0.0505,
      basicPersonalAmount: 13262,
      payrollCredits: true,
      surtax: [
        { threshold: 5940, rate: 0.2 },
        { threshold: 7602, rate: 0.36 },
      ],
      // Non-eligible rate cut to 1.9863% from 2027 (Bill 97, enacted).
      dividendCredit: { eligible: 0.1, nonEligible: 0.019863 },
      ontario: {
        taxReductionBasic: 306,
        lift: { max: 875, employmentRate: 0.0505, threshold: 32500, phaseOutRate: 0.05 },
      },
      notes: ["Ontario's dividend tax credit on non-eligible dividends falls to 1.9863% in 2027."],
    },
    {
      name: "Prince Edward Island",
      slug: "pei",
      abbreviation: "PE",
      // PEI doesn't index automatically; 2026 amounts carry forward.
      brackets: [
        { min: 0, max: 33928, rate: 0.095 },
        { min: 33928, max: 65820, rate: 0.1347 },
        { min: 65820, max: 106890, rate: 0.166 },
        { min: 106890, max: 142520, rate: 0.1762 },
        { min: 142520, max: 200000, rate: 0.19 },
        { min: 200000, max: Infinity, rate: 0.2 },
      ],
      creditRate: 0.095,
      basicPersonalAmount: 15000,
      payrollCredits: true,
      dividendCredit: { eligible: 0.105, nonEligible: 0.013 },
      lowIncomeReduction: { base: 350, threshold: 23000, phaseOutRate: 0.05 },
    },
    {
      name: "Quebec",
      slug: "quebec",
      abbreviation: "QC",
      brackets: [
        { min: 0, max: 56035, rate: 0.14 },
        { min: 56035, max: 112060, rate: 0.19 },
        { min: 112060, max: 136360, rate: 0.24 },
        { min: 136360, max: Infinity, rate: 0.2575 },
      ],
      creditRate: 0.14,
      basicPersonalAmount: 19541,
      payrollCredits: false,
      dividendCredit: { eligible: 0.117, nonEligible: 0.0342 },
      quebec: {
        workerDeduction: { rate: 0.06, max: 1495 },
        healthServicesFund: {
          threshold: 19075,
          tiers: [
            { upTo: 66355, rate: 0.01, maxContribution: 150 },
            { upTo: Infinity, rate: 0.01, maxContribution: 1000 },
          ],
        },
      },
      notes: ["Quebec publishes its 2027 parameters in late November 2026. QPP and QPIP rates shown are 2026 rates carried forward."],
    },
    {
      name: "Saskatchewan",
      slug: "saskatchewan",
      abbreviation: "SK",
      brackets: [
        { min: 0, max: 55950, rate: 0.105 },
        { min: 55950, max: 159856, rate: 0.125 },
        { min: 159856, max: Infinity, rate: 0.145 },
      ],
      creditRate: 0.105,
      // Indexed amount plus the Affordability Act's extra $500 (2025–2028).
      basicPersonalAmount: 21411,
      payrollCredits: true,
      dividendCredit: { eligible: 0.11, nonEligible: 0.02519 },
    },
    {
      name: "Yukon",
      slug: "yukon",
      abbreviation: "YT",
      brackets: [
        { min: 0, max: 60044, rate: 0.064 },
        { min: 60044, max: 120088, rate: 0.09 },
        { min: 120088, max: 186157, rate: 0.109 },
        { min: 186157, max: 500000, rate: 0.128 },
        { min: 500000, max: Infinity, rate: 0.15 },
      ],
      creditRate: 0.064,
      basicPersonalAmount: 16879,
      bpaPhaseOut: { start: 186157, end: 265203, reducedAmount: 15215 },
      employmentAmount: 1540,
      payrollCredits: true,
      dividendCredit: { eligible: 0.1202, nonEligible: 0.0067 },
    },
  ],
  sources: [
    "https://www.canada.ca/en/revenue-agency/services/tax/businesses/topics/payroll/payroll-deductions-contributions/employment-insurance-ei/ei-premium-rates-maximums.html",
    "https://laws-lois.justice.gc.ca/eng/acts/c-8/nifnev.html",
    "https://laws-lois.justice.gc.ca/eng/acts/I-3.3/section-117.1.html",
    "https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810000401",
    "https://www.canada.ca/en/revenue-agency/services/tax/registered-plans-administrators/pspa/mp-rrsp-dpsp-tfsa-limits-ympe.html",
  ],
};

export default data;
