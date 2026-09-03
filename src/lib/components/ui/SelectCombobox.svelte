<script lang="ts">
  // Combobox dùng chung cho cả 4 biến thể select (Single/Multi × With/WithoutOther) —
  // chỉ khác nhau qua 2 prop `multiple`/`allowCustom`, tránh viết 4 component gần giống nhau.
  // Giá trị luôn là string: single → chính giá trị đó, multiple → nối các lựa chọn bằng `;`
  // (cùng quy ước lưu trữ với multi-select trong dữ liệu hợp đồng) — nhờ vậy nơi gọi
  // (ContractFormModal, formValues: Record<string,string>) không cần đổi kiểu dữ liệu.
  export let options: string[] = [];
  export let multiple = false;
  export let allowCustom = false;
  export let value = "";
  export let onChange: (value: string) => void;
  export let placeholder = "Chọn hoặc nhập để tìm...";

  let query = "";
  let open = false;
  let inputEl: HTMLInputElement;
  // Id duy nhất mỗi instance, để aria-controls trên input trỏ đúng tới listbox của chính nó
  // (trang có thể có nhiều SelectCombobox cùng lúc, mỗi field trong form là một instance riêng).
  const listboxId = `select-combobox-${Math.random().toString(36).slice(2)}`;

  $: selected = multiple
    ? value
        .split(";")
        .map((item) => item.trim())
        .filter(Boolean)
    : value
      ? [value]
      : [];

  $: filteredOptions = options.filter((option) =>
    option.toLocaleLowerCase("vi").includes(query.trim().toLocaleLowerCase("vi")),
  );

  $: canAddCustom =
    allowCustom &&
    query.trim().length > 0 &&
    !options.some(
      (option) => option.toLocaleLowerCase("vi") === query.trim().toLocaleLowerCase("vi"),
    );

  function emit(next: string[]): void {
    onChange(multiple ? next.join(";") : (next[0] ?? ""));
  }

  function toggle(option: string): void {
    if (multiple) {
      emit(
        selected.includes(option)
          ? selected.filter((item) => item !== option)
          : [...selected, option],
      );
      return;
    }
    emit([option]);
    query = "";
    open = false;
  }

  function addCustom(): void {
    const custom = query.trim();
    if (!custom) return;
    if (multiple) {
      if (!selected.includes(custom)) emit([...selected, custom]);
    } else {
      emit([custom]);
    }
    query = "";
    if (!multiple) open = false;
  }

  function removeChip(option: string): void {
    emit(selected.filter((item) => item !== option));
  }

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === "Enter") {
      event.preventDefault();
      if (canAddCustom) addCustom();
      else if (filteredOptions.length === 1) toggle(filteredOptions[0]);
    } else if (event.key === "Escape") {
      open = false;
      inputEl?.blur();
    }
  }
</script>

<div class="relative">
  {#if multiple && selected.length}
    <div class="mb-1.5 flex flex-wrap gap-1">
      {#each selected as item (item)}
        <span
          class="inline-flex items-center gap-1 rounded bg-primary-100 px-2 py-0.5 text-xs text-primary-800"
        >
          {item}
          <button
            type="button"
            class="text-primary-500 hover:text-primary-800"
            aria-label={`Bỏ chọn ${item}`}
            on:click={() => removeChip(item)}
          >
            ⨉
          </button>
        </span>
      {/each}
    </div>
  {/if}
  <input
    bind:this={inputEl}
    type="text"
    role="combobox"
    aria-expanded={open}
    aria-controls={listboxId}
    aria-autocomplete="list"
    class="w-full"
    {placeholder}
    value={multiple ? query : open ? query : (selected[0] ?? "")}
    on:focus={() => {
      open = true;
      query = "";
    }}
    on:input={(event) => (query = event.currentTarget.value)}
    on:keydown={onKeydown}
    on:blur={() => setTimeout(() => (open = false), 150)}
  />
  {#if open && (filteredOptions.length || canAddCustom)}
    <div
      id={listboxId}
      role="listbox"
      class="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded border border-slate-200 bg-white shadow-lg"
    >
      {#each filteredOptions as option (option)}
        {@const isSelected = selected.includes(option)}
        <button
          type="button"
          role="option"
          aria-selected={isSelected}
          class="block w-full truncate px-2.5 py-1.5 text-left text-sm {isSelected
            ? 'bg-primary-600 text-white'
            : 'text-slate-700 hover:bg-slate-100'}"
          on:mousedown|preventDefault={() => toggle(option)}
        >
          {option}
        </button>
      {/each}
      {#if canAddCustom}
        <button
          type="button"
          class="block w-full truncate border-t border-slate-100 px-2.5 py-1.5 text-left text-sm text-primary-700 hover:bg-primary-50"
          on:mousedown|preventDefault={addCustom}
        >
          + Thêm "{query.trim()}"
        </button>
      {/if}
    </div>
  {/if}
</div>
