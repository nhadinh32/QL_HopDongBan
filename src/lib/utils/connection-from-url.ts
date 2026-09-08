import type { ConnectionConfig } from "$lib/types/data-view";

const PARAM_MAP: Record<keyof ConnectionConfig, string> = {
  url: "urlapi",
  publicKey: "apikey",
  table: "tablename",
};

// Chỉ đọc query string đúng 1 lần cho suốt vòng đời tab trình duyệt — khai báo ở module-level
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
