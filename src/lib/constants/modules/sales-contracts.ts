import type { ContractModuleConfig } from "$lib/types/contracts";

// Cấu hình module "Hợp đồng bán": bảng db_hopdongban trên Supabase.
export const salesContractsModule: ContractModuleConfig = {
  id: "sales-contracts",
  label: "Hợp đồng bán",
  storageKey: "contract-manager-config:sales-contracts",
  defaultUrl: "https://zjddgdqnqmzyafeoaiej.supabase.co/rest/v1/",
  defaultTable: "db_hopdongban",
  defaultFields: [
    "id", "KhuVucKV", "NhomHangMucThiCong", "CumCongTrinhC1", "CumCongTrinhC2",
    "CongTrinh", "SoHopDong", "NoiDungHangMuc", "LoaiHS", "NguoiTrinh",
    "NgayTrinhLanDau", "BuocXuLy", "NgayChuyenBuoc", "GiaTriHS",
    "TinhTrangThiCong", "NguoiNhan", "ThongTinChiTiet", "TyLeTamUng", "TamUng",
    "AnhHuongHSKhac", "TinhTrangDTCP", "NgayDuKienPD",
    "TuyChon1", "TuyChon2", "DanhSachCon", "DuAn", "CongTrinhDTCP", "BenGiaoThau", "BenNhanThau",
  ],
  defaultSortFields: [
    { field: "SoHopDong", direction: "asc" },
    { field: "LoaiHS", direction: "asc" },
  ],
  fieldConfig: {
    // Các trường số được căn phải và chuyển thành number trước khi lưu.
    numericFields: new Set(["id", "GiaTriHS", "TyLeTamUng", "TamUng"]),
    // Các trường dài được hiển thị bằng textarea trong biểu mẫu và cho phép xuống dòng trong bảng.
    longTextFields: new Set(["ThongTinChiTiet", "NoiDungHangMuc", "DanhSachCon"]),
    // Các trường tiền tệ được định dạng theo VNĐ.
    currencyFields: new Set(["GiaTriHS", "TamUng"]),
    // Các trường tỷ lệ được định dạng theo phần trăm.
    percentFields: new Set(["TyLeTamUng"]),
    // Các trường ngày được hiển thị/định dạng theo kiểu ngày (input type="date", dd/mm/yyyy trong bảng).
    dateFields: new Set(["NgayTrinhLanDau", "NgayChuyenBuoc", "NgayDuKienPD"]),
    totalValueField: "GiaTriHS",
  },
};
