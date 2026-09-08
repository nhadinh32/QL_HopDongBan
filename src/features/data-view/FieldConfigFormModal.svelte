<script lang="ts">
  // Modal thêm/sửa MỘT dòng cf_field_config. Khác với DataViewFormModal (form động theo
  // FieldConfig[] bất kỳ), form này có shape CỐ ĐỊNH đúng theo FieldConfigRow nên khai báo
  // tường minh từng trường thay vì Record<string,string> chung chung.
  import Modal from "$lib/components/ui/Modal.svelte";
  import Button from "$lib/components/ui/Button.svelte";
  import SelectCombobox from "$lib/components/ui/SelectCombobox.svelte";
  import { toFilterType, toSubtotalType } from "$lib/services/field-config-service";
  import {
    isSelectType,
    FIELD_TYPE_OPTIONS,
    FILTER_TYPE_OPTIONS,
    SUBTOTAL_TYPE_OPTIONS,
    type FieldConfigRow,
    type FieldType,
    type FilterType,
    type SubtotalType,
  } from "$lib/types/field-config";

  export let row: FieldConfigRow | null;
  // Tên các cột khác đã cấu hình trong cùng view — dùng cho dropdown "cột hiện nội dung nhóm".
  export let existingFieldNames: string[];
  // View đang thao tác — luôn do màn cha (DataViewManager, qua FieldConfigViewList) quyết định,
  // cố định trong suốt vòng đời modal này. Tạo/đổi tên/xóa view là hành động riêng ở sidebar,
  // form 1 cột không tự tạo view nữa.
  export let viewId: string;
  export let viewLabel: string;
  export let saveError: string;
  export let saving: boolean;
  export let onClose: () => void;
  export let onSubmit: (
    payload: Omit<FieldConfigRow, "id" | "TableName" | "DefaultFieldOrderIndex">,
  ) => void;
  export let onDelete: (() => void) | undefined = undefined;

  // FilterType/Subtotal lưu PascalCase trên Supabase nhưng TS union trong app là chữ thường —
  // dùng lại đúng logic quy đổi của field-config-service.ts (toFilterType/toSubtotalType) khi
  // khởi tạo form thay vì viết lại; chiều ngược lại (lưu) chỉ cần viết hoa chữ cái đầu.
  const toDbCase = (value: string): string => value.charAt(0).toUpperCase() + value.slice(1);

  const isCreate = row === null;
  let fieldName = row?.FieldName ?? "";
  let label = row?.Label ?? "";
  let fieldType: FieldType = row?.FieldType ?? "Text";
  let filterType: FilterType = toFilterType(row?.FilterType ?? "text");
  let defaultDisplay = row?.DefaultDisplayField ?? true;
  let columnWidth = row?.DefaultFieldColumnWidth != null ? String(row.DefaultFieldColumnWidth) : "";
  let customStyle = row?.DefaultCustomStyleForColumn ?? "";
  let suggestOptionsValue = (row?.SuggestForSelect ?? []).join(";");
  let sortPriority =
    row?.DefaultSortOrder?.[0] != null ? String(row.DefaultSortOrder[0]) : "";
  let sortDirection: "asc" | "desc" = row?.DefaultSortOrder?.[1] === 1 ? "desc" : "asc";
  let groupOrder = row?.DefaultRowGroupOrder != null ? String(row.DefaultRowGroupOrder) : "";
  let groupDisplayField = row?.DefaultPositionFieldNamShowGroup ?? "";
  let subtotal: SubtotalType | null = toSubtotalType(row?.Subtotal ?? null);

  $: groupDisplayFieldOptions = existingFieldNames.filter((name) => name !== fieldName);

  function toNumberOrNull(value: string): number | null {
    return value.trim() === "" ? null : Number(value);
  }

  function handleSubmit(): void {
    const priority = toNumberOrNull(sortPriority);
    onSubmit({
      FieldName: fieldName.trim(),
      Label: label.trim(),
      DefaultDisplayField: defaultDisplay,
      FieldType: fieldType,
      FilterType: toDbCase(filterType),
      DefaultFieldColumnWidth: toNumberOrNull(columnWidth),
      DefaultCustomStyleForColumn: customStyle.trim() === "" ? null : customStyle.trim(),
      SuggestForSelect:
        isSelectType(fieldType) && suggestOptionsValue.trim() !== ""
          ? suggestOptionsValue
              .split(";")
              .map((item) => item.trim())
              .filter(Boolean)
          : null,
      DefaultSortOrder: priority == null ? null : [priority, sortDirection === "desc" ? 1 : 0],
      DefaultRowGroupOrder: toNumberOrNull(groupOrder),
      DefaultPositionFieldNamShowGroup: groupDisplayField.trim() === "" ? null : groupDisplayField,
      Subtotal: subtotal ? toDbCase(subtotal) : null,
      ViewName: [viewId, viewLabel],
    });
  }
</script>

<Modal {onClose} labelledBy="field-config-title" size="lg">
  <div class="flex flex-col h-full gap-0 p-6">
    <div class="flex items-start justify-between gap-3 shrink-0 border-b border-slate-200 pb-2">
      <div>
        <h3 id="field-config-title" class="text-lg font-semibold text-slate-900">
          {isCreate ? "Thêm cột cấu hình" : `Sửa cột "${row?.Label || row?.FieldName}"`}
        </h3>
        <p class="mt-0.5 text-sm text-slate-500">
          Áp dụng ngay cho tab Danh sách sau khi lưu, không cần tải lại trang.
        </p>
      </div>
      <Button variant="icon" ariaLabel="Đóng" on:click={onClose}>⨉</Button>
    </div>

    <div class="min-h-0 flex-1 overflow-y-auto px-0 mt-0">
      <form on:submit|preventDefault={handleSubmit} class="p-0 space-y-5">
        <!-- Thông tin cơ bản -->
        <div class="mt-5 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
          <label class="mb-4">
            Tên cột kỹ thuật (FieldName)
            {#if isCreate}
              <input
                class="mt-1.5"
                bind:value={fieldName}
                required
                placeholder="Phải khớp đúng tên cột thật trong bảng dữ liệu"
              />
            {:else}
              <input class="mt-1.5 bg-slate-100 text-slate-500" value={fieldName} readonly />
              <span class="mt-1 block text-xs text-slate-400">Không thể đổi tên cột sau khi tạo.</span>
            {/if}
          </label>
          <label class="mb-4">
            Nhãn hiển thị
            <input class="mt-1.5" bind:value={label} required />
          </label>
          <label class="mb-4">
            Loại dữ liệu
            <select class="mt-1.5" bind:value={fieldType}>
              {#each FIELD_TYPE_OPTIONS as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
          <label class="mb-4 flex items-center gap-2 self-end pb-2.5">
            <input type="checkbox" bind:checked={defaultDisplay} class="h-4 w-4" />
            Hiện trong bảng danh sách
          </label>
          <label class="mb-4">
            Thuộc view
            <input class="mt-1.5 bg-slate-100 text-slate-500" value={viewLabel} readonly />
            <span class="mt-1 block text-xs text-slate-400"
              >Cột luôn thuộc view đang chọn ở danh sách View bên trái.</span
            >
          </label>
        </div>

        <!-- Bộ lọc -->
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2 border-t border-slate-200 pt-4">
          <label class="mb-4">
            Kiểu lọc
            <select class="mt-1.5" bind:value={filterType}>
              {#each FILTER_TYPE_OPTIONS as option (option.value)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
          {#if isSelectType(fieldType)}
            <label class="mb-4">
              Danh sách gợi ý (SuggestForSelect)
              <div class="mt-1.5">
                <SelectCombobox
                  options={[]}
                  multiple
                  allowCustom
                  value={suggestOptionsValue}
                  onChange={(next) => (suggestOptionsValue = next)}
                  placeholder="Gõ một lựa chọn rồi Enter để thêm..."
                />
              </div>
            </label>
          {/if}
        </div>

        <!-- Sắp xếp & nhóm dòng -->
        <div class="grid grid-cols-1 gap-x-4 sm:grid-cols-2 border-t border-slate-200 pt-4">
          <label class="mb-4">
            Độ ưu tiên sort mặc định (để trống = không sort)
            <input class="mt-1.5" type="number" bind:value={sortPriority} />
          </label>
          <label class="mb-4">
            Hướng sort
            <select class="mt-1.5" bind:value={sortDirection} disabled={sortPriority.trim() === ""}>
              <option value="asc">Tăng dần</option>
              <option value="desc">Giảm dần</option>
            </select>
          </label>
          <label class="mb-4">
            Cấp nhóm dòng (để trống = không nhóm)
            <input class="mt-1.5" type="number" bind:value={groupOrder} />
          </label>
          <label class="mb-4">
            Cột hiện nội dung dòng nhóm
            <select class="mt-1.5" bind:value={groupDisplayField}>
              <option value="">— Cột dữ liệu đầu tiên —</option>
              {#each groupDisplayFieldOptions as name (name)}
                <option value={name}>{name}</option>
              {/each}
            </select>
          </label>
          <label class="mb-4">
            Subtotal
            <select class="mt-1.5" bind:value={subtotal}>
              {#each SUBTOTAL_TYPE_OPTIONS as option (option.label)}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          </label>
        </div>

        <!-- Nâng cao -->
        <details class="border-t border-slate-200 pt-4">
          <summary class="cursor-pointer text-sm font-semibold text-slate-700">Nâng cao</summary>
          <div class="mt-3 grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <label class="mb-4">
              Độ rộng cột (px, để trống = tự co giãn)
              <input class="mt-1.5" type="number" bind:value={columnWidth} />
            </label>
            <label class="mb-4 sm:col-span-2">
              CSS tùy chỉnh cho cột (áp trực tiếp qua style, không phải class Tailwind)
              <textarea
                class="mt-1.5 min-h-[70px] resize-y font-mono text-xs"
                bind:value={customStyle}
                placeholder="vd. background-color:#dcfce7; color:#166534; font-weight:bold"
              ></textarea>
            </label>
          </div>
        </details>

        {#if saveError}
          <div
            class="mt-1 rounded border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {saveError}
          </div>
        {/if}
      </form>
      <div class="flex gap-2 border-t border-slate-200 pt-2 mt-4">
        {#if onDelete}
          <Button variant="danger" extraClass="mr-auto" on:click={onDelete}>Xóa</Button>
        {/if}
        <Button on:click={onClose}>Hủy</Button>
        <Button
          variant="primary"
          type="submit"
          disabled={saving}
          on:click={handleSubmit}>{saving ? "Đang lưu..." : "Lưu"}</Button
        >
      </div>
    </div>
  </div>
</Modal>
