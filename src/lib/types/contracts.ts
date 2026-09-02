// Kiểu giá trị có thể trao đổi với Supabase REST cho một ô dữ liệu hợp đồng.
export type ContractValue = string | number | boolean | null | undefined;

// Bản ghi có cấu trúc động vì cột được lấy trực tiếp từ bảng Supabase của người dùng.
export interface ContractRecord {
  id: string | number;
  [field: string]: ContractValue;
}

// Cấu hình kết nối chỉ được lưu trong localStorage của trình duyệt.
export interface ConnectionConfig {
  url: string;
  publicKey: string;
  table: string;
}

// Hướng và độ ưu tiên dùng cho sắp xếp nhiều cột trên bảng danh sách.
export type SortDirection = 'asc' | 'desc';

export interface SortField {
  field: string;
  direction: SortDirection;
}

// Cấu hình định dạng cột dùng chung cho bảng/biểu mẫu của một module dữ liệu.
export interface ModuleFieldConfig {
  numericFields: Set<string>;
  longTextFields: Set<string>;
  currencyFields: Set<string>;
  percentFields: Set<string>;
  dateFields: Set<string>;
  // Cột dùng để tính tổng hiển thị ở thẻ "Giá trị" trên đầu trang; null nếu module không có.
  totalValueField: string | null;
}

// Khai báo một module dữ liệu (một bảng Supabase) hiển thị như một mục trong sidebar.
// Mỗi module có kết nối Supabase (URL/API key/tên bảng) và cấu hình cột riêng —
// thêm module mới bằng cách tạo một cấu hình tương tự trong $lib/constants/modules.
export interface ContractModuleConfig {
  id: string;
  label: string;
  storageKey: string;
  defaultUrl: string;
  defaultTable: string;
  defaultFields: string[];
  defaultSortFields: SortField[];
  fieldConfig: ModuleFieldConfig;
}
