// Tiện ích lọc danh sách hồ sơ theo từng cột, dùng chung cho bảng của mọi module.
// Kiểu lọc (FilterType) đọc thẳng từ FieldConfig (cf_field_config), không còn tự suy luận
// từ dữ liệu như trước — panel bộ lọc (ContractFilters.svelte) tự sinh đúng loại điều khiển
// (slicer nhiều lựa chọn / khoảng ngày / khoảng số / tìm chuỗi) theo đúng cấu hình DB.
import { hasValue } from "./contract-format";
import type { ContractRecord } from "$lib/types/contracts";
import type { FieldConfig, FilterType } from "$lib/types/field-config";

export type { FilterType };

export interface FilterField {
  field: string;
  label: string;
  kind: FilterType;
  options: string[];
}

// Giá trị lọc của một cột là một chuỗi duy nhất, nhưng ý nghĩa khác nhau theo kind:
// - "select": JSON của mảng các lựa chọn đã bật (cho phép chọn nhiều, xem decode/encodeSelectValues).
// - "date"/"numeric": KHÔNG lưu trực tiếp ở key `field`, mà tách thành 2 key riêng
//   `field::from`/`field::to` (ngày) hoặc `field::min`/`field::max` (số) — vì mỗi cột dạng
//   khoảng cần 2 ô nhập độc lập. Quy ước này lặp lại ở isFilterActive và matchesFilters bên dưới.
// - "text": chuỗi tìm kiếm nhập trực tiếp, so khớp "chứa" không phân biệt hoa/thường.
export type ColumnFilters = Record<string, string>;

// Giá trị multi-select trong một ô lưu nối bằng `;` (cùng quy ước với SuggestForSelect) —
// tách ra để so khớp/liệt kê từng lựa chọn riêng thay vì coi cả chuỗi là một giá trị lạ.
// Với field single-select, chuỗi không chứa `;` nên tách ra vẫn chỉ được đúng 1 phần tử,
// không ảnh hưởng gì — nhờ vậy có thể áp dụng chung cho mọi field kind "select".
function splitCellValues(value: string): string[] {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function distinctValues(rows: ContractRecord[], field: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    if (!hasValue(row[field])) continue;
    for (const part of splitCellValues(String(row[field]))) values.add(part);
  }
  return [...values].sort((a, b) =>
    a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }),
  );
}

// Tính trước { field, label, kind, options } cho từng cột đang hiển thị. `kind` đọc thẳng
// từ `filterKind` của FieldConfig (cf_field_config), không còn suy luận theo cardinality.
// Với kind "select", options = SuggestForSelect (giữ nguyên thứ tự đã cấu hình — nhiều field
// dùng thứ tự có ý nghĩa, vd. quy trình xử lý, không phải bảng chữ cái) nối thêm các giá trị
// thực tế đang có trong dữ liệu nhưng chưa nằm trong SuggestForSelect (sắp theo alphabet).
// Các bộ lọc LIÊN KẾT với nhau: options của một cột chỉ gồm giá trị xuất hiện ở các dòng đã
// khớp TẤT CẢ bộ lọc CÒN LẠI (trừ chính cột đó, để không tự thu hẹp lựa chọn của chính mình
// theo lựa chọn hiện tại của nó) — giống slicer Excel.
//
// Cách tính: duyệt `rows` đúng MỘT lượt (không lọc lại toàn bộ rows riêng cho từng cột select,
// vì vậy tránh độ phức tạp bậc 2 theo số cột). Với mỗi dòng, đếm số cột mà dòng đó KHÔNG khớp
// bộ lọc riêng của cột đó:
// - 0 cột trượt: dòng khớp mọi bộ lọc → tính vào tập liên quan của MỌI cột select.
// - đúng 1 cột trượt: dòng khớp tất cả cột CÒN LẠI → chỉ tính vào tập liên quan của chính cột đó.
// - từ 2 cột trượt trở lên: dòng không khớp "tất cả cột khác" của bất kỳ cột select nào → bỏ qua.
export function computeFilterFields(
  fieldConfigs: FieldConfig[],
  rows: ContractRecord[],
  filters: ColumnFilters = {},
): FilterField[] {
  const asFilterField = (config: FieldConfig): FilterField => ({
    field: config.field,
    label: config.label,
    kind: config.filterKind,
    options: [],
  });
  const allFields = fieldConfigs.map(asFilterField);
  const selectFields = fieldConfigs.filter((config) => config.filterKind === "select");

  const relevantRowsByField = new Map<string, ContractRecord[]>();
  for (const config of selectFields) relevantRowsByField.set(config.field, []);

  for (const row of rows) {
    let failingField = "";
    let failCount = 0;
    for (const field of allFields) {
      if (matchesFilter(row, filters, field)) continue;
      failCount++;
      failingField = field.field;
      if (failCount > 1) break;
    }
    if (failCount === 0) {
      for (const list of relevantRowsByField.values()) list.push(row);
    } else if (failCount === 1) {
      relevantRowsByField.get(failingField)?.push(row);
    }
  }

  return fieldConfigs.map((config) => {
    if (config.filterKind !== "select")
      return { field: config.field, label: config.label, kind: config.filterKind, options: [] };
    const relevantRows = relevantRowsByField.get(config.field) ?? [];
    const values = new Set(distinctValues(relevantRows, config.field));
    const ordered = config.suggestOptions.filter((value) => values.has(value));
    const extra = [...values]
      .filter((value) => !config.suggestOptions.includes(value))
      .sort((a, b) => a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }));
    return {
      field: config.field,
      label: config.label,
      kind: "select" as const,
      options: [...ordered, ...extra],
    };
  });
}

export function decodeSelectValues(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export function encodeSelectValues(values: string[]): string {
  return values.length ? JSON.stringify(values) : "";
}

// Cột có đang bị lọc hay không — dùng để đếm badge "N bộ lọc" và để panel bộ lọc quyết định
// có hiện nút xóa riêng (⨉) trên từng thẻ hay không (ContractFilters.svelte).
export function isFilterActive(field: string, kind: FilterType, filters: ColumnFilters): boolean {
  if (kind === "date") return Boolean(filters[`${field}::from`] || filters[`${field}::to`]);
  if (kind === "numeric") return Boolean(filters[`${field}::min`] || filters[`${field}::max`]);
  if (kind === "select") return decodeSelectValues(filters[field]).length > 0;
  return Boolean(filters[field]);
}

// Một dòng dữ liệu có khớp bộ lọc riêng của MỘT cột hay không. Tách khỏi matchesFilters để
// computeFilterFields tái dùng trực tiếp theo từng cột, không phải dựng mảng 1 phần tử mỗi lần gọi.
function matchesFilter(row: ContractRecord, filters: ColumnFilters, { field, kind }: FilterField): boolean {
  if (kind === "date") {
    const from = filters[`${field}::from`];
    const to = filters[`${field}::to`];
    const value = row[field] == null ? "" : String(row[field]);
    if (from && (!value || value < from)) return false;
    if (to && (!value || value > to)) return false;
    return true;
  }
  if (kind === "numeric") {
    const min = filters[`${field}::min`];
    const max = filters[`${field}::max`];
    const num = Number(row[field]);
    if (min !== undefined && min !== "" && !(Number.isFinite(num) && num >= Number(min)))
      return false;
    if (max !== undefined && max !== "" && !(Number.isFinite(num) && num <= Number(max)))
      return false;
    return true;
  }
  if (kind === "select") {
    const selected = decodeSelectValues(filters[field]);
    if (!selected.length) return true;
    const cell = row[field] == null ? "" : String(row[field]);
    const cellValues = splitCellValues(cell);
    return selected.some((value) => cellValues.includes(value));
  }
  const filterValue = filters[field];
  if (!filterValue) return true;
  const cell = row[field] == null ? "" : String(row[field]);
  return cell.toLocaleLowerCase("vi").includes(filterValue.toLocaleLowerCase("vi"));
}

// Một dòng dữ liệu có khớp toàn bộ bộ lọc đang áp dụng hay không (AND giữa các cột).
export function matchesFilters(
  row: ContractRecord,
  filters: ColumnFilters,
  filterFields: FilterField[],
): boolean {
  return filterFields.every((field) => matchesFilter(row, filters, field));
}

export function countActiveFilters(filters: ColumnFilters, filterFields: FilterField[]): number {
  return filterFields.filter(({ field, kind }) => isFilterActive(field, kind, filters)).length;
}
