<script lang="ts">
  // Khung ứng dụng dùng chung: sidebar cố định bên trái (kèm badge trạng thái kết nối ở dưới
  // cùng) + topbar mỏng + vùng nội dung cuộn riêng.
  import Sidebar from "./Sidebar.svelte";

  export let navItems: { id: string; label: string; icon: "data" | "settings" }[];
  export let active: string;
  export let onSelect: (id: string) => void;
  export let connected: boolean;
  export let connectionLabel: string;

  let sidebarOpen = false;
</script>

<div class="flex min-h-screen items-stretch bg-slate-50">
  <Sidebar
    items={navItems}
    {active}
    onSelect={onSelect}
    {connected}
    {connectionLabel}
    open={sidebarOpen}
    onClose={() => (sidebarOpen = false)}
  />

  <div class="flex min-w-0 flex-1 flex-col">
    <header
      class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 md:hidden"
    >
      <button
        type="button"
        class="grid h-9 w-9 shrink-0 place-items-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
        aria-label="Mở menu"
        on:click={() => (sidebarOpen = true)}
      >
        ☰
      </button>
    </header>

    <main class="w-full flex-1 px-2 py-2 sm:px-2 md:px-2 md:py-2">
      <slot />
    </main>
  </div>
</div>
