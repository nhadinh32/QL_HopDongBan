<script lang="ts">
  // Bảng danh sách hồ sơ: sắp xếp nhiều cột, các trạng thái rỗng/tải/lỗi.
  // Tổng quát cho mọi module dữ liệu — nhận FieldConfig[] (đọc từ cf_field_config) qua prop
  // thay vì hard-code Set cột số/cột dài.
  //
  // Chọn dòng để sửa: bấm 1 dòng để chọn (tô nền), bấm lại để bỏ chọn — nút "Sửa" thao tác trên
  // dòng đang chọn nằm ở thanh công cụ chung (ContractManager.svelte), không phải trong bảng.
  import { columnWidthStyle } from "$lib/utils/contract-format";
  import ContractTableGroupRows from "./ContractTableGroupRows.svelte";
  import type { ContractRecord, SortField } from "$lib/types/contracts";
  import type { FieldConfig } from "$lib/types/field-config";
  import type { GroupNode } from "$lib/utils/contract-grouping";

  export let fields: FieldConfig[];
  export let rows: ContractRecord[];
  export let groupTree: GroupNode[] = [];
  export let sortFields: SortField[];
  export let loading: boolean;
  export let hasConnection: boolean;
  export let onToggleSort: (field: string) => void;
  export let selectedRow: ContractRecord | null;
  export let onSelectRow: (row: ContractRecord) => void;

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

  function onRowClick(row: ContractRecord): void {
    onSelectRow(row);
  }
</script>

<div class="flex h-0 min-h-0 flex-1 flex-col rounded bg-white" role="presentation">
  {#if loading}
    <div class={emptyStateClass}>Đang tải dữ liệu...</div>
  {:else if !hasConnection}
    <div class={emptyStateClass}>
      Hãy mở mục <b class="font-semibold text-slate-700">Cài đặt kết nối</b> để nhập thông tin Supabase.
    </div>
  {:else if !rows.length}
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
                  on:click={() => onToggleSort(field.field)}
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
          <ContractTableGroupRows
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
