<script lang="ts">
  // Danh sách View (ViewName trong cf_field_config) dùng trong tab "Cấu hình" — cho phép
  // thêm/đổi tên/xóa/sắp xếp view mà không cần đi vòng qua form thêm/sửa 1 cột. View không có
  // bảng riêng trong Supabase (chỉ là ViewName lặp lại trên từng dòng cột), nên mọi thao tác ở
  // đây đều được DataViewManager.svelte quy đổi thành các lệnh CRUD hàng loạt trên FieldConfigRow.
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";

  export let views: { id: string; label: string; columnCount: number }[];
  export let selectedViewId: string;
  // Tên bảng dữ liệu thật của module (config.table) — chỉ dùng để nhắc trong ConfirmDialog xóa
  // view rằng dữ liệu thật không bị ảnh hưởng.
  export let tableName: string;
  export let onSelect: (id: string) => void;
  export let onCreate: (label: string) => void;
  export let onRename: (id: string, newLabel: string) => void;
  // Thực sự xóa (network call) — chỉ gọi SAU KHI người dùng xác nhận ở ConfirmDialog bên dưới,
  // khác với các callback khác vốn nhận input trực tiếp từ form.
  export let onDelete: (id: string) => void;
  export let onMove: (id: string, direction: "up" | "down") => void;

  let renamingId: string | null = null;
  let renameValue = "";
  let creating = false;
  let createValue = "";
  let deleteTarget: { id: string; label: string; columnCount: number } | null = null;

  function confirmDelete(): void {
    if (deleteTarget) onDelete(deleteTarget.id);
    deleteTarget = null;
  }

  function startRename(id: string, currentLabel: string): void {
    renamingId = id;
    renameValue = currentLabel;
  }

  function confirmRename(): void {
    const label = renameValue.trim();
    if (renamingId && label) onRename(renamingId, label);
    renamingId = null;
  }

  function startCreate(): void {
    creating = true;
    createValue = "";
  }

  function confirmCreate(): void {
    const label = createValue.trim();
    if (label) onCreate(label);
    creating = false;
  }
</script>

<div class="flex h-full flex-col">
  <h3 class="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">View</h3>
  <ul
    class="flex flex-1 flex-row gap-1 overflow-x-auto md:flex-col md:overflow-x-visible md:overflow-y-auto"
  >
    {#each views as view, index (view.id)}
      <li
        class="w-44 shrink-0 rounded border px-2 py-1.5 md:w-auto md:shrink {selectedViewId ===
        view.id
          ? 'border-primary-500 bg-primary-50'
          : 'border-slate-200 bg-white hover:bg-slate-50'}"
      >
        {#if renamingId === view.id}
          <form on:submit|preventDefault={confirmRename} class="flex items-center gap-1">
            <input class="min-w-0 flex-1 !py-1 text-sm" bind:value={renameValue} required />
            <Button variant="icon" extraClass="!h-7 !w-7 !p-0" type="submit" ariaLabel="Lưu tên view"
              >✓</Button
            >
            <Button
              variant="icon"
              extraClass="!h-7 !w-7 !p-0"
              ariaLabel="Hủy đổi tên"
              on:click={() => (renamingId = null)}>⨉</Button
            >
          </form>
        {:else}
          <div class="flex items-center gap-1">
            <div class="flex flex-col">
              <Button
                variant="icon"
                extraClass="!h-4 !w-5 !p-0 !border-0 !bg-transparent text-slate-400 hover:text-slate-700"
                ariaLabel="Đưa view lên trên"
                title="Đưa view lên trên"
                disabled={index === 0}
                on:click={() => onMove(view.id, "up")}>▲</Button
              >
              <Button
                variant="icon"
                extraClass="!h-4 !w-5 !p-0 !border-0 !bg-transparent text-slate-400 hover:text-slate-700"
                ariaLabel="Đưa view xuống dưới"
                title="Đưa view xuống dưới"
                disabled={index === views.length - 1}
                on:click={() => onMove(view.id, "down")}>▼</Button
              >
            </div>
            <button
              type="button"
              class="min-w-0 flex-1 truncate text-left text-sm font-medium text-slate-800"
              on:click={() => onSelect(view.id)}
            >
              {view.label}
              <span class="ml-1 text-xs font-normal text-slate-400">({view.columnCount})</span>
            </button>
            <Button
              variant="icon"
              extraClass="!h-7 !w-7 !p-0"
              ariaLabel="Đổi tên view"
              title="Đổi tên view"
              on:click={() => startRename(view.id, view.label)}>✎</Button
            >
            <Button
              variant="icon"
              extraClass="!h-7 !w-7 !p-0"
              ariaLabel="Xóa view"
              title={views.length === 1 ? "Phải còn ít nhất 1 view" : "Xóa view"}
              disabled={views.length === 1}
              on:click={() => (deleteTarget = view)}>🗑</Button
            >
          </div>
        {/if}
      </li>
    {/each}
  </ul>

  <div class="mt-2 border-t border-slate-200 pt-2">
    {#if creating}
      <form on:submit|preventDefault={confirmCreate} class="flex items-center gap-1">
        <input
          class="min-w-0 flex-1 !py-1 text-sm"
          bind:value={createValue}
          required
          placeholder="Tên view mới, vd. Tài chính"
        />
        <Button variant="icon" extraClass="!h-7 !w-7 !p-0" type="submit" ariaLabel="Tạo view"
          >✓</Button
        >
        <Button
          variant="icon"
          extraClass="!h-7 !w-7 !p-0"
          ariaLabel="Hủy tạo view"
          on:click={() => (creating = false)}>⨉</Button
        >
      </form>
    {:else}
      <Button extraClass="w-full justify-center" on:click={startCreate}>＋ Thêm view</Button>
    {/if}
  </div>
</div>

{#if deleteTarget}
  <ConfirmDialog
    title="Xóa view?"
    description={`View "${deleteTarget.label}" và toàn bộ ${deleteTarget.columnCount} cột cấu hình bên trong sẽ bị xóa. Dữ liệu thật trong bảng ${tableName} không bị xóa, chỉ mất cấu hình hiển thị.`}
    confirmLabel="Xóa view"
    onCancel={() => (deleteTarget = null)}
    onConfirm={confirmDelete}
  />
{/if}
