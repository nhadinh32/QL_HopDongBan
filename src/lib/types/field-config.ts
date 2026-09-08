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

// Giữ nguyên union chữ thường đã có sẵn ở data-view-filters.ts, chỉ chuyển định nghĩa sang đây
// để field-config.ts làm "nguồn gốc" — cf_field_config lưu PascalCase (Date/Numeric/Select/Text/None),
// field-config-service.ts chuyển về chữ thường khi parse. "none" = field không áp dụng filter,
// bị loại khỏi filterFields ngay ở DataViewManager.svelte (không render thẻ lọc nào cho nó).
export type FilterType = "date" | "numeric" | "select" | "text" | "none";

export type SubtotalType = "sum" | "count" | "max" | "min" | "average" | "product";

// Mã/nhãn view dùng khi một dòng cấu hình chưa gán ViewName (dữ liệu cũ) hoặc trước khi
// fieldConfigs tải xong — nguồn duy nhất cho 2 giá trị này, tránh gõ tay chuỗi "default"/"Danh
// sách" rải rác ở nhiều nơi (field-config-service.ts, DataViewManager.svelte).
export const DEFAULT_VIEW_ID = "default";
export const DEFAULT_VIEW_LABEL = "Danh sách";

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
  // [ViewID, ViewLabel] — mảng 2 phần tử, cùng pattern với DefaultSortOrder. ViewID là mã view
  // (dùng làm id tab + khoá storageKey riêng), ViewLabel là nhãn tab hiển thị. null = dòng cũ
  // chưa gán view (field-config-service.ts fallback về DEFAULT_VIEW_ID/DEFAULT_VIEW_LABEL).
  ViewName: [string, string] | null;
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
  viewId: string;
  viewLabel: string;
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

// Danh mục nhãn tiếng Việt cho tab "Cấu hình" (FieldConfigFormModal) — tránh bắt người dùng
// gõ tay các chuỗi PascalCase/chữ thường kỹ thuật khi thêm/sửa cột trong cf_field_config.
export const FIELD_TYPE_OPTIONS: { value: FieldType; label: string }[] = [
  { value: "Text", label: "Văn bản ngắn" },
  { value: "LongText", label: "Văn bản dài" },
  { value: "Numeric", label: "Số" },
  { value: "Percent", label: "Phần trăm" },
  { value: "Currency", label: "Tiền tệ" },
  { value: "Date", label: "Ngày" },
  { value: "DateTime", label: "Ngày giờ" },
  { value: "SingleSelectWithoutOther", label: "Chọn 1 (danh sách cố định)" },
  { value: "SingleSelectWithOther", label: "Chọn 1 (cho thêm tự do)" },
  { value: "MultiSelectWithoutOther", label: "Chọn nhiều (danh sách cố định)" },
  { value: "MultiSelectWithOther", label: "Chọn nhiều (cho thêm tự do)" },
];

export const FILTER_TYPE_OPTIONS: { value: FilterType; label: string }[] = [
  { value: "text", label: "Tìm theo chuỗi" },
  { value: "numeric", label: "Theo khoảng số" },
  { value: "date", label: "Theo khoảng ngày" },
  { value: "select", label: "Chọn nhiều (slicer)" },
  { value: "none", label: "Không lọc" },
];

export const SUBTOTAL_TYPE_OPTIONS: { value: SubtotalType | null; label: string }[] = [
  { value: null, label: "Không tính" },
  { value: "sum", label: "Tổng" },
  { value: "count", label: "Đếm số dòng" },
  { value: "average", label: "Trung bình" },
  { value: "max", label: "Giá trị lớn nhất" },
  { value: "min", label: "Giá trị nhỏ nhất" },
  { value: "product", label: "Tích" },
];
