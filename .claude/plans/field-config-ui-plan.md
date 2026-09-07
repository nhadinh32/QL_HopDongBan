# Tab "Cấu hình" — xem & sửa `cf_field_config` ngay trong UI

## Bối cảnh

Hiện tại, muốn thêm/sửa/ẩn một cột (đổi nhãn, kiểu nhập liệu, cách lọc, thứ tự, độ rộng, sort mặc định, nhóm dòng, subtotal...) người dùng phải vào thẳng Supabase Table Editor để sửa bảng `cf_field_config`. Việc này đòi hỏi hiểu schema kỹ thuật (`FieldConfigRow` — xem [`src/lib/types/field-config.ts`](../../src/lib/types/field-config.ts)) và không thân thiện với người dùng cuối.

Mục tiêu: thêm một tab **"Cấu hình"** ngay trong `DataViewManager.svelte` (cạnh tab "Cài đặt"), cho phép xem toàn bộ cột đang cấu hình cho module hiện tại, và thêm/sửa/xóa/sắp xếp lại chúng — trải nghiệm giống hệt phần "Danh sách" hồ sơ hiện có (bảng + modal form + xác nhận xóa), không cần rời khỏi app hay đụng tới Supabase Console.

Đây là tính năng CRUD thứ hai của app (sau CRUD hồ sơ dữ liệu), áp dụng lại đúng các quy ước đã có: `createSupabaseRestClient` cho REST, `Modal`/`Button`/`ConfirmDialog`/`SelectCombobox` cho UI, pattern `editX: T | null | undefined` cho trạng thái modal thêm/sửa, callback prop `onXxx` giữa các component.

## Vị trí tab & luồng UI

Sửa mảng `tabs` trong [`DataViewManager.svelte`](../../src/features/data-view/DataViewManager.svelte) (dòng 30-34): thêm tab `"config"` ngay trước `"settings"`:

```
Tổng quan → Danh sách → Cấu hình → Cài đặt
```

Khi bấm vào tab "Cấu hình" lần đầu (hoặc mỗi lần vào lại), tải danh sách cột **thô** (raw `FieldConfigRow[]`, không phải `FieldConfig[]` đã parse) để có đủ `id`/`TableName` phục vụ sửa/xóa.

## 1. Tầng dữ liệu — mở rộng `field-config-service.ts`

File [`src/lib/services/field-config-service.ts`](../../src/lib/services/field-config-service.ts) hiện chỉ có `loadFieldConfig()` (đọc + parse sang `FieldConfig`, dùng cho bảng/lọc/form hồ sơ). Giữ nguyên hàm này, thêm 4 hàm CRUD làm việc trực tiếp trên `FieldConfigRow` (không parse, vì tab cấu hình cần sửa đúng field thô kể cả `id`/`TableName`):

```ts
export async function loadFieldConfigRows(config: ConnectionConfig, tableName: string): Promise<FieldConfigRow[]>
export async function createFieldConfigRow(config: ConnectionConfig, row: Omit<FieldConfigRow, "id">): Promise<FieldConfigRow>
export async function updateFieldConfigRow(config: ConnectionConfig, id: number, patch: Partial<FieldConfigRow>): Promise<FieldConfigRow>
export async function deleteFieldConfigRow(config: ConnectionConfig, id: number): Promise<void>
```

Cả 4 hàm dùng lại `createSupabaseRestClient<FieldConfigRow>({ ...config, table: FIELD_CONFIG_TABLE })` y hệt `loadFieldConfig()` hiện có — chỉ khác gọi `create`/`update`/`remove` thay vì `list`.

## 2. Danh mục lựa chọn thân thiện — thêm vào `field-config.ts`

Để không bắt người dùng gõ tay các chuỗi PascalCase (`"SingleSelectWithOther"`, `"MultiSelectWithoutOther"`...), thêm vào [`src/lib/types/field-config.ts`](../../src/lib/types/field-config.ts) 3 danh sách `{ value, label }` tiếng Việt dùng cho dropdown, đứng cạnh các hàm predicate đã có:

- `FIELD_TYPE_OPTIONS` — 11 mục, vd. `Text` → "Văn bản ngắn", `Currency` → "Tiền tệ", `SingleSelectWithOther` → "Chọn 1 (cho thêm tự do)"...
- `FILTER_TYPE_OPTIONS` — 5 mục: `date`/`numeric`/`select`/`text`/`none` → "Theo khoảng ngày"/"Theo khoảng số"/"Chọn nhiều (slicer)"/"Tìm theo chuỗi"/"Không lọc".
- `SUBTOTAL_TYPE_OPTIONS` — 6 mục + tùy chọn "Không tính" (null): `sum`/`count`/`max`/`min`/`average`/`product`.

## 3. Component mới (đặt trong `src/features/data-view/`, cạnh `ConnectionSettingsPanel.svelte` — cùng là UI quản trị riêng cho module, không phải widget generic dùng lại ở nơi khác)

### `FieldConfigPanel.svelte` — nội dung tab

Props: `rows: FieldConfigRow[]`, `loading: boolean`, `onCreate: () => void`, `onEdit: (row) => void`, `onDelete: (row) => void`, `onMove: (row, direction: "up" | "down") => void`.

Bố cục giống các bảng khác trong app: tiêu đề + mô tả ngắn + nút "＋ Thêm cột" (góc phải), bên dưới là một `<table>` liệt kê các cột đã cấu hình (đã sort theo `DefaultFieldOrderIndex`):

| Thứ tự (▲▼) | Tên cột kỹ thuật | Nhãn hiển thị | Loại dữ liệu | Hiện trong bảng? | Lọc | Thao tác (Sửa/Xóa) |

- Nút ▲▼ gọi `onMove` để đổi `DefaultFieldOrderIndex` với cột liền kề (xem mục 4).
- Cột "Hiện trong bảng?" hiện dạng `Badge` (tone success/neutral) cho dễ quét mắt, giống cách `Sidebar.svelte` dùng `Badge` cho trạng thái kết nối.
- Trạng thái rỗng/đang tải dùng lại đúng class `emptyStateClass` kiểu đang có ở `DataViewTable.svelte`.

### `FieldConfigFormModal.svelte` — modal thêm/sửa một cột

Dựng trên `Modal` (size `lg` vì nhiều trường hơn form hồ sơ). Khác với `DataViewFormModal` (form *động* theo `FieldConfig[]` bất kỳ), form này có **shape cố định** đúng theo `FieldConfigRow`, nên state cục bộ khai báo tường minh từng field thay vì `Record<string,string>` chung chung.

Chia làm các nhóm nhỏ trong modal, phong cách progressive-disclosure để không rợp mắt (mirror layout 2 cột `grid sm:grid-cols-2` đã dùng ở `DataViewFormModal`):

1. **Thông tin cơ bản:** `FieldName` (chỉ nhập được lúc **tạo mới** — khi sửa hiển thị readonly kèm ghi chú "phải khớp đúng tên cột thật trong bảng dữ liệu"), `Label`, `FieldType` (dùng lại `SelectCombobox` single-select, `options` = nhãn từ `FIELD_TYPE_OPTIONS`), checkbox "Hiện trong bảng danh sách" (`DefaultDisplayField`).
2. **Bộ lọc:** `FilterType` (`SelectCombobox` single, options từ `FILTER_TYPE_OPTIONS`). Chỉ khi `FieldType` là kiểu select mới hiện thêm ô `SuggestForSelect` — tái dùng `SelectCombobox` với `multiple + allowCustom`, không truyền `options` cố định (tức nhập tay từng lựa chọn, đúng như combobox đã hỗ trợ sẵn).
3. **Sắp xếp & nhóm dòng (tùy chọn):** số `DefaultSortOrder[0]` (độ ưu tiên sort) + chọn hướng asc/desc (chỉ bật khi có độ ưu tiên), số `DefaultRowGroupOrder` (cấp nhóm), dropdown `DefaultPositionFieldNamShowGroup` (chọn từ danh sách `FieldName` của các cột khác trong cùng module — truyền qua prop `existingFieldNames: string[]`), dropdown `Subtotal` (options từ `SUBTOTAL_TYPE_OPTIONS`, có mục "Không tính").
4. **Nâng cao (tùy chọn, có thể để trong `<details>` gập lại mặc định):** `DefaultFieldColumnWidth` (number), `DefaultCustomStyleForColumn` (textarea, ghi chú rõ đây là CSS inline thô).

Props: `row: FieldConfigRow | null` (null = tạo mới), `existingFieldNames: string[]`, `saveError: string`, `saving: boolean`, `onClose`, `onSubmit(payload: Omit<FieldConfigRow, "id" | "TableName">)`, `onDelete` (chỉ hiện nút khi đang sửa, giống nút "Xóa" trong `DataViewFormModal`).

Validate tối thiểu trước khi submit: `FieldName` và `Label` không rỗng (bắt buộc `required` trên input, không cần logic JS thêm).

## 4. Nối vào `DataViewManager.svelte`

- Mở rộng type tab: `"overview" | "list" | "config" | "settings"`; thêm `{ id: "config", label: "Cấu hình" }` vào mảng `tabs`.
- State mới: `fieldConfigRows: FieldConfigRow[] = []`, `fieldConfigRowsLoading = false`, `editFieldConfigRow: FieldConfigRow | null | undefined = undefined`, `deleteFieldConfigRow: FieldConfigRow | null = null`, `fieldConfigSaveError = ""`, `fieldConfigSaving = false`.
- `selectTab()`: khi chuyển sang `"config"`, gọi `loadFieldConfigRowsForEditor()` (tương tự cách `"list"` gọi `armListContent()`).
- Hàm nghiệp vụ mới, đặt cạnh các hàm `loadRows`/`saveRecord`/`removeRecord` hiện có:
  - `loadFieldConfigRowsForEditor()` — gọi `loadFieldConfigRows(config, module.defaultTable)`.
  - `openCreateFieldConfigRow()` / `openEditFieldConfigRow(row)` / `closeFieldConfigEdit()` — mirror `openCreate`/`openEdit`/`closeEdit` của hồ sơ.
  - `saveFieldConfigRow(payload)` — gọi `createFieldConfigRow`/`updateFieldConfigRow` tùy `editFieldConfigRow` đang là `null` hay có `id`; sau khi lưu thành công, gọi lại **cả** `loadFieldConfigRowsForEditor()` (làm mới bảng cấu hình) **lẫn** `loadFieldConfigs()` đã có sẵn (để bảng "Danh sách"/form hồ sơ cập nhật cột ngay, không cần tải lại trang).
  - `requestDeleteFieldConfigRow(row)` / `removeFieldConfigRow()` — mirror `requestDelete`/`removeRecord`, cũng refresh cả hai nguồn sau khi xóa.
  - `moveFieldConfigRow(row, direction)` — tìm cột liền kề trong `fieldConfigRows` đã sort, hoán đổi giá trị `DefaultFieldOrderIndex` giữa 2 cột bằng 2 lệnh `updateFieldConfigRow` gọi song song (`Promise.all`), rồi `loadFieldConfigRowsForEditor()` + `loadFieldConfigs()`.
- Render: thêm nhánh `{:else if activeTab === "config"}` gọi `<FieldConfigPanel rows={fieldConfigRows} loading={fieldConfigRowsLoading} onCreate={openCreateFieldConfigRow} onEdit={openEditFieldConfigRow} onDelete={requestDeleteFieldConfigRow} onMove={moveFieldConfigRow} />`, đặt trước nhánh `{:else}` (Cài đặt) hiện có.
- Thêm khối `{#if editFieldConfigRow !== undefined}<FieldConfigFormModal .../>{/if}` và một `<ConfirmDialog>` riêng cho `deleteFieldConfigRow` (nội dung "Xóa cấu hình cột? Dữ liệu thật trong bảng không bị xóa, chỉ ẩn cột khỏi giao diện."), đặt cạnh khối modal/confirm hồ sơ hiện có ở cuối file.

## 5. Cập nhật `README.md`

- Đổi "Ba tab ngang" → "Bốn tab ngang" ở phần mô tả `DataViewManager`, thêm mô tả tab "Cấu hình".
- Thêm `FieldConfigPanel.svelte`/`FieldConfigFormModal.svelte` vào sơ đồ cây thư mục (`features/data-view/`) và mục "Giải thích chi tiết từng phần".
- Thêm đoạn mô tả 4 hàm CRUD mới trong phần nói về `field-config-service.ts`.

## Giới hạn chấp nhận được (không xử lý ở lần này)

- Không kiểm tra ràng buộc "cột đang được cột khác trỏ tới qua `DefaultPositionFieldNamShowGroup` thì không cho xóa" — xóa vẫn thực hiện, chỉ để lại tham chiếu treo (giá trị vô hại, code render đã có fallback `!hasTarget` khi không tìm thấy field đích).
- Không kéo-thả (drag & drop) để sắp xếp — chỉ nút ▲▼ đổi chỗ với hàng liền kề, giữ đúng tinh thần đơn giản của UI hiện có.
- Không tự tạo cột thật trong bảng dữ liệu Supabase — tab này chỉ quản lý *cấu hình hiển thị* cho cột đã tồn tại sẵn trong bảng dữ liệu (`db_hopdongban`...); người dùng vẫn phải tự thêm cột thật trong Supabase trước.

## Kiểm tra sau khi làm

1. `npm run check` — không lỗi type.
2. `npm run dev` — vào tab "Cấu hình": xem danh sách cột đúng thứ tự, thêm cột mới (chọn đúng loại/lọc), sửa một cột đã có, đổi thứ tự bằng ▲▼, xóa một cột — mỗi thao tác xác nhận tab "Danh sách" cập nhật cột ngay mà không cần tải lại trang.
3. `npm run build` — build `docs/` không lỗi.
