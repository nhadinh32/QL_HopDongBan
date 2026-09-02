<script lang="ts">
  // Điều hướng chính bên trái: logo/workspace + danh sách mục, mục hiện tại được tô nổi bật.
  // Trên mobile, sidebar trở thành drawer trượt từ trái, ẩn/hiện qua prop open.
  import Badge from "../ui/Badge.svelte";

  export let items: { id: string; label: string; icon: "data" | "settings" }[];
  export let active: string;
  export let onSelect: (id: string) => void;
  export let connected: boolean;
  export let connectionLabel: string;
  export let open = false;
  export let onClose: () => void = () => {};
</script>

{#if open}
  <div
    class="fixed inset-0 z-30 bg-slate-900/50 md:hidden"
    role="presentation"
    on:click={onClose}
  ></div>
{/if}

<aside
  class="fixed shadow-md inset-y-0 left-0 z-40 flex h-screen w-60 shrink-0 -translate-x-full flex-col border-r border-slate-200 bg-white transition-transform duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 md:self-start {open
    ? 'translate-x-0'
    : ''}"
>
  <div class="flex items-center gap-2.5 px-5 py-5">
    <div class="grid h-8 w-8 shrink-0 place-items-center rounded bg-primary-600 text-sm font-bold text-white">
      HD
    </div>
    <div class="min-w-0 flex-1">
      <p class="truncate text-sm font-semibold leading-none text-slate-900">Hợp đồng bán</p>
      <p class="mt-1 text-[11px] font-medium uppercase tracking-wider text-slate-400">
        Workspace
      </p>
    </div>
    <button
      type="button"
      class="grid h-8 w-8 shrink-0 place-items-center rounded text-slate-500 hover:bg-slate-50 md:hidden"
      aria-label="Đóng menu"
      on:click={onClose}
    >
      ×
    </button>
  </div>

  <nav class="flex-1 space-y-1 overflow-y-auto px-3" aria-label="Điều hướng chính">
    {#each items as item (item.id)}
      <button
        type="button"
        class="flex w-full items-center gap-2.5 rounded px-3 py-2.5 text-left text-sm font-medium transition-colors {active ===
        item.id
          ? 'bg-primary-50 text-primary-700'
          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}"
        on:click={() => {
          onSelect(item.id);
          onClose();
        }}
      >
        {#if item.icon === "data"}
          <svg
            class="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <path d="M3 10h18M9 4v16" />
          </svg>
        {:else}
          <svg
            class="h-4 w-4 shrink-0"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path
              d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
            />
          </svg>
        {/if}
        {item.label}
      </button>
    {/each}
  </nav>

  <div class="border-t border-slate-200 p-3">
    <Badge tone={connected ? "success" : "warning"}>{connectionLabel}</Badge>
  </div>
</aside>
