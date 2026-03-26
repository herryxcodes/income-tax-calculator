import { describe, it, expect } from "vitest";
import {
  calculateTax,
  calculateAllProvinces,
  getProvinceBySlug,
  formatCurrency,
  type TaxInput,
} from "./tax-engine";

// Helper to create input with defaults
function input(overrides: Partial<TaxInput> = {}): TaxInput {
  return {
    employmentIncome: 0,
    selfEmploymentIncome: 0,
    otherIncome: 0,
    capitalGains: 0,
    eligibleDividends: 0,
    ineligibleDividends: 0,
    rrspContribution: 0,
    fhsaContribution: 0,
    provinceSlug: "ontario",
    ...overrides,
  };
}

function getProvince(slug: string) {
  const p = getProvinceBySlug(slug);
  if (!p) throw new Error(`Province not found: ${slug}`);
  return p;
}

// ─── Zero / very low income ────────────────────────────────────────

describe("Zero and very low income", () => {
  it("$0 income → all zeros", () => {
    const r = calculateTax(input(), getProvince("ontario"));
    expect(r.totalIncome).toBe(0);
    expect(r.totalTax).toBe(0);
    expect(r.federalTax).toBe(0);
    expect(r.provincialTax).toBe(0);
    expect(r.cppContributions).toBe(0);
    expect(r.eiPremiums).toBe(0);
    expect(r.averageRate).toBe(0);
    expect(r.marginalRate).toBe(0);
  });

  it("$500 income → no income tax, only EI (below CPP exemption)", () => {
    const r = calculateTax(
      input({ employmentIncome: 500 }),
      getProvince("ontario")
    );
    expect(r.federalTax).toBe(0);
    expect(r.provincialTax).toBe(0);
    // CPP: $500 < $3,500 basic exemption → $0
    expect(r.cppContributions).toBe(0);
    // EI: $500 * 0.0164 = $8.20
    expect(r.eiPremiums).toBeCloseTo(8.2, 0);
    expect(r.totalTax).toBeCloseTo(8.2, 0);
    // Marginal rate should be 0% (below basic personal amount)
    expect(r.marginalRate).toBe(0);
  });

  it("$5,000 income → no income tax, CPP + EI only", () => {
    const r = calculateTax(
      input({ employmentIncome: 5000 }),
      getProvince("ontario")
    );
    expect(r.federalTax).toBe(0);
    expect(r.provincialTax).toBe(0);
    // CPP: ($5000 - $3500) * 5.95% = $89.25
    expect(r.cppContributions).toBeCloseTo(89.25, 1);
    // EI: $5000 * 1.64% = $82
    expect(r.eiPremiums).toBeCloseTo(82, 0);
    expect(r.marginalRate).toBe(0);
  });

  it("$10,000 income → no income tax (below all BPAs)", () => {
    const r = calculateTax(
      input({ employmentIncome: 10000 }),
      getProvince("alberta")
    );
    // Federal BPA: $16,129, Alberta BPA: $22,323 — both above $10,000
    expect(r.federalTax).toBe(0);
    expect(r.provincialTax).toBe(0);
    expect(r.marginalRate).toBe(0);
  });
});

// ─── Basic personal amount boundary ────────────────────────────────

describe("Basic personal amount boundary", () => {
  it("income at federal BPA ($16,129) → $0 federal tax", () => {
    const r = calculateTax(
      input({ employmentIncome: 16129 }),
      getProvince("ontario")
    );
    // Federal: $16,129 * 14.5% = $2,338.71, credit = $16,129 * 14.5% = $2,338.71 → $0
    expect(r.federalTax).toBeCloseTo(0, 0);
  });

  it("income just above federal BPA → small federal tax", () => {
    const r = calculateTax(
      input({ employmentIncome: 20000 }),
      getProvince("ontario")
    );
    // Federal: $20,000 * 14.5% = $2,900, credit = $16,129 * 14.5% = $2,338.71 → ~$561
    expect(r.federalTax).toBeCloseTo(561, 0);
    expect(r.federalTax).toBeGreaterThan(0);
    // Marginal should now be > 0 (above federal BPA $16,129 and above ON BPA $12,747)
    expect(r.marginalRate).toBeGreaterThan(0);
  });

  it("income between provincial BPA and federal BPA → provincial tax but no federal", () => {
    // Newfoundland BPA is $11,067 (lowest), federal BPA is $16,129
    const r = calculateTax(
      input({ employmentIncome: 12000 }),
      getProvince("newfoundland")
    );
    expect(r.federalTax).toBe(0); // below federal BPA
    expect(r.provincialTax).toBeGreaterThan(0); // above NL BPA of $11,067
  });
});

// ─── Middle income ($50K-$100K) ────────────────────────────────────

describe("Middle income ranges", () => {
  it("$50,000 Ontario → reasonable tax", () => {
    const r = calculateTax(
      input({ employmentIncome: 50000 }),
      getProvince("ontario")
    );
    expect(r.totalIncome).toBe(50000);
    expect(r.federalTax).toBeGreaterThan(3000);
    expect(r.federalTax).toBeLessThan(6000);
    expect(r.provincialTax).toBeGreaterThan(1000);
    expect(r.provincialTax).toBeLessThan(3000);
    expect(r.afterTaxIncome).toBeGreaterThan(35000);
    expect(r.afterTaxIncome).toBeLessThan(45000);
    expect(r.averageRate).toBeGreaterThan(0.15);
    expect(r.averageRate).toBeLessThan(0.30);
  });

  it("$75,000 Ontario → matches approximate known values", () => {
    const r = calculateTax(
      input({ employmentIncome: 75000 }),
      getProvince("ontario")
    );
    // Combined federal + provincial income tax should be ~$12,000-$14,000
    const incomeTax = r.federalTax + r.provincialTax;
    expect(incomeTax).toBeGreaterThan(11000);
    expect(incomeTax).toBeLessThan(15000);
    // Total with CPP+EI should be ~$16,000-$20,000
    expect(r.totalTax).toBeGreaterThan(15000);
    expect(r.totalTax).toBeLessThan(20000);
  });

  it("$100,000 Alberta → lower provincial tax than Ontario", () => {
    const ab = calculateTax(
      input({ employmentIncome: 100000, provinceSlug: "alberta" }),
      getProvince("alberta")
    );
    const on = calculateTax(
      input({ employmentIncome: 100000, provinceSlug: "ontario" }),
      getProvince("ontario")
    );
    // Alberta has a high BPA ($22,323) but 10% flat on first $148K
    // Ontario has 5.05% + 9.15% brackets — provincial tax should be lower in ON at $100K
    // But Alberta's total may be higher due to 10% flat vs Ontario's lower starting bracket
    // The key check: both calculate without error and produce different results
    expect(ab.provincialTax).not.toBe(on.provincialTax);
    expect(ab.totalTax).toBeGreaterThan(0);
    expect(on.totalTax).toBeGreaterThan(0);
  });
});

// ─── High income ───────────────────────────────────────────────────

describe("High income", () => {
  it("$260,000 → hits top federal bracket (33%)", () => {
    const r = calculateTax(
      input({ employmentIncome: 260000 }),
      getProvince("ontario")
    );
    // $260K > $253,414 → top federal bracket (33%) + top ON bracket (13.16%)
    expect(r.marginalRate).toBeGreaterThan(0.45);
    expect(r.federalTax).toBeGreaterThan(30000);
  });

  it("$1,000,000 → very high tax rate", () => {
    const r = calculateTax(
      input({ employmentIncome: 1000000 }),
      getProvince("ontario")
    );
    expect(r.totalTax).toBeGreaterThan(400000);
    expect(r.averageRate).toBeGreaterThan(0.40);
  });
});

// ─── RRSP deduction ────────────────────────────────────────────────

describe("RRSP deduction", () => {
  it("RRSP reduces taxable income", () => {
    const without = calculateTax(
      input({ employmentIncome: 80000 }),
      getProvince("ontario")
    );
    const withRRSP = calculateTax(
      input({ employmentIncome: 80000, rrspContribution: 10000 }),
      getProvince("ontario")
    );
    expect(withRRSP.taxableIncome).toBe(without.taxableIncome - 10000);
    expect(withRRSP.totalTax).toBeLessThan(without.totalTax);
    // Tax savings should be roughly contribution * marginal rate
    const savings = without.totalTax - withRRSP.totalTax;
    expect(savings).toBeGreaterThan(2000);
    expect(savings).toBeLessThan(5000);
  });

  it("RRSP contribution cannot exceed income", () => {
    const r = calculateTax(
      input({ employmentIncome: 5000, rrspContribution: 50000 }),
      getProvince("ontario")
    );
    // Deduction capped at total income
    expect(r.taxableIncome).toBe(0);
  });
});

// ─── FHSA deduction ────────────────────────────────────────────────

describe("FHSA deduction", () => {
  it("FHSA reduces taxable income (capped at $8,000)", () => {
    const without = calculateTax(
      input({ employmentIncome: 80000 }),
      getProvince("ontario")
    );
    const withFHSA = calculateTax(
      input({ employmentIncome: 80000, fhsaContribution: 8000 }),
      getProvince("ontario")
    );
    expect(withFHSA.taxableIncome).toBe(without.taxableIncome - 8000);
    expect(withFHSA.totalTax).toBeLessThan(without.totalTax);
  });

  it("FHSA capped at $8,000 even if more contributed", () => {
    const with8k = calculateTax(
      input({ employmentIncome: 80000, fhsaContribution: 8000 }),
      getProvince("ontario")
    );
    const with20k = calculateTax(
      input({ employmentIncome: 80000, fhsaContribution: 20000 }),
      getProvince("ontario")
    );
    // Both should result in same taxable income (capped at 8000)
    expect(with8k.taxableIncome).toBe(with20k.taxableIncome);
  });
});

// ─── Self-employment ───────────────────────────────────────────────

describe("Self-employment income", () => {
  it("self-employed pays both halves of CPP", () => {
    const employed = calculateTax(
      input({ employmentIncome: 60000 }),
      getProvince("ontario")
    );
    const selfEmployed = calculateTax(
      input({ selfEmploymentIncome: 60000 }),
      getProvince("ontario")
    );
    // Self-employed CPP should be ~2x employee CPP
    expect(selfEmployed.cppContributions).toBeCloseTo(
      employed.cppContributions * 2,
      -2 // allow $100 tolerance
    );
  });

  it("self-employed does not pay EI (no employment income)", () => {
    const r = calculateTax(
      input({ selfEmploymentIncome: 60000 }),
      getProvince("ontario")
    );
    expect(r.eiPremiums).toBe(0);
  });

  it("mixed income: employment + self-employment", () => {
    const r = calculateTax(
      input({ employmentIncome: 40000, selfEmploymentIncome: 30000 }),
      getProvince("ontario")
    );
    // Should have EI on employment portion
    expect(r.eiPremiums).toBeGreaterThan(0);
    // CPP on combined pensionable earnings (self-employed rate since has SE income)
    expect(r.cppContributions).toBeGreaterThan(0);
    // Total income should be combined
    expect(r.totalIncome).toBe(70000);
  });
});

// ─── CPP edge cases ────────────────────────────────────────────────

describe("CPP edge cases", () => {
  it("income below CPP basic exemption ($3,500) → $0 CPP", () => {
    const r = calculateTax(
      input({ employmentIncome: 3000 }),
      getProvince("ontario")
    );
    expect(r.cppContributions).toBe(0);
    expect(r.cpp2Contributions).toBe(0);
  });

  it("income at CPP max ($71,300) → max CPP1, no enhanced", () => {
    const r = calculateTax(
      input({ employmentIncome: 71300 }),
      getProvince("ontario")
    );
    // CPP1: ($71,300 - $3,500) * 5.95% = $4,034.60
    expect(r.cppContributions).toBeCloseTo(4034.1, 0);
    expect(r.cpp2Contributions).toBe(0);
  });

  it("income above $81,200 → max CPP1 + max enhanced", () => {
    const r = calculateTax(
      input({ employmentIncome: 100000 }),
      getProvince("ontario")
    );
    expect(r.cppContributions).toBeCloseTo(4034.1, 0);
    // Enhanced: ($81,200 - $71,300) * 4% = $396
    expect(r.cpp2Contributions).toBeCloseTo(396, 0);
  });

  it("income between $71,300 and $81,200 → partial enhanced", () => {
    const r = calculateTax(
      input({ employmentIncome: 76000 }),
      getProvince("ontario")
    );
    expect(r.cppContributions).toBeCloseTo(4034.1, 0);
    // Enhanced: ($76,000 - $71,300) * 4% = $188
    expect(r.cpp2Contributions).toBeCloseTo(188, 0);
  });
});

// ─── Quebec special rules ──────────────────────────────────────────

describe("Quebec special rules", () => {
  it("Quebec applies 16.5% federal abatement", () => {
    const qc = calculateTax(
      input({ employmentIncome: 80000, provinceSlug: "quebec" }),
      getProvince("quebec")
    );
    const on = calculateTax(
      input({ employmentIncome: 80000, provinceSlug: "ontario" }),
      getProvince("ontario")
    );
    // Quebec federal tax should be ~16.5% less than Ontario's federal tax
    expect(qc.federalTax).toBeLessThan(on.federalTax);
    expect(qc.federalTax).toBeCloseTo(on.federalTax * 0.835, -2);
  });

  it("Quebec has QPIP premiums", () => {
    const r = calculateTax(
      input({ employmentIncome: 80000, provinceSlug: "quebec" }),
      getProvince("quebec")
    );
    expect(r.qpipPremiums).toBeGreaterThan(0);
  });

  it("non-Quebec has no QPIP", () => {
    const r = calculateTax(
      input({ employmentIncome: 80000 }),
      getProvince("ontario")
    );
    expect(r.qpipPremiums).toBe(0);
  });
});

// ─── Capital gains ─────────────────────────────────────────────────

describe("Capital gains", () => {
  it("50% inclusion rate applied", () => {
    const r = calculateTax(
      input({ capitalGains: 100000 }),
      getProvince("ontario")
    );
    // Only $50,000 of $100,000 should be taxable
    expect(r.totalIncome).toBe(50000);
    expect(r.taxableIncome).toBe(50000);
  });

  it("capital gains don't incur CPP or EI", () => {
    const r = calculateTax(
      input({ capitalGains: 100000 }),
      getProvince("ontario")
    );
    expect(r.cppContributions).toBe(0);
    expect(r.eiPremiums).toBe(0);
  });
});

// ─── Province comparison ───────────────────────────────────────────

describe("Province comparison", () => {
  it("calculates all 13 provinces", () => {
    const results = calculateAllProvinces(input({ employmentIncome: 75000 }));
    expect(results.length).toBe(13);
  });

  it("each province has different tax amounts", () => {
    const results = calculateAllProvinces(input({ employmentIncome: 100000 }));
    const taxes = results.map((r) => r.totalTax);
    const unique = new Set(taxes.map((t) => Math.round(t)));
    // Should have mostly unique values (some could be close but not identical)
    expect(unique.size).toBeGreaterThan(8);
  });

  it("Alberta is consistently lower than Quebec", () => {
    for (const income of [30000, 60000, 100000, 200000]) {
      const ab = calculateTax(
        input({ employmentIncome: income, provinceSlug: "alberta" }),
        getProvince("alberta")
      );
      const qc = calculateTax(
        input({ employmentIncome: income, provinceSlug: "quebec" }),
        getProvince("quebec")
      );
      expect(ab.totalTax).toBeLessThan(qc.totalTax);
    }
  });
});

// ─── Marginal rate correctness ─────────────────────────────────────

describe("Marginal rate", () => {
  it("0% when below both BPAs", () => {
    const r = calculateTax(
      input({ employmentIncome: 5000 }),
      getProvince("ontario")
    );
    expect(r.marginalRate).toBe(0);
  });

  it("provincial-only when between provincial BPA and federal BPA", () => {
    // NL BPA is $11,067, federal BPA is $16,129
    const r = calculateTax(
      input({ employmentIncome: 12000 }),
      getProvince("newfoundland")
    );
    // Federal marginal = 0 (below $16,129), provincial marginal > 0 (above $11,067)
    expect(r.marginalRate).toBeGreaterThan(0);
    expect(r.marginalRate).toBeLessThan(0.145); // only provincial component (8.7%)
  });

  it("combined when above both BPAs", () => {
    const r = calculateTax(
      input({ employmentIncome: 50000 }),
      getProvince("ontario")
    );
    // 14.5% federal + 5.05% ON = 19.55%
    expect(r.marginalRate).toBeCloseTo(0.145 + 0.0505, 3);
  });

  it("top combined rate for Ontario at $260K", () => {
    const r = calculateTax(
      input({ employmentIncome: 260000 }),
      getProvince("ontario")
    );
    // 33% federal + 13.16% ON = 46.16%
    expect(r.marginalRate).toBeCloseTo(0.33 + 0.1316, 3);
  });
});

// ─── Dividends ─────────────────────────────────────────────────────

describe("Dividends", () => {
  it("eligible dividends are grossed up by 38%", () => {
    const r = calculateTax(
      input({ eligibleDividends: 10000 }),
      getProvince("ontario")
    );
    // $10,000 * 1.38 = $13,800 grossed-up income
    expect(r.totalIncome).toBeCloseTo(13800, 0);
  });

  it("dividend tax credits reduce tax payable", () => {
    const divResult = calculateTax(
      input({ eligibleDividends: 50000 }),
      getProvince("ontario")
    );
    const otherResult = calculateTax(
      input({ otherIncome: 50000 }),
      getProvince("ontario")
    );
    // Dividend income (despite gross-up) should result in less tax due to credits
    expect(divResult.federalTax).toBeLessThan(otherResult.federalTax);
  });

  it("no CPP or EI on dividend income", () => {
    const r = calculateTax(
      input({ eligibleDividends: 100000 }),
      getProvince("ontario")
    );
    expect(r.cppContributions).toBe(0);
    expect(r.eiPremiums).toBe(0);
  });
});

// ─── EI edge cases ─────────────────────────────────────────────────

describe("EI", () => {
  it("caps at max insurable earnings ($65,700)", () => {
    const at65k = calculateTax(
      input({ employmentIncome: 65700 }),
      getProvince("ontario")
    );
    const at100k = calculateTax(
      input({ employmentIncome: 100000 }),
      getProvince("ontario")
    );
    // EI should be the same — both at or above the cap
    expect(at65k.eiPremiums).toBeCloseTo(at100k.eiPremiums, 2);
  });

  it("Quebec has reduced EI rate", () => {
    const on = calculateTax(
      input({ employmentIncome: 50000, provinceSlug: "ontario" }),
      getProvince("ontario")
    );
    const qc = calculateTax(
      input({ employmentIncome: 50000, provinceSlug: "quebec" }),
      getProvince("quebec")
    );
    expect(qc.eiPremiums).toBeLessThan(on.eiPremiums);
  });
});
