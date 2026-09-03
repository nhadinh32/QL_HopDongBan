# Kế hoạch: Hệ thống `cf_field_config` điều khiển động cột dữ liệu hợp đồng

## Context

Hiện tại toàn bộ cấu hình cột (tên trường, loại dữ liệu, cột nào là số/ngày/tiền tệ/text dài, trường nào hiển thị mặc định trong bảng...) được khai báo **cứng bằng tay** trong TypeScript — cụ thể là `ModuleFieldConfig` (5 `Set<string>`) và mảng `defaultFields` trong `src/lib/constants/modules/sales-contracts.ts`. Cách này có 3 vấn đề:

1. Muốn thêm/sửa một cột phải sửa code + deploy lại, không ai ngoài dev làm được.
2. Không có khái niệm "nhãn hiển thị" (label) — bảng và form hiện đang hiển thị thẳng tên cột kỹ thuật (`KhuVucKV`) thay vì tên tiếng Việt dễ đọc.
3. Chỉ hỗ trợ 5 loại trường (numeric/longText/currency/percent/date); không có select, multi-select, datetime.

Người dùng đã tạo sẵn 3 bảng trên Supabase: `cf_field_config` (danh sách cấu hình từng field, đã có đủ 29 dòng cho `db_hopdongban`), `cf_field_type` và `cf_filter_type` (2 bảng danh mục chỉ chứa danh sách giá trị hợp lệ của `FieldType`/`FilterType` — dùng làm ràng buộc khoá ngoại phía Supabase để đảm bảo dữ liệu nhập vào `cf_field_config` không sai chính tả; **app không cần gọi tới 2 bảng danh mục này**, vì union type `FieldType`/`FilterType` phía TypeScript đã khai báo sẵn đúng các giá trị đó).

**`cf_field_type`** (11 giá trị, cột `FieldType`): `Text`, `LongText`, `Numeric`, `Percent`, `SingleSelectWithoutOther`, `SingleSelectWithOther`, `MultiSelectWithoutOther`, `MultiSelectWithOther`, `Date`, `DateTime`, `Currency`.

**`cf_filter_type`** (4 giá trị, cột `FilterType`): `Date`, `Numeric`, `Select`, `Text`.

Schema thật của `cf_field_config`:
```
id                        bigint identity, PK
"TableName"                text not null
"FieldOrderIndex"          bigint null
"FieldName"                text not null
"Label"                    text not null
"DefaultDisplayField"      boolean not null
"FieldType"                text not null
"FilterType"               text not null
"DefaultFieldColumnWidth"  smallint null   -- chiều rộng cột mặc định (px) trong bảng danh sách
"CustomStyleForColumn"     text null       -- CSS inline thuần (vd. "background-color:#dcfce7; color:#166534; font-weight:bold"), áp thẳng qua style attribute — không phải class Tailwind
"SuggestForSelect"         text[] null     -- mảng Postgres thật, KHÔNG phải chuỗi nối `;`
```

Mục tiêu: driven-by-data hoàn toàn — thêm/sửa/ẩn cột chỉ cần sửa dữ liệu trong Supabase, không cần sửa code; đồng thời chuẩn bị sẵn cho nhiều module (multi-table) trong tương lai.

## Quyết định đã chốt với người dùng

1. **Multi-module ngay từ đầu**: `cf_field_config` có cột `TableName`, mọi truy vấn lọc theo tên bảng Supabase thực tế của module (`module.defaultTable`, vd. `"db_hopdongban"`) — không dùng `module.id` nội bộ, để cấu hình gắn trực tiếp với bảng dữ liệu mà nó mô tả.
2. **WithOther vs WithoutOther**: `...WithOther` = combobox chọn từ `SuggestForSelect` HOẶC gõ giá trị mới tự do (creatable). `...WithoutOther` = chỉ chọn trong danh sách, không cho gõ tự do.
3. **Thứ tự field**: thêm cột `FieldOrderIndex` (số nguyên) — không dựa vào thứ tự dòng trong DB.
4. **Nguồn option cho filter Select**: hợp nhất `SuggestForSelect` + giá trị thực tế đang có trong dữ liệu đã tải (không thiếu, không thừa).

## ⚠️ Một điểm cần bạn xác nhận

- **`id` sẽ biến mất khỏi bảng theo mặc định**: dữ liệu thật trong `cf_field_config` có `DefaultDisplayField = false` cho field `id`. Theo thiết kế mới, `DefaultDisplayField` quyết định cột nào hiện trong bảng danh sách (form nhập liệu vẫn luôn hiển thị đủ mọi field, trừ `id` — `id` không bao giờ cho sửa tay). Nếu muốn `id` vẫn hiện trong bảng, đổi giá trị này thành `true`.

(Ghi chú: `DefaultFieldColumnWidth` hiện đang `null` ở toàn bộ 29 dòng — hợp lý, code sẽ mặc định "không cố định chiều rộng, tự co giãn theo nội dung như hiện tại". Điền giá trị sau nếu muốn tuỳ biến độ rộng cột.)

## Kiến trúc & luồng dữ liệu

`ContractManager.svelte` khi mount sẽ gọi 2 truy vấn Supabase song song (dùng lại `ConnectionConfig` đã lưu sẵn của module, chỉ đổi `table` thành `"cf_field_config"`):
- `cf_field_config?TableName=eq.<module.defaultTable>&order=FieldOrderIndex.asc` → danh sách `FieldConfig[]`
- dữ liệu hồ sơ như hiện tại (`db_hopdongban?select=*`)

`FieldConfig[]` sau đó là **nguồn duy nhất** quyết định: field nào tồn tại, nhãn hiển thị, control nhập liệu, cách format hiển thị, cách lọc, và cột nào hiện trong bảng — thay thế hoàn toàn `ModuleFieldConfig` + `defaultFields`.

## Thay đổi theo file

### Mới
- **`src/lib/types/field-config.ts`** — `FieldType` (union 11 giá trị), `FilterType` (chuyển từ `contract-filters.ts` sang đây, dùng `"date"|"numeric"|"select"|"text"` để tránh phá vỡ chỗ đang dùng), `FieldConfigRow` (raw shape từ PostgREST, khớp đúng tên cột thật: `id, TableName, FieldOrderIndex, FieldName, Label, DefaultDisplayField, FieldType, FilterType, DefaultFieldColumnWidth, CustomStyleForColumn, SuggestForSelect: string[] | null`), `FieldConfig` (shape runtime đã parse: `field, label, type, defaultDisplay, suggestOptions: string[], filterKind, columnWidth: number | null, customStyle: string | null, orderIndex`), và các hàm predicate dùng chung: `isNumericType`, `isDateType`, `isMultiSelectType`, `isSelectType`, `allowsCustomValue`.
- **`src/lib/services/field-config-service.ts`** — `loadFieldConfig(config, tableName)`: gọi `createSupabaseRestClient({...config, table: "cf_field_config"})`, filter theo `TableName=eq.<tableName>` (dùng `module.defaultTable`), map sang `FieldConfig`: `suggestOptions = row.SuggestForSelect ?? []` (PostgREST trả `text[]` thành mảng string sẵn, **không cần tách `;` nữa**), `filterKind` = `row.FilterType` chuyển chữ thường, `columnWidth = row.DefaultFieldColumnWidth ?? null`, `customStyle = row.CustomStyleForColumn ?? null`, `label = row.Label || row.FieldName`.
- **`src/lib/components/ui/SelectCombobox.svelte`** — 1 component dùng chung cho cả 4 biến thể select (props `multiple`, `allowCustom`, `options`, `value`, `onChange`), thay vì viết 4 component riêng. Kiểu emit: luôn trả về string (multiple → chuỗi nối bằng `;`), để không phải đổi kiểu `formValues: Record<string,string>` ở nơi khác.

### Sửa
- **`src/lib/types/contracts.ts`** — xoá `ModuleFieldConfig`; `ContractModuleConfig` rút gọn còn `{ id, label, storageKey, defaultUrl, defaultTable, defaultSortFields, totalValueField }` (bỏ `defaultFields`, `fieldConfig`; `totalValueField` dời lên thành field riêng vì đây là cấu hình tổng hợp cấp module, không có tương đương trong `cf_field_config`).
- **`src/lib/constants/modules/sales-contracts.ts`** + **`index.ts`** — rút gọn chỉ còn thông tin kết nối/sort; xoá mảng `defaultFields` và khối 5 Set.
- **`src/lib/services/supabase-rest.ts`** — `list()` nhận thêm tham số `query?: string` để hỗ trợ filter/order (tương thích ngược, các chỗ gọi cũ không cần sửa).
- **`src/lib/utils/contract-format.ts`** — `formatValue(value, config: FieldConfig)` thay vì nhận `ModuleFieldConfig`; switch theo `config.type`, thêm case `DateTime`, MultiSelect hiển thị nối bằng `", "`.
- **`src/lib/utils/contract-filters.ts`** — `computeFilterFields(fieldConfigs: FieldConfig[], rows)` thay vì suy luận kind từ cardinality; xoá `SELECT_OPTION_LIMIT`. Options của kind `select` = hợp nhất `suggestOptions` + `distinctValues` (data thực tế). **Cần sửa 2 lỗi phát sinh với MultiSelect**: `distinctValues` phải tách giá trị cell theo `;` trước khi gộp (nếu không, một ô multi-select như `"Hoàn thiện;Phần thô"` sẽ bị coi là 1 option lạ); `matchesFilters` nhánh `select` cần kiểm tra giao nhau giữa lựa chọn đã chọn và các giá trị tách `;` trong cell, thay vì so khớp chuỗi tuyệt đối. `FilterField` thêm `label: string`.
- **`src/features/contracts/ContractFormModal.svelte`** — nhận `fields: FieldConfig[]` thay vì `string[] + ModuleFieldConfig`. Label hiển thị = `field.label`. Switch theo `field.type` ra đúng control (text/textarea/number/date/datetime-local/`SelectCombobox` với `multiple`/`allowCustom` theo `isMultiSelectType`/`allowsCustomValue`). Layout LongText span 2 cột **giữ nguyên hardcode** như code hiện tại, chỉ đổi điều kiện từ `fieldConfig.longTextFields.has(field)` sang `field.type === "LongText"`.
- **`src/features/contracts/ContractTable.svelte`** — nhận `fields: FieldConfig[]` (chỉ những field `defaultDisplay`). Header = `field.label`; căn phải theo `isNumericType`; `whitespace-pre-line` theo `type === "LongText"`. Hai style riêng biệt, **không dùng chung 1 hàm**:
  - `<th>` (header): chỉ áp `width`/`min-width` từ `field.columnWidth` (nếu khác `null`) — **không** áp `field.customStyle`.
  - `<td>` (từng ô dữ liệu): áp cả `width`/`min-width` từ `field.columnWidth` **và** nguyên văn `field.customStyle` (nối `;`) lên div nội dung ô — `CustomStyleForColumn` chỉ có tác dụng ở đây, không ảnh hưởng tiêu đề cột.
  
  Áp dụng qua **inline style**, không ghép thành class Tailwind động (vd. `w-[120px]` dựng từ chuỗi runtime) vì Tailwind chỉ sinh CSS cho class thấy được lúc build, giá trị đến từ Supabase lúc chạy sẽ không có CSS tương ứng và bị bỏ qua âm thầm — đây cũng là lý do `CustomStyleForColumn` được thiết kế là CSS inline thuần (`background-color:...`) thay vì tên class Tailwind. `columnWidth`/`customStyle` đều `null` thì giữ hành vi hiện tại (tự co giãn theo nội dung, không style riêng).
- **`src/features/contracts/ContractFilters.svelte`** — dùng `label` thay `field` cho tiêu đề thẻ lọc; logic `kind` giữ nguyên.
- **`src/features/contracts/ContractManager.svelte`** (sửa sau cùng, phụ thuộc mọi thứ trên) — thêm state `fieldConfigs`, `fieldConfigLoading`; `onMount` gọi thêm `loadFieldConfig()`; **xoá** dòng suy luận `fields` từ `Object.keys(rows...)` (cf_field_config giờ là nguồn duy nhất); `compareValue`/`saveRecord`/`totalValue` chuyển sang tra cứu qua `fieldConfigMap`/`module.totalValueField`; `displayFields` (lọc `defaultDisplay`) truyền cho `ContractTable`, toàn bộ `fieldConfigs` truyền cho `ContractFormModal`.
- **`README.md`** — cập nhật phần "FilterKind" (~dòng 156-203), mô tả `ModuleFieldConfig` (~119-128), hướng dẫn thêm module mới (~227-231) sang mô tả thêm dòng `cf_field_config` thay vì sửa Set trong TS.

## Thứ tự triển khai

1. `field-config.ts` (types) + rút gọn `contracts.ts`
2. Rút gọn `sales-contracts.ts` + `index.ts` (compile sẽ lộ ngay chỗ nào còn tham chiếu cũ)
3. `supabase-rest.ts` (mở rộng `list`) + `field-config-service.ts`
4. `contract-format.ts`, `contract-filters.ts`
5. `SelectCombobox.svelte`
6. `ContractFormModal.svelte`, `ContractTable.svelte`, `ContractFilters.svelte`
7. `ContractManager.svelte` (lớn nhất, làm sau cùng)
8. `README.md`

## Kiểm thử (repo không có test suite — xác nhận qua package.json, chỉ có script dev/build/preview/check)

1. `npm run check` sau mỗi bước lớn, đặc biệt sau bước 7 (`ContractManager.svelte`) — `svelte-check` sẽ tự lộ các chỗ còn import kiểu cũ.
2. `npm run dev`, mở tab "Danh sách": kiểm tra trạng thái loading, cột hiện đúng theo `FieldOrderIndex` + chỉ những field `DefaultDisplayField=true`, header hiện `Label`.
3. Panel bộ lọc: kiểm tra range ngày/số, slicer select hợp nhất đúng suggest + data thật, tìm kiếm text, và **đặc biệt test filter trên field MultiSelect** (đảm bảo tách `;` đúng).
4. "Thêm hồ sơ": đủ mọi field (kể cả field không hiện trong bảng); đúng control theo từng `FieldType`; test `...WithOther` cho gõ tự do, `...WithoutOther` chặn gõ tự do; lưu xong kiểm tra trong Supabase: field số lưu đúng kiểu number, field multi-select lưu chuỗi nối `;`.
5. Sửa một bản ghi có sẵn giá trị select/multi-select: combobox phải tự chọn đúng lựa chọn đã lưu.
6. Kiểm tra sort (số vs text) và thẻ "Giá trị" vẫn tính đúng tổng theo `module.totalValueField`.
7. Test sẵn sàng multi-module: chèn 1 dòng `cf_field_config` với `TableName` khác (vd. một bảng chưa tồn tại), xác nhận nó không xuất hiện ở module `sales-contracts` (`db_hopdongban`).
