// Tiện ích định dạng/kiểm tra giá trị ô dữ liệu, dùng chung giữa bảng và biểu mẫu.
// Nhận FieldConfig của cột (đọc từ cf_field_config) thay vì hard-code tên cột, để dùng
// lại được cho mọi module dữ liệu (Hợp đồng bán, Hợp đồng mua, ...).
import type { DataValue } from "$lib/types/data-view";
import type { FieldConfig } from "$lib/types/field-config";

export const hasValue = (value: DataValue): boolean =>
  value !== null && value !== undefined && value !== "";

function formatDateVN(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
}

function formatDateTimeVN(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : `${date.toLocaleDateString("vi-VN")} ${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
}

// Giá trị multi-select lưu trong Supabase dưới dạng chuỗi nối `;` (cùng quy ước với
// SuggestForSelect); hiển thị lại thành danh sách dễ đọc, phân tách bằng ", ".
function formatMultiSelect(value: string): string {
  return value
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .join(", ");
}

// Độ rộng cột (px) — áp cho cả <th> lẫn <td> để cột đồng bộ chiều rộng. `columnWidth = null`
// giữ hành vi tự co giãn theo nội dung.
export function columnWidthStyle(field: FieldConfig): string {
  return field.columnWidth != null
    ? `width:${field.columnWidth}px; min-width:${field.columnWidth}px`
    : "";
}

export function formatValue(value: DataValue, config: FieldConfig): string {
  if (!hasValue(value)) return "—";
  switch (config.type) {
    case "Currency":
      return `${Number(value).toLocaleString("vi-VN")} đ`;
    case "Percent":
      return `${(Number(value) * 100).toLocaleString("vi-VN")}%`;
    case "Date":
      return formatDateVN(String(value));
    case "DateTime":
      return formatDateTimeVN(String(value));
    case "MultiSelectWithoutOther":
    case "MultiSelectWithOther":
      return formatMultiSelect(String(value));
    default:
      return String(value);
  }
}
