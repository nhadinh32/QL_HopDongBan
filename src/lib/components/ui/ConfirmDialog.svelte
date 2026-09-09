<script lang="ts">
  // Hộp thoại xác nhận dùng chung cho các thao tác không thể hoàn tác (xóa, hủy...).
  import Modal from "./Modal.svelte";
  import Button from "./Button.svelte";

  export let title: string;
  export let description: string;
  export let confirmLabel = "Xác nhận";
  export let onCancel: () => void;
  export let onConfirm: () => void;
</script>

<Modal onClose={onCancel} size="sm">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h3 class="text-lg font-semibold text-slate-900">{title}</h3>
      <p class="mt-0.5 text-sm text-slate-500">Thao tác này không thể hoàn tác.</p>
    </div>
    <Button variant="icon" ariaLabel="Đóng" on:click={onCancel}>×</Button>
  </div>
  <p class="mt-4 text-sm text-slate-600">{description}</p>
  <div class="mt-5 flex justify-end gap-2 border-t border-slate-200 pt-4">
    <Button on:click={onCancel}>Hủy</Button>
    <Button variant="danger" on:click={onConfirm}>{confirmLabel}</Button>
  </div>
</Modal>
