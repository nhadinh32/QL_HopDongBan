// Tiện ích định dạng/kiểm tra giá trị ô dữ liệu, dùng chung giữa bảng và biểu mẫu.
// Nhận fieldConfig của module hiện tại thay vì hard-code tên cột, để dùng lại được
// cho mọi module dữ liệu (Hợp đồng bán, Hợp đồng mua, ...).
import type { ContractValue, ModuleFieldConfig } from "$lib/types/contracts";

export const hasValue = (value: ContractValue): boolean =>
  value !== null && value !== undefined && value !== "";

// Quy ước: cột bắt đầu bằng "Ngay" được coi là kiểu ngày, trừ các ngoại lệ của module.
export const isDateField = (field: string, fieldConfig: ModuleFieldConfig): boolean =>
  /^Ngay/.test(field) && !fieldConfig.dateFieldExceptions.has(field);

export function formatValue(
  value: ContractValue,
  field: string,
  fieldConfig: ModuleFieldConfig,
): string {
  if (!hasValue(value)) return "—";
  if (fieldConfig.currencyFields.has(field))
    return `${Number(value).toLocaleString("vi-VN")} đ`;
  if (fieldConfig.percentFields.has(field))
    return `${(Number(value) * 100).toLocaleString("vi-VN")}%`;
  return String(value);
}
