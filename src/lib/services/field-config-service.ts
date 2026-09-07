import type { ConnectionConfig } from "$lib/types/data-view";
import type { FieldConfig, FieldConfigRow, FilterType, SubtotalType } from "$lib/types/field-config";
import { createSupabaseRestClient } from "./supabase-rest";

// Bảng cấu hình dùng chung cho mọi module — không phải bảng dữ liệu của module nào cả,
// nên tên bảng cố định, khác với config.table (bảng dữ liệu, đổi theo từng module).
const FIELD_CONFIG_TABLE = "cf_field_config";

// cf_field_config lưu FilterType dạng PascalCase (Date/Numeric/Select/Text/None); toàn bộ UI
// (data-view-filters.ts, DataViewFilters.svelte) dùng union chữ thường có sẵn từ trước.
function toFilterType(value: string): FilterType {
  const lower = value.toLowerCase();
  if (
    lower === "date" ||
    lower === "numeric" ||
    lower === "select" ||
    lower === "text" ||
    lower === "none"
  )
    return lower;
  return "text";
}

// cf_field_config lưu Subtotal dạng PascalCase (Sum/Count/Max/Min/Average/Product), null = không
// subtotal. Giá trị lạ (cấu hình sai) chỉ cảnh báo console + coi như null, không throw.
function toSubtotalType(value: string | null): SubtotalType | null {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (
    lower === "sum" ||
    lower === "count" ||
    lower === "max" ||
    lower === "min" ||
    lower === "average" ||
    lower === "product"
  )
    return lower;
  console.warn(`cf_field_config: giá trị Subtotal không hợp lệ "${value}".`);
  return null;
}

function toFieldConfig(row: FieldConfigRow): FieldConfig {
  const [priority, direction] = row.DefaultSortOrder ?? [];
  return {
    field: row.FieldName,
    label: row.Label || row.FieldName,
    type: row.FieldType,
    defaultDisplay: row.DefaultDisplayField,
    suggestOptions: row.SuggestForSelect ?? [],
    filterKind: toFilterType(row.FilterType),
    columnWidth: row.DefaultFieldColumnWidth ?? null,
    customStyle: row.DefaultCustomStyleForColumn ?? null,
    orderIndex: row.DefaultFieldOrderIndex ?? null,
    defaultSortPriority: priority ?? null,
    defaultSortDirection: priority == null ? null : direction === 1 ? "desc" : "asc",
    groupOrder: row.DefaultRowGroupOrder ?? null,
    groupDisplayField: row.DefaultPositionFieldNamShowGroup ?? null,
    subtotal: toSubtotalType(row.Subtotal),
  };
}

// Tải cấu hình cột của một module (lọc theo TableName = bảng dữ liệu thật của module đó),
// đã sắp theo DefaultFieldOrderIndex. Dùng chung ConnectionConfig (URL/key) đã cấu hình cho module —
// cf_field_config nằm cùng project Supabase, chỉ khác tên bảng.
export async function loadFieldConfig(
  config: ConnectionConfig,
  tableName: string,
): Promise<FieldConfig[]> {
  const client = createSupabaseRestClient<FieldConfigRow>({
    ...config,
    table: FIELD_CONFIG_TABLE,
  });
  const rows = await client.list(
    `TableName=eq.${encodeURIComponent(tableName)}&order=DefaultFieldOrderIndex.asc`,
  );
  return rows.map(toFieldConfig);
}

function fieldConfigClient(config: ConnectionConfig) {
  return createSupabaseRestClient<FieldConfigRow>({ ...config, table: FIELD_CONFIG_TABLE });
}

// Tải danh sách cột THÔ (FieldConfigRow, chưa parse) của một module — dùng cho tab "Cấu hình",
// nơi cần sửa/xóa đúng theo id/TableName thật thay vì shape FieldConfig đã rút gọn.
export async function loadFieldConfigRows(
  config: ConnectionConfig,
  tableName: string,
): Promise<FieldConfigRow[]> {
  return fieldConfigClient(config).list(
    `TableName=eq.${encodeURIComponent(tableName)}&order=DefaultFieldOrderIndex.asc`,
  );
}

export async function createFieldConfigRow(
  config: ConnectionConfig,
  row: Omit<FieldConfigRow, "id">,
): Promise<FieldConfigRow> {
  const [created] = await fieldConfigClient(config).create(row);
  return created;
}

export async function updateFieldConfigRow(
  config: ConnectionConfig,
  id: number,
  patch: Partial<FieldConfigRow>,
): Promise<FieldConfigRow> {
  const [updated] = await fieldConfigClient(config).update(id, patch);
  return updated;
}

export async function deleteFieldConfigRow(config: ConnectionConfig, id: number): Promise<void> {
  await fieldConfigClient(config).remove(id);
}
