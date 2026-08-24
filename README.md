# Quản lý hợp đồng bán

Ứng dụng Svelte + Vite + TypeScript, xuất tĩnh để triển khai trên GitHub Pages.

## Chạy cục bộ

```powershell
npm install
npm run dev
```

## Triển khai GitHub Pages

Workflow `.github/workflows/deploy-github-pages.yml` sẽ tự triển khai khi có thay đổi trên nhánh `main`.

Trong repository GitHub, mở **Settings → Pages → Build and deployment**, chọn **GitHub Actions** làm nguồn triển khai.

Workflow hiện dùng đường dẫn `/QL_HopDongBan/`, tương ứng repository `QL_HopDongBan`. Nếu đổi tên repository hoặc dùng custom domain, cập nhật biến `BASE_PATH` trong workflow (đặt thành `/` khi dùng custom domain).
