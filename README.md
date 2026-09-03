# Quản lý hợp đồng bán

Ứng dụng Svelte 5 + Vite + TypeScript, xuất tĩnh (static site) để triển khai trên GitHub Pages. Ứng dụng không có backend riêng — dữ liệu đọc/ghi trực tiếp từ trình duyệt tới một bảng **Supabase** qua REST API, dùng public key do người dùng tự nhập và lưu trong `localStorage` của máy họ. Toàn bộ quyền đọc/ghi thực sự do Supabase Row Level Security (RLS) kiểm soát, không phải do mã nguồn front-end.

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
├── App.svelte                       # Component gốc: sidebar + nội dung module đang chọn
├── app.css                          # Import Tailwind + style nền cho label/input/select dùng chung
├── lib/
│   ├── types/
│   │   ├── contracts.ts             # Kiểu dữ liệu chung (ContractRecord, ConnectionConfig, ContractModuleConfig...)
│   │   └── field-config.ts          # FieldType/FilterType + FieldConfig (shape cột đọc từ cf_field_config)
│   ├── constants/modules/
│   │   ├── sales-contracts.ts       # Khai báo module "Hợp đồng bán": kết nối Supabase + sort mặc định
│   │   └── index.ts                 # Danh sách MODULES hiển thị trong sidebar
│   ├── services/
│   │   ├── supabase-rest.ts         # Client REST tối giản gọi Supabase (list/create/update/remove), generic theo bảng
│   │   └── field-config-service.ts  # Tải cấu hình cột từ cf_field_config theo TableName
│   ├── utils/
│   │   ├── contract-format.ts       # Định dạng ô dữ liệu (ngày/giờ/tiền tệ/phần trăm/multi-select) + kiểm tra rỗng
│   │   └── contract-filters.ts      # Tính FilterField theo FieldConfig + hàm khớp lọc
│   └── components/
│       ├── layout/
│       │   ├── AppShell.svelte      # Khung ngoài cùng: sidebar cố định + vùng nội dung
│       │   └── Sidebar.svelte       # Điều hướng module, badge trạng thái kết nối
│       └── ui/
│           ├── Button.svelte        # Nút dùng chung, gom các biến thể màu/kích thước
│           ├── Modal.svelte         # Khung dialog nền mờ dùng chung
│           ├── ConfirmDialog.svelte # Hộp thoại xác nhận (dựa trên Modal)
│           ├── Badge.svelte         # Chip trạng thái có chấm màu
│           └── SelectCombobox.svelte # Combobox chọn 1/nhiều lựa chọn, cho gõ tự do tuỳ `allowCustom`
└── features/contracts/
    ├── ContractManager.svelte       # "Nhạc trưởng" của một module: state + toàn bộ logic nghiệp vụ
    ├── ContractTable.svelte         # Bảng danh sách hồ sơ, sắp xếp, nút Sửa nổi
    ├── ContractFilters.svelte       # Panel bộ lọc theo cột (dạng slicer/khoảng/tìm chuỗi)
    ├── ContractFormModal.svelte     # Modal thêm/sửa một hồ sơ
    ├── StatCards.svelte             # 3 thẻ số liệu nhanh ở tab Tổng quan
    └── ConnectionSettingsPanel.svelte # Form nhập URL/API key/tên bảng Supabase
```

## Kiến trúc tổng quan

Ứng dụng được thiết kế để **tổng quát cho nhiều "module dữ liệu"** (nhiều bảng Supabase khác nhau, ví dụ Hợp đồng bán, Hợp đồng mua...) mà không phải viết lại UI cho từng module. Cách làm: `ContractModuleConfig` chỉ còn giữ thông tin **cấp module** (kết nối Supabase, sort mặc định, cột tính tổng) — mọi thứ **theo từng cột** (tên trường, nhãn hiển thị, kiểu nhập liệu, cách lọc, hiển thị mặc định, thứ tự, độ rộng, style) đọc **động** từ bảng Supabase `cf_field_config` (lọc theo `TableName = module.defaultTable`), UI chỉ đọc `FieldConfig[]` trả về để tự sinh giao diện. Thêm/sửa/ẩn một cột chỉ cần sửa dữ liệu trong Supabase, không cần sửa code hay deploy lại.

```
App.svelte
 └─ AppShell (sidebar dùng chung, đọc MODULES để sinh menu)
     └─ ContractManager (mount lại mỗi khi đổi module, nhờ {#key activeModuleId})
         ├─ Tab "Tổng quan" → StatCards
         ├─ Tab "Danh sách" → ContractFilters + ContractTable
         ├─ Tab "Cài đặt"  → ConnectionSettingsPanel
         ├─ ContractFormModal (thêm/sửa, hiện đè lên khi editRecord !== undefined)
         └─ ConfirmDialog (xác nhận xóa)
```

`ContractManager.svelte` là nơi giữ toàn bộ **state** (danh sách bản ghi, bộ lọc, sắp xếp, trạng thái kết nối...) và **logic** (gọi Supabase, tính bản ghi đã lọc/sắp xếp, tính id tự động...). Các component còn lại trong `features/contracts/` thuần hiển thị — nhận dữ liệu qua props và báo sự kiện ra ngoài qua các callback prop dạng `onXxx` (quy ước xuyên suốt dự án, thay vì dùng `createEventDispatcher`).

### Vì sao cột dữ liệu không hard-code trong component?

`ContractManager` giữ hai danh sách cột, cả hai đều dẫn xuất từ `fieldConfigs: FieldConfig[]` (tải từ `cf_field_config` lúc `onMount`, xem `loadFieldConfigs()`):

- `fieldConfigs` — toàn bộ cột đã cấu hình cho module (theo `TableName`), sắp theo `FieldOrderIndex`. Dùng cho form nhập liệu (`ContractFormModal`) — sửa hồ sơ cần thấy đủ mọi field, kể cả field không hiện trong bảng.
- `displayFields` — chỉ những cột có `DefaultDisplayField = true`, dùng cho bảng danh sách (`ContractTable`).

Việc một cột thuộc kiểu nào (số/tiền tệ/phần trăm/văn bản dài/ngày/ngày giờ/select...) đọc thẳng từ cột `FieldType` của `cf_field_config` (xem `$lib/types/field-config.ts`), không còn Set tên cột khai báo tay trong file module nữa.

## Giải thích chi tiết từng phần

### Điểm khởi động

- **`index.html`** — có một `<div id="app">` và nạp `src/main.ts` làm module.
- **`src/main.ts`** — gọi `mount(App, { target })` của Svelte 5 để render `App.svelte` vào `#app`.
- **`src/App.svelte`** — component gốc. Đọc danh sách `MODULES`, dựng `navItems` cho sidebar, giữ `activeModuleId` (module đang chọn). Bọc `ContractManager` trong khối `{#key activeModuleId}` để **buộc Svelte huỷ và tạo lại component** mỗi khi đổi module — nhờ vậy state cũ (bộ lọc, trang đang sửa...) của module trước không bị rò rỉ sang module sau. `connected`/`connectionLabel` được `bind:` hai chiều từ `ContractManager` lên để `AppShell` hiển thị badge trạng thái kết nối chung trên mọi tab.

### Layout dùng chung (`lib/components/layout`)

- **`AppShell.svelte`** — khung ngoài cùng: sidebar cố định bên trái (ẩn thành drawer trượt trên mobile, đóng/mở qua state `sidebarOpen` cục bộ) + một topbar mỏng chỉ hiện trên mobile (nút ☰ mở drawer) + vùng nội dung chính chứa `<slot />`.
- **`Sidebar.svelte`** — danh sách module (props `items`), mục đang chọn tô nổi bật theo `active`. Có hai icon SVG inline (dữ liệu/cài đặt) chọn theo `item.icon`. Dưới cùng hiển thị `Badge` trạng thái kết nối.

### UI dùng chung (`lib/components/ui`)

- **`Button.svelte`** — một component nút duy nhất cho toàn app, gom biến thể `default | primary | danger | icon | ghost` thành các class Tailwind tương ứng, tránh lặp style ở từng nơi gọi.
- **`Modal.svelte`** — khung dialog dùng chung: nền mờ toàn màn hình, bấm ra ngoài (`on:click|self`) để đóng, `size` (`sm | md | lg`) quyết định `max-width`. Nội dung thực tế do `<slot />` của nơi gọi cung cấp.
- **`ConfirmDialog.svelte`** — dựng trên `Modal` (size `sm`), dùng cho các thao tác không thể hoàn tác (hiện tại là xóa hồ sơ).
- **`Badge.svelte`** — chip nhỏ có chấm màu theo `tone` (`success | warning | danger | neutral`), dùng cho trạng thái kết nối/đồng bộ.

### Style dùng chung (`src/app.css`)

Khai báo bảng màu thương hiệu `--color-primary-*` qua `@theme` của Tailwind v4, rồi dùng `@layer base` để đặt sẵn style mặc định cho các thẻ HTML gốc thay vì lặp lại class ở từng input trong từng component:

- `label` → chữ nhỏ, đậm, màu slate.
- `input`, `textarea`, `select` → khung bo góc, viền, padding, và style `:focus` (viền + ring xanh) đồng nhất trên toàn app.

Nhờ vậy các form (`ContractFormModal`, `ConnectionSettingsPanel`, `ContractFilters`) chỉ cần thêm class layout (`mt-1.5`, độ rộng...) mà không phải khai báo lại toàn bộ style input mỗi nơi.

### Khai báo kiểu dữ liệu (`lib/types/contracts.ts`)

File trung tâm định nghĩa các kiểu dùng xuyên suốt:

- `ContractValue` — kiểu một ô dữ liệu (`string | number | boolean | null | undefined`).
- `ContractRecord` — một bản ghi, có `id` bắt buộc, còn lại là index signature `[field: string]: ContractValue` vì cột lấy động từ Supabase.
- `ConnectionConfig` — `{ url, publicKey, table }`, lưu trong `localStorage`.
- `SortField`/`SortDirection` — một quy tắc sắp xếp (cột + hướng).
- `ContractModuleConfig` — khai báo một module ở **cấp module** (không còn danh sách cột): id, nhãn, `storageKey` (khoá localStorage riêng), URL/tên bảng Supabase mặc định, `defaultSortFields` (sort mặc định), và `totalValueField` (tên cột tính tổng cho thẻ "Giá trị", không có tương đương trong `cf_field_config` vì đây là cấu hình tổng hợp cấp module chứ không lặp lại theo từng field).

### Khai báo cấu hình cột (`lib/types/field-config.ts`)

Kiểu dữ liệu cho hệ thống cấu hình cột **động**, đọc từ bảng Supabase `cf_field_config` — thay thế hoàn toàn `ModuleFieldConfig`/`defaultFields` khai báo cứng trước đây:

- `FieldType` — union 11 giá trị: `Text`, `LongText`, `Numeric`, `Percent`, `SingleSelectWithoutOther`, `SingleSelectWithOther`, `MultiSelectWithoutOther`, `MultiSelectWithOther`, `Date`, `DateTime`, `Currency`.
- `FilterType` — union 4 giá trị chữ thường (`"date" | "numeric" | "select" | "text"`) — `cf_field_config` lưu PascalCase, `field-config-service.ts` chuyển chữ thường lúc parse.
- `FieldConfigRow` — raw shape trả về từ PostgREST, khớp đúng tên cột thật của `cf_field_config`.
- `FieldConfig` — shape runtime đã parse (`field, label, type, defaultDisplay, suggestOptions, filterKind, columnWidth, customStyle, orderIndex`), dùng xuyên suốt UI.
- Hàm predicate dùng chung: `isNumericType`, `isDateType`, `isMultiSelectType`, `isSelectType`, `allowsCustomValue` (field `...WithOther` cho gõ giá trị tự do ngoài `suggestOptions`, `...WithoutOther` thì không).

### Khai báo module dữ liệu (`lib/constants/modules`)

- **`sales-contracts.ts`** — cấu hình cụ thể cho bảng `db_hopdongban`: chỉ còn `id`/`label`/`storageKey`/`defaultUrl`/`defaultTable`/`defaultSortFields` (mặc định sắp theo Số hợp đồng rồi Loại HS)/`totalValueField` (`GiaTriHS`). Danh sách cột, nhãn, kiểu nhập liệu... đọc động từ `cf_field_config` (`TableName = "db_hopdongban"`).
- **`index.ts`** — export mảng `MODULES` để `App.svelte`/`Sidebar` lặp qua sinh menu. **Thêm module mới** (VD: Hợp đồng mua) chỉ cần tạo một file cấu hình tương tự `sales-contracts.ts`, thêm vào mảng này, rồi thêm các dòng field tương ứng vào `cf_field_config` (`TableName` = tên bảng module đó) — không phải sửa gì trong `App.svelte`, `AppShell` hay `Sidebar`.

### Tầng gọi dữ liệu (`lib/services/supabase-rest.ts`)

Một client REST tối giản, **không phụ thuộc SDK Supabase**, chỉ dùng `fetch` thuần:

- `restBase(url)` — chuẩn hoá URL người dùng nhập (project URL hoặc URL REST đầy đủ) thành dạng `<project>/rest/v1`.
- `requestHeaders(publicKey)` — header cố định cho mọi request: `apikey`, `Content-Type: application/json`, và `Prefer: return=representation` (yêu cầu Supabase trả lại bản ghi vừa tạo/sửa thay vì rỗng).
- `request(url, options)` — wrapper `fetch` dùng chung: ném lỗi kèm nội dung response nếu status không `ok`, còn nếu body rỗng (trường hợp DELETE) thì trả về mảng rỗng thay vì lỗi parse JSON.
- `createSupabaseRestClient<T = ContractRecord>(config)` — trả về object có 4 hàm ứng với 4 thao tác CRUD, đều thao tác trên một bảng (`config.table`), generic theo kiểu dòng trả về để dùng lại được cho cả bảng dữ liệu lẫn `cf_field_config` (xem `field-config-service.ts`):
  - `list(query?)` — `GET ?select=*`, nối thêm `query` (filter/order, vd. `"TableName=eq.x&order=FieldOrderIndex.asc"`) nếu có.
  - `create(payload)` — `POST` kèm `?select=*` để lấy lại bản ghi (và `id`) vừa tạo.
  - `update(id, payload)` — `PATCH ?id=eq.<id>&select=*`.
  - `remove(id)` — `DELETE ?id=eq.<id>`.

Toàn bộ phân quyền (ai được đọc/ghi cột nào) do **Row Level Security** phía Supabase quyết định; public key chỉ định danh app, không phải cấp quyền.

### Tầng cấu hình cột (`lib/services/field-config-service.ts`)

- `loadFieldConfig(config, tableName)` — gọi `createSupabaseRestClient<FieldConfigRow>({ ...config, table: "cf_field_config" })`, lọc theo `TableName=eq.<tableName>&order=FieldOrderIndex.asc`, rồi map từng `FieldConfigRow` (PascalCase, đúng tên cột Supabase) sang `FieldConfig` (camelCase, dùng trong UI): `SuggestForSelect` (Postgres `text[]`, có thể `null`) → `suggestOptions: string[]` (mặc định `[]`), `FilterType` → `filterKind` chuyển chữ thường, `DefaultFieldColumnWidth`/`CustomStyleForColumn` → `columnWidth`/`customStyle` (giữ `null` nếu trống), `Label` rỗng thì dùng tạm `FieldName`.
- Dùng chung `ConnectionConfig` (URL/key) đã cấu hình sẵn cho module — `cf_field_config` nằm cùng project Supabase, chỉ khác tên bảng.

### Tiện ích định dạng (`lib/utils/contract-format.ts`)

- `hasValue(value)` — coi `null`/`undefined`/chuỗi rỗng là "không có giá trị" (dùng để ẩn cột toàn rỗng, tô màu ô rỗng, so sánh khi sắp xếp...).
- `formatValue(value, config: FieldConfig)` — hiển thị ô dữ liệu theo `config.type`: `—` nếu rỗng, thêm hậu tố `đ` và định dạng số Việt Nam nếu `Currency`, nhân 100 và thêm `%` nếu `Percent`, định dạng `dd/mm/yyyy` nếu `Date`, thêm giờ `HH:mm` nếu `DateTime`, nối lại bằng `", "` nếu là `MultiSelect...` (giá trị lưu trong Supabase dạng chuỗi nối `;`), còn lại hiển thị nguyên văn.

### Tiện ích bộ lọc (`lib/utils/contract-filters.ts`)

Phục vụ panel bộ lọc ở tab Danh sách. **Kiểu lọc (`FilterType`) đọc thẳng từ `filterKind` của `FieldConfig`** (cột `FilterType` trong `cf_field_config`) — không còn tự suy luận từ dữ liệu (không còn giới hạn "≤ 30 giá trị khác nhau mới coi là select" như trước):

| `filterKind` | Điều khiển trong `ContractFilters.svelte` |
| --- | --- |
| `"date"` | Hai ô `<input type="date">` (từ/đến) |
| `"numeric"` | Hai ô `<input type="number">` (từ/đến) |
| `"select"` | Danh sách cuộn dọc kiểu Slicer Excel, chọn được nhiều giá trị |
| `"text"` | Ô nhập tìm theo chuỗi con, không phân biệt hoa/thường |

Chi tiết từng hàm:

- `splitCellValues(value)` — tách một ô theo dấu `;` (cùng quy ước lưu multi-select trong dữ liệu và `SuggestForSelect`); với field single-select (không có `;`) vẫn chỉ ra đúng 1 phần tử nên áp dụng chung được cho mọi field kind `"select"`.
- `distinctValues(rows, field)` — liệt kê các giá trị khác nhau (không rỗng, đã tách theo `;`) của một cột, sắp xếp theo `localeCompare` tiếng Việt.
- `computeFilterFields(fieldConfigs, rows)` — tính trước `{ field, label, kind, options }` cho từng cột từ `FieldConfig[]`, **dựa trên toàn bộ `rows` chưa lọc** (không phải phần đã lọc), để danh sách lựa chọn của slicer không bị co lại khi người dùng đang lọc dở. Với kind `"select"`, `options` = `suggestOptions` (giữ nguyên thứ tự đã cấu hình — nhiều field dùng thứ tự có ý nghĩa như quy trình xử lý, không phải bảng chữ cái) nối thêm giá trị thực tế trong dữ liệu nhưng chưa có trong `suggestOptions`.
- `encodeSelectValues`/`decodeSelectValues` — vì một cột `"select"` có thể chọn **nhiều** giá trị cùng lúc, giá trị lọc lưu dưới dạng chuỗi JSON của mảng (thay vì một chuỗi đơn như các kiểu lọc khác) trong cùng một object `ColumnFilters: Record<string, string>`.
- `isFilterActive`/`countActiveFilters` — xác định một cột có đang được lọc hay không (khác nhau theo kiểu: date/numeric xét cặp khoá `field::from`/`field::to` hoặc `field::min`/`field::max`; select xét mảng đã giải mã có phần tử hay không), rồi đếm số **cột** đang lọc để hiện lên nút "Bộ lọc (N)".
- `matchesFilters(row, filters, filterFields)` — hàm khớp lọc chính, `filterFields.every(...)`: một dòng phải thoả **tất cả** cột đang lọc mới được giữ lại (kết hợp AND giữa các cột; trong một cột select thì các giá trị đã chọn kết hợp OR với các phần tử đã tách `;` trong ô — chọn nhiều nghĩa là khớp một trong số đó, giống Slicer Excel, và đúng cho cả field multi-select).

### `features/contracts/ContractManager.svelte` — nơi giữ state và logic

Component quan trọng nhất, nhận prop `module: ContractModuleConfig` rồi tự vận hành toàn bộ vòng đời của một bảng dữ liệu:

**State chính:**
`rows` (dữ liệu thô từ Supabase), `fields` (cột hiện có), `sortFields`, `config` (kết nối, đọc từ `localStorage` theo `module.storageKey` lúc `onMount`), `filters`, `showFilters`, `editRecord`/`formValues` (đang thêm/sửa), `deleteRecord` (đang chờ xác nhận xoá).

**Các giá trị dẫn xuất (`$:`), tính lại tự động mỗi khi state đổi:**
`totalValue` (tổng cột `totalValueField`) → `displayFields` (cột có dữ liệu) → `filterFields` (kiểu lọc từng cột, bỏ cột `id`) → `activeFilterCount` → `filteredRows` (lọc theo `filters`) → `sortedRows` (sắp theo `sortFields`). Chuỗi này đảm bảo **lọc luôn chạy trước sắp xếp**, và bảng luôn nhận `sortedRows` đã qua cả hai bước.

**Các hàm nghiệp vụ đáng chú ý:**

- `loadRows()` — gọi `api.list()`, và nếu có dữ liệu thì tính lại `fields` từ chính các key của bản ghi trả về (không tin tưởng tuyệt đối vào `defaultFields` tĩnh).
- `nextAvailableId()` — quét toàn bộ `id` hiện có, trả về **số nguyên dương nhỏ nhất chưa dùng** (lấp khoảng trống nếu có hồ sơ đã xoá; nếu không có khoảng trống thì tương đương max + 1).
- `openCreate()` — mở modal thêm mới, tự gán sẵn `formValues.id` bằng `nextAvailableId()` — người dùng **không tự nhập id**, khác với `openEdit()` chỉ đổ nguyên bản ghi đang sửa vào `formValues`.
- `saveRecord()` — chuẩn hoá `formValues` trước khi gửi: chuỗi rỗng/`undefined` → `null`, cột số → ép kiểu `Number`; gọi `update` nếu đang sửa, `create` nếu đang thêm; nếu sửa mà Supabase trả về mảng rỗng thì coi là lỗi quyền (RLS) hoặc sai `id`.
- `toggleSort(field)` — bấm vào một cột sẽ luân phiên **tăng dần → giảm dần → tắt**; thứ tự các cột trong `sortFields` quyết định độ ưu tiên khi sắp nhiều cột (so sánh cột đầu trước, bằng nhau mới xét cột sau — xem `sortRows`/`compareValue`).
- `updateFilter`/`clearFilters` — cập nhật/xoá object `filters` theo khoá (khoá có thể là tên cột thẳng, hoặc `field::from`, `field::min`... tuỳ kiểu lọc).

### `ContractTable.svelte` — bảng danh sách

- Header mỗi cột là một nút bấm để gọi `onToggleSort`, hiện mũi tên ↑/↓ kèm số thứ tự ưu tiên nếu đang sắp nhiều cột.
- **Nút "Sửa" không phải là một cột trong bảng** — đây là điểm kỹ thuật đáng chú ý nhất trong file này: nút được dựng thành **một phần tử `position: absolute` nổi duy nhất**, đặt *ngoài* khung cuộn ngang (`overflow-auto`) nhưng bên trong div bọc ngoài `position: relative`. Lý do: nếu đặt bên trong khung cuộn thì nút sẽ bị cuộn theo nội dung (containing block là chính khung cuộn); đặt ở ngoài thì nút đứng yên ở mép phải bất kể cuộn ngang tới đâu, còn vị trí dọc (`shownTop`) tính bằng `offsetTop` của dòng đang được rê chuột/chạm tới — giá trị này không bị ảnh hưởng bởi cuộn ngang.
- `mouseleave` để ẩn nút được gắn ở **div bọc ngoài cùng** (bao cả bảng lẫn nút nổi), không phải ở khung cuộn — vì nếu gắn ở khung cuộn, việc rê chuột từ một dòng sang chính nút nổi (nằm ngoài DOM của khung cuộn) sẽ bị trình duyệt hiểu nhầm là chuột đã rời khung cuộn, khiến nút ẩn ngay khi vừa chạm tới.
- `pinnedRow` — trên thiết bị cảm ứng (không có "rê chuột"), chạm vào một dòng sẽ ghim nút Sửa hiện cho tới khi chạm lại, thay vì phải giữ chuột.

### `ContractFilters.svelte` — panel bộ lọc

Nhận `filterFields` (đã tính sẵn ở `ContractManager`) và render mỗi cột thành một **thẻ lọc rộng cố định**, xếp thành hàng ngang trong một container `overflow-x-auto` (cuộn ngang khi nhiều cột, thay vì đẩy nội dung xuống nhiều dòng). Bốn nhánh `{#if kind === ...}` tương ứng bảng kiểu lọc ở phần tiện ích bên trên; riêng nhánh `"select"` là danh sách nút bấm để bật/tắt từng lựa chọn (kiểu Slicer), tô nền màu khi đang được chọn.

### `ContractFormModal.svelte` — modal thêm/sửa

Render **động** một `<label>` + ô nhập cho mỗi cột trong `visibleFields` (tức `fields` trừ `id` — cột `id` không bao giờ cho sửa tay, hồ sơ mới lấy id tự động từ `ContractManager`). Loại ô nhập chọn theo `fieldConfig`: `textarea` cho cột văn bản dài, `input type="date"` cho cột ngày, `type="number"` cho cột số, còn lại là `text`. Tiêu đề modal hiện `"Sửa hồ sơ #<id>"` hoặc `"Thêm hồ sơ #<id>"` (id đã được tự gán sẵn) tuỳ theo có `editRecord` hay không; nút "Xóa hồ sơ" chỉ hiện khi đang sửa.

### `StatCards.svelte` — thẻ số liệu tổng quan

Ba thẻ tĩnh: tổng số hồ sơ, tổng giá trị (định dạng `toLocaleString("vi-VN")`), và trạng thái đồng bộ — dữ liệu tính sẵn ở `ContractManager` và truyền vào qua props, component này không tự tính toán gì.

### `ConnectionSettingsPanel.svelte` — cấu hình kết nối

Form nhập URL Supabase, public key (ô `type="password"` để tránh lộ khi ai đó nhìn màn hình), và tên bảng. Khi submit, `ContractManager.saveSettings()` sẽ ghi vào `localStorage` theo khoá riêng của từng module (`module.storageKey`) rồi tự chuyển sang tab Danh sách và tải lại dữ liệu — **thông tin này không bao giờ được đưa vào mã nguồn hay build**, chỉ tồn tại trên trình duyệt của người dùng.

## Cấu hình build & triển khai

- **`vite.config.js`** — `base` là `/QL_HopDongBan/` khi build (khớp đường dẫn GitHub Pages của repo này) hoặc `/` khi chạy dev; có thể ghi đè bằng biến môi trường `BASE_PATH`. `build.outDir` trỏ thẳng ra `docs/` (thay vì `dist/` mặc định) để GitHub Pages có thể phục vụ trực tiếp từ thư mục `docs` trên nhánh `main` mà không cần workflow CI riêng. Alias `$lib` trỏ tới `src/lib` (dùng trong toàn bộ import `$lib/...`).
- **`svelte.config.js`** — chỉ bật `vitePreprocess()` để Vite lo phần tiền xử lý (TypeScript, PostCSS...) trong file `.svelte`.
- **`tsconfig.json`** — bật `strict`, khai báo lại alias `$lib` cho riêng trình kiểm tra kiểu (TypeScript không tự đọc alias từ `vite.config.js`), `noEmit: true` vì Vite mới là công cụ build thật sự.
- **`index.html`** — khung HTML tối giản, chỉ có `<div id="app">` và thẻ nạp `src/main.ts`.

### Triển khai GitHub Pages

Đường dẫn build hiện được đặt cứng theo repository `QL_HopDongBan` (`/QL_HopDongBan/`). Nếu đổi tên repository hoặc dùng custom domain, cập nhật biến `BASE_PATH` tương ứng (đặt thành `/` khi dùng custom domain) rồi build lại — thư mục `docs/` sinh ra chính là nội dung deploy lên GitHub Pages (cấu hình Pages trỏ vào thư mục `docs` trên nhánh `main`).

## Hệ thống cấu hình cột theo dữ liệu (`cf_field_config`) — đang triển khai

> Xem kế hoạch đầy đủ tại [`.claude/plans/field-config-plan.md`](.claude/plans/field-config-plan.md). Mục này chỉ ghi lại 3 bảng Supabase đã tạo sẵn để tra cứu; code trong repo **chưa** được cập nhật theo hệ thống này.

Ba bảng mới trên Supabase, sẽ thay thế `ModuleFieldConfig`/`defaultFields` khai báo cứng trong TypeScript:

- **`cf_field_config`** — một dòng cho mỗi cột của một bảng module (cột `TableName` xác định thuộc bảng nào), gồm: `FieldOrderIndex`, `FieldName`, `Label`, `DefaultDisplayField`, `FieldType`, `FilterType`, `DefaultFieldColumnWidth`, `CustomStyleForColumn` (CSS inline thuần, vd. `"background-color:#dcfce7; font-weight:bold"` — áp trực tiếp qua `style`, không phải class Tailwind), `SuggestForSelect` (mảng Postgres `text[]`).
- **`cf_field_type`** — danh mục 11 giá trị hợp lệ của cột `FieldType`: `Text`, `LongText`, `Numeric`, `Percent`, `SingleSelectWithoutOther`, `SingleSelectWithOther`, `MultiSelectWithoutOther`, `MultiSelectWithOther`, `Date`, `DateTime`, `Currency`.
- **`cf_filter_type`** — danh mục 4 giá trị hợp lệ của cột `FilterType`: `Date`, `Numeric`, `Select`, `Text`.

`cf_field_type`/`cf_filter_type` chỉ dùng làm ràng buộc khoá ngoại phía Supabase (chống nhập sai chính tả) — app không truy vấn tới 2 bảng này, vì các union type tương ứng đã khai báo sẵn phía TypeScript.

## Cách thêm một module dữ liệu mới

1. Tạo file cấu hình mới trong `src/lib/constants/modules/`, mô phỏng theo `sales-contracts.ts`: đặt `id`, `label`, `storageKey` riêng, `defaultUrl`/`defaultTable`, `defaultFields`, `defaultSortFields`, và `fieldConfig` (khai báo đúng cột số/tiền tệ/phần trăm/văn bản dài/ngoại lệ ngày, cùng cột tính tổng nếu có).
2. Thêm object đó vào mảng `MODULES` trong `src/lib/constants/modules/index.ts`.
3. Không cần sửa gì thêm — `App.svelte`, `Sidebar`, `ContractManager` và toàn bộ UI đều đọc theo `MODULES`/`fieldConfig` một cách tổng quát.
