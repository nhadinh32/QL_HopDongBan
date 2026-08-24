// Tập trường dự phòng khi bảng Supabase chưa có bản ghi để suy luận cột thực tế.
export const DEFAULT_FIELDS: string[] = [
  'id', 'KhuVucKV', 'NhomHangMucThiCong', 'CumCongTrinhC1', 'CumCongTrinhC2',
  'CongTrinh', 'SoHopDong', 'NoiDungHangMuc', 'LoaiHS', 'NguoiTrinh',
  'NgayTrinhLanDau', 'BuocXuLy', 'NgayChuyenBuoc', 'GiaTriHS',
  'TinhTrangThiCong', 'NguoiNhan', 'ThongTinChiTiet', 'TyLeTamUng', 'TamUng',
  'AnhHuongHSKhac', 'TinhTrangDTCP', 'NgayDuKienPD',
  'TuyChon1', 'TuyChon2', 'DanhSachCon'
];

// Các trường số được căn phải, định dạng và chuyển thành number trước khi lưu.
export const NUMERIC_FIELDS = new Set<string>(['id', 'GiaTriHS', 'TyLeTamUng', 'TamUng']);

// Các trường dài được hiển thị bằng textarea trong biểu mẫu và cho phép xuống dòng trong bảng.
export const LONG_TEXT_FIELDS = new Set<string>(['ThongTinChiTiet', 'NoiDungHangMuc', 'DanhSachCon']);
