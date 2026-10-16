<script lang="ts">
  import type { Snippet } from "svelte";
  import { parseInput, formatInputDisplay, enforceMaxDigits } from "../../lib/input-utils";

  let {
    value = $bindable(0),
    id,
    label,
    hint = "",
    tag = "",
    placeholder = "0",
    action,
  }: {
    value?: number;
    id: string;
    label: string;
    hint?: string;
    tag?: string;
    placeholder?: string;
    action?: Snippet;
  } = $props();

  let focused = $state(false);
  let text = $state("");

  // Show formatted value unless the person is typing in the field.
  $effect(() => {
    if (!focused) text = formatInputDisplay(value);
  });

  function onInput(e: Event) {
    const cleaned = enforceMaxDigits((e.currentTarget as HTMLInputElement).value);
    text = cleaned;
    value = parseInput(cleaned);
  }
</script>

<div>
  <div class="flex items-baseline justify-between gap-3 mb-1.5">
    <label for={id} class="font-bold text-ink text-[0.95rem]">{label}</label>
    {#if tag}<span class="line-tag" title="Where this appears on your return">{tag}</span>{/if}
  </div>
  <div class="flex gap-2 items-stretch">
    <div class="field flex-1">
      <span class="affix" aria-hidden="true">$</span>
      <input
        {id}
        type="text"
        inputmode="decimal"
        autocomplete="off"
        value={text}
        {placeholder}
        oninput={onInput}
        onfocus={() => {
          focused = true;
          text = value ? String(value) : "";
        }}
        onblur={() => {
          focused = false;
          text = formatInputDisplay(value);
        }}
        aria-describedby={hint ? `${id}-hint` : undefined}
      />
    </div>
    {@render action?.()}
  </div>
  {#if hint}
    <p id="{id}-hint" class="text-sm text-ink-3 mt-1.5 leading-snug">{hint}</p>
  {/if}
</div>
