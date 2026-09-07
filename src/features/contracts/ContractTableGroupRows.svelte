<script lang="ts">
  // Render đệ quy cây nhóm dòng (GroupNode[]) — mỗi cấp nhóm là 1 dòng tiêu đề (bấm để
  // thu/mở), lồng vào bên trong là các cấp con tiếp theo hoặc dòng lá (<tr> dữ liệu, vẽ thẳng
  // ở đây — chỉ còn 1 chỗ gọi nên không tách component riêng nữa).
  import { formatValue, hasValue, columnWidthStyle } from "$lib/utils/contract-format";
  import Button from "$lib/components/ui/Button.svelte";
  import type { ContractRecord } from "$lib/types/contracts";
  import { isNumericType, type FieldConfig } from "$lib/types/field-config";
  import type { ContractValue } from "$lib/types/contracts";
  import type { GroupNode } from "$lib/utils/contract-grouping";

  export let nodes: GroupNode[];
  export let fields: FieldConfig[];
  export let collapsedKeys: Set<string>;
  export let onToggleCollapse: (key: string) => void;
  export let selectedRow: ContractRecord | null;
  export let onRowClick: (row: ContractRecord) => void;
  export let showCollapseColumn = false;
  // Chỉ dùng để chọn màu theo cấp nhóm (không dùng để thụt lề). Phải liệt kê đủ 4 chuỗi class
  // dạng literal (không ghép chuỗi runtime kiểu `bg-primary-${n}`) vì Tailwind chỉ sinh CSS cho
  // class thấy được lúc build — xem lý do tương tự ở ContractTable.svelte/CustomStyleForColumn.
  export let depth = 0;

  // Viền trên/dưới dùng chung cho mọi <td> trong file này (cả dòng nhóm lẫn dòng lá).
  const cellBorder = "border-y border-y-slate-300";

  function groupRowClass(level: number): string {
    if (level === 0) return "bg-slate-300 hover:bg-slate-400";
    if (level === 1) return "bg-slate-200 hover:bg-slate-300";
    if (level === 2) return "bg-slate-100 hover:bg-slate-200";
    return "bg-slate-50 hover:bg-slate-100";
  }

  // "count" là số dòng thuần (không phải giá trị của cột) nên không áp định dạng Currency/Percent
  // của field; các loại subtotal còn lại tái dùng formatValue để giữ định dạng theo field.type.
  function formatSubtotal(value: ContractValue | number | null, field: FieldConfig): string {
    if (field.subtotal === "count") return String(value ?? 0);
    return formatValue(value as ContractValue, field);
  }
</script>

{#each nodes as node (node.kind === 'group' ? node.key : 'leaf')}
  {#if node.kind === 'group'}
    {@const hasTarget = fields.some((f) => f.field === node.field.groupDisplayField)}
    <tr
      class="cursor-pointer {groupRowClass(depth)}"
      on:click={() => onToggleCollapse(node.key)}
    >
      {#if showCollapseColumn}
        <td class="{cellBorder} text-center">
          <Button
            variant="icon"
            ariaLabel={collapsedKeys.has(node.key) ? "Mở nhóm" : "Thu gọn nhóm"}
            title={collapsedKeys.has(node.key) ? "Mở nhóm" : "Thu gọn nhóm"}
            extraClass="border-none rounded-none p-0 !h-6 !w-6"
            on:click={(event) => {
              event.stopPropagation();
              onToggleCollapse(node.key);
            }}
          >{collapsedKeys.has(node.key) ? "▶" : "▼"}</Button>
        </td>
      {/if}
      {#each fields as field (field.field)}
        {#if field.field === node.field.groupDisplayField || (!hasTarget && field === fields[0])}
          <td class="{cellBorder} px-2 py-0 text-left text-sm font-semibold text-slate-900">
            {node.field.label}: {node.label}
          </td>
        {:else if field.subtotal != null}
          <td
            style={columnWidthStyle(field)}
            class="{cellBorder} px-1 py-1 font-semibold {isNumericType(field.type) ? 'text-right tabular-nums' : ''}"
          >{formatSubtotal(node.subtotals[field.field], field)}</td>
        {:else}
          <td class={cellBorder}></td>
        {/if}
      {/each}
    </tr>
    {#if !collapsedKeys.has(node.key)}
      <svelte:self
        nodes={node.children}
        {fields}
        depth={depth + 1}
        {showCollapseColumn}
        {collapsedKeys}
        {onToggleCollapse}
        {selectedRow}
        {onRowClick}
      />
    {/if}
  {:else}
    {#each node.rows as row (row.id)}
      <tr
        class="cursor-pointer"
        class:bg-slate-50={selectedRow === row}
        on:click={() => onRowClick(row)}
      >
        {#if showCollapseColumn}
          <td class={cellBorder}></td>
        {/if}
        {#each fields as field (field.field)}
          {@const text = formatValue(row[field.field], field)}
          <td
            style={columnWidthStyle(field)}
            class="{cellBorder} px-1 py-1 align-top {isNumericType(
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
  {/if}
{/each}
