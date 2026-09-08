# Nạp cấu hình kết nối Supabase từ URL fragment

## Mục tiêu

Khi người dùng mở app kèm URL fragment, ví dụ:

```
https://.../#urlapi=https://xxx.supabase.co&apikey=eyJxxx...&tablename=hop_dong_ban
```

App tự động nạp 3 giá trị đó vào `ConnectionConfig` (`url`, `publicKey`, `table` — 3 ô đang nhập tay ở tab **Cài đặt**), thay vì bắt người dùng copy/paste thủ công. Tham số trên URL luôn **ưu tiên hơn** cấu hình đã lưu trong `localStorage` nếu có mặt.

Dùng **fragment (`#...`)** thay vì query string (`?...`) vì fragment không bao giờ được trình duyệt gửi lên server trong HTTP request — nên `apikey` không lọt vào access log của server/CDN (GitHub Pages), cũng không lọt vào request của các bot xem-trước-link (Zalo, Messenger, Telegram...) khi link được dán vào chat. Query string thì bị gửi kèm mọi request nên cả hai nơi trên đều thấy được.

## Bối cảnh hiện tại (đã khảo sát code)

- `ConnectionConfig` định nghĩa ở [data-view.ts:11-15](src/lib/types/data-view.ts#L11-L15): `{ url, publicKey, table }`.
- `DataViewManager.svelte` giữ state `config` và trong `onMount` đọc từ `localStorage.getItem(module.storageKey)` để nạp cấu hình đã lưu trước đó — [DataViewManager.svelte:99-110](src/features/data-view/DataViewManager.svelte#L99-L110).
- Nút "Lưu" ở tab Cài đặt gọi `saveSettings()`, ghi `config` vào `localStorage.setItem(module.storageKey, ...)` — [DataViewManager.svelte:257-265](src/features/data-view/DataViewManager.svelte#L257-L265).
- **Quan trọng**: `App.svelte` bọc `<DataViewManager>` trong `{#key activeModuleId}` — [App.svelte:30-32](src/App.svelte#L30-L32) — nghĩa là mỗi lần người dùng đổi mục ở sidebar, `DataViewManager` bị huỷ và **mount lại từ đầu**, `onMount` chạy lại. Nếu đọc URL fragment trực tiếp trong `onMount` như đọc localStorage, tham số sẽ bị áp lại mỗi lần đổi tab sidebar chứ không chỉ "lần đầu truy cập" — cần chặn việc này.
- Mỗi module (mục sidebar) có `storageKey` riêng (xem `$lib/constants/modules`), nên cấu hình từ URL sẽ áp cho **module đang active tại thời điểm mount** (mặc định là module đầu tiên, `MODULES[0]`, vì `activeModuleId = MODULES[0].id`).
- `index.html` không load font/analytics/script bên thứ ba nào trước khi JS chạy — nên rủi ro rò rỉ qua header `Referer` sang domain khác là không đáng kể.
- `apikey` trong app này là **Supabase anon/public key** (xem comment ở [supabase-rest.ts:9](src/lib/services/supabase-rest.ts#L9)) — key này được thiết kế để lộ ra phía client, bảo mật thật sự nằm ở RLS (Row Level Security) trên Supabase chứ không nằm ở việc giấu key.

## Quyết định thiết kế (đã chốt)

1. **Vị trí đặt tham số**: dùng URL fragment `#urlapi=&apikey=&tablename=`, không dùng query string `?...` — tránh apikey lọt vào access log server/CDN và request của bot xem-trước-link.
2. **Độ ưu tiên**: nếu URL có tham số tương ứng, giá trị đó luôn ghi đè lên cấu hình đã lưu trong `localStorage`, bất kể trước đó đã lưu gì.
3. **Tự lưu**: sau khi nạp từ URL, tự động ghi luôn xuống `localStorage` (như thể người dùng đã bấm "Lưu" ở tab Cài đặt) — mở link 1 lần là dùng được lâu dài, kể cả truy cập lại không kèm fragment.
4. **Dọn URL sau khi đọc**: dùng `history.replaceState` để xoá `urlapi`, `apikey`, `tablename` khỏi thanh địa chỉ ngay sau khi đọc xong, tránh apikey lộ trong lịch sử trình duyệt / khi người dùng copy link chia sẻ lại.
5. **Chỉ áp dụng một lần cho toàn phiên**: việc đọc fragment chỉ chạy đúng 1 lần trong vòng đời của tab trình duyệt (module-level flag, không phải state trong `DataViewManager`, vì component này remount mỗi lần đổi sidebar).

## Thay đổi cụ thể (đã triển khai)

### 1. `src/lib/utils/connection-from-url.ts` (file mới)

```ts
import type { ConnectionConfig } from "$lib/types/data-view";

const PARAM_MAP: Record<keyof ConnectionConfig, string> = {
  url: "urlapi",
  publicKey: "apikey",
  table: "tablename",
};

// Chỉ đọc fragment đúng 1 lần cho suốt vòng đời tab trình duyệt — khai báo ở module-level
// (không phải Svelte state) vì DataViewManager bị huỷ/mount lại mỗi lần đổi mục sidebar
// (App.svelte bọc trong {#key activeModuleId}), nên state trong component sẽ bị reset còn
// cờ module-level thì không.
let consumed = false;

// Đọc urlapi/apikey/tablename từ URL fragment (#urlapi=&apikey=&tablename=, không phải query
// string ?...) rồi xoá khỏi thanh địa chỉ ngay sau đó. Fragment không bao giờ được trình duyệt
// gửi lên server trong HTTP request (không như query string), nên apikey không lọt vào access
// log của server/CDN, cũng không lọt vào request của các bot xem-trước-link (Zalo, Messenger,
// Telegram...) khi link được dán vào chat. Trả về patch rỗng nếu không có tham số nào hoặc đã
// đọc rồi trong phiên này.
export function consumeConnectionConfigFromUrl(): Partial<ConnectionConfig> {
  if (consumed || typeof window === "undefined") return {};
  consumed = true;

  const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const patch: Partial<ConnectionConfig> = {};
  let found = false;

  for (const [key, paramName] of Object.entries(PARAM_MAP) as [keyof ConnectionConfig, string][]) {
    const value = params.get(paramName);
    if (value) {
      patch[key] = value;
      found = true;
      params.delete(paramName);
    }
  }

  if (found) {
    const newHash = params.toString();
    const newUrl = window.location.pathname + window.location.search + (newHash ? `#${newHash}` : "");
    window.history.replaceState(null, "", newUrl);
  }

  return patch;
}
```

- Cờ `consumed` khai báo ở module-level (ngoài hàm) → tồn tại suốt vòng đời tab, không bị reset khi `DataViewManager` remount lúc đổi sidebar → đảm bảo đúng nghĩa "chỉ áp dụng lần đầu truy cập".
- Guard `typeof window === "undefined"` giữ nguyên tinh thần comment sẵn có ở dòng 98 của `DataViewManager.svelte` (tránh lỗi khi build tĩnh).

### 2. Gắn vào `DataViewManager.svelte`

`onMount` ở [DataViewManager.svelte:99-118](src/features/data-view/DataViewManager.svelte#L99-L118):

```ts
onMount(() => {
  const stored = localStorage.getItem(module.storageKey);
  if (stored)
    config = {
      ...config,
      ...(JSON.parse(stored) as Partial<ConnectionConfig>),
    };

  // Tham số trên URL fragment (#urlapi=&apikey=&tablename=) luôn ưu tiên hơn cấu hình đã lưu — dùng để
  // chia sẻ link tự động cấu hình kết nối. Đọc xong tự lưu lại localStorage và dọn sạch URL.
  const fromUrl = consumeConnectionConfigFromUrl();
  if (Object.keys(fromUrl).length > 0) {
    config = { ...config, ...fromUrl, table: fromUrl.table?.trim() || config.table };
    localStorage.setItem(module.storageKey, JSON.stringify(config));
  }

  if (config.publicKey) {
    loadFieldConfigs();
    loadRows();
  }
});
```

- Đọc localStorage trước, URL sau, rồi merge đè lên `config` → URL luôn thắng khi có mặt (đúng quyết định #2).
- Ghi lại `localStorage` ngay khi có patch từ URL → đúng quyết định #3 (tự lưu).
- Việc dọn URL (quyết định #4) đã nằm trong `consumeConnectionConfigFromUrl()`.
- Không cần sửa `saveSettings()` hay `ConnectionSettingsPanel.svelte` — 3 ô nhập tay ở tab Cài đặt vẫn hoạt động y như cũ, chỉ là giờ có thêm một nguồn nạp config nữa trước khi người dùng động tay vào.

## Trạng thái

- [x] Tạo `src/lib/utils/connection-from-url.ts` với `consumeConnectionConfigFromUrl()`.
- [x] Sửa `onMount` trong `DataViewManager.svelte` để gọi hàm trên sau bước đọc `localStorage`, merge đè và lưu lại nếu có patch.
- [x] `npm run check` — 0 lỗi.
- [ ] Test thủ công:
  - Mở `#urlapi=...&apikey=...&tablename=...` lần đầu (chưa có localStorage) → 3 ô Cài đặt được điền đúng, dữ liệu tự tải, URL trên thanh địa chỉ sạch tham số.
  - Mở lại app **không** kèm fragment → vẫn giữ cấu hình đã lưu (đọc từ localStorage).
  - Đã có cấu hình cũ trong localStorage, mở link mới với tham số khác → cấu hình mới từ URL ghi đè, lưu lại đúng giá trị mới.
  - Đổi qua lại giữa các mục sidebar sau khi đã tiêu thụ URL fragment → không bị áp lại/ghi đè ngoài ý muốn.
  - Chỉ truyền 1-2 trong 3 tham số (ví dụ chỉ `apikey`) → chỉ field tương ứng được cập nhật, các field còn lại giữ nguyên giá trị cũ.

## Rủi ro còn lại (đã trao đổi với người dùng, chấp nhận)

- Nếu người dùng dán nguyên link (kể cả phần `#...`) vào tin nhắn chat, người nhận đọc được `apikey` bằng mắt thường — không cách nào che được vì bản chất là chia sẻ chuỗi text chứa key. Fragment chỉ chặn được đường lộ tự động qua server log/bot preview, không chặn được việc chia sẻ link thủ công.
- `apikey` là Supabase anon/public key, an toàn dữ liệu phụ thuộc vào RLS đã cấu hình đúng trên các bảng liên quan, không phụ thuộc vào việc giữ bí mật key này.
