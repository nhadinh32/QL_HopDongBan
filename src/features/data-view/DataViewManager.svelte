<script lang="ts">
  // Màn hình quản lý một module dữ liệu (một bảng Supabase): giữ state/logic nghiệp vụ,
  // ghép các component UI đã tách. Tổng quát cho mọi module (Hợp đồng bán, Hợp đồng mua, ...)
  // qua prop `module` — component gốc App.svelte render một AppShell/Sidebar dùng chung ở
  // ngoài, mỗi mục sidebar mount một DataViewManager riêng với module tương ứng.
  import { onMount } from "svelte";
  import { createSupabaseRestClient } from "$lib/services/supabase-rest";
  import { loadFieldConfig } from "$lib/services/field-config-service";
  import { isNumericType, type FieldConfig } from "$lib/types/field-config";
  import type {
    ConnectionConfig,
    DataModuleConfig,
    DataRecord,
    DataValue,
  } from "$lib/types/data-view";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import StatCards from "./StatCards.svelte";
  import DataViewTable from "$lib/components/ui/DataViewTable.svelte";
  import DataViewFormModal from "$lib/components/ui/DataViewFormModal.svelte";
  import ConnectionSettingsPanel from "./ConnectionSettingsPanel.svelte";

  export let module: DataModuleConfig;

  // Trạng thái kết nối được bind ra ngoài để App.svelte hiển thị trên badge của topbar chung.
  export let connected = false;
  export let connectionLabel = "Chưa kết nối";

  // Ba tab ngang trong một module: tổng quan (thống kê) → danh sách (bảng) → cài đặt kết nối.
  const tabs: { id: "overview" | "list" | "settings"; label: string }[] = [
    { id: "overview", label: "Tổng quan" },
    { id: "list", label: "Danh sách" },
    { id: "settings", label: "Cài đặt" },
  ];
  let activeTab: "overview" | "list" | "settings" = "list";
  let rows: DataRecord[] = [];
  // Cấu hình cột đọc động từ cf_field_config (TableName = module.defaultTable) — nguồn duy
  // nhất quyết định field nào tồn tại, thay cho module.defaultFields tĩnh trước đây.
  let fieldConfigs: FieldConfig[] = [];
  let fieldConfigLoading = false;
  let config: ConnectionConfig = {
    url: module.defaultUrl,
    publicKey: "",
    table: module.defaultTable,
  };
  let loading = false;
  let notice = "";
  let savedText = "";
  let editRecord: DataRecord | null | undefined = undefined;
  let deleteRecord: DataRecord | null = null;
  // Dòng đang chọn trong bảng danh sách (bấm 1 dòng để chọn/bỏ chọn) — nút "Sửa" trên thanh
  // công cụ thao tác lên dòng này thay vì có nút sửa nổi riêng theo từng dòng.
  let selectedRow: DataRecord | null = null;
  let formValues: Record<string, string> = {};
  let saveError = "";
  let saving = false;
  let showFilters = true;
  let listContentReady = false;

  // Trì hoãn việc mount DataViewTable đúng 1 nhịp (setTimeout 0 — chạy sau khi trình duyệt đã
  // kịp vẽ xong lượt cập nhật hiện tại, gồm cả trạng thái tab đang chọn) để bấm tab phản hồi
  // ngay lập tức, còn phần dựng bảng (nặng: tính lại filter/sort/group + tạo DOM) hiện
  // "Đang tải dữ liệu..." trước rồi mới chạy, giống trải nghiệm lần đầu vào trang.
  function armListContent(): void {
    listContentReady = false;
    setTimeout(() => {
      listContentReady = true;
    }, 0);
  }

  function selectTab(tabId: "overview" | "list" | "settings"): void {
    activeTab = tabId;
    if (tabId === "list") armListContent();
  }

  if (activeTab === "list") armListContent();

  // Chỉ đọc cấu hình từ localStorage ở trình duyệt để tránh lỗi khi build tĩnh.
  onMount(() => {
    const stored = localStorage.getItem(module.storageKey);
    if (stored)
      config = {
        ...config,
        ...(JSON.parse(stored) as Partial<ConnectionConfig>),
      };
    if (config.publicKey) {
      loadFieldConfigs();
      loadRows();
    }
  });

  // Cột hiện trong bảng danh sách theo mặc định (DefaultDisplayField=true); form nhập liệu
  // vẫn luôn dùng toàn bộ fieldConfigs (trừ id) để không "giấu mất" field nào lúc sửa.
  $: displayFields = fieldConfigs.filter((field) => field.defaultDisplay);
  $: connected = Boolean(config.publicKey) && !notice;
  $: statusLabel = loading
    ? "Đang tải"
    : config.publicKey
      ? notice
        ? "Lỗi kết nối"
        : "Đã đồng bộ"
      : "Chưa kết nối";
  $: connectionLabel = connected ? `Đã kết nối · ${config.table}` : "Chưa kết nối";

  // Tải cấu hình cột từ cf_field_config (TableName = module.defaultTable, xem
  // field-config-service.ts) — độc lập với loadRows(), gọi song song lúc kết nối sẵn sàng.
  async function loadFieldConfigs() {
    fieldConfigLoading = true;
    try {
      fieldConfigs = await loadFieldConfig(config, module.defaultTable);
    } catch (error) {
      notice = `Không tải được cấu hình cột: ${error instanceof Error ? error.message : String(error)}`;
      fieldConfigs = [];
    } finally {
      fieldConfigLoading = false;
    }
  }

  // Tải toàn bộ bản ghi qua Supabase REST bằng cấu hình người dùng đã lưu.
  async function loadRows() {
    notice = "";
    selectedRow = null;
    if (!config.url || !config.publicKey) return;
    loading = true;
    try {
      const data = await createSupabaseRestClient(config).list();
      rows = Array.isArray(data) ? data : [];
    } catch (error) {
      notice = `Supabase trả về lỗi: ${error instanceof Error ? error.message : String(error)}`;
      rows = [];
    } finally {
      loading = false;
    }
  }

  // Cấu hình chỉ lưu trên trình duyệt hiện tại, không được đưa vào mã nguồn hay GitHub Pages.
  function saveSettings() {
    config = { ...config, table: config.table.trim() || module.defaultTable };
    localStorage.setItem(module.storageKey, JSON.stringify(config));
    savedText = "Đã lưu trên trình duyệt này";
    selectTab("list");
    loadFieldConfigs();
    loadRows();
  }

  // Số id nhỏ nhất chưa được dùng, để tự động điền cho hồ sơ mới thay vì cho gõ tự do.
  function nextAvailableId(): number {
    const usedIds = new Set(
      rows.map((row) => Number(row.id)).filter((id) => Number.isFinite(id)),
    );
    let candidate = 1;
    while (usedIds.has(candidate)) candidate++;
    return candidate;
  }

  function openCreate() {
    editRecord = null;
    formValues = { id: String(nextAvailableId()) };
    saveError = "";
  }

  function openEdit(row: DataRecord): void {
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

  function requestDelete(record: DataRecord | null | undefined): void {
    if (record) deleteRecord = record;
  }

  // Chuẩn hóa chuỗi rỗng thành null và trường số thành number trước khi gửi API.
  async function saveRecord() {
    saving = true;
    saveError = "";
    const payload: Record<string, DataValue> = Object.fromEntries(
      fieldConfigs
        .filter((field) => field.field !== "id" || !editRecord)
        .map((field) => {
          const value = formValues[field.field];
          return [
            field.field,
            value === "" || value === undefined
              ? null
              : isNumericType(field.type)
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

</script>

<svelte:head><title>{module.label}</title></svelte:head>

<section class="flex h-full min-h-0 flex-col overflow-hidden">
  <div class="mt-2 mx-2 flex flex-wrap items-start justify-end gap-2">
        <Button on:click={loadRows}>↻ Làm mới</Button>
        <Button disabled={!selectedRow} on:click={() => selectedRow && openEdit(selectedRow)}
          >✎ Sửa</Button
        >
        <Button
          variant="primary"
          disabled={fieldConfigLoading || !fieldConfigs.length}
          on:click={openCreate}>＋ Thêm</Button
        >
  </div>

  <div class="mt-2 px-2 border-b-1 border-slate-300 shadow-md z-38">
    <nav class="-mb-px flex items-center overflow-x-auto" aria-label="Chuyển tab">
      {#each tabs as tab}
        <div class="flex items-center gap-1 whitespace-nowrap px-2 py-2 rounded-t text-sm font-medium transition-colors
            {activeTab === tab.id ? 'border-b-2 border-primary-500 bg-primary-50 text-primary-700' : 'text-slate-500 hover:text-primary-700'}">
          <button
            type="button"
            class=""
            on:click={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
          {#if tab.id === "list"}
            <Button
              ariaLabel="Bộ lọc"
              title="Bộ lọc"
              variant="ghost"
              extraClass="!m-0 !p-0 !px-1 hover:!bg-primary-100"
              on:click={() => (showFilters = !showFilters)}
            >
              <svg
                class="h-4 w-4 shrink-0"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="1.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              >
                <path d="M4 5h16l-6 8v6l-4 2v-8z" />
              </svg>
            </Button>
          {/if}
        </div>
      {/each}
    </nav>
  </div>

  {#if notice}
    <div
      class="mt-6 rounded border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      role="alert"
    >
      {notice}
    </div>
  {/if}

  {#if activeTab === "overview"}
    <div class="mt-2">
      <StatCards totalRows={rows.length} {statusLabel} />
    </div>
  {:else if activeTab === "list"}
    {#if listContentReady}
      <DataViewTable
        fields={displayFields}
        {fieldConfigs}
        {rows}
        loading={loading || fieldConfigLoading}
        hasConnection={Boolean(config.publicKey)}
        {selectedRow}
        onSelectRow={(row) => (selectedRow = selectedRow === row ? null : row)}
        {showFilters}
        storageKey={module.storageKey}
      />
    {:else}
      <div class="px-5 py-16 text-center text-sm text-slate-500">Đang tải dữ liệu...</div>
    {/if}
  {:else}
    <div class="mt-2">
      <ConnectionSettingsPanel {config} {savedText} onSubmit={saveSettings} />
    </div>
  {/if}
</section>

{#if editRecord !== undefined}
  <DataViewFormModal
    fields={fieldConfigs}
    {editRecord}
    {formValues}
    {saveError}
    {saving}
    onClose={closeEdit}
    onSubmit={saveRecord}
    onDelete={() => requestDelete(editRecord)}
  />
{/if}

{#if deleteRecord}
  <ConfirmDialog
    title="Xóa hồ sơ?"
    description={`Bạn sắp xóa hồ sơ #${deleteRecord.id} khỏi bảng ${config.table}.`}
    confirmLabel="Xóa hồ sơ"
    onCancel={() => (deleteRecord = null)}
    onConfirm={removeRecord}
  />
{/if}
