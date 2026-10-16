<script lang="ts">
  // Where each dollar goes: one bar, measured like a ruler from 0 to 100%.
  import { formatCurrency, type TaxResult } from "../../lib/tax-engine";

  let { result }: { result: TaxResult } = $props();

  let isQuebec = $derived(result.province.slug === "quebec");
  let parts = $derived.by(() => {
    const total = result.cashIncome;
    const list = [
      { key: "kept", label: "Take-home", amount: Math.max(0, result.afterTaxIncome), color: "var(--color-kept)", text: "#fff" },
      { key: "federal", label: "Federal tax", amount: result.federalTax, color: "var(--color-federal)", text: "#fff" },
      { key: "provincial", label: `${result.province.abbreviation} tax`, amount: result.provincialTax, color: "var(--color-provincial)", text: "var(--color-ink)" },
      {
        key: "pension",
        label: isQuebec ? "QPP" : "CPP",
        amount: result.cppContributions + result.cpp2Contributions,
        color: "var(--color-pension)",
        text: "var(--color-ink)",
      },
      {
        key: "insurance",
        label: isQuebec ? "EI and QPIP" : "EI",
        amount: result.eiPremiums + result.qpipPremiums,
        color: "var(--color-insurance)",
        text: "var(--color-ink)",
      },
    ];
    return list.map((p) => ({ ...p, share: total > 0 ? p.amount / total : 0 }));
  });
  let visible = $derived(parts.filter((p) => p.amount >= 0.5));
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
</script>

<figure class="mt-10" aria-label="Where each dollar of your income goes">
  <div class="flex justify-between text-xs text-ink-3 figure mb-1.5" aria-hidden="true">
    <span>0%</span><span>25%</span><span>50%</span><span>75%</span><span>100%</span>
  </div>
  <div class="relative">
    <div class="absolute inset-x-0 -top-1 flex justify-between pointer-events-none" aria-hidden="true">
      {#each [0, 1, 2, 3, 4] as tick (tick)}
        <span class="w-px h-2 bg-rule"></span>
      {/each}
    </div>
    <div class="flex h-14 sm:h-16 w-full overflow-hidden rounded-[3px] bg-field" role="img" aria-label={visible.map((p) => `${p.label} ${pct(p.share)}`).join(", ")}>
      {#each visible as part (part.key)}
        <div
          class="h-full flex items-center px-2 sm:px-3 overflow-hidden border-r-2 border-sheet last:border-r-0 transition-[width] duration-300 ease-out motion-reduce:transition-none"
          style="width: {pct(part.share)}; background: {part.color}; color: {part.text};"
        >
          {#if part.share > 0.11}
            <span class="font-bold text-sm sm:text-base whitespace-nowrap {part.key === 'kept' ? '' : 'hidden md:inline'}">{pct(part.share)}</span>
          {/if}
        </div>
      {/each}
    </div>
  </div>
  <figcaption>
    <ul class="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-6 gap-y-3">
      {#each parts as part (part.key)}
        {#if part.key === "kept" || part.amount >= 0.5}
          <li class="flex items-start gap-2.5">
            <span class="mt-1.5 w-3 h-3 rounded-[2px] shrink-0" style="background: {part.color}; box-shadow: inset 0 0 0 1px rgb(21 26 61 / 0.08);"></span>
            <span>
              <span class="block text-sm text-ink-2">{part.label}</span>
              <span class="block font-bold figure text-ink">{formatCurrency(part.amount)}</span>
            </span>
          </li>
        {/if}
      {/each}
    </ul>
  </figcaption>
</figure>
