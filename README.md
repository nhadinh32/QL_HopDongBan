# Quản lý dữ liệu

Ứng dụng Svelte 5 + Vite + TypeScript, xuất tĩnh (static site) để triển khai trên GitHub Pages. Ứng dụng không có backend riêng — dữ liệu đọc/ghi trực tiếp từ trình duyệt tới một bảng **Supabase** qua REST API, dùng public key do người dùng tự nhập và lưu trong `localStorage` của máy họ. Toàn bộ quyền đọc/ghi thực sự do Supabase Row Level Security (RLS) kiểm soát, không phải do mã nguồn front-end.

**Điểm cốt lõi:** không một cột dữ liệu nào (tên, nhãn, kiểu nhập liệu, cách lọc, hiển thị mặc định, thứ tự, độ rộng, style, sort mặc định, nhóm dòng) được khai báo cứng trong TypeScript — tất cả đọc **động** từ bảng Supabase `cf_field_config`. Thêm/sửa/ẩn một cột chỉ cần sửa dữ liệu trong Supabase, không cần sửa code hay deploy lại.

## Công nghệ sử dụng

| Thành phần | Vai trò |
| --- | --- |
| [Svelte 5](https://svelte.dev/) | Framework UI, dùng cú pháp component `.svelte` với `export let` (props) và `$:` (reactive statement) |
| [Vite](https://vitejs.dev/) | Dev server + build tool |
| TypeScript | Kiểu dữ liệu cho toàn bộ `.ts` và phần `<script lang="ts">` trong `.svelte` |
| [Tailwind CSS v4](https://tailwindcss.com/) | Toàn bộ giao diện style bằng utility class, cấu hình qua `@tailwindcss/vite` |
| Supabase REST API | Nơi lưu dữ liệu thật; ứng dụng gọi thẳng bằng `fetch`, không dùng SDK `@supabase/supabase-js` |

Không có framework fullstack (không dùng SvelteKit) — đây là một Single Page App tĩnh, gắn (`mount`) vào một `<div id="app">` duy nhất trong `index.html`.

## Chạy cục bộ

```powershell
npm install
npm run dev
```

Các lệnh khác:

- `npm run build` — build ra thư mục `docs/` (xem lý do dùng `docs/` thay vì `dist/` ở phần Triển khai bên dưới).
- `npm run preview` — chạy thử bản đã build.
- `npm run check` — chạy `svelte-check` để kiểm tra kiểu dữ liệu TypeScript trong toàn bộ `.ts`/`.svelte`.

## Cấu trúc thư mục

```
src/
├── main.ts                          # Điểm khởi động: mount App.svelte vào #app
├── App.svelte                       # Component gốc: sidebar + module đang chọn (state activeModuleId)
├── app.css                          # Import Tailwind + token màu thương hiệu + style nền cho label/input/select dùng chung
├── lib/
│   ├── types/
│   │   ├── data-view.ts             # Kiểu dữ liệu chung (DataRecord, ConnectionConfig, SortField, DataModuleConfig)
│   │   └── field-config.ts          # FieldType/FilterType + FieldConfig (shape cột đọc từ cf_field_config)
│   ├── constants/modules/
│   │   ├── sales-contracts.ts       # Khai báo module "Hợp đồng bán": id/label/storageKey + kết nối Supabase mặc định
│   │   └── index.ts                 # Danh sách MODULES hiển thị trong sidebar
│   ├── services/
│   │   ├── supabase-rest.ts         # Client REST tối giản gọi Supabase (list/create/update/remove), generic theo bảng
│   │   └── field-config-service.ts  # Tải cấu hình cột từ cf_field_config theo TableName
│   ├── utils/
│   │   ├── data-view-format.ts      # Định dạng ô dữ liệu (ngày/giờ/tiền tệ/phần trăm/multi-select) + độ rộng cột + kiểm tra rỗng
│   │   ├── data-view-sort.ts        # So sánh/sắp xếp dòng theo FieldConfig, dùng chung cho sort phẳng và sort trong từng nhóm
│   │   ├── data-view-filters.ts     # Tính FilterField theo FieldConfig + hàm khớp lọc (liên kết kiểu slicer Excel)
│   │   └── data-view-grouping.ts    # Dựng cây nhóm dòng (treeview) nhiều cấp theo FieldConfig.groupOrder
│   └── components/
│       ├── layout/
│       │   ├── AppShell.svelte      # Khung ngoài cùng: sidebar cố định + topbar mobile + vùng nội dung
│       │   └── Sidebar.svelte       # Điều hướng module (drawer trượt trên mobile), badge trạng thái kết nối
│       └── ui/
│           ├── Button.svelte        # Nút dùng chung, gom biến thể default/primary/danger/icon/ghost
│           ├── Modal.svelte         # Khung dialog nền mờ dùng chung, size sm/md/lg
│           ├── ConfirmDialog.svelte # Hộp thoại xác nhận (dựa trên Modal)
│           ├── Badge.svelte         # Chip trạng thái có chấm màu theo tone
│           ├── SelectCombobox.svelte # Combobox dùng chung cho cả 4 biến thể select (đơn/nhiều × có/không cho gõ tự do)
│           ├── DataViewTable.svelte # Khung bảng dữ liệu dùng chung: header sort, các trạng thái rỗng/tải/lỗi
│           ├── DataViewTableGroupRows.svelte # Render đệ quy cây nhóm dòng (treeview) + dòng dữ liệu lá
│           ├── DataViewFilters.svelte # Panel bộ lọc theo cột (dạng slicer/khoảng/tìm chuỗi)
│           └── DataViewFormModal.svelte # Modal thêm/sửa một hồ sơ
└── features/data-view/
    ├── DataViewManager.svelte       # "Nhạc trưởng" của một module: state + toàn bộ logic nghiệp vụ
    ├── StatCards.svelte             # 2 thẻ số liệu nhanh ở tab Tổng quan (tổng hồ sơ, trạng thái)
    └── ConnectionSettingsPanel.svelte # Form nhập URL/API key/tên bảng Supabase
```

## Kiến trúc tổng quan

Ứng dụng được thiết kế để **tổng quát cho nhiều "module dữ liệu"** (nhiều bảng Supabase khác nhau, ví dụ Hợp đồng bán, Hợp đồng mua...) mà không phải viết lại UI cho từng module. Cách làm: `DataModuleConfig` chỉ còn giữ thông tin **cấp module** (`id`, `label`, `storageKey`, URL/tên bảng Supabase mặc định) — mọi thứ **theo từng cột** (tên trường, nhãn hiển thị, kiểu nhập liệu, cách lọc, hiển thị mặc định, thứ tự, độ rộng, style, sort mặc định, cấp nhóm dòng) đọc **động** từ bảng Supabase `cf_field_config` (lọc theo `TableName = module.defaultTable`), UI chỉ đọc `FieldConfig[]` trả về để tự sinh giao diện.

```
App.svelte
 └─ AppShell (sidebar dùng chung, đọc MODULES để sinh menu)
     └─ DataViewManager (mount lại mỗi khi đổi module, nhờ {#key activeModuleId})
         ├─ Tab "Tổng quan" → StatCards
         ├─ Tab "Danh sách" → DataViewFilters + DataViewTable → DataViewTableGroupRows
         ├─ Tab "Cài đặt"  → ConnectionSettingsPanel
         ├─ DataViewFormModal (thêm/sửa, hiện đè lên khi editRecord !== undefined)
         └─ ConfirmDialog (xác nhận xóa)
```

`DataViewManager.svelte` là nơi giữ toàn bộ **state** (danh sách bản ghi, cấu hình cột, bộ lọc, sắp xếp, dòng đang chọn, trạng thái kết nối...) và **logic** (gọi Supabase, tính bản ghi đã lọc/sắp xếp/nhóm, tính id tự động...). Các component còn lại — `StatCards`/`ConnectionSettingsPanel` trong `features/data-view/`, và `DataViewTable`/`DataViewFilters`/`DataViewFormModal`/`DataViewTableGroupRows` dùng chung trong `lib/components/ui/` — thuần hiển thị: nhận dữ liệu qua props và báo sự kiện ra ngoài qua các callback prop dạng `onXxx` (quy ước xuyên suốt dự án, thay vì dùng `createEventDispatcher`). Đặt 4 component này trong `lib/components/ui/` (thay vì `features/data-view/`) để có thể dựng nhiều bảng dữ liệu độc lập ở nơi khác trong app mà không phải phụ thuộc vào `DataViewManager`.

### Vì sao cột dữ liệu không hard-code trong component?

`DataViewManager` giữ hai danh sách cột, cả hai đều dẫn xuất từ `fieldConfigs: FieldConfig[]` (tải từ `cf_field_config` lúc `onMount`, xem `loadFieldConfigs()`):

- `fieldConfigs` — toàn bộ cột đã cấu hình cho module (theo `TableName`), sắp theo `DefaultFieldOrderIndex`. Dùng cho form nhập liệu (`DataViewFormModal`) — sửa hồ sơ cần thấy đủ mọi field, kể cả field không hiện trong bảng.
- `displayFields` — chỉ những cột có `DefaultDisplayField = true`, dùng cho bảng danh sách (`DataViewTable`).

Việc một cột thuộc kiểu nào (số/tiền tệ/phần trăm/văn bản dài/ngày/ngày giờ/select...) đọc thẳng từ cột `FieldType` của `cf_field_config` (xem `$lib/types/field-config.ts`), sort mặc định đọc từ `DefaultSortOrder`, và cấp nhóm dòng đọc từ `DefaultRowGroupOrder` — không có Set tên cột nào khai báo tay trong file module.

## Giải thích chi tiết từng phần

### Điểm khởi động

- **`index.html`** — có một `<div id="app">` và nạp `src/main.ts` làm module.
- **`src/main.ts`** — gọi `mount(App, { target })` của Svelte 5 để render `App.svelte` vào `#app`.
- **`src/App.svelte`** — component gốc. Đọc danh sách `MODULES`, dựng `navItems` cho sidebar, giữ `activeModuleId` (module đang chọn). Bọc `DataViewManager` trong khối `{#key activeModuleId}` để **buộc Svelte huỷ và tạo lại component** mỗi khi đổi module — nhờ vậy state cũ (bộ lọc, dòng đang chọn...) của module trước không bị rò rỉ sang module sau. `connected`/`connectionLabel` được `bind:` hai chiều từ `DataViewManager` lên để `AppShell` hiển thị badge trạng thái kết nối chung trên mọi tab.

### Layout dùng chung (`lib/components/layout`)

- **`AppShell.svelte`** — khung ngoài cùng: sidebar cố định bên trái (ẩn thành drawer trượt trên mobile, đóng/mở qua state `sidebarOpen` cục bộ) + một topbar mỏng chỉ hiện trên mobile (nút ☰ mở drawer) + vùng nội dung chính chứa `<slot />`.
- **`Sidebar.svelte`** — danh sách module (props `items`), mục đang chọn tô nổi bật theo `active`. Có hai icon SVG inline (dữ liệu/cài đặt) chọn theo `item.icon`. Dưới cùng hiển thị `Badge` trạng thái kết nối.

### UI dùng chung (`lib/components/ui`)

- **`Button.svelte`** — một component nút duy nhất cho toàn app, gom biến thể `default | primary | danger | icon | ghost` thành các class Tailwind tương ứng, tránh lặp style ở từng nơi gọi.
- **`Modal.svelte`** — khung dialog dùng chung: nền mờ toàn màn hình, bấm ra ngoài (`on:click|self`) để đóng, `size` (`sm | md | lg`) quyết định `max-width`. Nội dung thực tế do `<slot />` của nơi gọi cung cấp.
- **`ConfirmDialog.svelte`** — dựng trên `Modal` (size `sm`), dùng cho các thao tác không thể hoàn tác (hiện tại là xóa hồ sơ).
- **`Badge.svelte`** — chip nhỏ có chấm màu theo `tone` (`success | warning | danger | neutral`), dùng cho trạng thái kết nối.
- **`SelectCombobox.svelte`** — combobox dùng chung cho cả 4 biến thể select (`Single/MultiSelectWith/WithoutOther`), chỉ khác nhau qua 2 prop `multiple`/`allowCustom` thay vì viết 4 component gần giống nhau. Giá trị luôn là `string`: chọn đơn là chính giá trị đó, chọn nhiều nối các lựa chọn bằng `;` (cùng quy ước lưu multi-select trong dữ liệu và `SuggestForSelect`). `allowCustom` (field `...WithOther`) cho phép gõ và thêm giá trị không có trong danh sách gợi ý.

### Style dùng chung (`src/app.css`)

Khai báo bảng màu thương hiệu `--color-primary-*` qua `@theme` của Tailwind v4, rồi dùng `@layer base` để đặt sẵn style mặc định cho các thẻ HTML gốc thay vì lặp lại class ở từng input trong từng component:

- `label` → chữ nhỏ, đậm, màu slate.
- `input`, `textarea`, `select` → khung bo góc, viền, padding, và style `:focus` (viền + ring xanh) đồng nhất trên toàn app.

Nhờ vậy các form (`DataViewFormModal`, `ConnectionSettingsPanel`, `DataViewFilters`) chỉ cần thêm class layout mà không phải khai báo lại toàn bộ style input mỗi nơi.

### Khai báo kiểu dữ liệu (`lib/types/data-view.ts`)

File trung tâm định nghĩa các kiểu dùng xuyên suốt:

- `DataValue` — kiểu một ô dữ liệu (`string | number | boolean | null | undefined`).
- `DataRecord` — một bản ghi, có `id` bắt buộc, còn lại là index signature `[field: string]: DataValue` vì cột lấy động từ Supabase.
- `ConnectionConfig` — `{ url, publicKey, table }`, lưu trong `localStorage`.
- `SortField`/`SortDirection` — một quy tắc sắp xếp (cột + hướng).
- `DataModuleConfig` — khai báo một module ở **cấp module**: `id`, `label`, `storageKey` (khoá localStorage riêng), `defaultUrl`/`defaultTable` (kết nối Supabase mặc định). Không còn danh sách cột hay cấu hình tổng hợp nào ở đây — tất cả đọc động từ `cf_field_config`.

### Khai báo cấu hình cột (`lib/types/field-config.ts`)

Kiểu dữ liệu cho hệ thống cấu hình cột **động**, đọc từ bảng Supabase `cf_field_config`:

- `FieldType` — union 11 giá trị: `Text`, `LongText`, `Numeric`, `Percent`, `SingleSelectWithoutOther`, `SingleSelectWithOther`, `MultiSelectWithoutOther`, `MultiSelectWithOther`, `Date`, `DateTime`, `Currency`.
- `FilterType` — union 5 giá trị chữ thường (`"date" | "numeric" | "select" | "text" | "none"`) — `cf_field_config` lưu PascalCase, `field-config-service.ts` chuyển chữ thường lúc parse. `"none"` nghĩa là field không áp dụng bộ lọc nào (bị loại khỏi `filterFields` ngay ở `DataViewManager`).
- `FieldConfigRow` — raw shape trả về từ PostgREST, khớp đúng tên cột thật của `cf_field_config`, gồm cả `DefaultSortOrder` (`[STT, hướng]`, hướng `0 = asc`/`1 = desc`) và `DefaultRowGroupOrder` (số nguyên đơn, cấp nhóm dòng).
- `FieldConfig` — shape runtime đã parse (`field, label, type, defaultDisplay, suggestOptions, filterKind, columnWidth, customStyle, orderIndex, defaultSortPriority, defaultSortDirection, groupOrder`), dùng xuyên suốt UI.
- Hàm predicate dùng chung: `isNumericType`, `isDateType`, `isMultiSelectType`, `isSelectType`, `allowsCustomValue` (field `...WithOther` cho gõ giá trị tự do ngoài `suggestOptions`, `...WithoutOther` thì không).

### Khai báo module dữ liệu (`lib/constants/modules`)

- **`sales-contracts.ts`** — cấu hình cụ thể cho bảng `db_hopdongban`: chỉ còn `id`/`label`/`storageKey`/`defaultUrl`/`defaultTable`. Danh sách cột, nhãn, kiểu nhập liệu, sort mặc định, cấp nhóm dòng... đọc động từ `cf_field_config` (`TableName = "db_hopdongban"`).
- **`index.ts`** — export mảng `MODULES` để `App.svelte`/`Sidebar` lặp qua sinh menu. **Thêm module mới** (VD: Hợp đồng mua) chỉ cần tạo một file cấu hình tương tự `sales-contracts.ts`, thêm vào mảng này, rồi thêm các dòng field tương ứng vào `cf_field_config` (`TableName` = tên bảng module đó) — không phải sửa gì trong `App.svelte`, `AppShell` hay `Sidebar`.

### Tầng gọi dữ liệu (`lib/services/supabase-rest.ts`)

Một client REST tối giản, **không phụ thuộc SDK Supabase**, chỉ dùng `fetch` thuần:

- `restBase(url)` — chuẩn hoá URL người dùng nhập (project URL hoặc URL REST đầy đủ) thành dạng `<project>/rest/v1`.
- `requestHeaders(publicKey)` — header cố định cho mọi request: `apikey`, `Content-Type: application/json`, và `Prefer: return=representation` (yêu cầu Supabase trả lại bản ghi vừa tạo/sửa thay vì rỗng).
- `request(url, options)` — wrapper `fetch` dùng chung: ném lỗi kèm nội dung response nếu status không `ok`, còn nếu body rỗng (trường hợp DELETE) thì trả về mảng rỗng thay vì lỗi parse JSON.
- `createSupabaseRestClient<T = DataRecord>(config)` — trả về object có 4 hàm ứng với 4 thao tác CRUD, đều thao tác trên một bảng (`config.table`), generic theo kiểu dòng trả về để dùng lại được cho cả bảng dữ liệu lẫn `cf_field_config` (xem `field-config-service.ts`):
  - `list(query?)` — `GET ?select=*`, nối thêm `query` (filter/order, vd. `"TableName=eq.x&order=DefaultFieldOrderIndex.asc"`) nếu có.
  - `create(payload)` — `POST` kèm `?select=*` để lấy lại bản ghi (và `id`) vừa tạo.
  - `update(id, payload)` — `PATCH ?id=eq.<id>&select=*`.
  - `remove(id)` — `DELETE ?id=eq.<id>`.

Toàn bộ phân quyền (ai được đọc/ghi cột nào) do **Row Level Security** phía Supabase quyết định; public key chỉ định danh app, không phải cấp quyền.

### Tầng cấu hình cột (`lib/services/field-config-service.ts`)

- `loadFieldConfig(config, tableName)` — gọi `createSupabaseRestClient<FieldConfigRow>({ ...config, table: "cf_field_config" })`, lọc theo `TableName=eq.<tableName>&order=DefaultFieldOrderIndex.asc`, rồi map từng `FieldConfigRow` (PascalCase, đúng tên cột Supabase) sang `FieldConfig` (camelCase, dùng trong UI): `SuggestForSelect` (Postgres `text[]`, có thể `null`) → `suggestOptions: string[]` (mặc định `[]`), `FilterType` → `filterKind` chuyển chữ thường, `DefaultFieldColumnWidth`/`DefaultCustomStyleForColumn` → `columnWidth`/`customStyle` (giữ `null` nếu trống), `DefaultSortOrder` (`[STT, hướng]`) → `defaultSortPriority`/`defaultSortDirection`, `DefaultRowGroupOrder` → `groupOrder`, `Label` rỗng thì dùng tạm `FieldName`.
- Dùng chung `ConnectionConfig` (URL/key) đã cấu hình sẵn cho module — `cf_field_config` nằm cùng project Supabase, chỉ khác tên bảng.

### Tiện ích định dạng (`lib/utils/data-view-format.ts`)

- `hasValue(value)` — coi `null`/`undefined`/chuỗi rỗng là "không có giá trị" (dùng để tô màu ô rỗng, so sánh khi sắp xếp...).
- `columnWidthStyle(field)` — style CSS `width`/`min-width` theo `field.columnWidth`, áp cho cả `<th>` lẫn `<td>` để cột đồng bộ chiều rộng; `columnWidth = null` giữ hành vi tự co giãn theo nội dung.
- `formatValue(value, config: FieldConfig)` — hiển thị ô dữ liệu theo `config.type`: `—` nếu rỗng, thêm hậu tố `đ` và định dạng số Việt Nam nếu `Currency`, nhân 100 và thêm `%` nếu `Percent`, định dạng `dd/mm/yyyy` nếu `Date`, thêm giờ `HH:mm` nếu `DateTime`, nối lại bằng `", "` nếu là `MultiSelect...` (giá trị lưu trong Supabase dạng chuỗi nối `;`), còn lại hiển thị nguyên văn.

### Tiện ích sắp xếp (`lib/utils/data-view-sort.ts`)

Dùng chung giữa sort phẳng (`DataViewManager`) và sort dòng lá trong từng nhóm (`data-view-grouping.ts`):

- `compareValues(left, right, field)` — so sánh 2 giá trị ô theo kiểu field: cột số (`isNumericType`) so bằng phép trừ, còn lại `localeCompare` tiếng Việt (`numeric: true` để so đúng thứ tự chuỗi có số); giá trị rỗng luôn xuống cuối.
- `sortRows(rows, sortFields, fieldConfigs)` — áp dụng lần lượt các cột trong `sortFields`, phần tử đầu có ưu tiên cao nhất (so cột đầu trước, bằng nhau mới xét cột sau).

### Tiện ích bộ lọc (`lib/utils/data-view-filters.ts`)

Phục vụ panel bộ lọc ở tab Danh sách. **Kiểu lọc (`FilterType`) đọc thẳng từ `filterKind` của `FieldConfig`** (cột `FilterType` trong `cf_field_config`) — không suy luận từ dữ liệu.

| `filterKind` | Điều khiển trong `DataViewFilters.svelte` |
| --- | --- |
| `"date"` | Hai ô `<input type="date">` (từ/đến) |
| `"numeric"` | Hai ô `<input type="number">` (từ/đến) |
| `"select"` | Danh sách cuộn dọc kiểu Slicer Excel, chọn được nhiều giá trị |
| `"text"` | Ô nhập tìm theo chuỗi con, không phân biệt hoa/thường |
| `"none"` | Không hiện thẻ lọc nào cho cột này |

Chi tiết từng hàm:

- `distinctValues(rows, field)` — liệt kê các giá trị khác nhau (không rỗng, đã tách theo `;`) của một cột, sắp xếp theo `localeCompare` tiếng Việt.
- `computeFilterFields(fieldConfigs, rows, filters)` — tính trước `{ field, label, kind, options }` cho từng cột. Với kind `"select"`, các bộ lọc **liên kết với nhau kiểu slicer Excel**: `options` của một cột chỉ gồm giá trị xuất hiện ở những dòng đã khớp *mọi bộ lọc còn lại* (trừ chính cột đó) — thuật toán duyệt `rows` đúng một lượt, đếm cho mỗi dòng số cột không khớp, để tránh độ phức tạp bậc 2 theo số cột select. `options` giữ nguyên thứ tự đã cấu hình trong `suggestOptions` (nhiều field dùng thứ tự có ý nghĩa như quy trình xử lý, không phải bảng chữ cái) rồi nối thêm giá trị thực tế chưa có trong `suggestOptions` (sắp alphabet).
- `encodeSelectValues`/`decodeSelectValues` — vì một cột `"select"` có thể chọn **nhiều** giá trị cùng lúc, giá trị lọc lưu dưới dạng chuỗi JSON của mảng (thay vì một chuỗi đơn như các kiểu lọc khác) trong cùng một object `ColumnFilters: Record<string, string>`.
- `isFilterActive`/`countActiveFilters` — xác định một cột có đang được lọc hay không (date/numeric xét cặp khoá `field::from`/`field::to` hoặc `field::min`/`field::max`; select xét mảng đã giải mã có phần tử hay không), rồi đếm số **cột** đang lọc để hiện lên nút "Xóa N bộ lọc".
- `matchesFilters(row, filters, filterFields)` — hàm khớp lọc chính, `filterFields.every(...)`: một dòng phải thoả **tất cả** cột đang lọc mới được giữ lại (AND giữa các cột; trong một cột select thì các giá trị đã chọn kết hợp OR với các phần tử tách `;` trong ô).

### Tiện ích nhóm dòng (`lib/utils/data-view-grouping.ts`)

Dựng cây nhóm dòng (row grouping / treeview) cho bảng danh sách, dựa trên `FieldConfig.groupOrder` (cột `DefaultRowGroupOrder` trong `cf_field_config`):

- `groupFieldsFrom(fieldConfigs)` — lọc field có `groupOrder != null`, sắp tăng dần (số nhỏ = cấp nhóm ngoài cùng). Field kiểu MultiSelect bị loại khỏi nhóm (chỉ cảnh báo console, không throw) vì một dòng có thể thuộc nhiều giá trị cùng lúc — mơ hồ khi làm cấp nhóm.
- `buildRowGroupTree(rows, groupFields, sortFields, fieldConfigs)` — dựng cây `GroupNode[]` đệ quy theo từng cấp field nhóm; không field nào tham gia nhóm thì trả về đúng 1 node `"leaf"` chứa toàn bộ dòng đã sort, để phía render (`DataViewTable`) luôn có một cây hợp lệ, không cần rẽ nhánh có-nhóm/không-nhóm. Thứ tự các nhóm với nhau **cố định theo giá trị field nhóm** (dùng lại `compareValues`, nhóm rỗng luôn xuống cuối); `sortFields` chỉ áp dụng để sắp các dòng lá **bên trong** mỗi nhóm lá cuối cùng.

### `features/data-view/DataViewManager.svelte` — nơi giữ state và logic

Component quan trọng nhất, nhận prop `module: DataModuleConfig` rồi tự vận hành toàn bộ vòng đời của một bảng dữ liệu:

**State chính:**
`rows` (dữ liệu thô từ Supabase), `fieldConfigs` (cột hiện có, đọc từ `cf_field_config`), `sortFields`, `config` (kết nối, đọc từ `localStorage` theo `module.storageKey` lúc `onMount`), `filters` (cũng lưu/đọc `localStorage`, khoá riêng `${module.storageKey}:filters`), `showFilters`, `selectedRow` (dòng đang chọn trong bảng), `editRecord`/`formValues` (đang thêm/sửa), `deleteRecord` (đang chờ xác nhận xoá).

**Các giá trị dẫn xuất (`$:`), tính lại tự động mỗi khi state đổi:**
`displayFields` (cột có `DefaultDisplayField = true`) → `filterFields` (kiểu lọc từng cột, bỏ cột `id` và field `filterKind === "none"`) → `activeFilterCount` → `filteredRows` (lọc theo `filters`) → `sortedRows` (sắp theo `sortFields`, dùng cho bảng phẳng) → `groupFields`/`groupTree` (cây nhóm dựng từ `filteredRows`, `sortFields` chỉ sắp dòng lá trong từng nhóm). Chuỗi này đảm bảo **lọc luôn chạy trước sắp xếp/nhóm**.

**Các hàm nghiệp vụ đáng chú ý:**

- `loadFieldConfigs()` — gọi `loadFieldConfig()`, và nếu người dùng chưa tự chọn sort nào thì áp `defaultSortFieldsFrom()` (đọc `DefaultSortOrder` từ cấu hình cột).
- `loadRows()` — gọi `api.list()` để tải toàn bộ bản ghi qua Supabase REST.
- `nextAvailableId()` — quét toàn bộ `id` hiện có, trả về **số nguyên dương nhỏ nhất chưa dùng** (lấp khoảng trống nếu có hồ sơ đã xoá; nếu không có khoảng trống thì tương đương max + 1).
- `openCreate()` — mở modal thêm mới, tự gán sẵn `formValues.id` bằng `nextAvailableId()` — người dùng **không tự nhập id**, khác với `openEdit()` chỉ đổ nguyên bản ghi đang sửa vào `formValues`.
- `saveRecord()` — chuẩn hoá `formValues` trước khi gửi: chuỗi rỗng/`undefined` → `null`, cột số → ép kiểu `Number`; gọi `update` nếu đang sửa, `create` nếu đang thêm; nếu sửa mà Supabase trả về mảng rỗng thì coi là lỗi quyền (RLS) hoặc sai `id`.
- `toggleSort(field)` — bấm vào một cột sẽ luân phiên **tăng dần → giảm dần → tắt**; thứ tự các cột trong `sortFields` quyết định độ ưu tiên khi sắp nhiều cột.
- `updateFilter`/`clearFilters` — cập nhật/xoá object `filters` theo khoá (khoá có thể là tên cột thẳng, hoặc `field::from`, `field::min`... tuỳ kiểu lọc).

### `DataViewTable.svelte` / `DataViewTableGroupRows.svelte` — bảng danh sách

- **Chọn dòng để sửa, không có nút nổi theo từng dòng:** bấm một dòng để chọn (tô nền), bấm lại để bỏ chọn (`selectedRow`/`onSelectRow`). Nút "Sửa" thao tác trên dòng đang chọn nằm ở **thanh công cụ chung** phía trên bảng (`DataViewManager.svelte`), không phải trong bảng — đơn giản hơn hẳn cách làm nút nổi `position: absolute` theo từng dòng của phiên bản trước.
- Header mỗi cột là một nút bấm để gọi `onToggleSort`, hiện mũi tên ↑/↓ kèm số thứ tự ưu tiên nếu đang sắp nhiều cột.
- `DataViewTable.svelte` chỉ vẽ khung bảng (header, các trạng thái rỗng/tải/lỗi) và giao việc vẽ thân bảng cho `DataViewTableGroupRows.svelte`, component tự gọi đệ quy chính nó (`<svelte:self>`) để vẽ từng cấp của cây nhóm (`GroupNode[]`, từ `data-view-grouping.ts`):
  - Node `"group"` vẽ thành một dòng tiêu đề (nhãn cột + giá trị + số hồ sơ), bấm để thu gọn/mở rộng (`collapsedKeys`, chỉ tồn tại trong phiên — không lưu `localStorage`, mặc định mở hết); màu nền dòng nhóm đậm/nhạt dần theo độ sâu lồng nhau.
  - Node `"leaf"` vẽ các `<tr>` dữ liệu thật, tô nền khi trùng `selectedRow`.
  - Module không cấu hình `DefaultRowGroupOrder` nào (mặc định `null` hết) sẽ chỉ nhận đúng 1 node `"leaf"` — hiển thị y hệt một bảng phẳng, không có cột thu gọn nhóm.

### `DataViewFilters.svelte` — panel bộ lọc

Nhận `filterFields` (đã tính sẵn ở `DataViewManager`) và render mỗi cột thành một **thẻ lọc rộng cố định**, xếp thành hàng ngang trong một container `overflow-x-auto` (cuộn ngang khi nhiều cột, thay vì đẩy nội dung xuống nhiều dòng). Bốn nhánh `{#if kind === ...}` tương ứng bảng kiểu lọc ở phần tiện ích bên trên; riêng nhánh `"select"` là danh sách nút bấm để bật/tắt từng lựa chọn (kiểu Slicer), tô nền màu khi đang được chọn.

### `DataViewFormModal.svelte` — modal thêm/sửa

Render **động** một `<label>` + ô nhập cho mỗi cột trong `visibleFields` (tức `fieldConfigs` trừ `id` — cột `id` không bao giờ cho sửa tay, hồ sơ mới lấy id tự động từ `DataViewManager`). Loại ô nhập chọn theo `field.type`: `textarea` cho `LongText`, `SelectCombobox` cho mọi field `isSelectType` (đơn/nhiều, có/không cho gõ tự do tuỳ `allowsCustomValue`), `input type="date"`/`"datetime-local"` cho `Date`/`DateTime`, `type="number"` cho các cột số, còn lại là `text`. Tiêu đề modal hiện `"Sửa hồ sơ #<id>"` hoặc `"Thêm hồ sơ #<id>"` (id đã được tự gán sẵn) tuỳ theo có `editRecord` hay không; nút "Xóa hồ sơ" chỉ hiện khi đang sửa.

### `StatCards.svelte` — thẻ số liệu tổng quan

Hai thẻ tĩnh: tổng số hồ sơ và trạng thái đồng bộ — dữ liệu tính sẵn ở `DataViewManager` và truyền vào qua props, component này không tự tính toán gì.

### `ConnectionSettingsPanel.svelte` — cấu hình kết nối

Form nhập URL Supabase, public key (ô `type="password"` để tránh lộ khi ai đó nhìn màn hình), và tên bảng. Khi submit, `DataViewManager.saveSettings()` sẽ ghi vào `localStorage` theo khoá riêng của từng module (`module.storageKey`) rồi tự chuyển sang tab Danh sách và tải lại dữ liệu — **thông tin này không bao giờ được đưa vào mã nguồn hay build**, chỉ tồn tại trên trình duyệt của người dùng.

## Cấu hình build & triển khai

- **`vite.config.js`** — `base` là `/QL_HopDongBan/` khi build (khớp đường dẫn GitHub Pages của repo này) hoặc `/` khi chạy dev; có thể ghi đè bằng biến môi trường `BASE_PATH`. `build.outDir` trỏ thẳng ra `docs/` (thay vì `dist/` mặc định) để GitHub Pages có thể phục vụ trực tiếp từ thư mục `docs` trên nhánh `main` mà không cần workflow CI riêng. Alias `$lib` trỏ tới `src/lib` (dùng trong toàn bộ import `$lib/...`).
- **`svelte.config.js`** — chỉ bật `vitePreprocess()` để Vite lo phần tiền xử lý (TypeScript, PostCSS...) trong file `.svelte`.
- **`tsconfig.json`** — bật `strict`, khai báo lại alias `$lib` cho riêng trình kiểm tra kiểu (TypeScript không tự đọc alias từ `vite.config.js`), `noEmit: true` vì Vite mới là công cụ build thật sự.
- **`index.html`** — khung HTML tối giản, chỉ có `<div id="app">` và thẻ nạp `src/main.ts`.

### Triển khai GitHub Pages

Đường dẫn build hiện được đặt cứng theo repository `QL_HopDongBan` (`/QL_HopDongBan/`). Nếu đổi tên repository hoặc dùng custom domain, cập nhật biến `BASE_PATH` tương ứng (đặt thành `/` khi dùng custom domain) rồi build lại — thư mục `docs/` sinh ra chính là nội dung deploy lên GitHub Pages (cấu hình Pages trỏ vào thư mục `docs` trên nhánh `main`).

## Hệ thống cấu hình cột theo dữ liệu (`cf_field_config`)

Ba bảng trên Supabase điều khiển toàn bộ hành vi cột của mọi module dữ liệu — không có cấu hình cột nào khai báo cứng trong TypeScript. Đây là schema tham chiếu để dựng lại/mở rộng database (khớp đúng `FieldConfigRow` trong [`src/lib/types/field-config.ts`](src/lib/types/field-config.ts) — nguồn xác thực duy nhất, vì code map thẳng theo tên cột này).

### `cf_field_config` — một dòng cho mỗi cột của một bảng module

| Cột | Kiểu Postgres | Bắt buộc | Ý nghĩa |
| --- | --- | --- | --- |
| `id` | `bigint`, identity | PK | Khoá chính tự tăng, không liên quan tới `id` của bảng dữ liệu module. |
| `TableName` | `text` | ✅ | Tên bảng dữ liệu thật trên Supabase mà dòng cấu hình này mô tả (vd. `"db_hopdongban"`) — mọi truy vấn đọc cấu hình đều lọc theo cột này (`module.defaultTable`). |
| `DefaultFieldOrderIndex` | `bigint`, null | | Thứ tự cột trong **form** thêm/sửa (và cũng là thứ tự tải về mặc định của `fieldConfigs`); số nhỏ đứng trước. |
| `FieldName` | `text` | ✅ | Tên cột kỹ thuật, phải khớp đúng tên cột trong bảng dữ liệu thật của module (vd. `"KhuVucKV"`, `"GiaTriHS"`). |
| `Label` | `text` | ✅ | Nhãn tiếng Việt hiển thị cho người dùng; nếu để rỗng, UI dùng tạm `FieldName`. |
| `DefaultDisplayField` | `boolean` | ✅ | `true` = hiện trong bảng danh sách (`displayFields`). Cột `id` của module thường đặt `false` — form vẫn luôn thấy mọi field trừ `id`. |
| `FieldType` | `text` (FK → `cf_field_type.FieldType`) | ✅ | Một trong 11 giá trị — xem bảng danh mục bên dưới. Quyết định control nhập liệu, cách format hiển thị, và cột có phải kiểu số không. |
| `FilterType` | `text` (FK → `cf_filter_type.FilterType`) | ✅ | Một trong 5 giá trị — xem bảng danh mục bên dưới. Quyết định loại điều khiển lọc render trong `DataViewFilters`. |
| `DefaultFieldColumnWidth` | `smallint`, null | | Chiều rộng cột cố định (px) trong bảng danh sách. `null` = tự co giãn theo nội dung. |
| `DefaultCustomStyleForColumn` | `text`, null | | CSS inline thuần áp trực tiếp qua `style` của ô dữ liệu, vd. `"background-color:#dcfce7; color:#166534; font-weight:bold"` — **không phải** class Tailwind. |
| `SuggestForSelect` | `text[]`, null | | Mảng Postgres thật (không phải chuỗi nối `;`) — danh sách gợi ý cho field kiểu select, giữ nguyên thứ tự cấu hình (nhiều field dùng thứ tự có ý nghĩa như quy trình xử lý, không phải bảng chữ cái). Bỏ trống/`null` nếu field không phải kiểu select. |
| `DefaultSortOrder` | mảng 2 phần tử số nguyên (`[STT, hướng]`), null | | Sort mặc định khi mở bảng lần đầu (trước khi người dùng tự bấm sort): phần tử 1 = thứ tự ưu tiên (số nhỏ ưu tiên trước), phần tử 2 = hướng (`0 = asc`, `1 = desc`). `null` = field không tham gia sort mặc định. |
| `DefaultRowGroupOrder` | `smallint`/`bigint`, null | | Cấp nhóm dòng (treeview) trong bảng danh sách — số nguyên đơn, **không phải tuple**. Số nhỏ = cấp nhóm ngoài cùng, số lớn = cấp lồng bên trong; `null` = field không tham gia nhóm dòng. Field kiểu MultiSelect bị bỏ qua dù có set giá trị này (ứng dụng chỉ cảnh báo console, không lỗi). |

Ví dụ một dòng cấu hình đầy đủ (field tiền tệ, hiện trong bảng, lọc theo khoảng số, sort ưu tiên 1 giảm dần, không nhóm):

```json
{
  "TableName": "db_hopdongban",
  "FieldName": "GiaTriHS",
  "Label": "Giá trị hồ sơ",
  "DefaultFieldOrderIndex": 8,
  "DefaultDisplayField": true,
  "FieldType": "Currency",
  "FilterType": "Numeric",
  "DefaultFieldColumnWidth": 120,
  "DefaultCustomStyleForColumn": null,
  "SuggestForSelect": null,
  "DefaultSortOrder": [1, 1],
  "DefaultRowGroupOrder": null
}
```

### `cf_field_type` — danh mục 11 giá trị hợp lệ của cột `FieldType`

`Text`, `LongText`, `Numeric`, `Percent`, `SingleSelectWithoutOther`, `SingleSelectWithOther`, `MultiSelectWithoutOther`, `MultiSelectWithOther`, `Date`, `DateTime`, `Currency`.

`...WithOther` = combobox chọn từ `SuggestForSelect` **hoặc** gõ giá trị mới tự do (creatable); `...WithoutOther` = chỉ được chọn trong danh sách gợi ý.

### `cf_filter_type` — danh mục 5 giá trị hợp lệ của cột `FilterType`

`Date`, `Numeric`, `Select`, `Text`, `None` (`None` = field không có ô lọc nào trong `DataViewFilters`).

`cf_field_type`/`cf_filter_type` chỉ dùng làm **ràng buộc khoá ngoại** phía Supabase (chống nhập sai chính tả khi thêm dòng cấu hình mới) — app front-end không truy vấn tới 2 bảng này, vì các union type `FieldType`/`FilterType` tương ứng đã khai báo sẵn phía TypeScript ([`src/lib/types/field-config.ts`](src/lib/types/field-config.ts)).

## Cách thêm một module dữ liệu mới

1. Tạo file cấu hình mới trong `src/lib/constants/modules/`, mô phỏng theo `sales-contracts.ts`: đặt `id`, `label`, `storageKey` riêng, `defaultUrl`/`defaultTable`.
2. Thêm object đó vào mảng `MODULES` trong `src/lib/constants/modules/index.ts`.
3. Thêm các dòng cấu hình cột tương ứng vào bảng `cf_field_config` trên Supabase (`TableName` = tên bảng dữ liệu của module đó).
4. Không cần sửa gì thêm — `App.svelte`, `Sidebar`, `DataViewManager` và toàn bộ UI đều đọc theo `MODULES`/`cf_field_config` một cách tổng quát.
