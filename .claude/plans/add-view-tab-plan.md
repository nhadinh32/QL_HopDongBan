# Thêm `ViewID`/`ViewLabel` vào `cf_field_config` — mỗi view là một tab

## Bối cảnh

Cột `ViewID`/`ViewLabel` đã được thêm sẵn vào bảng `cf_field_config` trên Supabase (không cần chạy SQL thêm cột nữa) — phần còn lại là dùng 2 cột này ở tầng ứng dụng.

Hiện tại mỗi dòng `cf_field_config` mô tả một cột của một bảng module (`TableName`), và toàn bộ cột có `DefaultDisplayField = true` được gộp thành **một** danh sách `displayFields` duy nhất render trong tab "Danh sách" cố định ([`DataViewManager.svelte:39-44`](../../src/features/data-view/DataViewManager.svelte#L39-L44) khai báo tab, dòng 122 lọc `displayFields`). Không có khái niệm "view" nào ở code hiện tại — xem chi tiết ở [`field-config.ts`](../../src/lib/types/field-config.ts) (`FieldConfigRow`/`FieldConfig`) và [`field-config-service.ts`](../../src/lib/services/field-config-service.ts) (load/parse).

Mục tiêu: dùng `ViewID`/`ViewLabel` để một cột dữ liệu có thể được gán vào một "view"; **mỗi view trở thành một tab ngang ngay trên hàng tab chính** (cùng hàng với "Cấu hình"/"Cài đặt" hiện có — không phải tab con lồng bên trong "Danh sách"). Tab "Danh sách" cố định trước đây bị thay bằng N tab động (N = số view của module), mỗi tab render riêng một instance `DataViewTable.svelte` (component đã chuẩn hoá sẵn) — cùng một nguồn `rows` (dữ liệu hồ sơ thô) như cũ, nhưng **mỗi view có bộ cấu hình cột riêng hoàn toàn**: mỗi dòng `cf_field_config` (kể cả những dòng cùng `FieldName` nhưng khác `ViewID`, dùng khi muốn 1 field xuất hiện ở nhiều view) tự mang `FilterType`, `DefaultSortOrder`, `DefaultRowGroupOrder`, `DefaultFieldColumnWidth`, `DefaultCustomStyleForColumn`, `Subtotal`... **riêng của view đó** — không dùng chung 1 bộ filter/sort/style cho cả module như suy nghĩ ban đầu. Tab "Cấu hình" (đã có sẵn từ [`field-config-ui-plan.md`](field-config-ui-plan.md)) dùng chung cơ chế chọn view này để biết đang thêm/sửa cột cho view nào.

## Quyết định thiết kế (để tránh mơ hồ khi implement)

1. **Một dòng `cf_field_config` = một cột trong một view cụ thể**, tự mang toàn bộ hành vi của cột đó CHO RIÊNG view đó (nhãn, kiểu, hiện/ẩn, filter, sort, group, width, style, subtotal). Muốn cùng 1 `FieldName` xuất hiện ở nhiều view với filter/sort/style khác nhau → tạo nhiều dòng cấu hình riêng (cùng `FieldName`, khác `id`/`ViewID`, mỗi dòng tự set filter/sort/style theo ý muốn cho view đó) — đây là cách dùng **có chủ đích**, không phải giới hạn.
2. **Mỗi view = một tab trực tiếp trên hàng tab chính**, không phải tab con/thanh phụ. Hàng tab trở thành: `[view 1, view 2, ..., "Cấu hình", "Cài đặt"]`. Với module hiện tại (chỉ 1 view mặc định `"default"`/"Danh sách"), hàng tab hiển thị đúng y hệt hôm nay: `Danh sách | Cấu hình | Cài đặt`.
3. **`DataViewTable.svelte` không cần sửa gì cả** — chỉ cần `DataViewManager` lọc `fieldConfigs` theo `activeViewId` trước khi truyền xuống, cho **cả 2 prop** `fields` (cột hiển thị) **và** `fieldConfigs` (nguồn cho filter/sort/group nội bộ của `DataViewTable`). Vì `DataViewTable` tự suy ra `filterFields`/`sortFields`/`groupFields` từ đúng prop `fieldConfigs` nó nhận được, chỉ cần truyền đúng tập con của view đang xem là filter/sort/group/style/width tự động trở thành riêng theo từng view, không phải sửa logic bên trong `DataViewTable`.
4. **`storageKey` (localStorage lưu bộ lọc) tách riêng theo view** — nối thêm `activeViewId`, vì mỗi view có thể có tập field lọc được khác nhau (`${module.storageKey}:${activeViewId}`), tránh bộ lọc của view này áp nhầm lên view khác.
5. **View mặc định**: các cột hiện có (chưa từng gán view) coi như thuộc view `"default"` / nhãn "Danh sách" — nếu 2 cột `ViewID`/`ViewLabel` có default tương ứng ở Supabase thì mọi dòng cũ đã tự có giá trị hợp lệ; tầng service ở mục 2 vẫn fallback về `"default"`/"Danh sách" khi giá trị rỗng/null để an toàn.
6. **Tab "Cấu hình" dùng "view đang xem gần nhất"** (`activeViewId`, đồng bộ mỗi khi người dùng bấm vào một tab-view) để biết đang thêm/sửa cột cho view nào — kể cả khi đang đứng ở tab "Cấu hình"/"Cài đặt" (không có "view" riêng).
7. **Mỗi lần chuyển view = một instance `DataViewTable` mới** (bọc bằng `{#key activeTab}`), để trạng thái nội bộ của bảng không lẫn giữa các view, đúng yêu cầu "mỗi tab là mỗi view với mỗi `DataViewTable.svelte`".
8. **Form Thêm/Sửa hồ sơ (`DataViewFormModal`) không phụ thuộc view** — vẫn cho sửa toàn bộ dữ liệu 1 hồ sơ bất kể view, nhưng phải **loại trùng theo `FieldName`** trước khi truyền cho form (mục 3), vì nay việc trùng `FieldName` giữa nhiều view là hợp lệ/có chủ đích (mục 1) — nếu không loại trùng, form sẽ hiện cùng 1 ô nhập liệu 2 lần.

## 1. Tầng kiểu dữ liệu — [`field-config.ts`](../../src/lib/types/field-config.ts)

- `FieldConfigRow` (dòng 27-50): thêm 2 trường raw, đặt cạnh `TableName` (khớp đúng tên cột thật đã có sẵn trên Supabase):
  ```ts
  ViewID: string;
  ViewLabel: string;
  ```
- `FieldConfig` (dòng 53-68): thêm 2 trường đã parse:
  ```ts
  viewId: string;
  viewLabel: string;
  ```

## 2. Tầng service — [`field-config-service.ts`](../../src/lib/services/field-config-service.ts)

Trong `toFieldConfig()` (dòng 42-60), thêm mapping (fallback phòng dòng nào đó có giá trị rỗng/null):

```ts
viewId: row.ViewID || "default",
viewLabel: row.ViewLabel || "Danh sách",
```

`loadFieldConfig`/`loadFieldConfigRows` (dòng 65-92) giữ nguyên — vẫn tải toàn bộ cột (mọi view) của `TableName` trong 1 lần gọi; việc lọc theo view đang xem thực hiện ở phía client (mục 3), vì tab "Danh sách" cần đổi view tức thời không cần gọi lại API.

## 3. [`DataViewManager.svelte`](../../src/features/data-view/DataViewManager.svelte) — hàng tab trở thành động theo view

### Kiểu tab & state

Thay khai báo tab cố định (dòng 39-44):

```ts
// Trước:
const tabs: { id: "list" | "config" | "settings"; label: string }[] = [
  { id: "list", label: "Danh sách" },
  { id: "config", label: "Cấu hình" },
  { id: "settings", label: "Cài đặt" },
];
let activeTab: "list" | "config" | "settings" = "list";
```

```ts
// Sau: mỗi view là một tab id = ViewID; "config"/"settings" là 2 tab cố định còn lại.
function isViewTab(tabId: string): boolean {
  return tabId !== "config" && tabId !== "settings";
}
let activeTab = "default";
// "View đang xem gần nhất" — đồng bộ mỗi khi activeTab là 1 view-tab, dùng để scope tab "Cấu hình"
// và lọc fieldConfigs cho DataViewTable.
let activeViewId = "default";
```

Cạnh derivation `displayFields` (dòng 122), thay bằng (trước khi `fieldConfigs` tải xong, `distinctViews` rỗng nên fallback về 1 tab tạm dùng chính `activeTab` — tránh hàng tab bị thiếu tab trong lúc đang tải; với module chỉ có 1 view thật thì nhãn "Danh sách" trùng khớp luôn, không bị nháy):

```ts
$: distinctViews = fieldConfigs.reduce<{ id: string; label: string }[]>((acc, f) => {
  if (!acc.some((v) => v.id === f.viewId)) acc.push({ id: f.viewId, label: f.viewLabel });
  return acc;
}, []);
$: views = distinctViews.length ? distinctViews : [{ id: activeTab, label: "Danh sách" }];
$: tabs = [
  ...views,
  { id: "config", label: "Cấu hình" },
  { id: "settings", label: "Cài đặt" },
];

// Nếu view đang chọn không còn tồn tại (xóa hết cột của view đó...), rơi về view đầu tiên.
$: if (distinctViews.length && isViewTab(activeTab) && !distinctViews.some((v) => v.id === activeTab)) {
  activeTab = distinctViews[0].id;
}
// Đồng bộ "view đang xem gần nhất" mỗi khi activeTab là 1 view-tab.
$: if (isViewTab(activeTab)) activeViewId = activeTab;

// Toàn bộ cột (kể cả không hiện trong bảng) CỦA RIÊNG view đang xem — nguồn filter/sort/group/
// style/width cho DataViewTable (quyết định #3), khác hẳn cách cũ là dùng chung fieldConfigs toàn module.
$: fieldConfigsForActiveView = fieldConfigs.filter((f) => f.viewId === activeViewId);
$: displayFields = fieldConfigsForActiveView.filter((f) => f.defaultDisplay);

// Danh sách THÔ đã lọc theo view đang chọn — dùng cho tab "Cấu hình" (mục 5) và moveFieldConfigRow.
$: fieldConfigRowsForActiveView = fieldConfigRows.filter(
  (r) => (r.ViewID || "default") === activeViewId,
);

// Loại trùng theo FieldName (ưu tiên dòng xuất hiện trước) — dùng cho form Thêm/Sửa hồ sơ (quyết
// định #8), vì trùng FieldName giữa nhiều view giờ là hợp lệ nhưng form sửa 1 hồ sơ chỉ cần hỏi 1 lần.
$: recordFormFields = fieldConfigs.reduce<FieldConfig[]>((acc, f) => {
  if (!acc.some((x) => x.field === f.field)) acc.push(f);
  return acc;
}, []);
```

### `selectTab`/khởi tạo (dòng 89-95)

```ts
function selectTab(tabId: string): void {
  activeTab = tabId;
  if (isViewTab(tabId)) armListContent();
  if (tabId === "config") loadFieldConfigRowsForEditor();
}

if (isViewTab(activeTab)) armListContent();
```

`saveSettings()` (dòng 259-266) gọi `selectTab("list")` → đổi thành `selectTab(activeViewId)` (quay lại đúng view đang xem gần nhất thay vì id `"list"` không còn tồn tại).

Sửa `moveFieldConfigRow()` (dòng 221-239): đổi mọi tham chiếu `fieldConfigRows` → `fieldConfigRowsForActiveView`, để ▲▼ chỉ hoán đổi với hàng liền kề **trong cùng view** đang xem, không nhảy sang cột của view khác.

`saveFieldConfigRow()` (dòng 175-201) không cần sửa: payload từ `FieldConfigFormModal` (mục 6) đã tự mang `ViewID`/`ViewLabel`, và `Omit<FieldConfigRow, "id" | "TableName" | "DefaultFieldOrderIndex">` tự động bao gồm 2 trường mới vì chúng không nằm trong danh sách `Omit`.

### `saveRecord()` (dòng 304-321) và `openEdit`/`formValues`

Đổi nguồn field dùng để build `payload` từ `fieldConfigs` → `recordFormFields` (đã loại trùng theo `FieldName` ở trên), tránh set trùng key 2 lần (vô hại nhưng thừa) khi 1 field xuất hiện ở nhiều view.

## 4. UI — render tab theo `tabs` động + `DataViewTable` theo view

Nav tab hiện có (dòng 370-406) đã lặp qua mảng `tabs` sẵn — không cần sửa cấu trúc, chỉ đổi điều kiện icon bộ lọc (dòng 382) từ `{#if tab.id === "list"}` → `{#if isViewTab(tab.id)}` (icon lọc hiện trên mọi tab-view, không riêng gì tab đầu tiên).

Khối render nội dung (dòng 417-446): đổi điều kiện `{#if activeTab === "list"}` → `{#if isViewTab(activeTab)}`, bọc `<DataViewTable>` bằng `{#key activeTab}` (quyết định #7), và đổi `{fieldConfigs}`/`storageKey` sang bản đã lọc theo view (quyết định #3, #4):

```svelte
{#if isViewTab(activeTab)}
  {#if listContentReady}
    {#key activeTab}
      <DataViewTable
        fields={displayFields}
        fieldConfigs={fieldConfigsForActiveView}
        {rows}
        loading={loading || fieldConfigLoading}
        hasConnection={Boolean(config.publicKey)}
        {selectedRow}
        onSelectRow={(row) => (selectedRow = selectedRow === row ? null : row)}
        {showFilters}
        storageKey={`${module.storageKey}:${activeViewId}`}
      />
    {/key}
  {:else}
    <div class="px-5 py-16 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
  {/if}
{:else if activeTab === "config"}
  <FieldConfigPanel
    rows={fieldConfigRowsForActiveView}
    loading={fieldConfigRowsLoading}
    viewLabel={views.find((v) => v.id === activeViewId)?.label ?? "Danh sách"}
    onCreate={openCreateFieldConfigRow}
    onEdit={openEditFieldConfigRow}
    onDelete={requestDeleteFieldConfigRow}
    onMove={moveFieldConfigRow}
  />
{:else}
  <div class="mt-2">
    <ConnectionSettingsPanel {config} {savedText} onSubmit={saveSettings} />
  </div>
{/if}
```

Khối `<DataViewFormModal>` (dòng 449-460): đổi `fields={fieldConfigs}` → `fields={recordFormFields}` (quyết định #8).

Khối `{#if editFieldConfigRow !== undefined}` (dòng 472-485): truyền thêm 3 prop mới cho `FieldConfigFormModal`, và đổi `existingFieldNames` sang scope theo view đang xem (nhóm-dòng chỉ nên trỏ tới cột trong cùng view):

```svelte
existingFieldNames={fieldConfigRowsForActiveView.map((row) => row.FieldName)}
existingViews={views.map((v) => ({ viewId: v.id, viewLabel: v.label }))}
initialViewId={activeViewId}
initialViewLabel={views.find((v) => v.id === activeViewId)?.label ?? "Danh sách"}
```

## 5. [`FieldConfigPanel.svelte`](../../src/features/data-view/FieldConfigPanel.svelte)

Không cần thêm cột "View" trong bảng (mọi dòng hiển thị đã cùng thuộc 1 view do được lọc sẵn ở `DataViewManager`, thêm cột sẽ chỉ lặp lại cùng 1 giá trị — không cần thiết).

- Thêm prop `export let viewLabel: string;`.
- Sửa tiêu đề (dòng 33) thành: `Cấu hình cột dữ liệu — view "{viewLabel}"` để người dùng biết đang xem/sửa view nào.
- Thông báo rỗng (dòng 46) đổi thành `Chưa có cột nào được cấu hình cho view "{viewLabel}".`

## 6. [`FieldConfigFormModal.svelte`](../../src/features/data-view/FieldConfigFormModal.svelte)

- Props mới: `existingViews: { viewId: string; viewLabel: string }[]`, `initialViewId: string`, `initialViewLabel: string`.
- State cục bộ mới (cạnh dòng 48-61):
  ```ts
  const NEW_VIEW = "__new__";
  let viewSelection = row?.ViewID ?? initialViewId;
  let newViewId = "";
  let newViewLabel = "";
  ```
- Thêm 1 `<label>` chọn view trong nhóm "Thông tin cơ bản" (dòng 111-142), đặt sau "Loại dữ liệu":
  ```svelte
  <label class="mb-4">
    View (tab hiển thị)
    <select class="mt-1.5" bind:value={viewSelection}>
      {#each existingViews as v (v.viewId)}
        <option value={v.viewId}>{v.viewLabel}</option>
      {/each}
      <option value={NEW_VIEW}>+ Tạo view mới…</option>
    </select>
  </label>
  {#if viewSelection === NEW_VIEW}
    <label class="mb-4">
      Mã view (ViewID)
      <input class="mt-1.5" bind:value={newViewId} required placeholder="vd. tai-chinh" />
    </label>
    <label class="mb-4">
      Tên tab hiển thị (ViewLabel)
      <input class="mt-1.5" bind:value={newViewLabel} required placeholder="vd. Tài chính" />
    </label>
  {/if}
  ```
  Ghi chú ngay dưới dropdown: chọn lại 1 `FieldName` đã tồn tại ở view khác + đổi view = tạo bản sao cấu hình riêng cho view mới (filter/sort/style độc lập, đúng quyết định #1) — không phải "chuyển" field sang view khác.
- Trong `handleSubmit()` (dòng 69-91), tính `ViewID`/`ViewLabel` cuối cùng và thêm vào payload:
  ```ts
  const finalViewId = viewSelection === NEW_VIEW ? newViewId.trim() : viewSelection;
  const finalViewLabel =
    viewSelection === NEW_VIEW
      ? newViewLabel.trim()
      : (existingViews.find((v) => v.viewId === viewSelection)?.viewLabel ?? initialViewLabel);
  // ...trong object truyền cho onSubmit, thêm:
  ViewID: finalViewId,
  ViewLabel: finalViewLabel,
  ```

## 7. Cập nhật [`README.md`](../../README.md)

- Bảng schema `cf_field_config` (dòng 271-285): thêm 2 dòng `ViewID`/`ViewLabel` (kiểu `text`), nêu rõ mỗi view là một tab và mỗi dòng cấu hình (kể cả trùng `FieldName` khác `ViewID`) tự mang filter/sort/style/width riêng cho view đó.
- Đoạn mô tả cấu trúc tab của `DataViewManager` (nếu có): sửa "tab Danh sách cố định" thành "N tab theo view (mặc định 1 tab 'Danh sách') + Cấu hình + Cài đặt".
- Ví dụ JSON dòng cấu hình đầy đủ (dòng 289-304): thêm `"ViewID": "default", "ViewLabel": "Danh sách"`.

## Giới hạn chấp nhận được (không xử lý ở lần này)

- Không kiểm tra ràng buộc khi đổi/xóa view (vd. đổi 1 cột sang view khác khiến view cũ trống hẳn, tab đó tự biến mất khỏi hàng tab) — không cần dọn dẹp riêng.
- Không đổi tên/xóa cả một view cùng lúc (theo lô) — muốn đổi tên view (đổi nhãn tab) phải sửa `ViewLabel` từng dòng cấu hình thuộc view đó.
- Không giới hạn `ViewID`/`ViewLabel` trùng với `"config"`/`"settings"` — nếu người dùng đặt `ViewID` là đúng chuỗi `"config"` hoặc `"settings"`, tab đó sẽ bị `isViewTab()` coi nhầm là tab cố định. Chấp nhận rủi ro nhỏ này, không validate ở lần triển khai đầu.
- Không đồng bộ giá trị đang nhập dở ở form Sửa hồ sơ khi cùng 1 field có nhiều dòng cấu hình khác kiểu hiển thị (`FieldType` khác nhau giữa các view) — `recordFormFields` lấy cấu hình của dòng xuất hiện trước theo `DefaultFieldOrderIndex`; nếu 2 view định nghĩa cùng `FieldName` nhưng khác `FieldType`, form dùng type của dòng đến trước. Coi đây là quy ước sử dụng, không xử lý cảnh báo.

## Kiểm tra sau khi làm

1. `npm run check` — không lỗi type.
2. `npm run dev`, với module chưa gán view mới (dữ liệu `cf_field_config` hiện có): xác nhận hàng tab vẫn đúng `Danh sách | Cấu hình | Cài đặt` — giao diện y hệt trước khi có tính năng.
3. Vào "Cấu hình" → "＋ Thêm cột" → chọn "+ Tạo view mới…", đặt `ViewID`/`ViewLabel` mới, lưu → xác nhận xuất hiện tab mới ngay trên hàng tab chính (trước "Cấu hình").
4. Tạo 2 dòng cấu hình cùng `FieldName` nhưng khác `ViewID`, đặt `FilterType`/`DefaultSortOrder`/`DefaultFieldColumnWidth` khác nhau ở mỗi dòng → xác nhận khi chuyển qua lại 2 tab-view, cột đó hiện đúng độ rộng/kiểu lọc/sort riêng của từng view; mở form Thêm/Sửa hồ sơ chỉ thấy đúng 1 ô nhập cho field đó (không lặp).
5. Thử ▲▼ đổi thứ tự cột trong 1 view — xác nhận chỉ hoán đổi với cột liền kề cùng view, không ảnh hưởng cột của view khác.
6. Vào tab "Cấu hình" trong khi đang xem view A rồi bấm "Cài đặt" → quay lại "Cấu hình" — xác nhận vẫn đang scope đúng view A (không bị reset về view đầu tiên).
7. `npm run build` — build `docs/` không lỗi.
