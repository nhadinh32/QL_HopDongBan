<script lang="ts">
  // Khung dialog dùng chung: nền mờ, đóng khi bấm ra ngoài, kích thước tùy biến qua prop size.
  export let onClose: () => void;
  export let labelledBy: string | undefined = undefined;
  export let size: "sm" | "md" | "lg" = "md";

  const sizeClass: Record<string, string> = {
    sm: "max-w-sm",
    md: "max-w-2xl",
    lg: "max-w-4xl",
  };
</script>

<div
  class="fixed inset-0 z-30 flex items-center justify-center bg-primary-900/80 p-5"
  role="presentation"
  on:click|self={onClose}
>
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby={labelledBy}
    class="max-h-[90vh] h-full {sizeClass[size]} rounded border-0 bg-white flex flex-col overflow-hidden"
  >
    <slot />
  </div>
</div>
