<script lang="ts">
  // Màn hình quản lý hồ sơ hợp đồng: cấu hình kết nối, danh sách và thao tác CRUD.
  import { onMount } from "svelte";
  import {
    DEFAULT_FIELDS,
    LONG_TEXT_FIELDS,
    NUMERIC_FIELDS,
  } from "$lib/constants/contract-fields";
  import { createSupabaseRestClient } from "$lib/services/supabase-rest";
  import type {
    ConnectionConfig,
    ContractRecord,
    ContractValue,
    SortField,
  } from "$lib/types/contracts";

  const defaultUrl = "https://zjddgdqnqmzyafeoaiej.supabase.co/rest/v1/";
  let activeTab: "data" | "settings" = "data";
  let rows: ContractRecord[] = [];
  let fields: string[] = DEFAULT_FIELDS;
  let sortFields: SortField[] = [
    { field: "SoHopDong", direction: "asc" },
    { field: "LoaiHS", direction: "asc" },
  ];
  let config: ConnectionConfig = {
    url: defaultUrl,
    publicKey: "",
    table: "db_hopdongban",
  };
  let loading = false;
  let notice = "";
  let savedText = "";
  let editRecord: ContractRecord | null | undefined = undefined;
  let deleteRecord: ContractRecord | null = null;
  let formValues: Record<string, string> = {};
  let saveError = "";
  let saving = false;

  // Chỉ đọc cấu hình từ localStorage ở trình duyệt để tránh lỗi khi build tĩnh.
  onMount(() => {
    const stored = localStorage.getItem("contract-manager-config");
    if (stored)
      config = {
        ...config,
        ...(JSON.parse(stored) as Partial<ConnectionConfig>),
      };
    if (config.publicKey) loadRows();
  });

  // Các giá trị dẫn xuất tự cập nhật theo dữ liệu và lựa chọn sắp xếp.
  $: totalValue = rows.reduce(
    (sum, row) => sum + (Number(row.GiaTriHS) || 0),
    0,
  );
  $: displayFields = fields.filter((field) =>
    rows.some((row) => hasValue(row[field])),
  );
  $: sortedRows = sortRows(rows, sortFields);

  const hasValue = (value: ContractValue): boolean =>
    value !== null && value !== undefined && value !== "";
  const isDateField = (field: string): boolean =>
    /^Ngay/.test(field) && field !== "NgayChuyenBuoc_Nam";

  function formatValue(value: ContractValue, field: string): string {
    if (!hasValue(value)) return "—";
    if (field === "GiaTriHS" || field === "TamUng")
      return `${Number(value).toLocaleString("vi-VN")} đ`;
    if (field === "TyLeTamUng")
      return `${(Number(value) * 100).toLocaleString("vi-VN")}%`;
    return String(value);
  }

  function compareValue(
    left: ContractValue,
    right: ContractValue,
    field: string,
  ): number {
    if (!hasValue(left) && !hasValue(right)) return 0;
    if (!hasValue(left)) return 1;
    if (!hasValue(right)) return -1;
    return NUMERIC_FIELDS.has(field)
      ? Number(left) - Number(right)
      : String(left).localeCompare(String(right), "vi", {
          sensitivity: "base",
          numeric: true,
        });
  }

  // Áp dụng lần lượt các cột sắp xếp; phần tử đầu trong rules có ưu tiên cao nhất.
  function sortRows(
    records: ContractRecord[],
    rules: SortField[],
  ): ContractRecord[] {
    return [...records].sort((left, right) => {
      for (const item of rules) {
        const result = compareValue(
          left[item.field],
          right[item.field],
          item.field,
        );
        if (result) return result * (item.direction === "asc" ? 1 : -1);
      }
      return 0;
    });
  }

  // Tải toàn bộ bản ghi qua Supabase REST bằng cấu hình người dùng đã lưu.
  async function loadRows() {
    notice = "";
    if (!config.url || !config.publicKey) return;
    loading = true;
    try {
      const data = await createSupabaseRestClient(config).list();
      rows = Array.isArray(data) ? data : [];
      if (rows.length) fields = [...new Set(rows.flatMap(Object.keys))];
    } catch (error) {
      notice = `Supabase trả về lỗi: ${error instanceof Error ? error.message : String(error)}`;
      rows = [];
    } finally {
      loading = false;
    }
  }

  // Cấu hình chỉ lưu trên trình duyệt hiện tại, không được đưa vào mã nguồn hay GitHub Pages.
  function saveSettings() {
    config = { ...config, table: config.table.trim() || "db_hopdongban" };
    localStorage.setItem("contract-manager-config", JSON.stringify(config));
    savedText = "Đã lưu trên trình duyệt này";
    activeTab = "data";
    loadRows();
  }

  function openCreate() {
    editRecord = null;
    formValues = {};
    saveError = "";
  }

  function openEdit(row: ContractRecord): void {
    editRecord = row;
    formValues = Object.fromEntries(
      Object.entries(row).map(([field, value]) => [
        field,
        value == null ? "" : String(value),
      ]),
    );
    saveError = "";
  }

  function closeEdit() {
    editRecord = undefined;
  }

  function requestDelete(record: ContractRecord | null | undefined): void {
    if (record) deleteRecord = record;
  }

  // Chuẩn hóa chuỗi rỗng thành null và trường số thành number trước khi gửi API.
  async function saveRecord() {
    saving = true;
    saveError = "";
    const payload: Record<string, ContractValue> = Object.fromEntries(
      fields
        .filter((field) => field !== "id" || !editRecord)
        .map((field) => {
          const value = formValues[field];
          return [
            field,
            value === "" || value === undefined
              ? null
              : NUMERIC_FIELDS.has(field)
                ? Number(value)
                : value,
          ];
        }),
    );
    try {
      const api = createSupabaseRestClient(config);
      const saved = editRecord
        ? await api.update(editRecord.id, payload)
        : await api.create(payload);
      if (editRecord && !saved.length)
        throw new Error(
          "Không có bản ghi nào được cập nhật. Kiểm tra quyền UPDATE (RLS) và mã id.",
        );
      closeEdit();
      await loadRows();
    } catch (error) {
      saveError = `Không thể lưu hồ sơ: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      saving = false;
    }
  }

  async function removeRecord() {
    try {
      if (!deleteRecord) return;
      await createSupabaseRestClient(config).remove(deleteRecord.id);
      deleteRecord = null;
      closeEdit();
      await loadRows();
    } catch (error) {
      deleteRecord = null;
      notice = `Không thể xóa hồ sơ: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Mỗi cột luân phiên: tăng dần → giảm dần → tắt; thứ tự bấm xác định độ ưu tiên.
  function toggleSort(field: string): void {
    const existing = sortFields.find((item) => item.field === field);
    if (!existing) {
      sortFields = [...sortFields, { field, direction: "asc" }];
      return;
    }

    sortFields =
      existing.direction === "asc"
        ? sortFields.map((item) =>
            item.field === field ? { ...item, direction: "desc" } : item,
          )
        : sortFields.filter((item) => item.field !== field);
  }
</script>

<svelte:head><title>Khoản mục hợp đồng | Supabase Manager</title></svelte:head>

<!-- Khung ứng dụng và hai chế độ: danh sách dữ liệu / cấu hình kết nối. -->
<div class="shell">
  <header class="topbar">
    <div class="brand">
      <h1>Khoản mục hợp đồng</h1>
      <small>Database workspace</small>
    </div>
    <div class="connection">
      <span class:online={config.publicKey && !notice} class="dot"
      ></span>{config.publicKey && !notice
        ? `Đã kết nối · ${config.table}`
        : "Chưa kết nối"}
    </div>
  </header>
  <main>
    <nav class="tabs" aria-label="Điều hướng">
      <button
        class:active={activeTab === "data"}
        on:click={() => (activeTab = "data")}>Dữ liệu</button
      >
      <button
        class:active={activeTab === "settings"}
        on:click={() => (activeTab = "settings")}>Cài đặt kết nối</button
      >
    </nav>

    {#if activeTab === "data"}
      <section>
        <div class="heading">
          <div>
            <h2>Danh sách hồ sơ</h2>
            <p>Theo dõi và cập nhật dữ liệu trực tiếp trên Supabase</p>
          </div>
          <div class="toolbar">
            <button class="btn" on:click={loadRows}>↻ Làm mới</button><button
              class="btn primary"
              on:click={openCreate}>＋ Thêm hồ sơ</button
            >
          </div>
        </div>
        {#if notice}<div class="notice" role="alert">{notice}</div>{/if}
        <div class="metrics">
          <div class="metric">
            <span>TỔNG HỒ SƠ</span><strong
              >{rows.length.toLocaleString("vi-VN")}</strong
            >
          </div>
          <div class="metric">
            <span>GIÁ TRỊ HỢP ĐỒNG</span><strong
              >{totalValue
                ? `${totalValue.toLocaleString("vi-VN")} đ`
                : "—"}</strong
            >
          </div>
          <div class="metric">
            <span>TRẠNG THÁI</span><strong
              >{loading
                ? "Đang tải"
                : config.publicKey
                  ? notice
                    ? "Lỗi kết nối"
                    : "Đã đồng bộ"
                  : "Chưa kết nối"}</strong
            >
          </div>
        </div>
        <div class="table-wrap">
          {#if loading}<div class="empty">Đang tải dữ liệu...</div>
          {:else if !config.publicKey}<div class="empty">
              Hãy mở tab <b>Cài đặt kết nối</b> để nhập thông tin Supabase.
            </div>
          {:else if !rows.length}<div class="empty">
              Chưa có dữ liệu trong bảng này.
            </div>
          {:else}<table>
              <thead
                ><tr
                  >{#each displayFields as field}<th
                      class:numeric={NUMERIC_FIELDS.has(field)}
                      ><button
                        type="button"
                        on:click={() => toggleSort(field)}
                        title="Bấm để chuyển: tăng dần, giảm dần, tắt"
                        >{field}{#each sortFields as item, index}{#if item.field === field}
                            {item.direction === "asc"
                              ? "↑"
                              : "↓"}{sortFields.length > 1
                              ? index + 1
                              : ""}{/if}{/each}</button
                      ></th
                    >{/each}<th aria-label="Thao tác"></th></tr
                ></thead
              ><tbody
                >{#each sortedRows as row (row.id)}<tr
                    >{#each displayFields as field}<td
                        class:numeric={NUMERIC_FIELDS.has(field)}
                        class:wrap={LONG_TEXT_FIELDS.has(field)}
                        class:muted={!hasValue(row[field])}
                        >{formatValue(row[field], field)}</td
                      >{/each}<td
                      ><div class="actions">
                        <button
                          class="btn icon"
                          aria-label="Sửa"
                          on:click={() => openEdit(row)}>✎</button
                        >
                      </div></td
                    ></tr
                  >{/each}</tbody
              >
            </table>{/if}
        </div>
      </section>
    {:else}
      <section class="settings">
        <div class="heading">
          <div>
            <h2>Cài đặt kết nối</h2>
            <p>Thông tin được lưu trên trình duyệt này.</p>
          </div>
        </div>
        <div class="settings-panel">
          <h3>Supabase REST API</h3>
          <p>Nhập thông tin project và tên bảng để bắt đầu quản lý dữ liệu.</p>
          <form on:submit|preventDefault={saveSettings}>
            <label
              >Supabase API URL<input
                type="url"
                bind:value={config.url}
                required
                placeholder="https://project.supabase.co/rest/v1/"
              /></label
            ><label
              >Public API key · đọc và chỉnh sửa<input
                type="password"
                bind:value={config.publicKey}
                required
                placeholder="sb_publishable_..."
              /></label
            ><label>Tên bảng<input bind:value={config.table} required /></label>
            <div class="settings-actions">
              <span>{savedText}</span><button class="btn primary" type="submit"
                >Lưu và kết nối</button
              >
            </div>
          </form>
        </div>
      </section>
    {/if}
  </main>
</div>

<!-- Modal dùng chung cho tạo mới và cập nhật hồ sơ. -->
{#if editRecord !== undefined}
  <div class="backdrop" role="presentation" on:click|self={closeEdit}>
    <dialog open class="modal" aria-labelledby="edit-title">
      <div class="modal-head">
        <div>
          <h3 id="edit-title">
            {editRecord ? `Sửa hồ sơ #${editRecord.id}` : "Thêm hồ sơ"}
          </h3>
          <p>Nhập giá trị cho các trường dữ liệu.</p>
        </div>
        <button class="btn icon" on:click={closeEdit} aria-label="Đóng"
          >×</button
        >
      </div>
      <form on:submit|preventDefault={saveRecord}>
        <div class="form-grid">
          {#each fields.filter((field) => field !== "id" || !editRecord) as field}<label
              class:wide={LONG_TEXT_FIELDS.has(field)}
              >{field}{#if LONG_TEXT_FIELDS.has(field)}<textarea
                  bind:value={formValues[field]}
                ></textarea>{:else}<input
                  type={isDateField(field)
                    ? "date"
                    : NUMERIC_FIELDS.has(field)
                      ? "number"
                      : "text"}
                  step={NUMERIC_FIELDS.has(field) ? "any" : undefined}
                  bind:value={formValues[field]}
                />{/if}</label
            >{/each}
        </div>
        {#if saveError}<div class="notice">{saveError}</div>{/if}
        <div class="modal-actions">
          {#if editRecord}<button
              type="button"
              class="btn danger modal-delete"
              on:click={() => requestDelete(editRecord)}>Xóa hồ sơ</button
            >{/if}<button type="button" class="btn" on:click={closeEdit}
            >Hủy</button
          ><button type="submit" class="btn primary" disabled={saving}
            >{saving ? "Đang lưu..." : "Lưu hồ sơ"}</button
          >
        </div>
      </form>
    </dialog>
  </div>
{/if}

<!-- Modal xác nhận giúp tránh xóa nhầm bản ghi. -->
{#if deleteRecord}
  <div
    class="backdrop"
    role="presentation"
    on:click|self={() => (deleteRecord = null)}
  >
    <dialog open class="modal confirm">
      <div class="modal-head">
        <div>
          <h3>Xóa hồ sơ?</h3>
          <p>Thao tác này không thể hoàn tác.</p>
        </div>
        <button
          class="btn icon"
          on:click={() => (deleteRecord = null)}
          aria-label="Đóng">×</button
        >
      </div>
      <p>Bạn sắp xóa hồ sơ #{deleteRecord.id} khỏi bảng {config.table}.</p>
      <div class="modal-actions">
        <button class="btn" on:click={() => (deleteRecord = null)}>Hủy</button
        ><button class="btn danger" on:click={removeRecord}>Xóa hồ sơ</button>
      </div>
    </dialog>
  </div>
{/if}
