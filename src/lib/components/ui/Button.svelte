<script lang="ts">
  // Nút dùng chung cho toàn bộ UI, gom biến thể màu/kích thước về một nơi.
  export let variant: "default" | "primary" | "danger" | "icon" | "ghost" = "default";
  export let type: "button" | "submit" = "button";
  export let disabled = false;
  export let ariaLabel: string | undefined = undefined;
  export let title: string | undefined = undefined;
  export let extraClass = "";

  const base =
    "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-60";

  const styles: Record<string, string> = {
    default: "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
    primary: "border-primary-600 bg-primary-600 text-white hover:bg-primary-700",
    danger: "border-rose-200 bg-white text-rose-600 hover:bg-rose-50",
    icon: "h-9 w-9 shrink-0 p-0 border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800",
    ghost: "border-transparent bg-transparent text-slate-600 hover:bg-slate-100",
  };

  $: sizing = variant === "icon" ? "" : "px-1 py-1";
  $: classes = `${base} ${sizing} ${styles[variant]} ${extraClass}`;
</script>

<button {type} class={classes} {disabled} aria-label={ariaLabel} {title} on:click>
  <slot />
</button>
