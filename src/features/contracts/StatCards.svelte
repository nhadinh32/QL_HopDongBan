<script lang="ts">
  // Ba chỉ số nhanh phía trên bảng: tổng hồ sơ, tổng giá trị, trạng thái đồng bộ.
  export let totalRows: number;
  export let totalValueLabel: string;
  export let statusLabel: string;
</script>

<div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
  <div class="rounded bg-white px-5 py-4">
    <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Tổng hồ sơ</span>
    <strong class="mt-1 block text-2xl font-semibold text-slate-900"
      >{totalRows.toLocaleString("vi-VN")}</strong
    >
  </div>
  <div class="rounded bg-white px-5 py-4">
    <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Giá trị hợp đồng</span>
    <strong class="mt-1 block text-2xl font-semibold text-slate-900">{totalValueLabel}</strong>
  </div>
  <div class="rounded bg-white px-5 py-4">
    <span class="text-xs font-medium uppercase tracking-wide text-slate-500">Trạng thái</span>
    <strong class="mt-1 block text-2xl font-semibold text-slate-900">{statusLabel}</strong>
  </div>
</div>
