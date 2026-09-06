// Dựng cây nhóm dòng (row grouping / treeview) cho bảng danh sách, dựa trên
// FieldConfig.groupOrder (đọc từ cột DefaultRowGroupOrder trong cf_field_config).
import { formatValue, hasValue } from "./contract-format";
import { compareValues, sortRows } from "./contract-sort";
import type { ContractRecord, ContractValue, SortField } from "$lib/types/contracts";
import { isMultiSelectType, type FieldConfig } from "$lib/types/field-config";

const EMPTY_BUCKET_KEY = " __empty__";

export type GroupNode =
  | {
      kind: "group";
      field: FieldConfig;
      value: ContractValue;
      label: string;
      // Khoá duy nhất theo cả đường dẫn từ gốc (field+value mỗi cấp nối lại) — dùng làm #each key
      // và key trong collapsedKeys, để 2 nhóm cùng giá trị nhưng khác nhánh cha không đụng nhau.
      key: string;
      children: GroupNode[];
      rowCount: number;
    }
  | { kind: "leaf"; rows: ContractRecord[] };

// Lọc + sắp field tham gia nhóm theo groupOrder tăng dần. Field MultiSelect bị loại (1 dòng có
// thể thuộc nhiều giá trị cùng lúc → mơ hồ khi làm cấp nhóm), chỉ cảnh báo console chứ không throw
// — cấu hình sai ở Supabase không được làm sập cả bảng.
export function groupFieldsFrom(fieldConfigs: FieldConfig[]): FieldConfig[] {
  return fieldConfigs
    .filter((field) => field.groupOrder != null)
    .filter((field) => {
      if (isMultiSelectType(field.type)) {
        console.warn(
          `cf_field_config: field "${field.field}" có DefaultRowGroupOrder nhưng là kiểu MultiSelect — bỏ qua khỏi nhóm dòng.`,
        );
        return false;
      }
      return true;
    })
    .sort((a, b) => (a.groupOrder ?? 0) - (b.groupOrder ?? 0));
}

// Không field nào tham gia nhóm → trả về cây có đúng 1 node "leaf" chứa toàn bộ dòng (đã sort),
// thay vì mảng rỗng — để phía render (ContractTable.svelte) luôn có một cây hợp lệ để vẽ, không
// cần rẽ nhánh if/else giữa "có nhóm" và "không nhóm".
export function buildRowGroupTree(
  rows: ContractRecord[],
  groupFields: FieldConfig[],
  sortFields: SortField[],
  fieldConfigs: FieldConfig[],
): GroupNode[] {
  if (!groupFields.length)
    return [{ kind: "leaf", rows: sortRows(rows, sortFields, fieldConfigs) }];
  return buildLevel(rows, groupFields, sortFields, fieldConfigs, 0, "");
}

function buildLevel(
  rows: ContractRecord[],
  groupFields: FieldConfig[],
  sortFields: SortField[],
  fieldConfigs: FieldConfig[],
  depth: number,
  parentKey: string,
): GroupNode[] {
  const field = groupFields[depth];
  const buckets = new Map<string, ContractRecord[]>();
  const rawByKey = new Map<string, ContractValue>();
  for (const row of rows) {
    const raw = row[field.field];
    const key = hasValue(raw) ? String(raw) : EMPTY_BUCKET_KEY;
    if (!buckets.has(key)) {
      buckets.set(key, []);
      rawByKey.set(key, raw);
    }
    buckets.get(key)!.push(row);
  }

  // Thứ tự các nhóm với nhau: dùng lại compareValues (cùng quy tắc localeCompare/numeric như sort
  // hiện có) — nhóm rỗng luôn xuống cuối.
  const keys = [...buckets.keys()].sort((a, b) => {
    if (a === EMPTY_BUCKET_KEY) return 1;
    if (b === EMPTY_BUCKET_KEY) return -1;
    return compareValues(rawByKey.get(a), rawByKey.get(b), field);
  });

  const nextDepth = depth + 1;
  return keys.map((key) => {
    const groupRows = buckets.get(key)!;
    const value = rawByKey.get(key);
    const label = key === EMPTY_BUCKET_KEY ? "(Chưa xác định)" : formatValue(value, field);
    const nodeKey = `${parentKey}${field.field}=${key}␟`;
    const children: GroupNode[] =
      nextDepth < groupFields.length
        ? buildLevel(groupRows, groupFields, sortFields, fieldConfigs, nextDepth, nodeKey)
        : [{ kind: "leaf", rows: sortRows(groupRows, sortFields, fieldConfigs) }];
    return {
      kind: "group",
      field,
      value,
      label,
      key: nodeKey,
      children,
      rowCount: groupRows.length,
    };
  });
}
