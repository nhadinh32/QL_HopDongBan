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
  $: activeLabel = navItems.find((item) => item.id === active)?.label;
</script>

<div class="flex h-dvh overflow-hidden items-stretch bg-white">
  <Sidebar
    items={navItems}
    {active}
    onSelect={onSelect}
    {connected}
    {connectionLabel}
    open={sidebarOpen}
    onClose={() => (sidebarOpen = false)}
  />

  <div class="flex min-h-0 min-w-0 flex-1 flex-col">
    <!-- Bấm cả thanh header để mở sidebar (tiện chạm trên mobile) — nút ☰ bên trong đã đảm bảo
    đủ khả năng dùng bàn phím/screen reader, nên bỏ qua 2 cảnh báo a11y dưới đây có chủ đích. -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <header
      class="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-slate-200 bg-white/80 px-4 backdrop-blur sm:px-6 md:hidden"
      on:click={() => (sidebarOpen = true)}
    >
      <button
        type="button"
        class="grid h-9 w-9 shrink-0 place-items-center rounded border border-slate-200 text-slate-600 hover:bg-slate-50 md:hidden"
        aria-label="Mở menu"
      >
        ☰
      </button>
      <span class="text-sm font-semibold text-slate-900">{activeLabel}</span>
    </header>

    <main class="min-h-0 w-full flex-1 overflow-hidden">
      <slot />
    </main>
  </div>
</div>
