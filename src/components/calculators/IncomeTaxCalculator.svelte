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

  // Props
  let { initialProvince = "ontario" }: { initialProvince?: string } = $props();

  // Input state
  let employmentIncome = $state(0);
  let selfEmploymentIncome = $state(0);
  let otherIncome = $state(0);
  let capitalGains = $state(0);
  let eligibleDividends = $state(0);
  let ineligibleDividends = $state(0);
  let rrspContribution = $state(0);
  let fhsaContribution = $state(0);
  let selectedProvince = $state(initialProvince);
  let showAdvanced = $state(false);
  let showComparison = $state(false);

  // Build input object
  let input: TaxInput = $derived({
    employmentIncome,
    selfEmploymentIncome,
    otherIncome,
    capitalGains,
    eligibleDividends,
    ineligibleDividends,
    rrspContribution,
    fhsaContribution,
    provinceSlug: selectedProvince,
  });

  // Calculate results reactively
  let province = $derived(getProvinceBySlug(selectedProvince));
  let result: TaxResult | null = $derived(
    province ? calculateTax(input, province) : null
  );
  let allResults: TaxResult[] = $derived(
    showComparison ? calculateAllProvinces(input) : []
  );
  let sortedResults = $derived(
    [...allResults].sort((a, b) => a.totalTax - b.totalTax)
  );

  // Share URL
  function copyShareUrl() {
    const params = new URLSearchParams();
    if (employmentIncome) params.set("income", String(employmentIncome));
    if (otherIncome) params.set("other", String(otherIncome));
    if (capitalGains) params.set("gains", String(capitalGains));
    if (eligibleDividends) params.set("ediv", String(eligibleDividends));
    if (ineligibleDividends) params.set("idiv", String(ineligibleDividends));
    if (rrspContribution) params.set("rrsp", String(rrspContribution));
    if (fhsaContribution) params.set("fhsa", String(fhsaContribution));
    params.set("prov", selectedProvince);
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url);
    shareButtonText = "Copied!";
    setTimeout(() => (shareButtonText = "Share"), 2000);
  }

  let shareButtonText = $state("Share");

  // Load from URL params on mount
  $effect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("income")) employmentIncome = Number(params.get("income"));
    if (params.has("other")) otherIncome = Number(params.get("other"));
    if (params.has("gains")) capitalGains = Number(params.get("gains"));
    if (params.has("ediv")) eligibleDividends = Number(params.get("ediv"));
    if (params.has("idiv")) ineligibleDividends = Number(params.get("idiv"));
    if (params.has("rrsp")) rrspContribution = Number(params.get("rrsp"));
    if (params.has("fhsa")) fhsaContribution = Number(params.get("fhsa"));
    if (params.has("prov")) selectedProvince = params.get("prov")!;
  });

  // Parse currency input — strip $ and commas
  function parseInput(value: string): number {
    const num = Number(value.replace(/[$,\s]/g, ""));
    return isNaN(num) ? 0 : Math.max(0, num);
  }
</script>

<div class="calculator-wrapper">
  <!-- Input Section -->
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <div class="space-y-5">
      <h2 class="text-lg font-semibold text-slate-900 font-display">Your Income</h2>

      <!-- Province Selector -->
      <div>
        <label for="province" class="block text-sm font-medium text-slate-700 mb-1">
          Province / Territory
        </label>
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

      <!-- Employment Income -->
      <div>
        <label for="employment" class="block text-sm font-medium text-slate-700 mb-1">
          Employment Income
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-slate-400">$</span>
          <input
            id="employment"
            type="text"
            inputmode="decimal"
            value={employmentIncome || ""}
            oninput={(e) => (employmentIncome = parseInput((e.target as HTMLInputElement).value))}
            placeholder="75,000"
            class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
          />
        </div>
      </div>

      <!-- Self-employment callout -->
      <div class="bg-orange-50 rounded-xl p-3 border border-orange-100">
        <p class="text-xs text-orange-800">
          Have a side hustle or freelance income on top of your job?
          <a href="/self-employed-tax-calculator" class="font-semibold underline hover:text-orange-900">Use our Self-Employed Calculator</a>
          — enter your business revenue and expenses, plus your T4 employment income, and see your combined tax with both halves of CPP.
        </p>
      </div>

      <!-- RRSP -->
      <div>
        <label for="rrsp" class="block text-sm font-medium text-slate-700 mb-1">
          RRSP Contribution
          <span class="text-slate-400 font-normal">(optional)</span>
        </label>
        <div class="relative flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-slate-400">$</span>
            <input
              id="rrsp"
              type="text"
              inputmode="decimal"
              value={rrspContribution || ""}
              oninput={(e) => (rrspContribution = parseInput((e.target as HTMLInputElement).value))}
              placeholder="0"
              class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
            />
          </div>
          <button
            type="button"
            onclick={() => { if (employmentIncome > 0) rrspContribution = Math.min(32490, employmentIncome * 0.18); }}
            disabled={employmentIncome <= 0}
            class="px-4 py-2.5 rounded-xl text-sm font-semibold transition
              {employmentIncome > 0
                ? 'bg-teal-600 text-white hover:bg-teal-700 cursor-pointer'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'}"
          >
            Max
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-1">2025 max: $32,490 or 18% of income</p>
      </div>

      <!-- FHSA Contribution -->
      <div>
        <label for="fhsa" class="block text-sm font-medium text-slate-700 mb-1">
          FHSA Contribution
          <span class="text-slate-400 font-normal">(optional)</span>
        </label>
        <div class="relative flex gap-2">
          <div class="relative flex-1">
            <span class="absolute left-3 top-2.5 text-slate-400">$</span>
            <input
              id="fhsa"
              type="text"
              inputmode="decimal"
              value={fhsaContribution || ""}
              oninput={(e) => (fhsaContribution = parseInput((e.target as HTMLInputElement).value))}
              placeholder="0"
              class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
            />
          </div>
          <button
            type="button"
            onclick={() => fhsaContribution = 8000}
            class="px-4 py-2.5 rounded-xl text-sm font-semibold bg-teal-600 text-white hover:bg-teal-700 cursor-pointer transition"
          >
            Max
          </button>
        </div>
        <p class="text-xs text-slate-400 mt-1">First Home Savings Account — $8,000/year max</p>
      </div>

      <!-- Advanced Toggle -->
      <button
        type="button"
        onclick={() => (showAdvanced = !showAdvanced)}
        class="text-sm text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
      >
        <span class="transform transition-transform {showAdvanced ? 'rotate-90' : ''}">&rsaquo;</span>
        {showAdvanced ? "Hide" : "Show"} more income types
      </button>

      {#if showAdvanced}
        <div class="space-y-4 pl-3 border-l-2 border-teal-100">
          <div>
            <label for="capitalGains" class="block text-sm font-medium text-slate-700 mb-1">Capital Gains</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                id="capitalGains"
                type="text"
                inputmode="decimal"
                value={capitalGains || ""}
                oninput={(e) => (capitalGains = parseInput((e.target as HTMLInputElement).value))}
                placeholder="0"
                class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
              />
            </div>
            <p class="text-xs text-slate-400 mt-1">50% inclusion rate applies</p>
          </div>

          <div>
            <label for="eligibleDiv" class="block text-sm font-medium text-slate-700 mb-1">Eligible Dividends</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                id="eligibleDiv"
                type="text"
                inputmode="decimal"
                value={eligibleDividends || ""}
                oninput={(e) => (eligibleDividends = parseInput((e.target as HTMLInputElement).value))}
                placeholder="0"
                class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
              />
            </div>
          </div>

          <div>
            <label for="ineligibleDiv" class="block text-sm font-medium text-slate-700 mb-1">Ineligible Dividends</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                id="ineligibleDiv"
                type="text"
                inputmode="decimal"
                value={ineligibleDividends || ""}
                oninput={(e) => (ineligibleDividends = parseInput((e.target as HTMLInputElement).value))}
                placeholder="0"
                class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
              />
            </div>
          </div>

          <div>
            <label for="otherIncome" class="block text-sm font-medium text-slate-700 mb-1">Other Income</label>
            <div class="relative">
              <span class="absolute left-3 top-2.5 text-slate-400">$</span>
              <input
                id="otherIncome"
                type="text"
                inputmode="decimal"
                value={otherIncome || ""}
                oninput={(e) => (otherIncome = parseInput((e.target as HTMLInputElement).value))}
                placeholder="0"
                class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
              />
            </div>
            <p class="text-xs text-slate-400 mt-1">Rental, interest, pension, EI benefits, etc.</p>
          </div>
        </div>
      {/if}
    </div>

    <!-- Results Section -->
    <div>
      {#if result && result.totalIncome > 0}
        <div class="bg-white border border-slate-200/70 rounded-2xl p-6 space-y-5 shadow-sm">
          <h2 class="text-lg font-semibold text-slate-900 font-display">
            Your 2025 Tax Estimate (approximate)
            <span class="text-sm font-normal text-slate-500">({result.province.name})</span>
          </h2>

          <!-- Big numbers -->
          <div class="grid grid-cols-2 gap-4">
            <div class="bg-white rounded-xl p-4 shadow-sm">
              <p class="text-sm text-slate-500">Total Tax</p>
              <p class="text-2xl font-bold text-red-600">{formatCurrency(result.totalTax)}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm">
              <p class="text-sm text-slate-500">After-Tax Income</p>
              <p class="text-2xl font-bold text-green-600">{formatCurrency(result.afterTaxIncome)}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm">
              <p class="text-sm text-slate-500">Average Tax Rate</p>
              <p class="text-xl font-bold text-slate-900">{formatPercent(result.averageRate)}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm">
              <p class="text-sm text-slate-500">Marginal Tax Rate</p>
              <p class="text-xl font-bold text-slate-900">{formatPercent(result.marginalRate)}</p>
            </div>
          </div>

          <!-- Tax Breakdown -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-700 mb-3">Tax Breakdown</h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-600">Federal Tax</span>
                <span class="font-medium">{formatCurrency(result.federalTax)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">{result.province.name} Tax</span>
                <span class="font-medium">{formatCurrency(result.provincialTax)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">{province?.slug === "quebec" ? "QPP" : "CPP"} Contributions</span>
                <span class="font-medium">{formatCurrency(result.cppContributions + result.cpp2Contributions)}</span>
              </div>
              {#if result.cpp2Contributions > 0}
                <div class="flex justify-between pl-4">
                  <span class="text-slate-400 text-xs">Includes enhanced CPP on income above $71,300</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span class="text-slate-600">EI Premiums</span>
                <span class="font-medium">{formatCurrency(result.eiPremiums)}</span>
              </div>
              {#if result.qpipPremiums > 0}
                <div class="flex justify-between">
                  <span class="text-slate-600">QPIP Premiums</span>
                  <span class="font-medium">{formatCurrency(result.qpipPremiums)}</span>
                </div>
              {/if}
              <div class="border-t pt-2 flex justify-between font-semibold">
                <span>Total Tax</span>
                <span class="text-red-600">{formatCurrency(result.totalTax)}</span>
              </div>
            </div>
          </div>

          <!-- Bracket Breakdown (Federal + Provincial) -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-700 mb-3">Federal Tax Brackets</h3>
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-slate-200 text-slate-500">
                  <th class="text-left py-1.5 font-medium">Bracket</th>
                  <th class="text-right py-1.5 font-medium">Rate</th>
                  <th class="text-right py-1.5 font-medium">Taxable</th>
                  <th class="text-right py-1.5 font-medium">Tax</th>
                </tr>
              </thead>
              <tbody>
                {#each result.federalBrackets as b}
                  {#if b.taxableInBracket > 0}
                    <tr class="border-b border-slate-50">
                      <td class="py-1.5 text-slate-600">
                        {formatCurrency(b.min)} – {b.max === Infinity ? '...' : formatCurrency(b.max)}
                      </td>
                      <td class="py-1.5 text-right font-mono text-slate-700">{(b.rate * 100).toFixed(1)}%</td>
                      <td class="py-1.5 text-right font-mono text-slate-700">{formatCurrency(b.taxableInBracket)}</td>
                      <td class="py-1.5 text-right font-mono text-slate-700">{formatCurrency(b.taxInBracket)}</td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>

            <h3 class="text-sm font-semibold text-slate-700 mt-4 mb-3">{result.province.name} Tax Brackets</h3>
            <table class="w-full text-xs">
              <thead>
                <tr class="border-b border-slate-200 text-slate-500">
                  <th class="text-left py-1.5 font-medium">Bracket</th>
                  <th class="text-right py-1.5 font-medium">Rate</th>
                  <th class="text-right py-1.5 font-medium">Taxable</th>
                  <th class="text-right py-1.5 font-medium">Tax</th>
                </tr>
              </thead>
              <tbody>
                {#each result.provincialBrackets as b}
                  {#if b.taxableInBracket > 0}
                    <tr class="border-b border-slate-50">
                      <td class="py-1.5 text-slate-600">
                        {formatCurrency(b.min)} – {b.max === Infinity ? '...' : formatCurrency(b.max)}
                      </td>
                      <td class="py-1.5 text-right font-mono text-slate-700">{(b.rate * 100).toFixed(2)}%</td>
                      <td class="py-1.5 text-right font-mono text-slate-700">{formatCurrency(b.taxableInBracket)}</td>
                      <td class="py-1.5 text-right font-mono text-slate-700">{formatCurrency(b.taxInBracket)}</td>
                    </tr>
                  {/if}
                {/each}
              </tbody>
            </table>
          </div>

          <!-- Visual bar: tax vs take-home -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-700 mb-2">Income Split</h3>
            <div class="w-full h-8 rounded-full overflow-hidden flex">
              <div
                class="bg-red-400 h-full transition-all duration-300"
                style="width: {(result.averageRate * 100).toFixed(1)}%"
                title="Tax: {formatPercent(result.averageRate)}"
              ></div>
              <div
                class="bg-green-400 h-full transition-all duration-300"
                style="width: {((1 - result.averageRate) * 100).toFixed(1)}%"
                title="Take-home: {formatPercent(1 - result.averageRate)}"
              ></div>
            </div>
            <div class="flex justify-between text-xs text-slate-500 mt-1">
              <span>Tax: {formatPercent(result.averageRate)}</span>
              <span>Take-home: {formatPercent(1 - result.averageRate)}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-3">
            <button
              type="button"
              onclick={copyShareUrl}
              class="flex-1 bg-white border border-slate-200 text-slate-700 rounded-xl px-4 py-2 text-sm font-medium hover:bg-slate-50 transition"
            >
              {shareButtonText}
            </button>
            <button
              type="button"
              onclick={() => (showComparison = !showComparison)}
              class="flex-1 bg-teal-600 text-white rounded-xl px-4 py-2 text-sm font-medium hover:bg-teal-700 transition"
            >
              {showComparison ? "Hide" : "Compare"} All Provinces
            </button>
          </div>

          <!-- Wealthsimple Tax CTA -->
          <a
            href="https://www.wealthsimple.com/en-ca/tax"
            target="_blank"
            rel="noopener sponsored"
            class="block bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100 hover:border-emerald-200 hover:shadow-md transition-all group"
          >
            <div class="flex items-center justify-between">
              <div>
                <p class="text-sm font-semibold text-slate-900 group-hover:text-green-700 transition">Ready to file your return?</p>
                <p class="text-xs text-slate-500 mt-0.5">File your 2025 taxes free with Wealthsimple Tax · <span class="text-slate-400">Affiliate</span></p>
              </div>
              <span class="text-green-600 text-sm font-semibold whitespace-nowrap">File Free &rarr;</span>
            </div>
          </a>
        </div>
      {:else}
        <div class="bg-slate-50/50 rounded-2xl p-10 text-center border border-slate-100 border-dashed">
          <div class="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-slate-500 text-lg font-medium">Enter your income to see your tax estimate</p>
          <p class="text-slate-400 text-sm mt-2">Your data never leaves your browser</p>
        </div>
      {/if}
    </div>
  </div>

  <!-- Province Comparison Table -->
  {#if showComparison && sortedResults.length > 0}
    <div class="mt-8">
      <h2 class="text-lg font-semibold text-slate-900 font-display mb-4">All Provinces Compared</h2>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b-2 border-slate-200">
              <th class="text-left py-3 px-3 font-semibold text-slate-700">Province</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">Total Tax</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">After-Tax</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">Avg Rate</th>
              <th class="text-right py-3 px-3 font-semibold text-slate-700">Marginal</th>
            </tr>
          </thead>
          <tbody>
            {#each sortedResults as r}
              <tr
                class="border-b border-slate-100 {r.province.slug === selectedProvince
                  ? 'bg-teal-50 font-medium'
                  : 'hover:bg-slate-50'}"
              >
                <td class="py-2.5 px-3">
                  {r.province.name}
                  {#if r.province.slug === selectedProvince}
                    <span class="text-teal-600 text-xs ml-1">(selected)</span>
                  {/if}
                </td>
                <td class="py-2.5 px-3 text-right font-mono">{formatCurrency(r.totalTax)}</td>
                <td class="py-2.5 px-3 text-right font-mono">{formatCurrency(r.afterTaxIncome)}</td>
                <td class="py-2.5 px-3 text-right font-mono">{formatPercent(r.averageRate)}</td>
                <td class="py-2.5 px-3 text-right font-mono">{formatPercent(r.marginalRate)}</td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>
  {/if}

  <!-- Disclaimer -->
  <div class="mt-6 bg-slate-50 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
    <p>
      These calculations are <strong>estimates</strong> for informational purposes only,
      based on 2025 CRA-published tax rates. This calculator does not include every
      available tax credit, deduction, or special circumstance. Your actual tax liability
      may differ. <a href="/disclaimer" class="underline hover:text-slate-600">Full disclaimer</a>.
      Consult a qualified tax professional before making financial decisions.
    </p>
    <p class="mt-1">
      Your data stays in your browser — nothing is sent to any server.
    </p>
  </div>
</div>
