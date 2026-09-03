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
  import { formatValue, hasValue } from "$lib/utils/contract-format";
  import Button from "$lib/components/ui/Button.svelte";
  import type { ContractRecord, SortField } from "$lib/types/contracts";
  import { isNumericType, type FieldConfig } from "$lib/types/field-config";

  export let fields: FieldConfig[];
  export let rows: ContractRecord[];
  export let sortFields: SortField[];
  export let loading: boolean;
  export let hasConnection: boolean;
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

  // Độ rộng cột (px) — áp cho cả <th> lẫn <td> để cột đồng bộ chiều rộng. `columnWidth = null`
  // giữ hành vi hiện tại (tự co giãn theo nội dung).
  function widthStyle(field: FieldConfig): string {
    return field.columnWidth != null
      ? `width:${field.columnWidth}px; min-width:${field.columnWidth}px`
      : "";
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
      <table class="w-full min-w-[1500px] border-collapse text-sm">
        <thead>
          <tr>
            {#each fields as field (field.field)}
              <th
                style={widthStyle(field)}
                class="bg-primary-900 border-x border-slate-700 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary-50"
              >
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
          {#each rows as row (row.id)}
            <tr
              class:bg-slate-50={shownRow === row}
              on:mouseenter={(event) => onRowEnter(row, event.currentTarget)}
              on:click={(event) => onRowClick(row, event.currentTarget)}
            >
              {#each fields as field (field.field)}
                {@const text = formatValue(row[field.field], field)}
                <td
                  style={widthStyle(field)}
                  class="border-y border-y-slate-300 px-1 py-1 align-top {isNumericType(
                    field.type,
                  )
                    ? 'text-right tabular-nums'
                    : ''} {hasValue(row[field.field]) ? '' : 'text-slate-400'}"
                  title={text}
                  ><div
                    style={field.customStyle ?? ""}
                    class="line-clamp-3 {field.type === 'LongText' ? 'whitespace-pre-line' : ''}"
                  >{text}</div></td
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
