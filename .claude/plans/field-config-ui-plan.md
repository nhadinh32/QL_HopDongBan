# Tab "Cấu hình" v2 — biến View thành đối tượng quản lý được, không chỉ là hệ quả của cột

## Bối cảnh — plan cũ đã xong, giờ nâng cấp phần View

Plan gốc (CRUD cột `cf_field_config` ngay trong UI) đã được triển khai đầy đủ: `field-config-service.ts` có 4 hàm CRUD trên `FieldConfigRow`, `FieldConfigPanel.svelte` + `FieldConfigFormModal.svelte` cho phép thêm/sửa/xóa/sắp-xếp cột mà không cần vào Supabase Console, và `DataViewManager.svelte` đã tự suy ra **nhiều tab "view"** (mỗi giá trị `ViewName[0]` phân biệt = 1 tab dữ liệu riêng, xem `distinctViews`/`views` ở dòng 132-141) thay vì chỉ 1 tab "Danh sách" cố định.

Vấn đề còn lại: **View hiện chỉ là hệ quả gián tiếp của cột**, không phải một đối tượng có thể quản lý trực tiếp:

- **Không có "＋ Thêm view"** — muốn tạo view mới, người dùng phải mở modal thêm *cột*, kéo xuống mục View, chọn "+ Tạo view mới…" rồi gõ mã/tên view lẫn trong form của một trường hoàn toàn khác (`FieldConfigFormModal.svelte` dòng 148-174). Rất dễ bỏ sót, không trực quan.
- **Không đổi tên được view** — muốn sửa nhãn tab "Tài chính" thành "Tài chính & Công nợ" phải sửa từng cột một, tìm đúng dòng đang thuộc view đó trong bảng cấu hình rồi bấm Sửa từng dòng.
- **Không xóa được cả view** — muốn dẹp một view thử nghiệm phải xóa từng cột tới khi view tự biến mất (do `distinctViews` rỗng cho view đó).
- **Không sắp xếp lại thứ tự tab view** — thứ tự tab hiện suy ra "tình cờ" từ cột nào có `DefaultFieldOrderIndex` nhỏ nhất xuất hiện trước, không có cách chủ động đổi thứ tự 2 tab view cho nhau.
- **Tab "Cấu hình" ngầm định phụ thuộc tab dữ liệu vừa xem** (`activeViewId`, dòng 51/152) — muốn sửa cột của view B, phải bấm tab dữ liệu B trước rồi mới bấm "Cấu hình", 2 bước ẩn không rõ ràng.

Mục tiêu lần này: thiết kế lại tab "Cấu hình" thành **màn quản lý 2 cấp** — danh sách View (thêm/đổi tên/xóa/sắp xếp) ở bên trái, bảng cột của view đang chọn ở bên phải — thân thiện và tự giải thích, không cần đọc code để biết View là gì.

## Quyết định thiết kế (đã chốt với người dùng)

1. **Vị trí:** việc quản lý View nằm gọn trong tab "Cấu hình" hiện có (không thêm tab ngang mới) — tab này tách 2 khu vực rõ ràng: danh sách View bên trái, bảng cột bên phải.
2. **Xóa view có cột:** cho xóa thẳng, xóa kèm luôn toàn bộ cột cấu hình thuộc view đó — nhưng `ConfirmDialog` phải nói rõ số cột sẽ mất cấu hình và nhắc lại dữ liệu thật trong bảng Supabase không bị ảnh hưởng.
3. **Phạm vi "cài đặt view":** chỉ dừng ở danh tính — tên view (nhãn tab) và thứ tự tab. Không thêm mô tả, không thêm ẩn/hiện tạm thời — giữ đúng tinh thần tối giản hiện có.

## Không cần thêm cột/bảng mới trong Supabase

`ViewName` đã là `[ViewID, ViewLabel]` lưu lặp lại trên từng dòng cột (không có bảng `cf_view_config` riêng). Toàn bộ 3 thao tác quản lý View bên dưới đều **tái dùng đúng 4 hàm CRUD đã có** (`updateFieldConfigRow`/`deleteFieldConfigRow`/`createFieldConfigRow`), không đổi schema, không thêm cột `ViewOrder` hay bảng mới — giữ đúng cách làm tối giản đã có với `DefaultFieldOrderIndex`/`DefaultRowGroupOrder`:

- **Đổi tên view** = với mọi dòng có `ViewName[0] = viewId`, gọi `updateFieldConfigRow(id, { ViewName: [viewId, newLabel] })` song song (`Promise.all`) — y hệt cách `moveFieldConfigRow` hiện đổi 2 `DefaultFieldOrderIndex` song song.
- **Xóa view** = với mọi dòng thuộc view đó, gọi `deleteFieldConfigRow(id)` song song.
- **Sắp xếp lại thứ tự tab view** = không có cột "thứ tự view" riêng — thứ tự tab suy ra từ cột nào (thuộc view nào) có `DefaultFieldOrderIndex` nhỏ nhất. Đổi chỗ 2 view kế nhau nghĩa là **đánh số lại nguyên khối** `DefaultFieldOrderIndex` của 2 view đó: giữ thứ tự tương đối các cột *trong* từng view, nhưng hoán đổi 2 khối cho nhau (vd. view A đang chiếm số thứ tự 1-3, view B chiếm 4-5 → sau khi đổi, B chiếm 1-2, A chiếm 3-5). Cài trong `DataViewManager.svelte` (business logic, không cần hàm service mới) bằng 1 loạt `updateFieldConfigRow` chạy song song, theo đúng pattern đã có ở `moveFieldConfigRow`.
- **Tạo view mới** = không có "view rỗng" (view chỉ tồn tại nhờ có ít nhất 1 cột trỏ tới nó) — bấm "＋ Thêm view" chỉ hỏi tên view, sinh `ViewID` (slug không dấu từ tên, tự thêm hậu tố nếu trùng), sau đó **mở luôn modal thêm cột** với View đã được gán sẵn (khóa cứng, không cho đổi) để người dùng nhập cột đầu tiên — có dòng ghi chú giải thích "View chỉ xuất hiện trên hàng tab sau khi có ít nhất 1 cột, hãy thêm cột đầu tiên ngay bây giờ."

## 1. Đơn giản hóa `FieldConfigFormModal.svelte` — bỏ nhánh "+ Tạo view mới…"

Vì tạo view giờ là một hành động rõ ràng ở màn quản lý View (mục 3), modal thêm/sửa **một cột** không cần tự xử lý việc tạo view nữa — bỏ hẳn:

- Prop `existingViews`, `initialViewLabel`.
- Biến `NEW_VIEW`, `newViewId`, `newViewLabel`, và khối `{#if viewSelection === NEW_VIEW}` (dòng 156-170).
- Đoạn ghi chú "Chọn lại 1 tên cột kỹ thuật đã tồn tại ở view khác..." (dòng 171-174) — không còn cần vì view luôn cố định khi mở modal.

Giữ lại đúng 1 prop mới thay thế: `viewId: string` + `viewLabel: string` (view đang thao tác, luôn do màn cha truyền vào, hiển thị **read-only** trong form, vd. dòng chữ "Thuộc view: **Tài chính**" thay vì `<select>`). `handleSubmit()` dùng thẳng `viewId`/`viewLabel` nhận từ prop thay vì tính `finalViewId`/`finalViewLabel`.

Việc này thu hẹp form thêm/sửa cột đúng về đúng phạm vi của nó (1 cột), đúng tinh thần "dễ hiểu, dễ cấu hình" người dùng yêu cầu — mỗi màn chỉ làm một việc.

## 2. Component mới: `FieldConfigViewList.svelte` — danh sách View bên trái

Đặt cạnh `FieldConfigPanel.svelte` trong `src/features/data-view/`. Đây là phần thân thiện nhất của lần rebuild này — danh sách dạng thẻ dọc, mỗi thẻ 1 view:

```
┌─────────────────────────┐
│  VIEW                    │
│  ┌─────────────────────┐ │
│  │ ▲▼ Danh sách    (12) │ │ ← đang chọn: nổi bật (bg-primary-50, border trái primary-500)
│  │    ✎        🗑      │ │
│  ├─────────────────────┤ │
│  │ ▲▼ Tài chính     (4) │ │
│  │    ✎        🗑      │ │
│  └─────────────────────┘ │
│  ＋ Thêm view             │
└─────────────────────────┘
```

Props: `views: { id: string; label: string; columnCount: number }[]`, `selectedViewId: string`, `onSelect: (id) => void`, `onCreate: () => void`, `onRename: (id, currentLabel) => void`, `onDelete: (id) => void`, `onMove: (id, direction: "up" | "down") => void`.

- Số cột `(N)` lấy từ đếm `fieldConfigRows` theo view — giúp người dùng thấy ngay view nào "nặng"/"rỗng" mà không cần bấm vào.
- `✎` (đổi tên) mở một `Modal` nhỏ chỉ có 1 ô nhập tên + nút Lưu/Hủy — không cần modal riêng file, có thể là 1 state đơn giản `renamingView: { id, label } | null` xử lý ngay trong `FieldConfigViewList.svelte` hoặc đẩy lên `DataViewManager` tùy độ phức tạp lúc code (quyết định lúc cài đặt, không ảnh hưởng props ở trên).
- `🗑` disabled (mờ + `title="Phải còn ít nhất 1 view"`) khi `views.length === 1` — module luôn cần ít nhất 1 tab dữ liệu để hoạt động.
- `▲▼` disabled ở đầu/cuối danh sách, giống hệt hành vi ▲▼ đổi thứ tự cột đã có trong `FieldConfigPanel.svelte`.

## 3. `FieldConfigPanel.svelte` — thu hẹp lại đúng vai trò "bảng cột của 1 view"

Giữ nguyên gần như toàn bộ bảng liệt kê cột hiện có (dòng 1-111) — chỉ bỏ tiêu đề lặp "view ..." (chuyển lên header chung của layout 2 cột, xem mục 4) vì giờ đã có `FieldConfigViewList` hiển thị view đang chọn rồi, không cần nhắc lại trong tiêu đề bảng.

## 4. Bố cục lại tab "Cấu hình" trong `DataViewManager.svelte`

Thay nhánh `{:else if activeTab === "config"}` hiện tại (dòng 485-494) bằng layout 2 cột:

```
{:else if activeTab === "config"}
  <div class="flex h-full min-h-0 gap-3 p-2">
    <div class="w-56 shrink-0 overflow-y-auto">
      <FieldConfigViewList views={viewsWithCount} selectedViewId={configViewId} onSelect={...} onCreate={...} onRename={...} onDelete={...} onMove={...} />
    </div>
    <div class="min-w-0 flex-1 overflow-hidden">
      <FieldConfigPanel rows={fieldConfigRowsForConfigView} loading={fieldConfigRowsLoading} onCreate={openCreateFieldConfigRow} onEdit={openEditFieldConfigRow} onDelete={requestDeleteFieldConfigRow} onMove={moveFieldConfigRow} />
    </div>
  </div>
```

**State mới**, thay thế cách dùng `activeViewId` làm ngữ cảnh ngầm cho tab Cấu hình:

- `configViewId: string` — view đang được chọn để cấu hình *bên trong* tab "Cấu hình", độc lập với tab dữ liệu đang xem. Khởi tạo bằng `activeViewId` khi vào tab (giữ tiện lợi: bấm "Cấu hình" ngay sau khi xem 1 view thì mặc định vào đúng view đó), nhưng từ đó người dùng đổi view thoải mái bằng `FieldConfigViewList` mà **không cần rời tab / không cần bấm lại tab dữ liệu khác**. Đây là điểm sửa trực tiếp vấn đề "phụ thuộc ngầm" nêu ở Bối cảnh.
- `renamingView`, `viewPendingDelete` (state cho modal đổi tên / `ConfirmDialog` xóa view) — mirror pattern `deleteFieldConfigRowTarget` đã có.

**Derived state mới** (cạnh `distinctViews`/`views` dòng 132-141):

```ts
$: viewsWithCount = views.map((v) => ({
  ...v,
  columnCount: fieldConfigRows.filter((r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === v.id).length,
}));
$: fieldConfigRowsForConfigView = fieldConfigRows.filter(
  (r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === configViewId,
);
```

**Hàm nghiệp vụ mới** (cạnh `moveFieldConfigRow` dòng 275-301):

- `selectConfigView(id)` — set `configViewId = id`.
- `openCreateView()` — mở modal nhỏ hỏi tên view (state `creatingView = true` + input); submit sinh `viewId` bằng slug hóa (bỏ dấu, thường hóa, thay khoảng trắng bằng `-`, nếu trùng `views` hiện có thì thêm hậu tố `-2`, `-3`...), lưu vào biến tạm `pendingNewView = { id, label }`, đóng modal hỏi tên, rồi gọi `openCreateFieldConfigRow()` như hiện có nhưng với `viewId`/`viewLabel` cố định = `pendingNewView` (thay vì `activeViewId`/nhãn hiện tại) truyền xuống `FieldConfigFormModal`.
- `renameView(id, newLabel)` — `Promise.all(fieldConfigRows.filter(r => view id trùng).map(r => updateFieldConfigRow(config, r.id, { ViewName: [id, newLabel] })))`, rồi `refreshFieldConfigs()`.
- `requestDeleteView(id)` / `confirmDeleteView()` — mirror `requestDeleteFieldConfigRow`/`removeFieldConfigRow`, nhưng lặp `Promise.all` xóa toàn bộ dòng thuộc view; sau khi xóa, nếu `configViewId` vừa bị xóa thì set lại `configViewId` = view đầu tiên còn lại (và nếu `activeTab` cũng đang là view vừa xóa, cơ chế fallback đã có sẵn ở dòng 144-150 lo phần tab dữ liệu).
- `moveView(id, direction)` — tìm vị trí `id` trong `views`, xác định view liền kề theo `direction`, gộp 2 danh sách `fieldConfigRows` thuộc 2 view đó (đã sort theo `DefaultFieldOrderIndex`), đánh số lại liên tục bắt đầu từ `min(DefaultFieldOrderIndex)` của khối gộp — khối của view đích (hướng di chuyển) được đánh số trước, khối còn lại theo sau, mỗi khối giữ nguyên thứ tự nội bộ. Gọi `Promise.all` các `updateFieldConfigRow` cần thiết, rồi `refreshFieldConfigs()`.

## 5. Cập nhật `README.md`

- Dòng 82: `Tab "Cấu hình" → FieldConfigPanel + FieldConfigFormModal` → thêm `FieldConfigViewList`, mô tả ngắn layout 2 cột (danh sách View trái / bảng cột phải).
- Thêm `FieldConfigViewList.svelte` vào sơ đồ cây thư mục `features/data-view/` và mục giải thích chi tiết.
- Ghi chú rõ: không có bảng `cf_view_config` riêng — View vẫn là dữ liệu suy ra từ `ViewName` lặp lại trên từng dòng `cf_field_config`, thao tác đổi tên/xóa/sắp xếp view chỉ là ghi hàng loạt lên các dòng cột liên quan.

## Giới hạn chấp nhận được (không xử lý lần này)

- Không có "view rỗng" thật sự — luôn cần tạo kèm ít nhất 1 cột, vì không có bảng lưu View độc lập với cột. Nếu sau này thấy bất tiện, cân nhắc bảng `cf_view_config` riêng (schema change lớn hơn, để plan khác).
- Không kéo-thả để sắp xếp view, chỉ ▲▼ đổi chỗ view liền kề — nhất quán với cách sắp xếp cột đã có.
- Không thêm mô tả/ẩn-hiện tạm thời cho view (đã chốt ở mục Quyết định thiết kế) — chỉ tên + thứ tự.
- Đổi tên/xóa view chạy N lệnh REST song song (N = số cột trong view) — chấp nhận được vì số cột mỗi view thường nhỏ (chục cột trở xuống); không cần transaction/rollback phức tạp, giống cách `moveFieldConfigRow` hiện đã chấp nhận rủi ro tương tự ở quy mô nhỏ hơn (2 lệnh).

## Kiểm tra sau khi làm

1. `npm run check` — không lỗi type (đặc biệt sau khi bỏ `existingViews`/`NEW_VIEW` khỏi `FieldConfigFormModal`, rà lại chỗ gọi ở `DataViewManager.svelte`).
2. `npm run dev` — vào tab "Cấu hình":
   - Bấm "＋ Thêm view", đặt tên, xác nhận modal thêm cột mở ra với view đã khóa sẵn, thêm cột đầu tiên → tab dữ liệu mới xuất hiện ngay trên hàng tab.
   - Đổi tên 1 view có sẵn (nhiều cột) → nhãn tab dữ liệu tương ứng đổi theo ngay, không cần tải lại trang.
   - Đổi thứ tự 2 view bằng ▲▼ → thứ tự tab dữ liệu đổi theo đúng, thứ tự cột *trong* mỗi view không bị xáo trộn.
   - Xóa 1 view có cột → `ConfirmDialog` nêu đúng số cột sẽ mất, xác nhận xong tab dữ liệu của view đó biến mất, `configViewId` rơi về view còn lại hợp lý.
   - Thử xóa khi chỉ còn 1 view duy nhất → nút Xóa bị disable.
   - Chuyển qua lại giữa các view trong sidebar khi đang ở tab "Cấu hình", xác nhận **không cần** bấm ra tab dữ liệu rồi bấm lại tab "Cấu hình".
3. `npm run build` — build `docs/` không lỗi.
