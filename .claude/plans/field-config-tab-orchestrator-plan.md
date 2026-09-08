# Tách "nhạc trưởng" riêng cho tab "Cấu hình" — `FieldConfigTab.svelte`

## Bối cảnh

Sau khi dựng lại tab "Cấu hình" (xem `.claude/plans/field-config-ui-plan.md`), `DataViewManager.svelte` hiện đang gánh **toàn bộ** state + hàm nghiệp vụ của 3 việc rất khác nhau trong cùng 1 file: quản lý hồ sơ dữ liệu (rows/filters/sort), kết nối Supabase, **và** toàn bộ CRUD View/Cột của tab "Cấu hình" (`fieldConfigRows`, `configViewId`, `editFieldConfigRow`, `pendingNewView`, `deleteFieldConfigRowTarget`, cùng ~10 hàm như `saveFieldConfigRow`/`renameView`/`moveView`...). Ba component hiển thị (`FieldConfigViewList`, `FieldConfigPanel`, `FieldConfigFormModal`) chỉ là các "component câm", nhận cả chục prop callback từ `DataViewManager`.

Người dùng hỏi có nên gộp `FieldConfigFormModal`/`FieldConfigPanel` (và code liên quan) vào `FieldConfigViewList` không. Sau khi cân nhắc 2 hướng, đã chốt: **không gộp thẳng 3 file thành 1** (sẽ phình to ~500 dòng, trộn 3 kiểu giao diện khác nhau vào 1 file, tên file không còn đúng vai trò) — thay vào đó **tạo 1 component điều phối mới** (`FieldConfigTab.svelte`) đóng đúng vai trò "nhạc trưởng" cho riêng tab "Cấu hình", y hệt cách `DataViewManager.svelte` đang là nhạc trưởng cho cả module. `FieldConfigViewList`/`FieldConfigPanel`/`FieldConfigFormModal` **giữ nguyên không đổi 1 dòng nào** — chỉ đổi *ai* render và truyền prop cho chúng.

Mục tiêu: `DataViewManager.svelte` chỉ còn render `<FieldConfigTab>` với 5 prop đơn giản khi `activeTab === "config"`, không còn biết gì về `ViewName`/cột/form thêm-sửa nữa.

## Thiết kế `FieldConfigTab.svelte` (file mới, `src/features/data-view/`)

**Props nhận từ `DataViewManager`:**

```ts
export let config: ConnectionConfig;
export let tableName: string;        // = module.defaultTable
export let initialViewId: string;    // = activeViewId lúc mount — dùng làm giá trị khởi tạo configViewId
export let onChanged: () => void;    // gọi sau mỗi lần thêm/sửa/xóa/sắp xếp cột HOẶC view thành công,
                                      // để DataViewManager gọi lại loadFieldConfigs() (refresh tab Danh sách + tab bar)
export let onError: (message: string) => void; // đẩy lỗi lên banner `notice` chung của DataViewManager
```

**Lợi ích của việc mount/unmount tự nhiên:** vì `DataViewManager` chỉ render `<FieldConfigTab>` bên trong nhánh `{:else if activeTab === "config"}`, Svelte tự hủy component này mỗi khi rời tab và tạo mới mỗi khi vào lại — nên **không cần logic "chỉ reset configViewId khi mới vào tab"** như bản hiện tại (`enteringConfig` check trong `selectTab()`) nữa: `let configViewId = initialViewId;` chạy lại từ đầu mỗi lần mount đã tự nhiên đúng ý. Tương tự, gọi `loadRows()` (đổi tên từ `loadFieldConfigRowsForEditor`) trong `onMount` thay cho việc `DataViewManager.selectTab()` tự gọi hộ.

**State + derived dời nguyên xi từ `DataViewManager.svelte` vào đây** (đổi `fieldConfigRows`/`config`/`module.defaultTable` thành state/prop cục bộ của component này):

- `fieldConfigRows`, `fieldConfigRowsLoading`, `editFieldConfigRow`, `deleteFieldConfigRowTarget`, `fieldConfigSaveError`, `fieldConfigSaving`, `configViewId` (khởi tạo = `initialViewId`), `pendingNewView`.
- `viewsWithCount` — **tính lại từ `fieldConfigRows` cục bộ của chính component này** (nhóm theo `ViewName[0]`, đếm số dòng mỗi view), *không* nhận `views` từ `DataViewManager` — tách hẳn khỏi `views`/`fieldConfigs` (dữ liệu đã parse) mà `DataViewManager` vẫn cần giữ riêng cho hàng tab dữ liệu ở ngoài.
- `fieldConfigRowsForConfigView` — lọc theo `configViewId`.
- Fallback view biến mất: `$: if (viewsWithCount.length && !viewsWithCount.some(v => v.id === configViewId)) configViewId = viewsWithCount[0].id;` (bản sao của logic cũ, chỉ đổi nguồn từ `views` sang `viewsWithCount` cục bộ).

**Hàm nghiệp vụ dời nguyên xi:** `loadRows()` (= `loadFieldConfigRowsForEditor` cũ, gọi trong `onMount`), `refresh()` (= `refreshFieldConfigs` cũ — nhưng giờ chỉ tự load lại `fieldConfigRows` của chính nó rồi gọi `onChanged()` để báo `DataViewManager`, thay vì gọi thẳng 2 hàm của module khác), `openCreateFieldConfigRow`, `openEditFieldConfigRow`, `closeFieldConfigEdit`, `saveFieldConfigRow`, `requestDeleteFieldConfigRow`, `removeFieldConfigRow`, `moveFieldConfigRow`, `slugifyViewId`, `handleCreateView`, `renameView`, `deleteView`, `moveView`. Mọi chỗ trước đây set `notice = ...` (lỗi load/move/rename/delete view) đổi thành gọi `onError(...)`; lỗi `saveFieldConfigRow` vẫn giữ nguyên trong `fieldConfigSaveError` cục bộ (hiện trong modal, không qua `onError`).

**Render** — nguyên khối 2 cột + modal đang nằm ở cuối `DataViewManager.svelte` hiện tại, dời sang đây y hệt (prop truyền cho 3 component con **giữ nguyên tên/kiểu như hiện tại**, không đổi gì ở `FieldConfigViewList.svelte`/`FieldConfigPanel.svelte`/`FieldConfigFormModal.svelte`):

```svelte
<div class="flex h-full min-h-0 gap-3 p-2">
  <div class="w-56 shrink-0 overflow-y-auto rounded border border-slate-200 bg-white p-2">
    <FieldConfigViewList views={viewsWithCount} selectedViewId={configViewId} tableName={tableName}
      onSelect={(id) => (configViewId = id)} onCreate={handleCreateView} onRename={renameView}
      onDelete={deleteView} onMove={moveView} />
  </div>
  <div class="min-w-0 flex-1 overflow-hidden">
    <FieldConfigPanel rows={fieldConfigRowsForConfigView} loading={fieldConfigRowsLoading} tableName={tableName}
      bind:deleteTarget={deleteFieldConfigRowTarget} onCreate={openCreateFieldConfigRow}
      onEdit={openEditFieldConfigRow} onConfirmDelete={removeFieldConfigRow} onMove={moveFieldConfigRow} />
  </div>
</div>

{#if editFieldConfigRow !== undefined}
  {@const currentFieldConfigRow = editFieldConfigRow}
  {@const targetView = pendingNewView ?? { id: configViewId, label: viewsWithCount.find(v => v.id === configViewId)?.label ?? DEFAULT_VIEW_LABEL }}
  <FieldConfigFormModal row={currentFieldConfigRow} existingFieldNames={fieldConfigRowsForConfigView.map(r => r.FieldName)}
    viewId={targetView.id} viewLabel={targetView.label} saveError={fieldConfigSaveError} saving={fieldConfigSaving}
    onClose={closeFieldConfigEdit} onSubmit={saveFieldConfigRow}
    onDelete={currentFieldConfigRow ? () => requestDeleteFieldConfigRow(currentFieldConfigRow) : undefined} />
{/if}
```

## Thay đổi trong `DataViewManager.svelte`

- **Xóa hẳn:** state `fieldConfigRows`, `fieldConfigRowsLoading`, `editFieldConfigRow`, `deleteFieldConfigRowTarget`, `fieldConfigSaveError`, `fieldConfigSaving`, `configViewId`, `pendingNewView`; derived `viewsWithCount`, `fieldConfigRowsForConfigView`; hàm `loadFieldConfigRowsForEditor`, `refreshFieldConfigs`, `openCreateFieldConfigRow`, `openEditFieldConfigRow`, `closeFieldConfigEdit`, `saveFieldConfigRow`, `requestDeleteFieldConfigRow`, `removeFieldConfigRow`, `moveFieldConfigRow`, `slugifyViewId`, `handleCreateView`, `renameView`, `deleteView`, `moveView`.
- **Đơn giản hóa `selectTab()`:** bỏ hẳn nhánh `if (tabId === "config") { ... loadFieldConfigRowsForEditor() }` và biến `enteringConfig` — `FieldConfigTab` tự lo việc này qua `onMount` + prop `initialViewId`.
- **Import:** bỏ `loadFieldConfigRows`/`createFieldConfigRow`/`updateFieldConfigRow`/`deleteFieldConfigRow` (từ `field-config-service.ts`, không dùng trực tiếp ở đây nữa — vẫn giữ `loadFieldConfig` số ít cho `loadFieldConfigs()`), bỏ import `FieldConfigPanel`/`FieldConfigFormModal`/`FieldConfigViewList`/`type FieldConfigRow`, thêm import `FieldConfigTab`.
- **Template** — thay khối `{:else if activeTab === "config"}` (2 cột + modal) bằng:
  ```svelte
  {:else if activeTab === "config"}
    <FieldConfigTab
      {config}
      tableName={module.defaultTable}
      initialViewId={activeViewId}
      onChanged={loadFieldConfigs}
      onError={(message) => (notice = message)}
    />
  ```
- Giữ nguyên toàn bộ phần còn lại (rows/filters/sort/records, `ConnectionSettingsPanel`, `DataViewFormModal`, `ConfirmDialog` xóa hồ sơ).

## Không đổi

`FieldConfigViewList.svelte`, `FieldConfigPanel.svelte`, `FieldConfigFormModal.svelte` — copy nguyên logic/JSX, không sửa file nào trong 3 file này (đây là refactor "extract component" thuần túy, không đổi hành vi).

## Kiểm tra sau khi làm

1. `npm run check` — 0 lỗi (đặc biệt soát lại import thừa/thiếu ở `DataViewManager.svelte` sau khi xóa nhiều state/hàm).
2. `npm run build` — build `docs/` không lỗi.
3. `npm run dev` — lặp lại đúng bộ thao tác đã test ở plan trước (thêm/sửa/xóa/sắp xếp cột; thêm/đổi tên/xóa/sắp xếp view; chuyển qua lại giữa các view trong tab Cấu hình không cần rời tab) để xác nhận **hành vi y hệt trước refactor** — đây là refactor tổ chức lại code, không đổi tính năng.
