// So sánh/sắp xếp dòng dữ liệu theo cấu hình cột — dùng chung giữa sort phẳng (DataViewManager)
// và sort dòng lá trong từng nhóm (data-view-grouping.ts).
import { hasValue } from "./data-view-format";
import type { DataRecord, DataValue, SortField } from "$lib/types/data-view";
import { isNumericType, type FieldConfig } from "$lib/types/field-config";

// So sánh 2 giá trị ô theo kiểu field — field=undefined (vd. không tra được cấu hình) coi như
// so sánh chuỗi.
export function compareValues(
  left: DataValue,
  right: DataValue,
  field: FieldConfig | undefined,
): number {
  if (!hasValue(left) && !hasValue(right)) return 0;
  if (!hasValue(left)) return 1;
  if (!hasValue(right)) return -1;
  return field && isNumericType(field.type)
    ? Number(left) - Number(right)
    : String(left).localeCompare(String(right), "vi", { sensitivity: "base", numeric: true });
}

// Áp dụng lần lượt các cột sắp xếp; phần tử đầu trong sortFields có ưu tiên cao nhất.
export function sortRows(
  rows: DataRecord[],
  sortFields: SortField[],
  fieldConfigs: FieldConfig[],
): DataRecord[] {
  const configByField = new Map(fieldConfigs.map((item) => [item.field, item]));
  return [...rows].sort((left, right) => {
    for (const rule of sortFields) {
      const result = compareValues(left[rule.field], right[rule.field], configByField.get(rule.field));
      if (result) return result * (rule.direction === "asc" ? 1 : -1);
    }
    return 0;
  });
}
