// Golden-value tests. Every expected number below was worked out by hand from
// the CRA return (T1, Schedule 1, Schedule 8), the provincial 428 forms and
// Revenu Québec's TP-1, with the arithmetic shown, and cross-checked against an
// independent implementation. If one of these fails, the engine changed
// behaviour — don't update the number without redoing the arithmetic.

import { describe, it, expect } from "vitest";
import { calculateTax, emptyInput, topMarginalRate, ontarioHealthPremium, formatPercent, type TaxInput } from "./tax-engine";

const run = (slug: string, year: number, inputs: Partial<TaxInput>) =>
  calculateTax({ ...emptyInput(slug, year), ...inputs });

// Money to the cent, rates to 0.0001.
const cents = 2;

describe("2025 Ontario, $75,000 salary", () => {
  const r = run("ontario", 2025, { employmentIncome: 75_000 });

  it("payroll contributions", () => {
    // CPP1 (71,300 − 3,500) × 5.95% = 4,034.10; CPP2 (75,000 − 71,300) × 4% = 148; EI 65,700 × 1.64% = 1,077.48
    expect(r.cppContributions).toBeCloseTo(4_034.1, cents);
    expect(r.cpp2Contributions).toBeCloseTo(148, cents);
    expect(r.eiPremiums).toBeCloseTo(1_077.48, cents);
  });

  it("net income after the enhanced CPP deduction (line 22215)", () => {
    // 67,800 × 1% + 148 = 826 → 75,000 − 826 = 74,174
    expect(r.deductions.cppEnhanced).toBeCloseTo(826, cents);
    expect(r.taxableIncome).toBeCloseTo(74_174, cents);
  });

  it("federal tax at the 14.5% blended rate", () => {
    // 57,375 × 14.5% + 16,799 × 20.5% = 11,763.17
    // credits (16,129 + 1,471 + 3,356.10 + 1,077.48) × 14.5% = 3,194.87
    expect(r.federal.taxOnIncome).toBeCloseTo(11_763.17, cents);
    expect(r.federal.credits).toBeCloseTo(3_194.8691, cents);
    expect(r.federalTax).toBeCloseTo(8_568.3009, cents);
  });

  it("Ontario tax including the health premium", () => {
    // 52,886 × 5.05% + 21,288 × 9.15% = 4,618.595; credits (12,747 + 3,356.10 + 1,077.48) × 5.05% = 867.62
    // 3,750.98 (no surtax, no reduction, no LIFT) + OHP 750 = 4,500.98
    expect(r.provincial.healthPremium).toBe(750);
    expect(r.provincialTax).toBeCloseTo(4_500.9757, cents);
    expect(r.totalTax).toBeCloseTo(18_328.8566, cents);
    expect(r.marginalRate).toBeCloseTo(0.205 + 0.0915, 4);
  });
});

describe("2026 Ontario, $75,000 salary", () => {
  const r = run("ontario", 2026, { employmentIncome: 75_000 });

  it("matches the hand calculation", () => {
    // CPP1 (74,600 − 3,500) × 5.95% = 4,230.45; CPP2 400 × 4% = 16; EI 68,900 × 1.63% = 1,123.07
    // net income 75,000 − (711 + 16) = 74,273
    // federal 58,523 × 14% + 15,750 × 20.5% = 11,421.97 − (16,452 + 1,501 + 3,519.45 + 1,123.07) × 14% = 8,258.60
    // Ontario 53,891 × 5.05% + 20,382 × 9.15% = 4,586.45 − 17,631.52 × 5.05% = 3,696.06 + OHP 750 = 4,446.06
    expect(r.taxableIncome).toBeCloseTo(74_273, cents);
    expect(r.federalTax).toBeCloseTo(8_258.5972, cents);
    expect(r.provincialTax).toBeCloseTo(4_446.0567, cents);
    expect(r.contributions.total).toBeCloseTo(5_369.52, cents);
    expect(r.totalTax).toBeCloseTo(18_074.1739, cents);
    expect(r.afterTaxIncome).toBeCloseTo(56_925.8261, cents);
  });
});

describe("2026 Ontario, $30,000 salary: LIFT and the health premium", () => {
  const r = run("ontario", 2026, { employmentIncome: 30_000 });

  it("LIFT wipes out Ontario income tax but not the health premium", () => {
    // net income 30,000 − 265 = 29,735
    // Ontario after credits: 29,735 × 5.05% − (12,989 + 1,311.75 + 489) × 5.05% = 754.74
    // tax reduction: 2 × 300 − 754.74 < 0 → 0
    // LIFT: min(875, 5.05% × 30,000) − 5% × 0 = 875 → covers the 754.74
    // OHP on 29,735: $300
    expect(r.provincial.taxReduction).toBe(0);
    expect(r.provincial.liftCredit).toBeCloseTo(754.7351, cents);
    expect(r.provincial.healthPremium).toBe(300);
    expect(r.provincialTax).toBeCloseTo(300, cents);
    expect(r.federalTax).toBeCloseTo(1_397.375, cents);
    expect(r.totalTax).toBeCloseTo(3_763.125, cents);
  });
});

describe("2026 Quebec, $60,000 salary", () => {
  const r = run("quebec", 2026, { employmentIncome: 60_000 });

  it("uses QPP at 6.3%, Quebec EI and QPIP", () => {
    // QPP (60,000 − 3,500) × 6.3% = 3,559.50; EI 60,000 × 1.30% = 780; QPIP 60,000 × 0.430% = 258
    expect(r.cppContributions).toBeCloseTo(3_559.5, cents);
    expect(r.eiPremiums).toBeCloseTo(780, cents);
    expect(r.qpipPremiums).toBeCloseTo(258, cents);
  });

  it("applies the 16.5% abatement to basic federal tax", () => {
    // net income 60,000 − 565 = 59,435
    // basic federal 58,523 × 14% + 912 × 20.5% − (16,452 + 1,501 + 2,994.50 + 780 + 258) × 14% = 5,302.21
    // after abatement × 0.835 = 4,427.35
    expect(r.federal.basicTax).toBeCloseTo(5_302.21, cents);
    expect(r.federal.quebecAbatement).toBeCloseTo(874.8647, cents);
    expect(r.federalTax).toBeCloseTo(4_427.3454, cents);
  });

  it("Quebec tax: deduction for workers, no payroll credits", () => {
    // Quebec taxable income 59,435 − min(1,450, 6% × 60,000) = 57,985
    // 54,345 × 14% + 3,640 × 19% − 18,952 × 14% = 5,646.62
    expect(r.provincial.workerDeduction).toBe(1_450);
    expect(r.provincial.taxableIncome).toBeCloseTo(57_985, cents);
    expect(r.provincialTax).toBeCloseTo(5_646.62, cents);
    expect(r.provincial.healthServicesFund).toBe(0); // employment income only
    expect(r.totalTax).toBeCloseTo(14_671.4654, cents);
  });
});

describe("2026 Ontario, $60,000 self-employment income", () => {
  const r = run("ontario", 2026, { selfEmploymentIncome: 60_000 });

  it("pays both halves of CPP and deducts the right part", () => {
    // CPP (60,000 − 3,500) × 11.9% = 6,723.50, no EI
    // line 22200 = employer half 3,361.75 + enhanced part of own half 3,361.75 / 5.95 = 3,926.75
    expect(r.cppContributions).toBeCloseTo(6_723.5, cents);
    expect(r.eiPremiums).toBe(0);
    expect(r.deductions.cppSelfEmployed).toBeCloseTo(3_926.75, cents);
    expect(r.deductions.cppEnhanced).toBe(0);
    expect(r.taxableIncome).toBeCloseTo(56_073.25, cents);
  });

  it("gets no Canada employment amount or LIFT on business income", () => {
    // federal 56,073.25 × 14% − (16,452 + 2,796.75) × 14% = 5,155.43
    // Ontario 2,123.99 + OHP 600 = 2,723.99
    expect(r.federal.creditAmounts.employment).toBe(0);
    expect(r.provincial.liftCredit).toBe(0);
    expect(r.federalTax).toBeCloseTo(5_155.43, cents);
    expect(r.provincialTax).toBeCloseTo(2_723.991, cents);
    expect(r.totalTax).toBeCloseTo(14_602.921, cents);
  });
});

describe("2027 projected rules", () => {
  it("uses the 4.75% CPP base rate (5.75% employee rate)", () => {
    const r = run("ontario", 2027, { employmentIncome: 50_000 });
    // (50,000 − 3,500) × 5.75% = 2,673.75; base credit 46,500 × 4.75% = 2,208.75
    expect(r.cppContributions).toBeCloseTo(2_673.75, cents);
    expect(r.federal.creditAmounts.cppQpp).toBeCloseTo(2_208.75, cents);
  });

  it("uses the confirmed 2027 EI rate", () => {
    const r = run("ontario", 2027, { employmentIncome: 100_000 });
    expect(r.eiPremiums).toBeCloseTo(70_800 * 0.0164, cents); // 1,161.12
  });
});

describe("Top combined marginal rates", () => {
  // Federal 33% plus the provincial top rate, adjusted for Ontario's surtax
  // (× 1.56) and Quebec's abatement (federal × 0.835).
  const expected2026: Record<string, number> = {
    alberta: 0.33 + 0.15,
    bc: 0.33 + 0.205,
    manitoba: 0.33 + 0.174,
    "new-brunswick": 0.33 + 0.195,
    newfoundland: 0.33 + 0.218,
    "northwest-territories": 0.33 + 0.1405,
    "nova-scotia": 0.33 + 0.21,
    nunavut: 0.33 + 0.115,
    ontario: 0.33 + 0.1316 * 1.56, // 53.53%
    pei: 0.33 + 0.2, // new 20% bracket over $200,000 in 2026
    quebec: 0.33 * 0.835 + 0.2575, // 53.31%
    saskatchewan: 0.33 + 0.145,
    yukon: 0.33 + 0.15,
  };
  for (const [slug, rate] of Object.entries(expected2026)) {
    it(`2026 ${slug}: ${(rate * 100).toFixed(2)}%`, () => {
      expect(topMarginalRate(slug, 2026)).toBeCloseTo(rate, 6);
    });
  }

  it("2025 PEI top rate was 52% before the new bracket", () => {
    expect(topMarginalRate("pei", 2025)).toBeCloseTo(0.52, 6);
  });
});

describe("Mid-bracket marginal rates", () => {
  it("2026 Ontario at $100,000 includes the 20% surtax", () => {
    // 20.5% federal + 9.15% × 1.20 = 31.48%
    expect(run("ontario", 2026, { otherIncome: 100_000 }).marginalRate).toBeCloseTo(0.3148, 4);
  });

  it("2026 Ontario at $160,000 includes both surtax tiers", () => {
    // 26% federal + 12.16% × 1.56 = 44.97%
    expect(run("ontario", 2026, { otherIncome: 160_000 }).marginalRate).toBeCloseTo(0.26 + 0.1216 * 1.56, 4);
  });

  it("2026 federal BPA phase-out adds to the marginal rate", () => {
    // In Alberta at $200,000: 29% + 13% + 14% × (16,452 − 14,829) / (258,482 − 181,440) = 42.29%
    const extra = (0.14 * (16_452 - 14_829)) / (258_482 - 181_440);
    expect(run("alberta", 2026, { otherIncome: 200_000 }).marginalRate).toBeCloseTo(0.29 + 0.13 + extra, 4);
  });

  it("is zero below the basic personal amounts", () => {
    expect(run("ontario", 2026, { otherIncome: 8_000 }).marginalRate).toBe(0);
  });
});

describe("Ceilings and special rules", () => {
  it("CPP and EI stop at their maximums", () => {
    const r = run("ontario", 2026, { employmentIncome: 250_000 });
    expect(r.cppContributions).toBeCloseTo(4_230.45, cents);
    expect(r.cpp2Contributions).toBeCloseTo(416, cents);
    expect(r.eiPremiums).toBeCloseTo(1_123.07, cents);
  });

  it("nothing below the CPP basic exemption", () => {
    const r = run("ontario", 2026, { employmentIncome: 3_000 });
    expect(r.cppContributions).toBe(0);
    expect(r.eiPremiums).toBeCloseTo(48.9, cents);
  });

  it("federal BPA is fully reduced above the top threshold", () => {
    const r = run("alberta", 2026, { employmentIncome: 400_000 });
    expect(r.federal.creditAmounts.basicPersonal).toBe(14_829);
  });

  it("Manitoba phases its BPA out between $200,000 and $400,000", () => {
    // employment 300,000 → net income 300,000 − (711 + 416) = 298,873
    // 15,780 × (1 − 98,873 / 200,000) = 7,978.92
    const r = run("manitoba", 2026, { employmentIncome: 300_000 });
    expect(r.provincial.creditAmounts.basicPersonal).toBeCloseTo(15_780 * (1 - (298_873 - 200_000) / 200_000), cents);
  });

  it("Yukon mirrors the federal BPA reduction and has an employment amount", () => {
    const r = run("yukon", 2026, { employmentIncome: 220_000 });
    expect(r.provincial.creditAmounts.basicPersonal).toBeCloseTo(r.federal.creditAmounts.basicPersonal, 6);
    expect(r.provincial.creditAmounts.employment).toBe(1_501);
  });

  it("Ontario surtax is calculated before the dividend tax credit", () => {
    // With dividends, surtax applies to tax after non-refundable credits only.
    const r = run("ontario", 2026, { employmentIncome: 200_000, eligibleDividends: 20_000 });
    const afterCredits = r.provincial.taxOnIncome - r.provincial.creditsApplied;
    const surtax = 0.2 * (afterCredits - 5_818) + 0.36 * (afterCredits - 7_446);
    expect(r.provincial.surtax).toBeCloseTo(surtax, 6);
  });

  it("Ontario Health Premium schedule", () => {
    const cases: [number, number][] = [
      [20_000, 0], [22_500, 150], [25_000, 300], [36_000, 300], [37_000, 360], [38_500, 450],
      [48_000, 450], [48_300, 525], [48_600, 600], [72_000, 600], [72_600, 750], [200_000, 750],
      [200_300, 825], [200_600, 900], [1_000_000, 900],
    ];
    for (const [income, premium] of cases) expect(ontarioHealthPremium(income), `${income}`).toBeCloseTo(premium, 6);
  });

  it("Quebec abatement is 16.5% of basic federal tax", () => {
    const r = run("quebec", 2026, { employmentIncome: 120_000 });
    expect(r.federalTax).toBeCloseTo(r.federal.basicTax * 0.835, 6);
  });

  it("Health Services Fund applies to self-employment income in Quebec", () => {
    const r = run("quebec", 2026, { selfEmploymentIncome: 50_000, otherIncome: 10_000 });
    expect(r.provincial.healthServicesFund).toBe(150);
  });
});

describe("2026 marginal rates match TaxTips.ca's published tables", () => {
  // Combined federal + provincial rates on "other income", copied from
  // taxtips.ca/taxrates/{on,bc,ab,qc}.htm (revised Aug–Oct 2026). Those tables
  // exclude the Ontario Health Premium, low-income reductions and Quebec's Health
  // Services Fund, so test incomes avoid the health premium's phase-in bands, and
  // Quebec points inside the fund's 1% band ($64,355–$149,355) add 1%.
  // TaxTips truncates to two decimals, hence the 0.006-point tolerance.
  const published: Record<string, [number, number][]> = {
    ontario: [
      [30_000, 19.05], [56_000, 23.15], [80_000, 29.65], [94_800, 29.65], [95_000, 31.48], [105_000, 31.48],
      [110_000, 33.89], [115_000, 37.91], [130_000, 43.41], [170_000, 44.97], [210_000, 48.26], [240_000, 49.82],
      [300_000, 53.53],
    ],
    bc: [
      [48_000, 19.6], [55_000, 21.7], [80_000, 28.2], [110_000, 31.0], [116_500, 32.79], [130_000, 38.29],
      [160_000, 40.7], [185_000, 43.99], [220_000, 46.09], [262_000, 49.8], [300_000, 53.5],
    ],
    alberta: [
      [40_000, 22.0], [60_000, 28.5], [90_000, 30.5], [130_000, 36.0], [170_000, 38.0], [183_000, 41.29],
      [220_000, 42.29], [250_000, 43.29], [300_000, 47.0], [400_000, 48.0],
    ],
    quebec: [
      [40_000, 25.69], [56_000, 30.69], [62_000, 36.12], [90_000, 36.12 + 1], [112_000, 41.12 + 1],
      [125_000, 45.71 + 1], [160_000, 47.46], [220_000, 50.21], [300_000, 53.31],
    ],
  };
  for (const [slug, rows] of Object.entries(published)) {
    for (const [income, percent] of rows) {
      it(`${slug} at $${income.toLocaleString("en-CA")}: ${percent.toFixed(2)}%`, () => {
        const rate = run(slug, 2026, { otherIncome: income }).marginalRate * 100;
        expect(Math.abs(rate - percent)).toBeLessThan(0.006);
      });
    }
  }
});

describe("Independent cross-check: 22 scenarios", () => {
  // Expected values were computed by a separate implementation written only from
  // the CRA/Revenu Québec forms and published parameters (it never saw this
  // engine), and agree with the engine to the cent on every field.
  type Row = [string, string, number, Partial<TaxInput>, number, number, number, number, number, number];
  // id, province, year, inputs, federal, provincial, CPP/QPP, EI, QPIP, total
  const rows: Row[] = [
    ["2025 ON salary 75k", "ontario", 2025, { employmentIncome: 75_000 }, 8_568.3, 4_500.98, 4_182.1, 1_077.48, 0, 18_328.86],
    ["2026 ON salary 75k", "ontario", 2026, { employmentIncome: 75_000 }, 8_258.6, 4_446.06, 4_246.45, 1_123.07, 0, 18_074.17],
    ["2026 ON salary 30k (LIFT)", "ontario", 2026, { employmentIncome: 30_000 }, 1_397.38, 300, 1_576.75, 489, 0, 3_763.13],
    ["2026 BC salary 40k (BC reduction)", "bc", 2026, { employmentIncome: 40_000 }, 2_691.26, 1_152.49, 2_171.75, 652, 0, 6_667.49],
    ["2026 QC salary 60k", "quebec", 2026, { employmentIncome: 60_000 }, 4_427.35, 5_646.62, 3_559.5, 780, 258, 14_671.47],
    ["2026 AB salary 250k (BPA phase-out)", "alberta", 2026, { employmentIncome: 250_000 }, 53_524.01, 24_020.88, 4_646.45, 1_123.07, 0, 83_314.41],
    ["2026 ON self-employed 60k", "ontario", 2026, { selfEmploymentIncome: 60_000 }, 5_155.43, 2_723.99, 6_723.5, 0, 0, 14_602.92],
    ["2026 QC self-employed 50k + interest 10k (HSF)", "quebec", 2026, { selfEmploymentIncome: 50_000, otherIncome: 10_000 }, 4_361.19, 5_227.29, 5_859, 0, 382, 15_829.47],
    ["2026 ON salary 200k + eligible dividends 20k", "ontario", 2026, { employmentIncome: 200_000, eligibleDividends: 20_000 }, 42_816.48, 26_802.26, 4_646.45, 1_123.07, 0, 75_388.25],
    ["2026 MB salary 300k (BPA phase-out)", "manitoba", 2026, { employmentIncome: 300_000 }, 69_667.99, 45_074.29, 4_646.45, 1_123.07, 0, 120_511.79],
    ["2026 YT salary 220k", "yukon", 2026, { employmentIncome: 220_000 }, 44_735.53, 19_427.29, 4_646.45, 1_123.07, 0, 69_932.34],
    ["2026 NL salary 26k (low-income reduction)", "newfoundland", 2026, { employmentIncome: 26_000 }, 879.82, 380.92, 1_338.75, 423.8, 0, 3_023.29],
    ["2026 PE salary 250k (20% bracket)", "pei", 2026, { employmentIncome: 250_000 }, 53_524.01, 39_444.4, 4_646.45, 1_123.07, 0, 98_737.93],
    ["2026 NS salary 18k (low-income reduction)", "nova-scotia", 2026, { employmentIncome: 18_000 }, 0, 274.5, 862.75, 293.4, 0, 1_430.65],
    ["2026 NB salary 25k (low-income reduction)", "new-brunswick", 2026, { employmentIncome: 25_000 }, 750.44, 161.84, 1_279.25, 407.5, 0, 2_599.02],
    ["2026 MB salary 20k (Family Tax Benefit)", "manitoba", 2026, { employmentIncome: 20_000 }, 103.5, 284.3, 981.75, 326, 0, 1_695.54],
    ["2027 ON salary 75k (projected)", "ontario", 2027, { employmentIncome: 75_000 }, 8_108.87, 4_391.26, 4_111.25, 1_161.12, 0, 17_772.5],
    ["2025 QC salary 60k", "quebec", 2025, { employmentIncome: 60_000 }, 4_667.93, 5_760.16, 3_616, 786, 296.4, 15_126.49],
    ["2026 SK salary 100k + RRSP 10k", "saskatchewan", 2026, { employmentIncome: 100_000, rrspContribution: 10_000 }, 11_251.6, 7_391.02, 4_646.45, 1_123.07, 0, 24_412.13],
    ["2026 ON salary 120k + gains 20k + FHSA 8k", "ontario", 2026, { employmentIncome: 120_000, capitalGains: 20_000, fhsaContribution: 8_000 }, 18_022.14, 9_733.76, 4_646.45, 1_123.07, 0, 33_525.42],
    ["2026 ON salary 40k + self-employed 30k", "ontario", 2026, { employmentIncome: 40_000, selfEmploymentIncome: 30_000 }, 6_978.21, 3_716.19, 5_741.75, 652, 0, 17_088.15],
    ["2026 BC non-eligible dividends 30k", "bc", 2026, { ineligibleDividends: 30_000 }, 0, 143.61, 0, 0, 0, 143.61],
  ];
  for (const [name, slug, year, inputs, federal, provincial, pension, ei, qpip, total] of rows) {
    it(name, () => {
      const r = run(slug, year, inputs);
      expect(r.federalTax).toBeCloseTo(federal, 1);
      expect(r.provincialTax).toBeCloseTo(provincial, 1);
      expect(r.cppContributions + r.cpp2Contributions).toBeCloseTo(pension, 1);
      expect(r.eiPremiums).toBeCloseTo(ei, 1);
      expect(r.qpipPremiums).toBeCloseTo(qpip, 1);
      expect(r.totalTax).toBeCloseTo(total, 1);
    });
  }
});

describe("formatPercent", () => {
  it("rounds half up on the decimal value, not the binary one", () => {
    // 25.75% + 33% × (1 − 16.5%) = 53.305%, published as 53.31%
    expect(formatPercent(topMarginalRate("quebec", 2026))).toBe("53.31%");
    expect(formatPercent(0.29655)).toBe("29.66%");
    expect(formatPercent(0.2965)).toBe("29.65%");
    expect(formatPercent(0.1, 1)).toBe("10.0%");
    expect(formatPercent(0)).toBe("0.00%");
  });
});
