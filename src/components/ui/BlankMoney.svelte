<script lang="ts">
  // A dollar amount typed straight into a sentence, like filling in a form blank.
  // The input sits in a grid cell with an invisible copy of its text so it
  // grows to fit what's typed.
  import { parseInput, formatInputDisplay, enforceMaxDigits } from "../../lib/input-utils";

  let {
    value = $bindable(0),
    id,
    label,
    placeholder = "75,000",
  }: { value?: number; id: string; label: string; placeholder?: string } = $props();

  let focused = $state(false);
  let text = $state("");

  $effect(() => {
    if (!focused) text = formatInputDisplay(value);
  });

  function onInput(e: Event) {
    const cleaned = enforceMaxDigits((e.currentTarget as HTMLInputElement).value);
    text = cleaned;
    value = parseInput(cleaned);
  }
</script>

<span class="blank whitespace-nowrap">
  <span class="currency" aria-hidden="true">$</span>
  <span class="inline-grid">
    <span class="invisible whitespace-pre [grid-area:1/1]" aria-hidden="true">{text || placeholder}</span>
    <input
      {id}
      class="[grid-area:1/1] min-w-0 w-full placeholder:text-brand/35"
      type="text"
      size="1"
      inputmode="decimal"
      autocomplete="off"
      aria-label={label}
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
    />
  </span>
</span>
