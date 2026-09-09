import type { DataModuleConfig } from "$lib/types/data-view";
import { salesContractsModule } from "./sales-contracts";

// Danh sách các module dữ liệu hiển thị trong sidebar, mỗi module ứng với một bảng Supabase.
// Để thêm module mới (VD: Hợp đồng mua), tạo một file cấu hình tương tự sales-contracts.ts
// (id/label/storageKey/URL/tên bảng), thêm vào mảng dưới đây, rồi thêm các
// dòng field tương ứng vào bảng cf_field_config (TableName = tên bảng module đó).
export const MODULES: DataModuleConfig[] = [salesContractsModule];
