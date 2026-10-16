<script lang="ts">
  import { formatCurrency, formatPercent, formatRate, type TaxResult, type BracketDetail } from "../../lib/tax-engine";
  import { buildWorksheet } from "../../lib/worksheet";

  let { result }: { result: TaxResult } = $props();

  let sections = $derived(buildWorksheet(result));

  const sign = (kind: string) => (kind === "less" ? "−" : kind === "plus" ? "+" : "");
  const range = (b: BracketDetail) =>
    b.max === Infinity ? `Over ${formatCurrency(b.min)}` : `${formatCurrency(b.min)} to ${formatCurrency(b.max)}`;
</script>

{#snippet brackets(list: BracketDetail[], caption: string)}
  <details class="group mt-2 mb-1">
    <summary class="cursor-pointer text-sm font-bold text-brand py-1 select-none list-none flex items-center gap-1.5">
      <svg class="w-3 h-3 transition-transform group-open:rotate-90 motion-reduce:transition-none" viewBox="0 0 8 12" aria-hidden="true"><path d="M1.5 1l5 5-5 5" fill="none" stroke="currentColor" stroke-width="1.8" /></svg>
      Show the bracket math
    </summary>
    <table class="w-full text-sm mt-2">
      <caption class="sr-only">{caption}</caption>
      <thead>
        <tr class="text-ink-3 text-left">
          <th class="font-normal py-1 pr-2">Bracket</th>
          <th class="font-normal py-1 pr-2 text-right">Rate</th>
          <th class="font-normal py-1 pr-2 text-right">Income in bracket</th>
          <th class="font-normal py-1 text-right">Tax</th>
        </tr>
      </thead>
      <tbody>
        {#each list.filter((b) => b.taxableInBracket > 0) as b (b.min)}
          <tr class="border-t border-rule-soft">
            <td class="py-1.5 pr-2 text-ink-2">{range(b)}</td>
            <td class="py-1.5 pr-2 text-right figure">{formatRate(b.rate)}</td>
            <td class="py-1.5 pr-2 text-right figure">{formatCurrency(b.taxableInBracket)}</td>
            <td class="py-1.5 text-right figure">{formatCurrency(b.taxInBracket)}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </details>
{/snippet}

<div class="sheet">
  <div class="px-5 sm:px-6 pt-5 pb-3 flex items-baseline justify-between gap-4 border-b border-rule-soft">
    <h2 class="font-extrabold text-lg text-ink">Your {result.year} return, line by line</h2>
    <span class="text-sm text-ink-3 hidden sm:inline">Boxes show the CRA line or T4 box</span>
  </div>

  {#each sections as section (section.id)}
    <section class="px-5 sm:px-6 py-4 border-b border-rule-soft last:border-b-0" aria-labelledby="ws-{section.id}">
      <h3 id="ws-{section.id}" class="font-bold text-ink mb-2">{section.title}</h3>
      <dl class="text-[0.95rem]">
        {#each section.rows as row, i (i)}
          <div
            class="grid grid-cols-[3.9rem_1fr_auto] gap-x-3 items-baseline py-1.5
              {row.kind === 'subtotal' ? 'border-t border-ink/70 mt-1 font-bold text-ink' : ''}
              {row.kind === 'total' ? 'border-t-2 border-ink mt-1.5 pt-2 font-extrabold text-ink' : ''}
              {row.kind === 'info' ? 'text-ink-3' : ''}"
          >
            <dt class="contents">
              <span>{#if row.tag}<span class="line-tag">{row.tag}</span>{/if}</span>
              <span class={row.kind === "amount" || row.kind === "less" || row.kind === "plus" ? "text-ink-2" : ""}>
                {row.label}
                {#if row.note}<span class="block text-xs text-ink-3 font-normal">{row.note}</span>{/if}
              </span>
            </dt>
            <dd class="figure text-right whitespace-nowrap">
              {#if sign(row.kind)}<span class="text-ink-3 mr-0.5">{sign(row.kind)}</span>{/if}{formatCurrency(row.amount)}
            </dd>
          </div>
        {/each}
      </dl>
      {#if section.id === "federal"}
        {@render brackets(result.federalBrackets, "Federal tax by bracket")}
      {:else if section.id === "provincial"}
        {@render brackets(result.provincialBrackets, `${result.province.name} tax by bracket`)}
      {/if}
    </section>
  {/each}

  <div class="px-5 sm:px-6 py-5 bg-field/60 rounded-b-[6px] grid grid-cols-2 gap-4">
    <div>
      <p class="text-sm text-ink-2">Total tax and contributions</p>
      <p class="figure text-2xl font-bold text-ink">{formatCurrency(result.totalTax)}</p>
    </div>
    <div>
      <p class="text-sm text-ink-2">Take-home</p>
      <p class="figure text-2xl font-bold text-brand">{formatCurrency(result.afterTaxIncome)}</p>
    </div>
    <div>
      <p class="text-sm text-ink-2">Average rate</p>
      <p class="figure text-lg font-bold text-ink">{formatPercent(result.averageRate)}</p>
    </div>
    <div>
      <p class="text-sm text-ink-2">Marginal rate on your next dollar</p>
      <p class="figure text-lg font-bold text-ink">{formatPercent(result.marginalRate)}</p>
    </div>
  </div>
</div>
