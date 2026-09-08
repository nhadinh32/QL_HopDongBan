<script lang="ts">
  // Màn hình quản lý một module dữ liệu (một bảng Supabase): giữ state/logic nghiệp vụ,
  // ghép các component UI đã tách. Tổng quát cho mọi module (Hợp đồng bán, Hợp đồng mua, ...)
  // qua prop `module` — component gốc App.svelte render một AppShell/Sidebar dùng chung ở
  // ngoài, mỗi mục sidebar mount một DataViewManager riêng với module tương ứng.
  import { onMount } from "svelte";
  import { createSupabaseRestClient } from "$lib/services/supabase-rest";
  import { consumeConnectionConfigFromUrl } from "$lib/utils/connection-from-url";
  import {
    loadFieldConfig,
    loadFieldConfigRows,
    createFieldConfigRow,
    updateFieldConfigRow,
    deleteFieldConfigRow,
  } from "$lib/services/field-config-service";
  import {
    isNumericType,
    DEFAULT_VIEW_ID,
    DEFAULT_VIEW_LABEL,
    type FieldConfig,
    type FieldConfigRow,
  } from "$lib/types/field-config";
  import type {
    ConnectionConfig,
    DataModuleConfig,
    DataRecord,
    DataValue,
  } from "$lib/types/data-view";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import DataViewTable from "$lib/components/ui/DataViewTable.svelte";
  import DataViewFormModal from "$lib/components/ui/DataViewFormModal.svelte";
  import ConnectionSettingsPanel from "./ConnectionSettingsPanel.svelte";
  import FieldConfigPanel from "./FieldConfigPanel.svelte";
  import FieldConfigFormModal from "./FieldConfigFormModal.svelte";

  export let module: DataModuleConfig;

  // Trạng thái kết nối được bind ra ngoài để App.svelte hiển thị trên badge của topbar chung.
  export let connected = false;
  export let connectionLabel = "Chưa kết nối";

  // Mỗi view (ViewName trong cf_field_config) là một tab; "config"/"settings" là 2 tab cố định
  // còn lại luôn đứng cuối hàng tab.
  function isViewTab(tabId: string): boolean {
    return tabId !== "config" && tabId !== "settings";
  }
  let activeTab = DEFAULT_VIEW_ID;
  // "View đang xem gần nhất" — đồng bộ mỗi khi activeTab là 1 view-tab, dùng để scope tab
  // "Cấu hình" và lọc fieldConfigs cho DataViewTable kể cả khi đang đứng ở tab "Cấu hình"/"Cài đặt".
  let activeViewId = DEFAULT_VIEW_ID;
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
  let listContentReady = false;

  // Danh sách cột THÔ (chưa parse, kèm id/TableName thật) dùng riêng cho tab "Cấu hình" —
  // khác với fieldConfigs (đã parse) dùng cho bảng/lọc/form hồ sơ.
  let fieldConfigRows: FieldConfigRow[] = [];
  let fieldConfigRowsLoading = false;
  let editFieldConfigRow: FieldConfigRow | null | undefined = undefined;
  let deleteFieldConfigRowTarget: FieldConfigRow | null = null;
  let fieldConfigSaveError = "";
  let fieldConfigSaving = false;

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

  function selectTab(tabId: string): void {
    activeTab = tabId;
    if (isViewTab(tabId)) armListContent();
    if (tabId === "config") loadFieldConfigRowsForEditor();
  }

  if (isViewTab(activeTab)) armListContent();

  // Chỉ đọc cấu hình từ localStorage ở trình duyệt để tránh lỗi khi build tĩnh.
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
      config = {
        ...config,
        ...fromUrl,
        table: fromUrl.table?.trim() || config.table,
      };
      localStorage.setItem(module.storageKey, JSON.stringify(config));
    }

    if (config.publicKey) {
      loadFieldConfigs();
      loadRows();
    }
  });

  // Danh sách view (mỗi view = 1 tab) suy ra từ fieldConfigs đã tải — trước khi tải xong,
  // distinctViews rỗng nên fallback về 1 tab tạm dùng chính activeTab để hàng tab không bị thiếu.
  $: distinctViews = fieldConfigs.reduce<{ id: string; label: string }[]>((acc, f) => {
    if (!acc.some((v) => v.id === f.viewId)) acc.push({ id: f.viewId, label: f.viewLabel });
    return acc;
  }, []);
  $: views = distinctViews.length ? distinctViews : [{ id: activeTab, label: DEFAULT_VIEW_LABEL }];
  $: tabs = [
    ...views,
    { id: "config", label: "Cấu hình" },
    { id: "settings", label: "Cài đặt" },
  ];

  // Nếu view đang chọn không còn tồn tại (xóa hết cột của view đó...), rơi về view đầu tiên.
  $: if (
    distinctViews.length &&
    isViewTab(activeTab) &&
    !distinctViews.some((v) => v.id === activeTab)
  ) {
    activeTab = distinctViews[0].id;
  }
  // Đồng bộ "view đang xem gần nhất" mỗi khi activeTab là 1 view-tab.
  $: if (isViewTab(activeTab)) activeViewId = activeTab;

  // Toàn bộ cột (kể cả không hiện trong bảng) CỦA RIÊNG view đang xem — nguồn filter/sort/group/
  // style/width cho DataViewTable, khác với dùng chung fieldConfigs toàn module.
  $: fieldConfigsForActiveView = fieldConfigs.filter((f) => f.viewId === activeViewId);
  // Cột hiện trong bảng danh sách theo mặc định (DefaultDisplayField=true) CỦA RIÊNG view đang xem.
  $: displayFields = fieldConfigsForActiveView.filter((field) => field.defaultDisplay);

  // Danh sách THÔ đã lọc theo view đang chọn — dùng cho tab "Cấu hình" và moveFieldConfigRow.
  $: fieldConfigRowsForActiveView = fieldConfigRows.filter(
    (r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === activeViewId,
  );

  // Loại trùng theo FieldName (ưu tiên dòng xuất hiện trước) — dùng cho form Thêm/Sửa hồ sơ, vì
  // trùng FieldName giữa nhiều view giờ là hợp lệ nhưng form sửa 1 hồ sơ chỉ cần hỏi 1 lần.
  $: recordFormFields = fieldConfigs.reduce<FieldConfig[]>((acc, f) => {
    if (!acc.some((x) => x.field === f.field)) acc.push(f);
    return acc;
  }, []);

  $: connected = Boolean(config.publicKey) && !notice;
  $: connectionLabel = connected
    ? `Đã kết nối · ${config.table}`
    : "Chưa kết nối";

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

  // Tải danh sách cột THÔ cho tab "Cấu hình" — gọi lại mỗi khi vào tab này hoặc sau khi
  // thêm/sửa/xóa/sắp xếp lại một cột.
  async function loadFieldConfigRowsForEditor() {
    if (!config.url || !config.publicKey) return;
    fieldConfigRowsLoading = true;
    try {
      fieldConfigRows = await loadFieldConfigRows(config, module.defaultTable);
    } catch (error) {
      notice = `Không tải được cấu hình cột: ${error instanceof Error ? error.message : String(error)}`;
      fieldConfigRows = [];
    } finally {
      fieldConfigRowsLoading = false;
    }
  }

  // Đồng bộ lại cả 2 nguồn cấu hình sau khi thêm/sửa/xóa/sắp xếp một cột — để tab "Danh sách"
  // (fieldConfigs đã parse) cập nhật ngay, không cần tải lại trang.
  async function refreshFieldConfigs() {
    await Promise.all([loadFieldConfigRowsForEditor(), loadFieldConfigs()]);
  }

  function openCreateFieldConfigRow(): void {
    editFieldConfigRow = null;
    fieldConfigSaveError = "";
  }

  function openEditFieldConfigRow(row: FieldConfigRow): void {
    editFieldConfigRow = row;
    fieldConfigSaveError = "";
  }

  function closeFieldConfigEdit(): void {
    editFieldConfigRow = undefined;
  }

  async function saveFieldConfigRow(
    payload: Omit<
      FieldConfigRow,
      "id" | "TableName" | "DefaultFieldOrderIndex"
    >,
  ) {
    fieldConfigSaving = true;
    fieldConfigSaveError = "";
    try {
      if (editFieldConfigRow) {
        await updateFieldConfigRow(config, editFieldConfigRow.id, payload);
      } else {
        const maxOrderIndex = fieldConfigRows.reduce(
          (max, row) => Math.max(max, row.DefaultFieldOrderIndex ?? 0),
          0,
        );
        await createFieldConfigRow(config, {
          ...payload,
          TableName: module.defaultTable,
          DefaultFieldOrderIndex: maxOrderIndex + 1,
        });
      }
      closeFieldConfigEdit();
      await refreshFieldConfigs();
    } catch (error) {
      fieldConfigSaveError = `Không thể lưu cấu hình cột: ${error instanceof Error ? error.message : String(error)}`;
    } finally {
      fieldConfigSaving = false;
    }
  }

  function requestDeleteFieldConfigRow(row: FieldConfigRow): void {
    deleteFieldConfigRowTarget = row;
  }

  async function removeFieldConfigRow() {
    try {
      if (!deleteFieldConfigRowTarget) return;
      await deleteFieldConfigRow(config, deleteFieldConfigRowTarget.id);
      deleteFieldConfigRowTarget = null;
      await refreshFieldConfigs();
    } catch (error) {
      deleteFieldConfigRowTarget = null;
      notice = `Không thể xóa cấu hình cột: ${error instanceof Error ? error.message : String(error)}`;
    }
  }

  // Đổi chỗ DefaultFieldOrderIndex với hàng liền kề (theo thứ tự đang hiển thị) — không kéo-thả,
  // chỉ hoán đổi 2 giá trị bằng 2 lệnh update chạy song song.
  async function moveFieldConfigRow(
    row: FieldConfigRow,
    direction: "up" | "down",
  ) {
    const index = fieldConfigRowsForActiveView.findIndex((item) => item.id === row.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (
      index === -1 ||
      targetIndex < 0 ||
      targetIndex >= fieldConfigRowsForActiveView.length
    )
      return;
    const target = fieldConfigRowsForActiveView[targetIndex];
    try {
      await Promise.all([
        updateFieldConfigRow(config, row.id, {
          DefaultFieldOrderIndex: target.DefaultFieldOrderIndex,
        }),
        updateFieldConfigRow(config, target.id, {
          DefaultFieldOrderIndex: row.DefaultFieldOrderIndex,
        }),
      ]);
      await refreshFieldConfigs();
    } catch (error) {
      notice = `Không thể đổi thứ tự cột: ${error instanceof Error ? error.message : String(error)}`;
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
    selectTab(activeViewId);
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
      recordFormFields
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
  <div class="mt-2 px-2 border-b-1 border-slate-300 shadow-md z-38 flex flex-col sm:flex-row sm:flex-wrap items-start justify-between gap-2">
    <div class="order-2 sm:order-1">
      <nav
        class="-mb-px flex items-center overflow-x-auto"
        aria-label="Chuyển tab"
      >
        {#each tabs as tab}
          <div
            class="flex items-center gap-1 whitespace-nowrap px-0 py-0 rounded-t text-sm font-medium transition-colors
            {activeTab === tab.id
              ? 'border-b-2 border-primary-500 bg-primary-50 text-primary-700'
              : 'text-slate-500 hover:text-primary-700'}"
          >
            <button
              type="button"
              class="px-2 py-2"
              on:click={() => selectTab(tab.id)}
            >
              {tab.label}
            </button>
          </div>
        {/each}
      </nav>
    </div>
    <div class="order-1 sm:order-2 flex flex-wrap items-center justify-center gap-2">
      <Button on:click={loadRows}>↻ Làm mới</Button>
      <Button
        disabled={!selectedRow}
        on:click={() => selectedRow && openEdit(selectedRow)}>✎ Sửa</Button
      >
      <Button
        variant="primary"
        disabled={fieldConfigLoading || !fieldConfigs.length}
        on:click={openCreate}>＋ Thêm</Button
      >
    </div>
  </div>

  {#if notice}
    <div
      class="mt-6 rounded border-l-4 border-rose-500 bg-rose-50 px-4 py-3 text-sm text-rose-800"
      role="alert"
    >
      {notice}
    </div>
  {/if}

  {#if isViewTab(activeTab)}
    {#if listContentReady}
      {#key activeTab}
        <DataViewTable
          fields={displayFields}
          fieldConfigs={fieldConfigsForActiveView}
          {rows}
          loading={loading || fieldConfigLoading}
          hasConnection={Boolean(config.publicKey)}
          {selectedRow}
          onSelectRow={(row) => (selectedRow = selectedRow === row ? null : row)}
          storageKey={`${module.storageKey}:${activeViewId}`}
        />
      {/key}
    {:else}
      <div class="px-5 py-16 text-center text-sm text-slate-500">
        Đang tải dữ liệu...
      </div>
    {/if}
  {:else if activeTab === "config"}
    <FieldConfigPanel
      rows={fieldConfigRowsForActiveView}
      loading={fieldConfigRowsLoading}
      viewLabel={views.find((v) => v.id === activeViewId)?.label ?? DEFAULT_VIEW_LABEL}
      onCreate={openCreateFieldConfigRow}
      onEdit={openEditFieldConfigRow}
      onDelete={requestDeleteFieldConfigRow}
      onMove={moveFieldConfigRow}
    />
  {:else}
    <div class="mt-2">
      <ConnectionSettingsPanel {config} {savedText} onSubmit={saveSettings} />
    </div>
  {/if}
</section>

{#if editRecord !== undefined}
  <DataViewFormModal
    fields={recordFormFields}
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

{#if editFieldConfigRow !== undefined}
  {@const currentFieldConfigRow = editFieldConfigRow}
  <FieldConfigFormModal
    row={currentFieldConfigRow}
    existingFieldNames={fieldConfigRowsForActiveView.map((row) => row.FieldName)}
    existingViews={views.map((v) => ({ viewId: v.id, viewLabel: v.label }))}
    initialViewId={activeViewId}
    initialViewLabel={views.find((v) => v.id === activeViewId)?.label ?? DEFAULT_VIEW_LABEL}
    saveError={fieldConfigSaveError}
    saving={fieldConfigSaving}
    onClose={closeFieldConfigEdit}
    onSubmit={saveFieldConfigRow}
    onDelete={currentFieldConfigRow
      ? () => requestDeleteFieldConfigRow(currentFieldConfigRow)
      : undefined}
  />
{/if}

{#if deleteFieldConfigRowTarget}
  <ConfirmDialog
    title="Xóa cấu hình cột?"
    description={`Cột "${deleteFieldConfigRowTarget.Label || deleteFieldConfigRowTarget.FieldName}" sẽ bị ẩn khỏi bảng danh sách và form. Dữ liệu thật trong bảng ${config.table} không bị xóa.`}
    confirmLabel="Xóa cấu hình"
    onCancel={() => (deleteFieldConfigRowTarget = null)}
    onConfirm={removeFieldConfigRow}
  />
{/if}
