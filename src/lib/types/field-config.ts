// Kiểu dữ liệu cho hệ thống cấu hình cột động, đọc từ bảng cf_field_config trên Supabase.
// Thay thế ModuleFieldConfig (5 Set<string> khai báo cứng) — mọi hành vi của một cột
// (nhãn, kiểu nhập liệu, cách lọc, hiển thị mặc định, thứ tự, độ rộng, style) đều đến từ đây.

export type FieldType =
  | "Text"
  | "LongText"
  | "Numeric"
  | "Percent"
  | "SingleSelectWithoutOther"
  | "SingleSelectWithOther"
  | "MultiSelectWithoutOther"
  | "MultiSelectWithOther"
  | "Date"
  | "DateTime"
  | "Currency";

// Giữ nguyên union chữ thường đã có sẵn ở contract-filters.ts, chỉ chuyển định nghĩa sang đây
// để field-config.ts làm "nguồn gốc" — cf_field_config lưu PascalCase (Date/Numeric/Select/Text/None),
// field-config-service.ts chuyển về chữ thường khi parse. "none" = field không áp dụng filter,
// bị loại khỏi filterFields ngay ở ContractManager.svelte (không render thẻ lọc nào cho nó).
export type FilterType = "date" | "numeric" | "select" | "text" | "none";

export type SubtotalType = "sum" | "count" | "max" | "min" | "average" | "product";

// Raw shape trả về từ PostgREST — khớp đúng tên cột thật trong cf_field_config.
export interface FieldConfigRow {
  id: number;
  TableName: string;
  DefaultFieldOrderIndex: number | null;
  FieldName: string;
  Label: string;
  DefaultDisplayField: boolean;
  FieldType: FieldType;
  FilterType: string;
  DefaultFieldColumnWidth: number | null;
  DefaultCustomStyleForColumn: string | null;
  SuggestForSelect: string[] | null;
  // [STT sắp xếp, hướng] — hướng: 0 = asc, 1 = desc. null nếu field không tham gia sort mặc định.
  DefaultSortOrder: [number, number] | null;
  // Số nguyên đơn (không phải tuple như DefaultSortOrder), giống DefaultFieldOrderIndex — số nhỏ
  // = cấp nhóm ngoài cùng, số lớn = cấp lồng bên trong. null = field không tham gia nhóm dòng.
  DefaultRowGroupOrder: number | null;
  // FieldName của cột dữ liệu sẽ hiển thị nội dung dòng nhóm (group row) khi field này được dùng
  // để group. null = chưa cấu hình, mặc định hiển thị ở cột dữ liệu đầu tiên.
  DefaultPositionFieldNamShowGroup: string | null;
  // Loại subtotal hiển thị ở ô của field này trên dòng nhóm — PascalCase (Sum/Count/Max/Min/
  // Average/Product). null = không hiển thị subtotal cho field này.
  Subtotal: string | null;
}

// Shape runtime đã parse, dùng xuyên suốt UI (form/bảng/filter).
export interface FieldConfig {
  field: string;
  label: string;
  type: FieldType;
  defaultDisplay: boolean;
  suggestOptions: string[];
  filterKind: FilterType;
  columnWidth: number | null;
  customStyle: string | null;
  orderIndex: number | null;
  defaultSortPriority: number | null;
  defaultSortDirection: "asc" | "desc" | null;
  groupOrder: number | null;
  groupDisplayField: string | null;
  subtotal: SubtotalType | null;
}

export function isNumericType(type: FieldType): boolean {
  return type === "Numeric" || type === "Percent" || type === "Currency";
}

export function isDateType(type: FieldType): boolean {
  return type === "Date" || type === "DateTime";
}

export function isMultiSelectType(type: FieldType): boolean {
  return type === "MultiSelectWithoutOther" || type === "MultiSelectWithOther";
}

export function isSelectType(type: FieldType): boolean {
  return (
    type === "SingleSelectWithoutOther" ||
    type === "SingleSelectWithOther" ||
    type === "MultiSelectWithoutOther" ||
    type === "MultiSelectWithOther"
  );
}

// "...WithOther" cho phép gõ giá trị tự do ngoài SuggestForSelect; "...WithoutOther" thì không.
export function allowsCustomValue(type: FieldType): boolean {
  return type === "SingleSelectWithOther" || type === "MultiSelectWithOther";
}
