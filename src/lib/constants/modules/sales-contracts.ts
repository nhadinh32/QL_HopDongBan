import type { ContractModuleConfig } from "$lib/types/contracts";

// Cấu hình module "Hợp đồng bán": bảng db_hopdongban trên Supabase.
// Danh sách cột, nhãn, kiểu nhập liệu, cách lọc... đọc động từ cf_field_config
// (lọc theo TableName = "db_hopdongban") — xem $lib/services/field-config-service.ts.
export const salesContractsModule: ContractModuleConfig = {
  id: "sales-contracts",
  label: "Hợp đồng bán",
  storageKey: "contract-manager-config:sales-contracts",
  defaultUrl: "https://zjddgdqnqmzyafeoaiej.supabase.co/rest/v1/",
  defaultTable: "db_hopdongban",
  defaultSortFields: [
    { field: "SoHopDong", direction: "asc" },
    { field: "LoaiHS", direction: "asc" },
  ],
  totalValueField: "GiaTriHS",
};
