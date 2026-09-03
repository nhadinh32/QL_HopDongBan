<script lang="ts">
  // Modal tạo mới/chỉnh sửa một hồ sơ: render động theo danh sách trường thực tế.
  // Tổng quát cho mọi module dữ liệu — nhận FieldConfig[] (đọc từ cf_field_config) qua prop.
  import Modal from "$lib/components/ui/Modal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import SelectCombobox from "$lib/components/ui/SelectCombobox.svelte";
  import type { ContractRecord } from "$lib/types/contracts";
  import {
    allowsCustomValue,
    isMultiSelectType,
    isNumericType,
    isSelectType,
    type FieldConfig,
  } from "$lib/types/field-config";

  export let fields: FieldConfig[];
  export let editRecord: ContractRecord | null;
  export let formValues: Record<string, string>;
  export let saveError: string;
  export let saving: boolean;
  export let onClose: () => void;
  export let onSubmit: () => void;
  export let onDelete: () => void;

  // Trường "id" không bao giờ cho nhập tay: hồ sơ mới được tự gán id nhỏ nhất còn trống.
  $: visibleFields = fields.filter((field) => field.field !== "id");
</script>

<Modal {onClose} labelledBy="edit-title">
  <div class="flex flex-col h-full gap-0 p-6">
    <div class="flex items-start justify-between gap-3 shrink-0 border-b border-slate-200 pb-2">
      <div>
        <h3 id="edit-title" class="text-lg font-semibold text-slate-900">
          {editRecord
            ? `Sửa hồ sơ #${editRecord.id}`
            : `Thêm hồ sơ #${formValues.id}`}
        </h3>
        <p class="mt-0.5 text-sm text-slate-500">
          Nhập giá trị cho các trường dữ liệu.
        </p>
      </div>
      <Button variant="icon" ariaLabel="Đóng" on:click={onClose}>⨉</Button>
    </div>
    <div class="min-h-0 flex-1 overflow-y-auto px-0 mt-0">
      <form on:submit|preventDefault={onSubmit} class="p-0 space-y-4">
        <div class="mt-5 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          {#each visibleFields as field (field.field)}
            <label class="mb-4 {field.type === 'LongText' ? 'sm:col-span-2' : ''}">
              {field.label}
              {#if field.type === "LongText"}
                <textarea
                  class="mt-1.5 min-h-[100px] resize-y"
                  bind:value={formValues[field.field]}
                ></textarea>
              {:else if isSelectType(field.type)}
                <div class="mt-1.5">
                  <SelectCombobox
                    options={field.suggestOptions}
                    multiple={isMultiSelectType(field.type)}
                    allowCustom={allowsCustomValue(field.type)}
                    value={formValues[field.field] ?? ""}
                    onChange={(next) => (formValues[field.field] = next)}
                  />
                </div>
              {:else}
                <input
                  class="mt-1.5"
                  type={field.type === "Date"
                    ? "date"
                    : field.type === "DateTime"
                      ? "datetime-local"
                      : isNumericType(field.type)
                        ? "number"
                        : "text"}
                  step={isNumericType(field.type) ? "any" : undefined}
                  bind:value={formValues[field.field]}
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
      </form>
      <div class="flex gap-2 border-t border-slate-200 pt-2 mt-2">
        {#if editRecord}
          <Button variant="danger" extraClass="mr-auto" on:click={onDelete}
            >Xóa</Button
          >
        {/if}
        <Button on:click={onClose}>Hủy</Button>
        <Button
          variant="primary"
          type="submit"
          disabled={saving}
          on:click={onSubmit}>{saving ? "Đang lưu..." : "Lưu"}</Button
        >
      </div>
    </div>
  </div>
</Modal>
