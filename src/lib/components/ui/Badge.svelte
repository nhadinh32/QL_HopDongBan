<script lang="ts">
  // Chip trạng thái với chấm màu theo tone, dùng cho trạng thái kết nối, đồng bộ...
  export let tone: "success" | "warning" | "danger" | "neutral" = "neutral";

  const dotTone: Record<string, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-400",
    danger: "bg-rose-500",
    neutral: "bg-slate-400",
  };
</script>

<span
  class="inline-flex items-center gap-2 rounded border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600"
>
  <span class="h-2 w-2 rounded {dotTone[tone]}"></span>
  <slot />
</span>
