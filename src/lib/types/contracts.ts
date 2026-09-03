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

// Khai báo một module dữ liệu (một bảng Supabase) hiển thị như một mục trong sidebar.
// Mỗi module có kết nối Supabase (URL/API key/tên bảng) — danh sách cột, nhãn, kiểu
// nhập liệu, cách lọc... không còn khai báo ở đây nữa mà đọc động từ bảng cf_field_config
// (xem $lib/types/field-config.ts + $lib/services/field-config-service.ts), lọc theo
// TableName = defaultTable của module. Thêm module mới bằng cách tạo một cấu hình tương tự
// trong $lib/constants/modules, rồi thêm các dòng field tương ứng vào cf_field_config.
export interface ContractModuleConfig {
  id: string;
  label: string;
  storageKey: string;
  defaultUrl: string;
  defaultTable: string;
  defaultSortFields: SortField[];
  // Cột dùng để tính tổng hiển thị ở thẻ "Giá trị" trên đầu trang; null nếu module không có.
  // Đây là cấu hình cấp module (không lặp lại theo field) nên không có cột tương ứng trong
  // cf_field_config, vẫn khai báo tĩnh ở đây.
  totalValueField: string | null;
}
