// Tiện ích lọc danh sách hồ sơ theo từng cột, dùng chung cho bảng của mọi module.
// Mỗi cột tự suy ra một "kiểu lọc" (FilterKind) từ fieldConfig + dữ liệu thực tế — nhờ vậy
// panel bộ lọc (ContractFilters.svelte) tự sinh đúng loại điều khiển (slicer nhiều lựa chọn /
// khoảng ngày / khoảng số / tìm chuỗi) mà không cần khai báo thủ công cho từng cột, từng module.
import { hasValue } from "./contract-format";
import type { ContractRecord, ModuleFieldConfig } from "$lib/types/contracts";

export type FilterKind = "date" | "numeric" | "select" | "text";

export interface FilterField {
  field: string;
  kind: FilterKind;
  options: string[];
}

// Cột chữ có tối đa chừng này giá trị khác nhau thì coi là danh mục (kind "select"),
// hiển thị dạng slicer; nhiều hơn thì coi là văn bản tự do (kind "text"), lọc bằng tìm chuỗi.
const SELECT_OPTION_LIMIT = 30;

// Giá trị lọc của một cột là một chuỗi duy nhất, nhưng ý nghĩa khác nhau theo kind:
// - "select": JSON của mảng các lựa chọn đã bật (cho phép chọn nhiều, xem decode/encodeSelectValues).
// - "date"/"numeric": KHÔNG lưu trực tiếp ở key `field`, mà tách thành 2 key riêng
//   `field::from`/`field::to` (ngày) hoặc `field::min`/`field::max` (số) — vì mỗi cột dạng
//   khoảng cần 2 ô nhập độc lập. Quy ước này lặp lại ở isFilterActive và matchesFilters bên dưới.
// - "text": chuỗi tìm kiếm nhập trực tiếp, so khớp "chứa" không phân biệt hoa/thường.
export type ColumnFilters = Record<string, string>;

export function distinctValues(rows: ContractRecord[], field: string): string[] {
  const values = new Set<string>();
  for (const row of rows) {
    if (hasValue(row[field])) values.add(String(row[field]));
  }
  return [...values].sort((a, b) =>
    a.localeCompare(b, "vi", { numeric: true, sensitivity: "base" }),
  );
}

// Tính trước kiểu lọc (date/numeric/select/text) + danh sách giá trị (nếu là "select") cho
// từng cột đang hiển thị. Nhận `rows` là TOÀN BỘ dữ liệu (không phải phần đã lọc), để danh
// sách lựa chọn của slicer không co lại/mất tùy chọn khi người dùng đang lọc bằng cột khác.
export function computeFilterFields(
  fields: string[],
  rows: ContractRecord[],
  fieldConfig: ModuleFieldConfig,
): FilterField[] {
  return fields.map((field) => {
    if (fieldConfig.dateFields.has(field)) return { field, kind: "date" as const, options: [] };
    if (fieldConfig.numericFields.has(field))
      return { field, kind: "numeric" as const, options: [] };
    const options = distinctValues(rows, field);
    return options.length > 0 && options.length <= SELECT_OPTION_LIMIT
      ? { field, kind: "select" as const, options }
      : { field, kind: "text" as const, options: [] };
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
export function isFilterActive(field: string, kind: FilterKind, filters: ColumnFilters): boolean {
  if (kind === "date") return Boolean(filters[`${field}::from`] || filters[`${field}::to`]);
  if (kind === "numeric") return Boolean(filters[`${field}::min`] || filters[`${field}::max`]);
  if (kind === "select") return decodeSelectValues(filters[field]).length > 0;
  return Boolean(filters[field]);
}

// Một dòng dữ liệu có khớp toàn bộ bộ lọc đang áp dụng hay không (AND giữa các cột).
export function matchesFilters(
  row: ContractRecord,
  filters: ColumnFilters,
  filterFields: FilterField[],
): boolean {
  return filterFields.every(({ field, kind }) => {
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
      return selected.includes(cell);
    }
    const filterValue = filters[field];
    if (!filterValue) return true;
    const cell = row[field] == null ? "" : String(row[field]);
    return cell.toLocaleLowerCase("vi").includes(filterValue.toLocaleLowerCase("vi"));
  });
}

export function countActiveFilters(filters: ColumnFilters, filterFields: FilterField[]): number {
  return filterFields.filter(({ field, kind }) => isFilterActive(field, kind, filters)).length;
}
