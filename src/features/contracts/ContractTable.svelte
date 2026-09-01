<script lang="ts">
  // Bảng danh sách hồ sơ: sắp xếp nhiều cột, các trạng thái rỗng/tải/lỗi.
  // Tổng quát cho mọi module dữ liệu — nhận fieldConfig (cột số/cột dài) qua prop thay vì hard-code.
  //
  // Nút "Sửa" không phải là một cột trong bảng: nó là MỘT nút nổi (position: absolute) duy nhất.
  // Nút này đặt NGOÀI khung cuộn ngang (div overflow-auto) — nếu đặt bên trong, nút sẽ bị cuộn
  // theo nội dung vì containing block của nó chính là khung đang cuộn. Đặt ở khung bọc ngoài
  // (không có overflow, không cuộn) thì nút mới thực sự đứng yên ở mép phải khi cuộn ngang.
  // Vị trí theo chiều dọc (top) tính bằng offsetTop của dòng đang được rê chuột/chạm tới —
  // offsetTop không bị ảnh hưởng bởi cuộn ngang nên vẫn đúng dù đặt ngoài khung cuộn.
  import { formatValue, hasValue } from "$lib/utils/contract-format";
  import Button from "$lib/components/ui/Button.svelte";
  import type { ContractRecord, ModuleFieldConfig, SortField } from "$lib/types/contracts";

  export let fields: string[];
  export let rows: ContractRecord[];
  export let sortFields: SortField[];
  export let loading: boolean;
  export let hasConnection: boolean;
  export let fieldConfig: ModuleFieldConfig;
  export let onToggleSort: (field: string) => void;
  export let onEdit: (row: ContractRecord) => void;

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
    <div class="px-5 py-16 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
  {:else if !hasConnection}
    <div class="px-5 py-16 text-center text-sm text-slate-500">
      Hãy mở mục <b class="font-semibold text-slate-700">Cài đặt kết nối</b> để nhập thông tin Supabase.
    </div>
  {:else if !rows.length}
    <div class="px-5 py-16 text-center text-sm text-slate-500">Chưa có dữ liệu trong bảng này.</div>
  {:else}
    <div class="overflow-auto rounded">
      <table class="w-full min-w-[1080px] border-collapse text-sm">
        <thead>
          <tr>
            {#each fields as field}
              <th
                class="bg-slate-800 px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300 {fieldConfig.numericFields.has(
                  field,
                )
                  ? 'text-right'
                  : ''}"
              >
                <button
                  type="button"
                  class="inline-flex w-full items-center gap-1 text-inherit hover:text-white {fieldConfig.numericFields.has(
                    field,
                  )
                    ? 'justify-end'
                    : ''}"
                  on:click={() => onToggleSort(field)}
                  title="Bấm để chuyển: tăng dần, giảm dần, tắt"
                  >{field}{#each sortFields as item, index}{#if item.field === field}<span
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
          {#each rows as row (row.id)}
            <tr
              class:bg-slate-50={shownRow === row}
              on:mouseenter={(event) => onRowEnter(row, event.currentTarget)}
              on:click={(event) => onRowClick(row, event.currentTarget)}
            >
              {#each fields as field}
                <td
                  class="max-w-[270px] border-t border-slate-100 px-4 py-3 align-top {fieldConfig.numericFields.has(
                    field,
                  )
                    ? 'text-right tabular-nums'
                    : ''} {fieldConfig.longTextFields.has(field)
                    ? 'whitespace-pre-line'
                    : ''} {hasValue(row[field]) ? '' : 'text-slate-400'}"
                  >{formatValue(row[field], field, fieldConfig)}</td
                >
              {/each}
            </tr>
          {/each}
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
