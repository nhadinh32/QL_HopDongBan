const sampleFields = [
  "id",
  "KhuVucKV",
  "NhomHangMucThiCong",
  "CumCongTrinhC1",
  "CumCongTrinhC2",
  "CongTrinh",
  "SoHopDong",
  "NoiDungHangMuc",
  "LoaiHS",
  "NguoiTrinh",
  "NgayTrinhLanDau",
  "BuocXuLy",
  "NgayChuyenBuoc",
  "GiaTriHS",
  "TinhTrangChung",
  "TinhTrangThiCong",
  "NguoiNhan",
  "ThongTinChiTiet",
  "TyLeTamUng",
  "TamUng",
  "NgayChuyenBuoc_Nam",
  "AnhHuongHSKhac",
  "TinhTrangDTCP",
  "NgayDuKienPD",
  "TuyChon1",
  "TuyChon2",
  "DanhSachCon",
];
const state = {
  rows: [],
  fields: sampleFields,
  editingId: null,
  deletingId: null,
  sortFields: [
    { field: "SoHopDong", direction: "asc" },
    { field: "LoaiHS", direction: "asc" },
  ],
};
const numericFields = new Set(["id", "GiaTriHS", "TyLeTamUng", "TamUng"]);
const $ = (id) => document.getElementById(id);
const cookies = {
  get: (key) =>
    document.cookie
      .split("; ")
      .find((row) => row.startsWith(key + "="))
      ?.split("=")
      .slice(1)
      .join("=") || "",
  set: (key, value) => {
    document.cookie =
      key +
      "=" +
      encodeURIComponent(value) +
      "; max-age=31536000; path=/; SameSite=Lax";
  },
  remove: (key) => {
    document.cookie =
      key + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  },
};
cookies.remove("sb_secret_key");
const defaultSupabaseUrl =
  "https://zjddgdqnqmzyafeoaiej.supabase.co/rest/v1/";
const config = {
  url: decodeURIComponent(cookies.get("sb_url")) || defaultSupabaseUrl,
  publicKey: decodeURIComponent(cookies.get("sb_public_key")),
  table: decodeURIComponent(cookies.get("sb_table")) || "db_hopdongban",
};
function apiBase() {
  let url = config.url.trim().replace(/\/$/, "");
  url = url.replace(/\/rest\/v1\/?$/i, "");
  return url + "/rest/v1";
}
function headers() {
  return {
    apikey: config.publicKey,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}
function showNotice(message) {
  $("notice").textContent = message;
  $("notice").classList.add("show");
}
function clearNotice() {
  $("notice").classList.remove("show");
}
function formatValue(value, field) {
  if (value === null || value === undefined || value === "")
    return '<span class="muted">—</span>';
  if (field === "GiaTriHS" || field === "TamUng")
    return Number(value).toLocaleString("vi-VN") + " đ";
  if (field === "TyLeTamUng")
    return (Number(value) * 100).toLocaleString("vi-VN") + "%";
  return escapeHtml(String(value));
}
function escapeHtml(value) {
  return value.replace(
    /[&<>'"]/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        char
      ],
  );
}
function hasValue(value) {
  return value !== null && value !== undefined && value !== "";
}
function compareValues(left, right, field) {
  if (!hasValue(left) && !hasValue(right)) return 0;
  if (!hasValue(left)) return 1;
  if (!hasValue(right)) return -1;
  if (numericFields.has(field)) return Number(left) - Number(right);
  return String(left).localeCompare(String(right), "vi", {
    sensitivity: "base",
    numeric: true,
  });
}
function sortRows(rows) {
  return [...rows].sort((left, right) => {
    for (const sortItem of state.sortFields) {
      const result = compareValues(left[sortItem.field], right[sortItem.field], sortItem.field);
      if (result !== 0) return result * (sortItem.direction === "asc" ? 1 : -1);
    }
    return 0;
  });
}
function renderTable() {
  $("rowCount").textContent = state.rows.length.toLocaleString("vi-VN");
  $("dataState").textContent = "Đã đồng bộ";
  const total = state.rows.reduce(
    (sum, row) => sum + (Number(row.GiaTriHS) || 0),
    0,
  );
  $("totalValue").textContent = total
    ? total.toLocaleString("vi-VN") + " đ"
    : "—";
  if (!state.rows.length) {
    $("tableArea").innerHTML =
      '<div class="empty">Chưa có dữ liệu trong bảng này.</div>';
    return;
  }
  const displayFields = state.fields.filter((field) =>
    state.rows.some((row) => hasValue(row[field])),
  );
  $("tableArea").innerHTML =
    "<table><thead><tr>" +
    displayFields
      .map(
        (field) =>
          '<th class="' +
          (numericFields.has(field) ? "numeric" : "") +
          '" data-sort-field="' +
          escapeHtml(field) +
          '"><button class="sort-button" type="button">' +
          escapeHtml(field) +
          (() => {
            const sortIndex = state.sortFields.findIndex(
              (sortItem) => sortItem.field === field,
            );
            if (sortIndex === -1) return "";
            const direction = state.sortFields[sortIndex].direction === "asc" ? "↑" : "↓";
            return " " + direction + (state.sortFields.length > 1 ? sortIndex + 1 : "");
          })() +
          "</button></th>",
      )
      .join("") +
    "<th>Thao tác</th></tr></thead><tbody>" +
    sortRows(state.rows)
      .map(
        (row) =>
          "<tr>" +
          displayFields
            .map(
              (field) =>
                '<td class="' +
                [
                  field === "ThongTinChiTiet" || field === "NoiDungHangMuc"
                    ? "wrap"
                    : "",
                  numericFields.has(field) ? "numeric" : "",
                ]
                  .filter(Boolean)
                  .join(" ") +
                '">' +
                (field === "id"
                  ? "<strong>" + formatValue(row[field], field) + "</strong>"
                  : formatValue(row[field], field)) +
                "</td>",
            )
            .join("") +
          '<td><div class="actions"><button class="btn icon" data-edit="' +
          escapeHtml(String(row.id)) +
          '" aria-label="Sửa">✎</button><button class="btn icon danger" data-delete="' +
          escapeHtml(String(row.id)) +
          '" aria-label="Xóa">⌫</button></div></td></tr>',
      )
      .join("") +
    "</tbody></table>";
  document
    .querySelectorAll("[data-edit]")
    .forEach((button) =>
      button.addEventListener("click", () => openEdit(button.dataset.edit)),
    );
  document
    .querySelectorAll("[data-delete]")
    .forEach((button) =>
      button.addEventListener("click", () => openDelete(button.dataset.delete)),
    );
  document.querySelectorAll("[data-sort-field]").forEach((header) =>
    header.addEventListener("click", (event) => {
      const field = header.dataset.sortField;
      const existing = state.sortFields.find((sortItem) => sortItem.field === field);
      if (event.shiftKey) {
        if (existing) {
          existing.direction = existing.direction === "asc" ? "desc" : "asc";
        } else {
          state.sortFields.push({ field, direction: "asc" });
        }
        state.sortFields.sort(
          (left, right) =>
            displayFields.indexOf(left.field) - displayFields.indexOf(right.field),
        );
      } else if (existing && state.sortFields.length === 1) {
        existing.direction = existing.direction === "asc" ? "desc" : "asc";
      } else {
        state.sortFields = [{ field, direction: "asc" }];
      }
      renderTable();
    }),
  );
}
async function loadRows() {
  clearNotice();
  if (!config.url || !config.publicKey) {
    $("tableArea").innerHTML =
      '<div class="empty">Hãy mở tab <b>Cài đặt kết nối</b> để nhập thông tin Supabase.</div>';
    $("dataState").textContent = "Chưa kết nối";
    return;
  }
  $("tableArea").innerHTML = '<div class="loading">Đang tải dữ liệu...</div>';
  try {
    const response = await fetch(
      apiBase() + "/" + encodeURIComponent(config.table) + "?select=*",
      { headers: headers("read") },
    );
    if (!response.ok) throw new Error(await response.text());
    const data = await response.json();
    state.rows = Array.isArray(data) ? data : [];
    if (state.rows.length)
      state.fields = [
        ...new Set(state.rows.flatMap((row) => Object.keys(row))),
      ];
    $("statusText").textContent = "Đã kết nối · " + config.table;
    $("statusDot").classList.add("online");
    renderTable();
  } catch (error) {
    $("tableArea").innerHTML =
      '<div class="empty">Không thể tải dữ liệu.</div>';
    $("dataState").textContent = "Lỗi kết nối";
    showNotice("Supabase trả về lỗi: " + error.message);
  }
}
function openEdit(id) {
  state.editingId = id;
  $("saveError").textContent = "";
  $("saveError").classList.remove("show");
  const row = state.rows.find((item) => String(item.id) === String(id));
  $("modalTitle").textContent = row ? "Sửa hồ sơ #" + id : "Thêm hồ sơ";
  const fields = state.fields.filter((field) => field !== "id" || !row);
  $("recordFields").innerHTML = fields
    .map((field) => {
      const value = row?.[field] ?? "";
      const isLong = [
        "ThongTinChiTiet",
        "NoiDungHangMuc",
        "DanhSachCon",
      ].includes(field);
      const isDate = /^Ngay/.test(field) && field !== "NgayChuyenBuoc_Nam";
      const type = isDate
        ? "date"
        : typeof value === "number"
          ? "number"
          : "text";
      return (
        '<div class="field ' +
        (isLong ? "wide" : "") +
        '"><label for="field-' +
        field +
        '">' +
        escapeHtml(field) +
        "</label>" +
        (isLong
          ? '<textarea id="field-' +
            field +
            '" data-field="' +
            field +
            '">' +
            escapeHtml(String(value)) +
            "</textarea>"
          : '<input id="field-' +
            field +
            '" data-field="' +
            field +
            '" type="' +
            type +
            '" value="' +
            escapeHtml(String(value)) +
            '">') +
        "</div>"
      );
    })
    .join("");
  $("editModal").classList.add("open");
}
function openDelete(id) {
  state.deletingId = id;
  $("deleteMessage").textContent =
    "Bạn sắp xóa hồ sơ #" + id + " khỏi bảng " + config.table + ".";
  $("deleteModal").classList.add("open");
}
function closeModal(id) {
  $(id).classList.remove("open");
}
async function saveRecord(event) {
  event.preventDefault();
  const saveButton = event.currentTarget.querySelector('button[type="submit"]');
  saveButton.disabled = true;
  saveButton.textContent = "Đang lưu...";
  $("saveError").textContent = "";
  $("saveError").classList.remove("show");
  const payload = {};
  document.querySelectorAll("#recordFields [data-field]").forEach((input) => {
    if (input.value !== "")
      payload[input.dataset.field] =
        input.type === "number" ? Number(input.value) : input.value;
    else payload[input.dataset.field] = null;
  });
  const editing = state.editingId !== null;
  try {
    if (!config.publicKey) throw new Error("Chưa nhập Public API key.");
    const url =
      apiBase() +
      "/" +
      encodeURIComponent(config.table) +
      (editing
        ? "?id=eq." + encodeURIComponent(state.editingId) + "&select=*"
        : "?select=*");
    const response = await fetch(url, {
      method: editing ? "PATCH" : "POST",
      headers: headers(),
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error(await response.text());
    const responseText = await response.text();
    const savedRows = responseText ? JSON.parse(responseText) : [];
    if (editing && (!Array.isArray(savedRows) || savedRows.length === 0)) {
      throw new Error(
        "Không có bản ghi nào được cập nhật. Kiểm tra quyền UPDATE (RLS) và mã id.",
      );
    }
    closeModal("editModal");
    await loadRows();
  } catch (error) {
    $("saveError").textContent = "Không thể lưu hồ sơ: " + error.message;
    $("saveError").classList.add("show");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Lưu hồ sơ";
  }
}
async function deleteRecord() {
  try {
    if (!config.publicKey) throw new Error("Chưa nhập Public API key.");
    const response = await fetch(
      apiBase() +
        "/" +
        encodeURIComponent(config.table) +
        "?id=eq." +
        encodeURIComponent(state.deletingId),
      { method: "DELETE", headers: headers() },
    );
    if (!response.ok) throw new Error(await response.text());
    closeModal("deleteModal");
    await loadRows();
  } catch (error) {
    closeModal("deleteModal");
    showNotice("Không thể xóa hồ sơ: " + error.message);
  }
}
document.querySelectorAll(".tab").forEach((tab) =>
  tab.addEventListener("click", () => {
    document
      .querySelectorAll(".tab, .view")
      .forEach((element) => element.classList.remove("active"));
    tab.classList.add("active");
    $(tab.dataset.tab + "View").classList.add("active");
  }),
);
$("settingsForm").addEventListener("submit", (event) => {
  event.preventDefault();
  config.url = $("apiUrl").value.trim();
  config.publicKey = $("publicApiKey").value.trim();
  config.table = $("tableName").value.trim() || "db_hopdongban";
  cookies.set("sb_url", config.url);
  cookies.set("sb_public_key", config.publicKey);
  cookies.set("sb_table", config.table);
  $("savedText").textContent = "Đã lưu trong cookie";
  document.querySelector('[data-tab="data"]').click();
  loadRows();
});
$("recordForm").addEventListener("submit", saveRecord);
$("confirmDelete").addEventListener("click", deleteRecord);
$("refreshBtn").addEventListener("click", loadRows);
$("addBtn").addEventListener("click", () => openEdit(null));
document
  .querySelectorAll("[data-close]")
  .forEach((button) =>
    button.addEventListener("click", () => closeModal(button.dataset.close)),
  );
document.querySelectorAll(".modal-backdrop").forEach((backdrop) =>
  backdrop.addEventListener("click", (event) => {
    if (event.target === backdrop) closeModal(backdrop.id);
  }),
);
$("apiUrl").value = config.url;
$("publicApiKey").value = config.publicKey;
$("tableName").value = config.table;
loadRows();
