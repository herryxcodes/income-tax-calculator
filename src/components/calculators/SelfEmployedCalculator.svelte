<script lang="ts">
  import {
    calculateTax,
    getProvinceBySlug,
    formatCurrency,
    formatPercent,
    type TaxInput,
  } from "../../lib/tax-engine";
  import { provinces, cpp, qpp } from "../../data/tax-rates/2025/index";

  // Focused inputs for self-employed
  let grossRevenue = $state(0);
  let businessExpenses = $state(0);
  let otherEmploymentIncome = $state(0);
  let rrspContribution = $state(0);
  let selectedProvince = $state("ontario");
  let showEmployment = $state(false);

  // Derived
  let netSelfEmploymentIncome = $derived(Math.max(0, grossRevenue - businessExpenses));
  let isQuebec = $derived(selectedProvince === "quebec");
  let gstThreshold = 30000;
  let mustRegisterGST = $derived(grossRevenue > gstThreshold);

  let province = $derived(getProvinceBySlug(selectedProvince));

  let input: TaxInput = $derived({
    employmentIncome: otherEmploymentIncome,
    selfEmploymentIncome: netSelfEmploymentIncome,
    otherIncome: 0,
    capitalGains: 0,
    eligibleDividends: 0,
    ineligibleDividends: 0,
    rrspContribution,
    fhsaContribution: 0,
    provinceSlug: selectedProvince,
  });

  let result = $derived(province ? calculateTax(input, province) : null);

  // CPP breakdown for self-employed: show both halves explicitly
  let plan = $derived(isQuebec ? qpp : cpp);
  let pensionableEarnings = $derived(netSelfEmploymentIncome + otherEmploymentIncome);
  let cpp1Earnings = $derived(Math.max(0, Math.min(pensionableEarnings, plan.maxPensionableEarnings) - plan.basicExemption));
  let cpp1EmployeeHalf = $derived(cpp1Earnings * plan.employeeRate);
  let cpp1EmployerHalf = $derived(cpp1Earnings * plan.employeeRate); // self-employed pays both
  let cpp1Total = $derived(cpp1EmployeeHalf + cpp1EmployerHalf);

  // Quarterly installments
  let quarterlyAmount = $derived(result ? result.totalTax / 4 : 0);
  let quarterlyDates = ["March 15", "June 15", "September 15", "December 15"];

  // Monthly take-home
  let monthlyTakeHome = $derived(result ? result.afterTaxIncome / 12 : 0);

  // Recommended savings rate
  let savingsRate = $derived(
    result && result.totalIncome > 0
      ? result.totalTax / grossRevenue
      : 0
  );

  function parseInput(value: string): number {
    const num = Number(value.replace(/[$,\s]/g, ""));
    return isNaN(num) ? 0 : Math.max(0, num);
  }
</script>

<div class="calculator-wrapper">
  <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
    <!-- Inputs -->
    <div class="space-y-5">
      <h2 class="text-lg font-semibold text-slate-900 font-display">Your Self-Employment Income</h2>

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
        <label for="revenue" class="block text-sm font-medium text-slate-700 mb-1">
          Gross Business Revenue
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-slate-400">$</span>
          <input
            id="revenue"
            type="text"
            inputmode="decimal"
            value={grossRevenue || ""}
            oninput={(e) => (grossRevenue = parseInput((e.target as HTMLInputElement).value))}
            placeholder="80,000"
            class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
          />
        </div>
      </div>

      <div>
        <label for="expenses" class="block text-sm font-medium text-slate-700 mb-1">
          Business Expenses
        </label>
        <div class="relative">
          <span class="absolute left-3 top-2.5 text-slate-400">$</span>
          <input
            id="expenses"
            type="text"
            inputmode="decimal"
            value={businessExpenses || ""}
            oninput={(e) => (businessExpenses = parseInput((e.target as HTMLInputElement).value))}
            placeholder="15,000"
            class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
          />
        </div>
        <p class="text-xs text-slate-400 mt-1">Home office, vehicle, supplies, insurance, etc.</p>
      </div>

      <!-- Net income callout -->
      {#if grossRevenue > 0}
        <div class="bg-slate-50 rounded-xl p-3 flex justify-between items-center">
          <span class="text-sm text-slate-600">Net Self-Employment Income</span>
          <span class="text-lg font-bold text-slate-900">{formatCurrency(netSelfEmploymentIncome)}</span>
        </div>
      {/if}

      <div>
        <label for="rrsp" class="block text-sm font-medium text-slate-700 mb-1">
          RRSP Contribution <span class="text-slate-400 font-normal">(optional)</span>
        </label>
        <div class="relative">
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
      </div>

      <!-- Optional employment income -->
      <button
        type="button"
        onclick={() => (showEmployment = !showEmployment)}
        class="text-sm text-teal-600 hover:text-teal-800 font-medium flex items-center gap-1"
      >
        <span class="transform transition-transform {showEmployment ? 'rotate-90' : ''}">&rsaquo;</span>
        {showEmployment ? "Hide" : "Also have"} employment income (T4)?
      </button>

      {#if showEmployment}
        <div class="pl-3 border-l-2 border-teal-100">
          <label for="employment" class="block text-sm font-medium text-slate-700 mb-1">Employment Income (T4)</label>
          <div class="relative">
            <span class="absolute left-3 top-2.5 text-slate-400">$</span>
            <input
              id="employment"
              type="text"
              inputmode="decimal"
              value={otherEmploymentIncome || ""}
              oninput={(e) => (otherEmploymentIncome = parseInput((e.target as HTMLInputElement).value))}
              placeholder="0"
              class="w-full rounded-xl border border-slate-200 pl-7 pr-4 py-2.5 text-slate-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition"
            />
          </div>
        </div>
      {/if}
    </div>

    <!-- Results -->
    <div>
      {#if result && netSelfEmploymentIncome > 0}
        <div class="bg-gradient-to-br from-amber-50/60 to-orange-50/30 rounded-2xl p-6 space-y-5 border border-amber-100/50">
          <h2 class="text-lg font-semibold text-slate-900 font-display">Your Self-Employment Tax</h2>

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
              <p class="text-sm text-slate-500">Monthly Take-Home</p>
              <p class="text-xl font-bold text-slate-900">{formatCurrency(monthlyTakeHome)}</p>
            </div>
            <div class="bg-white rounded-xl p-4 shadow-sm">
              <p class="text-sm text-slate-500">Average Tax Rate</p>
              <p class="text-xl font-bold text-slate-900">{formatPercent(result.averageRate)}</p>
            </div>
          </div>

          <!-- CPP Breakdown — the key self-employed insight -->
          <div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-400">
            <h3 class="text-sm font-semibold text-slate-700 mb-3">
              {isQuebec ? "QPP" : "CPP"} — You Pay Both Halves
            </h3>
            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-slate-600">Employee portion (5.95%)</span>
                <span class="font-medium">{formatCurrency(cpp1EmployeeHalf)}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-slate-600">Employer portion (5.95%)</span>
                <span class="font-medium">{formatCurrency(cpp1EmployerHalf)}</span>
              </div>
              <div class="border-t pt-2 flex justify-between font-semibold">
                <span>Total {isQuebec ? "QPP" : "CPP"} (11.9%)</span>
                <span class="text-orange-600">{formatCurrency(cpp1Total)}</span>
              </div>
              {#if result.cpp2Contributions > 0}
                <div class="flex justify-between text-slate-500 pt-1">
                  <span>Enhanced contributions <span class="text-xs">(on income $71,300–$81,200)</span></span>
                  <span class="font-medium">{formatCurrency(result.cpp2Contributions)}</span>
                </div>
                <div class="border-t pt-2 flex justify-between font-semibold">
                  <span>Total pension contributions</span>
                  <span class="text-orange-600">{formatCurrency(cpp1Total + result.cpp2Contributions)}</span>
                </div>
              {/if}
            </div>
            <p class="text-xs text-slate-400 mt-2">
              The employer half is deductible against your income. As an employee, your employer pays this — as self-employed, you pay both.
            </p>
          </div>

          <!-- Full tax breakdown -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-700 mb-3">Full Tax Breakdown</h3>
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
                <span class="text-slate-600">{isQuebec ? "QPP" : "CPP"} (both halves)</span>
                <span class="font-medium">{formatCurrency(result.cppContributions + result.cpp2Contributions)}</span>
              </div>
              {#if result.cpp2Contributions > 0}
                <div class="flex justify-between pl-4">
                  <span class="text-slate-400 text-xs">Includes enhanced contributions on income above $71,300</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span class="text-slate-600">EI Premiums</span>
                <span class="font-medium text-slate-400">
                  {otherEmploymentIncome > 0 ? formatCurrency(result.eiPremiums) : "N/A (optional)"}
                </span>
              </div>
              {#if result.qpipPremiums > 0}
                <div class="flex justify-between">
                  <span class="text-slate-600">QPIP</span>
                  <span class="font-medium">{formatCurrency(result.qpipPremiums)}</span>
                </div>
              {/if}
              <div class="border-t pt-2 flex justify-between font-semibold">
                <span>Total Tax</span>
                <span class="text-red-600">{formatCurrency(result.totalTax)}</span>
              </div>
            </div>
          </div>

          <!-- Quarterly Installments -->
          <div class="bg-white rounded-xl p-4 shadow-sm">
            <h3 class="text-sm font-semibold text-slate-700 mb-3">Quarterly Installments</h3>
            <p class="text-xs text-slate-500 mb-3">
              CRA may require quarterly tax installments if you owe more than $3,000.
            </p>
            <div class="grid grid-cols-2 gap-2 text-sm">
              {#each quarterlyDates as date}
                <div class="flex justify-between bg-slate-50 rounded-xl px-3 py-2">
                  <span class="text-slate-600">{date}</span>
                  <span class="font-mono font-medium">{formatCurrency(quarterlyAmount)}</span>
                </div>
              {/each}
            </div>
          </div>

          <!-- Savings rate recommendation -->
          {#if grossRevenue > 0}
            <div class="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h3 class="text-sm font-semibold text-amber-900 mb-1">Set aside for taxes</h3>
              <p class="text-xs text-amber-700">
                Save approximately <strong>{(savingsRate * 100).toFixed(0)}% of every invoice</strong> for taxes.
                On {formatCurrency(grossRevenue)} revenue, that's {formatCurrency(result.totalTax)} per year
                or ~{formatCurrency(result.totalTax / 12)}/month.
              </p>
            </div>
          {/if}

          <!-- GST/HST flag -->
          <div class="bg-white rounded-xl p-4 shadow-sm {mustRegisterGST ? 'border-l-4 border-red-400' : 'border-l-4 border-green-400'}">
            <h3 class="text-sm font-semibold text-slate-700 mb-1">GST/HST Registration</h3>
            {#if mustRegisterGST}
              <p class="text-xs text-red-700">
                Your revenue of {formatCurrency(grossRevenue)} exceeds the $30,000 threshold.
                <strong>You must register for and collect GST/HST.</strong>
              </p>
            {:else}
              <p class="text-xs text-green-700">
                Your revenue of {formatCurrency(grossRevenue)} is below the $30,000 threshold.
                GST/HST registration is optional.
              </p>
            {/if}
          </div>

          <!-- Filing deadline -->
          <div class="bg-teal-50 rounded-xl p-4 border border-teal-100">
            <h3 class="text-sm font-semibold text-teal-900 mb-1">Filing Deadline</h3>
            <p class="text-xs text-teal-700">
              Self-employed filing deadline: <strong>June 15, 2026</strong> (for 2025 tax year).
              But any balance owing is due <strong>April 30, 2026</strong>.
            </p>
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
                <p class="text-sm font-semibold text-slate-900 group-hover:text-green-700 transition">File your self-employed return</p>
                <p class="text-xs text-slate-500 mt-0.5">Wealthsimple Tax handles T2125 — file free · <span class="text-slate-400">Affiliate</span></p>
              </div>
              <span class="text-green-600 text-sm font-semibold whitespace-nowrap">File Free &rarr;</span>
            </div>
          </a>
        </div>
      {:else}
        <div class="bg-slate-50/50 rounded-2xl p-10 text-center border border-slate-100 border-dashed">
          <div class="w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center mx-auto mb-4">
            <svg class="w-6 h-6 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 13.255A23.193 23.193 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <p class="text-slate-500 text-lg font-medium">Enter your revenue and expenses</p>
          <p class="text-slate-400 text-sm mt-2">See your full self-employment tax breakdown</p>
        </div>
      {/if}
    </div>
  </div>

  <div class="mt-6 bg-slate-50 rounded-xl p-3 text-xs text-slate-400 leading-relaxed">
    <p>
      These calculations are <strong>estimates</strong> based on 2025 CRA-published tax rates.
      Self-employment deductions and credits vary by situation. Your actual tax liability
      may differ. <a href="/disclaimer" class="underline hover:text-slate-600">Full disclaimer</a>.
      Consult a qualified tax professional before making financial decisions.
    </p>
    <p class="mt-1">
      Your data stays in your browser — nothing is sent to any server.
      <a href="/income-tax-calculator" class="underline hover:text-slate-600">Need a full tax breakdown?</a>
    </p>
  </div>
</div>
