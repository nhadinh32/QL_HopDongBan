<script lang="ts">
  // Modal tạo mới/chỉnh sửa một hồ sơ: render động theo danh sách trường thực tế.
  // Tổng quát cho mọi module dữ liệu — nhận fieldConfig (cột số/cột dài) qua prop.
  import Modal from "$lib/components/ui/Modal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import { isDateField } from "$lib/utils/contract-format";
  import type { ContractRecord, ModuleFieldConfig } from "$lib/types/contracts";

  export let fields: string[];
  export let editRecord: ContractRecord | null;
  export let formValues: Record<string, string>;
  export let saveError: string;
  export let saving: boolean;
  export let fieldConfig: ModuleFieldConfig;
  export let onClose: () => void;
  export let onSubmit: () => void;
  export let onDelete: () => void;

  // Trường "id" không bao giờ cho nhập tay: hồ sơ mới được tự gán id nhỏ nhất còn trống.
  $: visibleFields = fields.filter((field) => field !== "id");
</script>

<Modal onClose={onClose} labelledBy="edit-title">
  <div class="flex items-start justify-between gap-3">
    <div>
      <h3 id="edit-title" class="text-lg font-semibold text-slate-900">
        {editRecord ? `Sửa hồ sơ #${editRecord.id}` : `Thêm hồ sơ #${formValues.id}`}
      </h3>
      <p class="mt-0.5 text-sm text-slate-500">Nhập giá trị cho các trường dữ liệu.</p>
    </div>
    <Button variant="icon" ariaLabel="Đóng" on:click={onClose}>×</Button>
  </div>
  <form on:submit|preventDefault={onSubmit}>
    <div class="mt-5 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
      {#each visibleFields as field}
        <label
          class="mb-4 {fieldConfig.longTextFields.has(field) ? 'sm:col-span-2' : ''}"
        >
          {field}
          {#if fieldConfig.longTextFields.has(field)}
            <textarea class="mt-1.5 min-h-[100px] resize-y" bind:value={formValues[field]} ></textarea>
          {:else}
            <input
              class="mt-1.5"
              type={isDateField(field, fieldConfig)
                ? "date"
                : fieldConfig.numericFields.has(field)
                  ? "number"
                  : "text"}
              step={fieldConfig.numericFields.has(field) ? "any" : undefined}
              bind:value={formValues[field]}
            />
          {/if}
        </label>
      {/each}
    </div>
    {#if saveError}
      <div
        class="mt-1 rounded border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      >
        {saveError}
      </div>
    {/if}
    <div class="mt-2 flex justify-end gap-2 border-t border-slate-200 pt-4">
      {#if editRecord}
        <Button variant="danger" extraClass="mr-auto" on:click={onDelete}>Xóa hồ sơ</Button>
      {/if}
      <Button on:click={onClose}>Hủy</Button>
      <Button variant="primary" type="submit" disabled={saving}
        >{saving ? "Đang lưu..." : "Lưu hồ sơ"}</Button
      >
    </div>
  </form>
</Modal>
