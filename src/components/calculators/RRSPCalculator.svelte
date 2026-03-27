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
  import { parseInput, formatInputDisplay, enforceMaxDigits } from "../../lib/input-utils";

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

  let activeField: string | null = $state(null);

  function handleInput(field: string, setter: (v: number) => void) {
    return (e: Event) => {
      const el = e.target as HTMLInputElement;
      const enforced = enforceMaxDigits(el.value);
      if (enforced !== el.value.replace(/[$,\s]/g, "")) el.value = enforced;
      setter(parseInput(enforced));
    };
  }
  function handleFocus(field: string) { return () => { activeField = field; }; }
  function handleBlur(field: string, value: number) {
    return (e: Event) => { activeField = null; (e.target as HTMLInputElement).value = formatInputDisplay(value); };
  }
  function displayValue(field: string, value: number): string {
    if (activeField === field) return value ? String(value) : "";
    return formatInputDisplay(value);
  }
</script>

<div class="calculator-wrapper">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Inputs -->
    <div class="space-y-5">
      <h2 class="text-lg font-semibold text-slate-900 font-display">Your RRSP Contribution</h2>

      <div>
        <label for="province" class="block text-sm font-medium text-slate-700 mb-1">Province / Territory</label>
        <select
          id="province"
          bind:value={selectedProvince}
          class="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
        >
          {#each provinces as prov}
            <option value={prov.slug}>{prov.name}</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="income" class="block text-sm font-medium text-slate-700 mb-1">
          Annual Income (Employment)
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-slate-400">$</span>
          <input
            id="income"
            type="text"
            inputmode="decimal"
            value={displayValue("income", income)}
            oninput={handleInput("income", (v) => income = v)}
            onfocus={handleFocus("income")}
            onblur={handleBlur("income", income)}
            placeholder="75,000"
            class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
          />
        </div>
      </div>

      <div>
        <label for="rrsp" class="block text-sm font-medium text-slate-700 mb-1">
          RRSP Contribution
        </label>
        <div class="relative flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-slate-400">$</span>
            <input
              id="rrsp"
              type="text"
              inputmode="decimal"
              value={displayValue("rrsp", rrspContribution)}
              oninput={handleInput("rrsp", (v) => rrspContribution = v)}
              onfocus={handleFocus("rrsp")}
              onblur={handleBlur("rrsp", rrspContribution)}
              placeholder="10,000"
              class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
            />
          </div>
          <button
            type="button"
            onclick={() => { if (income > 0) rrspContribution = maxContribution; }}
            disabled={income <= 0}
            class="px-4 py-2.5 rounded-xl text-sm font-semibold transition
              {income > 0
                ? 'bg-teal-600 text-white hover:bg-teal-700 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}"
          >
            Max
          </button>
        </div>
        {#if income > 0}
          <p class="text-xs mt-1 {isOverContributing ? 'text-amber-600 font-medium' : 'text-slate-400'}">
            Your 2025 limit: {formatCurrency(maxContribution)} (18% of income, max $32,490)
            {#if isOverContributing} — you may be over-contributing{/if}
          </p>
        {:else}
          <p class="text-xs text-slate-400 mt-1">2025 max: $32,490 or 18% of earned income</p>
        {/if}
      </div>
    </div>

    <!-- Results -->
    <div>
      {#if resultWithRRSP && income > 0 && rrspContribution > 0}
        <div class="bg-gradient-to-br from-emerald-50/60 to-teal-50/30 rounded-2xl p-6 space-y-5 border border-emerald-100/50">
          <h2 class="text-lg font-semibold text-slate-900 font-display">Your RRSP Tax Savings</h2>

          <!-- Hero number -->
          <div class="bg-white rounded-xl p-5 shadow-sm text-center">
            <p class="text-sm text-slate-500">You'll save in taxes</p>
            <p class="text-4xl font-bold text-green-600">{formatCurrency(taxSavings)}</p>
            <p class="text-sm text-slate-500 mt-1">
              on a {formatCurrency(rrspContribution)} RRSP contribution
            </p>
          </div>

          <!-- After-tax cost insight -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <div class="flex justify-between items-center">
              <div>
                <p class="text-sm text-slate-500">After-tax cost of contributing</p>
                <p class="text-xl font-bold text-slate-900">{formatCurrency(afterTaxCost)}</p>
              </div>
              <div class="text-right">
                <p class="text-sm text-slate-500">Your marginal rate</p>
                <p class="text-xl font-bold text-slate-900">{formatPercent(resultWithoutRRSP?.marginalRate ?? 0)}</p>
              </div>
            </div>
            <p class="text-xs text-slate-400 mt-2">
              Your {formatCurrency(rrspContribution)} contribution only costs you {formatCurrency(afterTaxCost)} after the tax refund.
            </p>
          </div>

          <!-- Before/after comparison -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-700 mb-3">Tax Comparison</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-600">Tax without RRSP</span>
                <span class="font-medium">{formatCurrency(resultWithoutRRSP?.totalTax ?? 0)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">Tax with RRSP</span>
                <span class="font-medium">{formatCurrency(resultWithRRSP.totalTax)}</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-semibold">
                <span class="text-green-700">Your savings</span>
                <span class="text-green-600">{formatCurrency(taxSavings)}</span>
              </div>
            </div>
          </div>

          <!-- RRSP vs TFSA callout -->
          <div class="bg-teal-50 rounded-xl p-4 border border-teal-100">
            <h3 class="text-sm font-semibold text-teal-900 mb-1">RRSP vs TFSA?</h3>
            <p class="text-xs text-teal-700">
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
            class="w-full bg-green-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-green-700 transition"
          >
            {showComparison ? "Hide" : "Compare"} Savings by Province
          </button>

          <!-- Wealthsimple Tax CTA -->
          <a
            href="https://sovrn.co/3pcm8xa"
            target="_blank"
            rel="noopener sponsored"
            class="block bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 hover:border-emerald-200 hover:shadow-md transition-all group"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900 group-hover:text-green-700 transition">Claim your RRSP deduction</p>
                <p class="text-xs text-slate-500 mt-0.5">File your 2025 taxes free with Wealthsimple Tax · <span class="text-slate-400">Affiliate</span></p>
              </div>
              <span class="text-green-600 text-sm font-semibold whitespace-nowrap">File Free &rarr;</span>
            </div>
          </a>
        </div>
      {:else if income > 0 && rrspContribution === 0}
        <div class="bg-slate-50/50 rounded-2xl p-10 text-center border border-slate-100 border-dashed">
          <p class="text-slate-500 text-lg font-medium">Enter an RRSP contribution to see your tax savings</p>
        </div>
      {:else}
        <div class="bg-slate-50/50 rounded-2xl p-10 text-center border border-slate-100 border-dashed">
          <div class="w-12 h-12 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p class="text-slate-500 text-lg font-medium">Enter your income and RRSP contribution</p>
          <p class="text-slate-400 text-sm mt-2">See exactly how much tax you'll save</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Province Comparison: RRSP savings -->
  {#if showComparison && allSavings.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-slate-900 font-display mb-4">
        RRSP Tax Savings by Province
        <span class="text-sm font-normal text-slate-500">({formatCurrency(rrspContribution)} contribution on {formatCurrency(income)} income)</span>
      </h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-slate-200">
              <th class="text-left py-3 px-3 font-semibold text-slate-700">Province</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">Tax Savings</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">After-Tax Cost</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">Marginal Rate</th>
            </tr>
          </thead>
          <tbody>
            {#each allSavings as s}
              <tr class="border-b border-slate-100 {s.province.slug === selectedProvince ? 'bg-green-50 font-medium' : 'hover:bg-slate-50'}">
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

  <div class="mt-6 bg-slate-50 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
    <p>
      These calculations are <strong>estimates</strong> based on 2025 CRA-published tax rates.
      Your actual tax savings may differ. <a href="/disclaimer" class="underline hover:text-slate-600">Full disclaimer</a>.
      Consult a qualified tax professional before making financial decisions.
    </p>
    <p class="mt-1">
      Your data stays in your browser — nothing is sent to any server.
      <a href="/income-tax-calculator" class="underline hover:text-slate-600">Need a full tax breakdown?</a>
    </p>
  </div>
</div>
