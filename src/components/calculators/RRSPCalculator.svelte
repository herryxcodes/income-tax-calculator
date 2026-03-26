<script lang="ts">
  import {
    calculateTax,
    calculateAllProvinces,
    getProvinceBySlug,
    formatCurrency,
    formatPercent,
    type TaxInput,
    type TaxResult,
  } from "../../lib/tax-engine";
  import { provinces } from "../../data/tax-rates/2025/index";

  // Focused inputs — just income, RRSP, province
  let income = $state(0);
  let rrspContribution = $state(0);
  let selectedProvince = $state("ontario");

  // Build two input objects: with and without RRSP
  function makeInput(rrsp: number): TaxInput {
    return {
      employmentIncome: income,
      selfEmploymentIncome: 0,
      otherIncome: 0,
      capitalGains: 0,
      eligibleDividends: 0,
      ineligibleDividends: 0,
      rrspContribution: rrsp,
      fhsaContribution: 0,
      provinceSlug: selectedProvince,
    };
  }

  let province = $derived(getProvinceBySlug(selectedProvince));
  let resultWithRRSP = $derived(province ? calculateTax(makeInput(rrspContribution), province) : null);
  let resultWithoutRRSP = $derived(province ? calculateTax(makeInput(0), province) : null);

  // The delta — this is the hero number
  let taxSavings = $derived(
    resultWithoutRRSP && resultWithRRSP
      ? resultWithoutRRSP.totalTax - resultWithRRSP.totalTax
      : 0
  );
  let afterTaxCost = $derived(rrspContribution - taxSavings);

  // Contribution room check
  let maxContribution = $derived(Math.min(32490, income * 0.18));
  let isOverContributing = $derived(rrspContribution > maxContribution && income > 0);

  // Province comparison: show RRSP savings across all provinces
  let showComparison = $state(false);
  let allSavings = $derived.by(() => {
    if (!showComparison || income <= 0) return [];
    return provinces.map((prov) => {
      const without = calculateTax(makeInput(0), prov);
      const withRRSP = calculateTax(makeInput(rrspContribution), prov);
      return {
        province: prov,
        taxWithout: without.totalTax,
        taxWith: withRRSP.totalTax,
        savings: without.totalTax - withRRSP.totalTax,
        marginalRate: without.marginalRate,
      };
    }).sort((a, b) => b.savings - a.savings);
  });

  function parseInput(value: string): number {
    const num = Number(value.replace(/[$,\s]/g, ""));
    return isNaN(num) ? 0 : Math.max(0, num);
  }
</script>

<div class="calculator-wrapper">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Inputs -->
    <div class="space-y-5">
      <h2 class="text-lg font-semibold text-gray-900">Your RRSP Contribution</h2>

      <div>
        <label for="province" class="block text-sm font-medium text-gray-700 mb-1">Province / Territory</label>
        <select
          id="province"
          bind:value={selectedProvince}
          class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
        >
          {#each provinces as prov}
            <option value={prov.slug}>{prov.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="income" class="block text-sm font-medium text-gray-700 mb-1">
          Annual Income (Employment)
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-gray-400">$</span>
          <input
            id="income"
            type="text"
            inputmode="decimal"
            value={income || ""}
            oninput={(e) => (income = parseInput((e.target as HTMLInputElement).value))}
            placeholder="75,000"
            class="w-full rounded-lg border border-gray-300 pl-7 pr-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
          />
        </div>
      </div>

      <div>
        <label for="rrsp" class="block text-sm font-medium text-gray-700 mb-1">
          RRSP Contribution
        </label>
        <div class="relative flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-gray-400">$</span>
            <input
              id="rrsp"
              type="text"
              inputmode="decimal"
              value={rrspContribution || ""}
              oninput={(e) => (rrspContribution = parseInput((e.target as HTMLInputElement).value))}
              placeholder="10,000"
              class="w-full rounded-lg border border-gray-300 pl-7 pr-4 py-2.5 text-gray-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
            />
          </div>
          <button
            type="button"
            onclick={() => { if (income > 0) rrspContribution = maxContribution; }}
            disabled={income <= 0}
            class="px-4 py-2.5 rounded-lg text-sm font-semibold transition
              {income > 0
                ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'}"
          >
            Max
          </button>
        </div>
        {#if income > 0}
          <p class="text-xs mt-1 {isOverContributing ? 'text-amber-600 font-medium' : 'text-gray-400'}">
            Your 2025 limit: {formatCurrency(maxContribution)} (18% of income, max $32,490)
            {#if isOverContributing} — you may be over-contributing{/if}
          </p>
        {:else}
          <p class="text-xs text-gray-400 mt-1">2025 max: $32,490 or 18% of earned income</p>
        {/if}
      </div>
    </div>

    <!-- Results -->
    <div>
      {#if resultWithRRSP && income > 0 && rrspContribution > 0}
        <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 space-y-5">
          <h2 class="text-lg font-semibold text-gray-900">Your RRSP Tax Savings</h2>

          <!-- Hero number -->
          <div class="bg-white rounded-xl p-5 shadow-sm text-center">
            <p class="text-sm text-gray-500">You'll save in taxes</p>
            <p class="text-4xl font-bold text-green-600">{formatCurrency(taxSavings)}</p>
            <p class="text-sm text-gray-500 mt-1">
              on a {formatCurrency(rrspContribution)} RRSP contribution
            </p>
          </div>

          <!-- After-tax cost insight -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-gray-500">After-tax cost of contributing</p>
                <p class="text-xl font-bold text-gray-900">{formatCurrency(afterTaxCost)}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-gray-500">Your marginal rate</p>
                <p class="text-xl font-bold text-gray-900">{formatPercent(resultWithoutRRSP?.marginalRate ?? 0)}</p>
              </div>
            </div>
            <p class="text-xs text-gray-400 mt-2">
              Your {formatCurrency(rrspContribution)} contribution only costs you {formatCurrency(afterTaxCost)} after the tax refund.
            </p>
          </div>

          <!-- Before/after comparison -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-gray-700 mb-3">Tax Comparison</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Tax without RRSP</span>
                <span class="font-medium">{formatCurrency(resultWithoutRRSP?.totalTax ?? 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Tax with RRSP</span>
                <span class="font-medium">{formatCurrency(resultWithRRSP.totalTax)}</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-semibold">
                <span class="text-green-700">Your savings</span>
                <span class="text-green-600">{formatCurrency(taxSavings)}</span>
              </div>
            </div>
          </div>

          <!-- RRSP vs TFSA callout -->
          <div class="bg-blue-50 rounded-xl p-4 border border-blue-100">
            <h3 class="text-sm font-semibold text-blue-900 mb-1">RRSP vs TFSA?</h3>
            <p class="text-xs text-blue-700">
              At your marginal rate of {formatPercent(resultWithoutRRSP?.marginalRate ?? 0)},
              RRSP saves you {formatCurrency(taxSavings)} upfront.
              TFSA gives no tax deduction now, but withdrawals are 100% tax-free.
              {#if (resultWithoutRRSP?.marginalRate ?? 0) > 0.30}
                At your rate, RRSP is likely the better choice if you expect lower income in retirement.
              {:else if (resultWithoutRRSP?.marginalRate ?? 0) > 0}
                At your rate, consider splitting between RRSP and TFSA.
              {/if}
            </p>
          </div>

          <button
            type="button"
            onclick={() => (showComparison = !showComparison)}
            class="w-full bg-green-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
          >
            {showComparison ? "Hide" : "Compare"} Savings by Province
          </button>

          <!-- Wealthsimple Tax CTA -->
          <a
            href="https://www.wealthsimple.com/en-ca/tax"
            target="_blank"
            rel="noopener sponsored"
            class="block bg-white rounded-xl p-4 shadow-sm border border-gray-200 hover:border-green-300 hover:shadow-md transition group"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-gray-900 group-hover:text-green-700 transition">Claim your RRSP deduction</p>
                <p class="text-xs text-gray-500 mt-0.5">File your 2025 taxes free with Wealthsimple Tax</p>
              </div>
              <span class="text-green-600 text-sm font-semibold whitespace-nowrap">File Free &rarr;</span>
            </div>
          </a>
        </div>
      {:else if income > 0 && rrspContribution === 0}
        <div class="bg-gray-50 rounded-2xl p-8 text-center">
          <p class="text-gray-400 text-lg">Enter an RRSP contribution to see your tax savings</p>
        </div>
      {:else}
        <div class="bg-gray-50 rounded-2xl p-8 text-center">
          <p class="text-gray-400 text-lg">Enter your income and RRSP contribution</p>
          <p class="text-gray-300 text-sm mt-2">See exactly how much tax you'll save</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Province Comparison: RRSP savings -->
  {#if showComparison && allSavings.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">
        RRSP Tax Savings by Province
        <span class="text-sm font-normal text-gray-500">({formatCurrency(rrspContribution)} contribution on {formatCurrency(income)} income)</span>
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-gray-200">
              <th class="text-left py-3 px-3 font-semibold text-gray-700">Province</th>
              <th class="text-right py-3 px-3 font-semibold text-gray-700">Tax Savings</th>
              <th class="text-right py-3 px-3 font-semibold text-gray-700">After-Tax Cost</th>
              <th class="text-right py-3 px-3 font-semibold text-gray-700">Marginal Rate</th>
            </tr>
          </thead>
          <tbody>
            {#each allSavings as s}
              <tr class="border-b border-gray-100 {s.province.slug === selectedProvince ? 'bg-green-50 font-medium' : 'hover:bg-gray-50'}">
                <td class="py-2.5 px-3">
                  {s.province.name}
                  {#if s.province.slug === selectedProvince}
                    <span class="text-green-600 text-xs ml-1">(selected)</span>
                  {/if}
                </td>
                <td class="py-2.5 px-3 text-right font-mono text-green-600">{formatCurrency(s.savings)}</td>
                <td class="py-2.5 px-3 text-right font-mono">{formatCurrency(rrspContribution - s.savings)}</td>
                <td class="py-2.5 px-3 text-right font-mono">{formatPercent(s.marginalRate)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <p class="mt-6 text-xs text-gray-400 text-center">
    Your data stays in your browser. Calculations based on 2025 CRA-published tax rates.
    <a href="/disclaimer" class="underline hover:text-gray-600">Disclaimer</a> |
    <a href="/income-tax-calculator" class="underline hover:text-gray-600">Need a full tax breakdown? Use our Income Tax Calculator</a>
  </p>
</div>
