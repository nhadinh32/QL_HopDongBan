<script lang="ts">
  // Bảng danh sách hồ sơ: sắp xếp nhiều cột, các trạng thái rỗng/tải/lỗi.
  // Tổng quát cho mọi module dữ liệu — nhận FieldConfig[] (đọc từ cf_field_config) qua prop
  // thay vì hard-code Set cột số/cột dài.
  //
  // Chọn dòng để sửa: bấm 1 dòng để chọn (tô nền), bấm lại để bỏ chọn — nút "Sửa" thao tác trên
  // dòng đang chọn nằm ở thanh công cụ chung (DataViewManager.svelte), không phải trong bảng.
  import { onMount } from "svelte";
  import { columnWidthStyle } from "$lib/utils/data-view-format";
  import DataViewTableGroupRows from "./DataViewTableGroupRows.svelte";
  import DataViewFilters from "./DataViewFilters.svelte";
  import type { DataRecord, SortField } from "$lib/types/data-view";
  import type { FieldConfig } from "$lib/types/field-config";
  import { groupFieldsFrom, buildRowGroupTree } from "$lib/utils/data-view-grouping";
  import { sortRows } from "$lib/utils/data-view-sort";
  import {
    computeFilterFields,
    countActiveFilters,
    matchesFilters,
    type ColumnFilters,
  } from "$lib/utils/data-view-filters";

  export let fields: FieldConfig[];
  export let fieldConfigs: FieldConfig[];
  export let rows: DataRecord[];
  export let loading: boolean;
  export let hasConnection: boolean;
  export let selectedRow: DataRecord | null;
  export let onSelectRow: (row: DataRecord) => void;
  export let showFilters: boolean;
  export let storageKey: string;

  let sortFields: SortField[] = [];

  // Sắp xếp mặc định đọc từ cf_field_config.DefaultSortOrder ([STT, hướng] trên từng field) —
  // chỉ áp dụng khi người dùng chưa tự chọn sort nào.
  function defaultSortFieldsFrom(configs: FieldConfig[]): SortField[] {
    return configs
      .filter((item) => item.defaultSortPriority != null)
      .sort((a, b) => (a.defaultSortPriority ?? 0) - (b.defaultSortPriority ?? 0))
      .map((item) => ({ field: item.field, direction: item.defaultSortDirection ?? "asc" }));
  }

  // Chỉ áp sort mặc định đúng 1 lần mỗi khi fieldConfigs THỰC SỰ được tải mới (đổi tham chiếu
  // mảng) — không phải mỗi khi sortFields rỗng trở lại do người dùng tự bấm tắt hết sort.
  let lastFieldConfigs: FieldConfig[] | null = null;
  $: if (fieldConfigs !== lastFieldConfigs) {
    lastFieldConfigs = fieldConfigs;
    if (sortFields.length === 0) sortFields = defaultSortFieldsFrom(fieldConfigs);
  }

  // Mỗi cột luân phiên: tăng dần → giảm dần → tắt; thứ tự bấm xác định độ ưu tiên.
  function toggleSort(field: string): void {
    const existing = sortFields.find((item) => item.field === field);
    if (!existing) {
      sortFields = [...sortFields, { field, direction: "asc" }];
      return;
    }
    sortFields =
      existing.direction === "asc"
        ? sortFields.map((item) => (item.field === field ? { ...item, direction: "desc" } : item))
        : sortFields.filter((item) => item.field !== field);
  }

  // Ghép hậu tố ":filters" ngay tại đây — quy ước đặt tên key lưu bộ lọc thuộc về DataViewTable,
  // DataViewManager chỉ cần biết storageKey gốc (dùng chung với việc lưu ConnectionConfig).
  const filtersStorageKey = `${storageKey}:filters`;
  let filters: ColumnFilters = {};
  // Chỉ ghi bộ lọc vào localStorage SAU khi đã đọc xong ở onMount, tránh việc ghi đè
  // giá trị rỗng ban đầu lên bộ lọc đã lưu từ trước khi kịp đọc ra.
  let filtersLoaded = false;

  onMount(() => {
    const stored = localStorage.getItem(filtersStorageKey);
    if (stored) {
      try {
        filters = JSON.parse(stored) as ColumnFilters;
      } catch {
        // Bỏ qua dữ liệu lỗi, giữ bộ lọc rỗng.
      }
    }
    filtersLoaded = true;
  });

  $: if (filtersLoaded) localStorage.setItem(filtersStorageKey, JSON.stringify(filters));

  // Bộ lọc do người dùng chọn/gõ theo từng cột đang có cấu hình (id không có ô lọc riêng,
  // field có filterKind "none" — cấu hình FilterType = "None" trong cf_field_config — cũng vậy).
  $: filterFields = computeFilterFields(
    fieldConfigs.filter((field) => field.field !== "id" && field.filterKind !== "none"),
    rows,
    filters,
  );
  $: activeFilterCount = countActiveFilters(filters, filterFields);
  $: filteredRows = rows.filter((row) => matchesFilters(row, filters, filterFields));
  $: sortedRows = sortRows(filteredRows, sortFields, fieldConfigs);
  // Field tham gia nhóm dòng (DefaultRowGroupOrder), theo đúng thứ tự cấp lồng nhau; cây nhóm
  // dựng từ filteredRows (chưa sort phẳng) — sortFields chỉ có ý nghĩa sắp dòng lá TRONG mỗi
  // nhóm (buildRowGroupTree tự gọi sortRows nội bộ ở từng nhóm lá), thứ tự các nhóm với nhau
  // luôn cố định theo giá trị field nhóm, độc lập với sortFields.
  $: groupFields = groupFieldsFrom(fieldConfigs);
  $: groupTree = buildRowGroupTree(filteredRows, groupFields, sortFields, fieldConfigs);

  function updateFilter(key: string, value: string): void {
    filters = { ...filters, [key]: value };
  }

  function clearFilters(): void {
    filters = {};
  }

  $: hasGroupColumn = groupTree.some((node) => node.kind === "group");

  // Style dùng chung cho 3 trạng thái rỗng (đang tải/chưa kết nối/chưa có dữ liệu).
  const emptyStateClass = "px-5 py-16 text-center text-sm text-slate-500";
  // Style dùng chung cho mọi <th> ở header (cả cột gutter lẫn cột dữ liệu).
  const headerCellClass =
    "sticky top-0 z-10 bg-primary-900 border border-slate-700 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary-50";

  // Nhóm nào đã bị thu gọn — rỗng = tất cả mở mặc định. Không lưu vào localStorage, mất khi
  // tải lại trang (đúng quyết định đã chốt: state chỉ trong phiên đang dùng).
  let collapsedKeys = new Set<string>();

  function toggleCollapse(key: string): void {
    const next = new Set(collapsedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsedKeys = next;
  }

  function onRowClick(row: DataRecord): void {
    onSelectRow(row);
  }
</script>

<div class="flex h-0 min-h-0 flex-1 flex-col">
  {#if showFilters}
    <DataViewFilters
      {filterFields}
      {filters}
      activeCount={activeFilterCount}
      onChange={updateFilter}
      onClear={clearFilters}
    />
  {/if}
  <div class="flex h-0 min-h-0 flex-1 flex-col rounded bg-white" role="presentation">
    {#if loading}
      <div class={emptyStateClass}>Đang tải dữ liệu...</div>
    {:else if !hasConnection}
      <div class={emptyStateClass}>
        Hãy mở mục <b class="font-semibold text-slate-700">Cài đặt kết nối</b> để nhập thông tin Supabase.
      </div>
    {:else if !sortedRows.length}
      <div class={emptyStateClass}>Chưa có dữ liệu trong bảng này.</div>
    {:else}
      <div class="h-0 min-h-0 flex-1 overflow-auto overscroll-contain">
        <table class="w-full border-separate border-spacing-0 text-sm">
          <thead class={headerCellClass}>
            <tr>
              {#if hasGroupColumn}
                <th class={headerCellClass} aria-label="Thu gọn nhóm"></th>
              {/if}
              {#each fields as field (field.field)}
                <th style={columnWidthStyle(field)} class={headerCellClass}>
                  <button
                    type="button"
                    class="inline-flex w-full items-center gap-1 text-inherit hover:text-white justify-center"
                    on:click={() => toggleSort(field.field)}
                    title="Bấm để chuyển: tăng dần, giảm dần, tắt"
                    >{field.label}{#each sortFields as item, index}{#if item.field === field.field}<span
                          class="text-primary-300"
                          >{item.direction === "asc"
                            ? "↑"
                            : "↓"}{sortFields.length > 1 ? index + 1 : ""}</span
                        >{/if}{/each}</button
                  >
                </th>
              {/each}
            </tr>
          </thead>
          <tbody>
            <DataViewTableGroupRows
              nodes={groupTree}
              {fields}
              showCollapseColumn={hasGroupColumn}
              {collapsedKeys}
              onToggleCollapse={toggleCollapse}
              {selectedRow}
              {onRowClick}
            />
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>
