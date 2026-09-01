<script lang="ts">
  // Biểu mẫu cấu hình kết nối Supabase, chỉ lưu trên trình duyệt hiện tại.
  import Button from "$lib/components/ui/Button.svelte";
  import type { ConnectionConfig } from "$lib/types/contracts";

  export let config: ConnectionConfig;
  export let savedText: string;
  export let onSubmit: () => void;
  export let onBack: (() => void) | undefined = undefined;

</script>

<section class="max-w-2xl">
  {#if onBack}
    <button
      type="button"
      class="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      on:click={onBack}
    >
      ← Quay lại danh sách
    </button>
  {/if}
  <div>
    <h2 class="text-2xl font-semibold text-slate-900">Cài đặt kết nối</h2>
    <p class="mt-0.5 text-sm text-slate-500">Thông tin được lưu trên trình duyệt này.</p>
  </div>
  <div class="mt-6 rounded bg-white p-6">
    <h3 class="text-base font-semibold text-slate-900">Supabase REST API</h3>
    <p class="mt-1 text-sm text-slate-500">
      Nhập thông tin project và tên bảng để bắt đầu quản lý dữ liệu.
    </p>
    <form class="mt-5" on:submit|preventDefault={onSubmit}>
      <label class="mb-4">
        Supabase API URL
        <input
          class="mt-1.5"
          type="url"
          bind:value={config.url}
          required
          placeholder="https://project.supabase.co/rest/v1/"
        />
      </label>
      <label class="mb-4">
        Public API key · đọc và chỉnh sửa
        <input
          class="mt-1.5"
          type="password"
          bind:value={config.publicKey}
          required
          placeholder="sb_publishable_..."
        />
      </label>
      <label class="mb-4">
        Tên bảng
        <input class="mt-1.5" bind:value={config.table} required />
      </label>
      <div class="flex items-center justify-between gap-3 pt-1">
        <span class="text-xs font-medium text-emerald-600">{savedText}</span>
        <Button type="submit" variant="primary">Lưu và kết nối</Button>
      </div>
    </form>
  </div>
</section>
