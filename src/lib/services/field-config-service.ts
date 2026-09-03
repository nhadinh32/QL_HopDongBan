import type { ConnectionConfig } from "$lib/types/contracts";
import type { FieldConfig, FieldConfigRow, FilterType } from "$lib/types/field-config";
import { createSupabaseRestClient } from "./supabase-rest";

// Bảng cấu hình dùng chung cho mọi module — không phải bảng dữ liệu của module nào cả,
// nên tên bảng cố định, khác với config.table (bảng dữ liệu, đổi theo từng module).
const FIELD_CONFIG_TABLE = "cf_field_config";

// cf_field_config lưu FilterType dạng PascalCase (Date/Numeric/Select/Text/None); toàn bộ UI
// (contract-filters.ts, ContractFilters.svelte) dùng union chữ thường có sẵn từ trước.
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

function toFieldConfig(row: FieldConfigRow): FieldConfig {
  return {
    field: row.FieldName,
    label: row.Label || row.FieldName,
    type: row.FieldType,
    defaultDisplay: row.DefaultDisplayField,
    suggestOptions: row.SuggestForSelect ?? [],
    filterKind: toFilterType(row.FilterType),
    columnWidth: row.DefaultFieldColumnWidth ?? null,
    customStyle: row.CustomStyleForColumn ?? null,
    orderIndex: row.FieldOrderIndex ?? null,
  };
}

// Tải cấu hình cột của một module (lọc theo TableName = bảng dữ liệu thật của module đó),
// đã sắp theo FieldOrderIndex. Dùng chung ConnectionConfig (URL/key) đã cấu hình cho module —
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
    `TableName=eq.${encodeURIComponent(tableName)}&order=FieldOrderIndex.asc`,
  );
  return rows.map(toFieldConfig);
}
