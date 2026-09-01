import type { ContractModuleConfig } from "$lib/types/contracts";
import { salesContractsModule } from "./sales-contracts";

// Danh sách các module dữ liệu hiển thị trong sidebar, mỗi module ứng với một bảng Supabase.
// Để thêm module mới (VD: Hợp đồng mua), tạo một file cấu hình tương tự sales-contracts.ts
// (bảng, danh sách cột mặc định, cột số/cột dài/cột tiền tệ...) rồi thêm vào mảng dưới đây.
export const MODULES: ContractModuleConfig[] = [salesContractsModule];
