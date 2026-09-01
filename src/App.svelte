<script lang="ts">
  // Component gốc: giữ AppShell/Sidebar dùng chung và danh sách module dữ liệu (mỗi module =
  // một mục sidebar + một bảng Supabase riêng). Thêm module mới trong $lib/constants/modules,
  // sidebar sẽ tự hiện thêm mục mà không cần sửa gì ở đây.
  import { MODULES } from "$lib/constants/modules";
  import AppShell from "$lib/components/layout/AppShell.svelte";
  import ContractManager from "./features/contracts/ContractManager.svelte";

  const navItems = MODULES.map((item) => ({
    id: item.id,
    label: item.label,
    icon: "data" as const,
  }));

  let activeModuleId = MODULES[0].id;
  $: activeModule = MODULES.find((item) => item.id === activeModuleId) ?? MODULES[0];

  // Trạng thái kết nối của module đang hiển thị, dùng cho badge trên topbar chung.
  let connected = false;
  let connectionLabel = "Chưa kết nối";
</script>

<AppShell
  {navItems}
  active={activeModuleId}
  onSelect={(id) => (activeModuleId = id)}
  {connected}
  {connectionLabel}
>
  {#key activeModuleId}
    <ContractManager module={activeModule} bind:connected bind:connectionLabel />
  {/key}
</AppShell>
