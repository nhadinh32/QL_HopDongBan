<script lang="ts">
  // Bảng điều khiển bộ lọc: mỗi cột là một thẻ lọc cố định chiều rộng, xếp thành hàng ngang
  // và cuộn ngang khi nhiều cột (thay vì wrap xuống dòng) để không đẩy bảng dữ liệu xuống quá xa.
  // Cột danh mục (kind "select") hiển thị kiểu Slicer của Excel: danh sách cuộn dọc, bấm để
  // bật/tắt từng lựa chọn, chọn được nhiều giá trị cùng lúc thay vì một dropdown đơn.
  import Button from "$lib/components/ui/Button.svelte";
  import {
    decodeSelectValues,
    encodeSelectValues,
    isFilterActive,
    type ColumnFilters,
    type FilterField,
  } from "$lib/utils/contract-filters";

  export let filterFields: FilterField[];
  export let filters: ColumnFilters;
  export let onChange: (key: string, value: string) => void;
  export let onClear: () => void;
  export let activeCount: number;

  const cardClass = "w-40 shrink-0 rounded border border-slate-100 overflow-hidden bg-white shadow-xs";
  const cardHeaderClass =
    "flex items-center justify-between gap-2 border-b border-primary-100 px-2.5 py-1.5 bg-primary-900";
  const cardTitleClass = "truncate text-xs font-semibold text-primary-50";
  const cardBodyClass = "p-2";
  const inputClass = "text-xs";
  const clearButtonClass = "shrink-0 !text-[10.5px] font-bold text-primary-300 hover:underline";

  function toggleOption(field: string, option: string): void {
    const selected = decodeSelectValues(filters[field]);
    const next = selected.includes(option)
      ? selected.filter((value) => value !== option)
      : [...selected, option];
    onChange(field, encodeSelectValues(next));
  }
</script>

<div class="">
  <div class="flex items-center justify-between gap-3">
    <h3 class="text-sm font-semibold text-primary-900">Bộ lọc</h3>
      <Button variant="ghost" extraClass="!text-red-500 text-xs !py-0.5" on:click={onClear}
        >Xóa {activeCount} bộ lọc</Button
      >
  </div>
  <div class="mt-1 flex gap-1 overflow-x-auto pb-1">
    {#each filterFields as { field, kind, options } (field)}
      {#if kind === "select"}
        {@const selected = decodeSelectValues(filters[field])}
        <div class={cardClass}>
          <div class={cardHeaderClass}>
            <span class={cardTitleClass} title={field}>{field}</span>
            {#if isFilterActive(field, kind, filters)}
              <button
                type="button"
                class={clearButtonClass}
                on:click={() => onChange(field, "")}
              >
                ⨉
              </button>
            {/if}
          </div>
          <div class="max-h-25 overflow-y-auto {cardBodyClass}">
            {#each options as option}
              {@const isSelected = selected.includes(option)}
              <button
                type="button"
                aria-pressed={isSelected}
                class="mb-1 block w-full truncate rounded px-2 py-1 text-left text-xs last:mb-0 {isSelected
                  ? 'bg-primary-600 text-white'
                  : 'text-slate-700 hover:bg-slate-100'}"
                on:click={() => toggleOption(field, option)}
                title={option}
              >
                {option}
              </button>
            {/each}
          </div>
        </div>
      {:else if kind === "date"}
        <div class={cardClass}>
          <div class={cardHeaderClass}>
            <span class={cardTitleClass} title={field}>{field}</span>
            {#if isFilterActive(field, kind, filters)}
              <button
                type="button"
                class={clearButtonClass}
                on:click={() => {
                  onChange(`${field}::from`, "");
                  onChange(`${field}::to`, "");
                }}
              >
                ⨉
              </button>
            {/if}
          </div>
          <div class="flex flex-col gap-1.5 {cardBodyClass}">
            <input
              class={inputClass}
              type="date"
              value={filters[`${field}::from`] ?? ""}
              on:change={(event) => onChange(`${field}::from`, event.currentTarget.value)}
            />
            <input
              class={inputClass}
              type="date"
              value={filters[`${field}::to`] ?? ""}
              on:change={(event) => onChange(`${field}::to`, event.currentTarget.value)}
            />
          </div>
        </div>
      {:else if kind === "numeric"}
        <div class={cardClass}>
          <div class={cardHeaderClass}>
            <span class={cardTitleClass} title={field}>{field}</span>
            {#if isFilterActive(field, kind, filters)}
              <button
                type="button"
                class={clearButtonClass}
                on:click={() => {
                  onChange(`${field}::min`, "");
                  onChange(`${field}::max`, "");
                }}
              >
                ⨉
              </button>
            {/if}
          </div>
          <div class="flex items-center gap-1.5 {cardBodyClass}">
            <input
              class={inputClass}
              type="number"
              step="any"
              placeholder="Từ"
              value={filters[`${field}::min`] ?? ""}
              on:input={(event) => onChange(`${field}::min`, event.currentTarget.value)}
            />
            <span class="text-xs text-slate-400">–</span>
            <input
              class={inputClass}
              type="number"
              step="any"
              placeholder="Đến"
              value={filters[`${field}::max`] ?? ""}
              on:input={(event) => onChange(`${field}::max`, event.currentTarget.value)}
            />
          </div>
        </div>
      {:else}
        <div class={cardClass}>
          <div class={cardHeaderClass}>
            <span class={cardTitleClass} title={field}>{field}</span>
            {#if isFilterActive(field, kind, filters)}
              <button
                type="button"
                class={clearButtonClass}
                on:click={() => onChange(field, "")}
              >
                ⨉
              </button>
            {/if}
          </div>
          <div class={cardBodyClass}>
            <input
              class={inputClass}
              type="text"
              placeholder="Nhập để tìm kiếm"
              value={filters[field] ?? ""}
              on:input={(event) => onChange(field, event.currentTarget.value)}
            />
          </div>
        </div>
      {/if}
    {/each}
  </div>
</div>
