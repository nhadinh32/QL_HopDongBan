<script lang="ts">
  // Nội dung tab "Cấu hình": liệt kê toàn bộ cột đã cấu hình cho module (bảng cf_field_config),
  // cho phép thêm/sửa/xóa/sắp xếp lại ngay trong UI thay vì phải vào thẳng Supabase Table Editor.
  import Button from "$lib/components/ui/Button.svelte";
  import Badge from "$lib/components/ui/Badge.svelte";
  import {
    FIELD_TYPE_OPTIONS,
    FILTER_TYPE_OPTIONS,
    type FieldConfigRow,
  } from "$lib/types/field-config";

  export let rows: FieldConfigRow[];
  export let loading: boolean;
  export let viewLabel: string;
  export let onCreate: () => void;
  export let onEdit: (row: FieldConfigRow) => void;
  export let onDelete: (row: FieldConfigRow) => void;
  export let onMove: (row: FieldConfigRow, direction: "up" | "down") => void;

  const fieldTypeLabel = (value: string): string =>
    FIELD_TYPE_OPTIONS.find((item) => item.value === value)?.label ?? value;
  const filterTypeLabel = (value: string): string =>
    FILTER_TYPE_OPTIONS.find((item) => item.value === value.toLowerCase())?.label ?? value;

  const emptyStateClass = "px-5 py-16 text-center text-sm text-slate-500";
  const headerCellClass =
    "sticky top-0 z-10 bg-primary-900 border border-slate-700 px-2 py-2 text-[11px] font-semibold uppercase tracking-wide text-primary-50";
  const cellClass = "border-y border-y-slate-300 px-2 py-1.5 align-top";
</script>

<section class="flex h-full min-h-0 flex-col overflow-hidden">
  <div class="mt-2 mx-2 flex flex-wrap items-start justify-between gap-2">
    <div>
      <h2 class="text-lg font-semibold text-slate-900">Cấu hình cột dữ liệu — view "{viewLabel}"</h2>
      <p class="mt-0.5 text-sm text-slate-500">
        Thêm/sửa/xóa cột hiển thị và đổi thứ tự — áp dụng ngay cho tab Danh sách, không cần tải lại
        trang.
      </p>
    </div>
    <Button variant="primary" disabled={loading} on:click={onCreate}>＋ Thêm cột</Button>
  </div>

  <div class="mt-3 h-0 min-h-0 flex-1 overflow-auto overscroll-contain px-2">
    {#if loading}
      <div class={emptyStateClass}>Đang tải cấu hình...</div>
    {:else if !rows.length}
      <div class={emptyStateClass}>Chưa có cột nào được cấu hình cho view "{viewLabel}".</div>
    {:else}
      <table class="w-full border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th class={headerCellClass} style="width:64px">Thứ tự</th>
            <th class={headerCellClass}>Tên cột kỹ thuật</th>
            <th class={headerCellClass}>Nhãn hiển thị</th>
            <th class={headerCellClass}>Loại dữ liệu</th>
            <th class={headerCellClass}>Hiện trong bảng?</th>
            <th class={headerCellClass}>Lọc</th>
            <th class={headerCellClass} style="width:120px">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {#each rows as row, index (row.id)}
            <tr class="hover:bg-slate-50">
              <td class="{cellClass} text-center">
                <div class="flex items-center justify-center gap-0.5">
                  <Button
                    variant="icon"
                    extraClass="!h-6 !w-6 !p-0"
                    ariaLabel="Đưa lên trên"
                    title="Đưa lên trên"
                    disabled={index === 0}
                    on:click={() => onMove(row, "up")}
                  >▲</Button>
                  <Button
                    variant="icon"
                    extraClass="!h-6 !w-6 !p-0"
                    ariaLabel="Đưa xuống dưới"
                    title="Đưa xuống dưới"
                    disabled={index === rows.length - 1}
                    on:click={() => onMove(row, "down")}
                  >▼</Button>
                </div>
              </td>
              <td class="{cellClass} font-mono text-xs text-slate-600">{row.FieldName}</td>
              <td class={cellClass}>{row.Label || row.FieldName}</td>
              <td class={cellClass}>{fieldTypeLabel(row.FieldType)}</td>
              <td class={cellClass}>
                <Badge tone={row.DefaultDisplayField ? "success" : "neutral"}>
                  {row.DefaultDisplayField ? "Có" : "Không"}
                </Badge>
              </td>
              <td class={cellClass}>{filterTypeLabel(row.FilterType)}</td>
              <td class={cellClass}>
                <div class="flex items-center gap-1">
                  <Button extraClass="!px-2 !py-1 text-xs" on:click={() => onEdit(row)}
                    >Sửa</Button
                  >
                  <Button
                    variant="danger"
                    extraClass="!px-2 !py-1 text-xs"
                    on:click={() => onDelete(row)}>Xóa</Button
                  >
                </div>
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    {/if}
  </div>
</section>
