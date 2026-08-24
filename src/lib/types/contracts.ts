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
