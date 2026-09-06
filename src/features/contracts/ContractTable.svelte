<script lang="ts">
  // Bảng danh sách hồ sơ: sắp xếp nhiều cột, các trạng thái rỗng/tải/lỗi.
  // Tổng quát cho mọi module dữ liệu — nhận FieldConfig[] (đọc từ cf_field_config) qua prop
  // thay vì hard-code Set cột số/cột dài.
  //
  // Nút "Sửa" không phải là một cột trong bảng: nó là MỘT nút nổi (position: absolute) duy nhất.
  // Nút này đặt NGOÀI khung cuộn ngang (div overflow-auto) — nếu đặt bên trong, nút sẽ bị cuộn
  // theo nội dung vì containing block của nó chính là khung đang cuộn. Đặt ở khung bọc ngoài
  // (không có overflow, không cuộn) thì nút mới thực sự đứng yên ở mép phải khi cuộn ngang.
  // Vị trí theo chiều dọc (top) tính bằng offsetTop của dòng đang được rê chuột/chạm tới —
  // offsetTop không bị ảnh hưởng bởi cuộn ngang nên vẫn đúng dù đặt ngoài khung cuộn.
  import { columnWidthStyle } from "$lib/utils/contract-format";
  import Button from "$lib/components/ui/Button.svelte";
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
  export let onEdit: (row: ContractRecord) => void;

  $: hasGroupColumn = groupTree.some((node) => node.kind === "group");

  // Style dùng chung cho 3 trạng thái rỗng (đang tải/chưa kết nối/chưa có dữ liệu).
  const emptyStateClass = "px-5 py-16 text-center text-sm text-slate-500";
  // Style dùng chung cho mọi <th> ở header (cả cột gutter lẫn cột dữ liệu).
  const headerCellClass =
    "bg-primary-900 border border-slate-700 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary-50";

  // Nhóm nào đã bị thu gọn — rỗng = tất cả mở mặc định. Không lưu vào localStorage, mất khi
  // tải lại trang (đúng quyết định đã chốt: state chỉ trong phiên đang dùng).
  let collapsedKeys = new Set<string>();

  function toggleCollapse(key: string): void {
    const next = new Set(collapsedKeys);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    collapsedKeys = next;
  }

  let shownRow: ContractRecord | null = null;
  let shownTop = 0;
  // Dòng được "ghim" bằng cách chạm (mobile) — giữ nút hiện cho tới khi chạm lại.
  let pinnedRow: ContractRecord | null = null;

  function focusRow(row: ContractRecord, el: HTMLTableRowElement): void {
    shownRow = row;
    shownTop = el.offsetTop + el.offsetHeight / 2;
  }

  function onRowEnter(row: ContractRecord, el: HTMLTableRowElement): void {
    if (!pinnedRow) focusRow(row, el);
  }

  function onContainerLeave(): void {
    if (!pinnedRow) shownRow = null;
  }

  function onRowClick(row: ContractRecord, el: HTMLTableRowElement): void {
    if (pinnedRow === row) {
      pinnedRow = null;
      shownRow = null;
      return;
    }
    pinnedRow = row;
    focusRow(row, el);
  }
</script>

<div class="relative rounded bg-white" role="presentation" on:mouseleave={onContainerLeave}>
  {#if loading}
    <div class={emptyStateClass}>Đang tải dữ liệu...</div>
  {:else if !hasConnection}
    <div class={emptyStateClass}>
      Hãy mở mục <b class="font-semibold text-slate-700">Cài đặt kết nối</b> để nhập thông tin Supabase.
    </div>
  {:else if !rows.length}
    <div class={emptyStateClass}>Chưa có dữ liệu trong bảng này.</div>
  {:else}
    <div class="overflow-auto">
      <table class="w-full min-w-[1500px] border border-slate-300 border-collapse text-sm">
        <thead>
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
            {shownRow}
            {onRowEnter}
            {onRowClick}
          />
        </tbody>
      </table>
    </div>

    {#if shownRow}
      {@const row = shownRow}
      <div
        class="pointer-events-none absolute right-1.5 z-10"
        style="top: {shownTop}px; transform: translateY(-50%);"
      >
        <div class="pointer-events-auto">
          <Button variant="icon" ariaLabel="Sửa" extraClass="bg-white" on:click={() => onEdit(row)}
            >✎</Button
          >
        </div>
      </div>
    {/if}
  {/if}
</div>
