import type { ConnectionConfig, ContractRecord } from '$lib/types/contracts';

// Chuẩn hóa URL project hoặc URL REST do người dùng nhập thành endpoint REST v1.
function restBase(url: string): string {
  const projectUrl = url.trim().replace(/\/$/, '').replace(/\/rest\/v1\/?$/i, '');
  return `${projectUrl}/rest/v1`;
}

// Public key được gửi ở mỗi request; quyền truy cập vẫn phải do Supabase RLS kiểm soát.
function requestHeaders(publicKey: string): HeadersInit {
  return { apikey: publicKey, 'Content-Type': 'application/json', Prefer: 'return=representation' };
}

// Chuẩn hóa lỗi HTTP và phản hồi rỗng của các thao tác DELETE/PATCH.
async function request<T>(url: string, options: RequestInit): Promise<T[]> {
  const response = await fetch(url, options);
  if (!response.ok) throw new Error(await response.text());
  const text = await response.text();
  return text ? (JSON.parse(text) as T[]) : [];
}

// Tạo client nhỏ, không phụ thuộc SDK, cho các thao tác CRUD trên một bảng Supabase.
// Generic <T> để dùng lại được cho cả bảng dữ liệu (ContractRecord, mặc định) lẫn bảng
// cấu hình cf_field_config (FieldConfigRow, xem field-config-service.ts) — chỉ khác kiểu dòng trả về.
export function createSupabaseRestClient<T = ContractRecord>(config: ConnectionConfig) {
  const tableUrl = (): string => `${restBase(config.url)}/${encodeURIComponent(config.table)}`;
  const options = (method: string, body?: Record<string, ContractValue>): RequestInit => ({
    method,
    headers: requestHeaders(config.publicKey),
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  return {
    // query: chuỗi filter/order bổ sung nối sau ?select=*, vd. "TableName=eq.x&order=FieldOrderIndex.asc".
    list: (query?: string): Promise<T[]> => request<T>(`${tableUrl()}?select=*${query ? `&${query}` : ''}`, options('GET')),
    create: (payload: Record<string, ContractValue>): Promise<T[]> => request<T>(`${tableUrl()}?select=*`, options('POST', payload)),
    update: (id: string | number, payload: Record<string, ContractValue>): Promise<T[]> => request<T>(`${tableUrl()}?id=eq.${encodeURIComponent(id)}&select=*`, options('PATCH', payload)),
    remove: (id: string | number): Promise<T[]> => request<T>(`${tableUrl()}?id=eq.${encodeURIComponent(id)}`, options('DELETE'))
  };
}

type ContractValue = ContractRecord[string];
