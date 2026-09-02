<script lang="ts">
  // Màn hình quản lý một module dữ liệu (một bảng Supabase): giữ state/logic nghiệp vụ,
  // ghép các component UI đã tách. Tổng quát cho mọi module (Hợp đồng bán, Hợp đồng mua, ...)
  // qua prop `module` — component gốc App.svelte render một AppShell/Sidebar dùng chung ở
  // ngoài, mỗi mục sidebar mount một ContractManager riêng với module tương ứng.
  import { onMount } from "svelte";
  import { createSupabaseRestClient } from "$lib/services/supabase-rest";
  import { hasValue } from "$lib/utils/contract-format";
  import {
    computeFilterFields,
    countActiveFilters,
    matchesFilters,
    type ColumnFilters,
  } from "$lib/utils/contract-filters";
  import type {
    ConnectionConfig,
    ContractModuleConfig,
    ContractRecord,
    ContractValue,
    SortField,
  } from "$lib/types/contracts";
  import Button from "$lib/components/ui/Button.svelte";
  import ConfirmDialog from "$lib/components/ui/ConfirmDialog.svelte";
  import StatCards from "./StatCards.svelte";
  import ContractTable from "./ContractTable.svelte";
  import ContractFilters from "./ContractFilters.svelte";
  import ContractFormModal from "./ContractFormModal.svelte";
  import ConnectionSettingsPanel from "./ConnectionSettingsPanel.svelte";

  export let module: ContractModuleConfig;

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
  let rows: ContractRecord[] = [];
  let fields: string[] = module.defaultFields;
  let sortFields: SortField[] = module.defaultSortFields;
  let config: ConnectionConfig = {
    url: module.defaultUrl,
    publicKey: "",
    table: module.defaultTable,
  };
  let loading = false;
  let notice = "";
  let savedText = "";
  let editRecord: ContractRecord | null | undefined = undefined;
  let deleteRecord: ContractRecord | null = null;
  let formValues: Record<string, string> = {};
  let saveError = "";
  let saving = false;
  let showFilters = true;
  let filters: ColumnFilters = {};
  // Chỉ ghi bộ lọc vào localStorage SAU khi đã đọc xong ở onMount, tránh việc ghi đè
  // giá trị rỗng ban đầu lên bộ lọc đã lưu từ trước khi kịp đọc ra.
  let filtersLoaded = false;
  const filtersStorageKey = `${module.storageKey}:filters`;

  // Chỉ đọc cấu hình từ localStorage ở trình duyệt để tránh lỗi khi build tĩnh.
  onMount(() => {
    const stored = localStorage.getItem(module.storageKey);
    if (stored)
      config = {
        ...config,
        ...(JSON.parse(stored) as Partial<ConnectionConfig>),
      };
    const storedFilters = localStorage.getItem(filtersStorageKey);
    if (storedFilters) {
      try {
        filters = JSON.parse(storedFilters) as ColumnFilters;
      } catch {
        // Bỏ qua dữ liệu lỗi, giữ bộ lọc rỗng.
      }
    }
    filtersLoaded = true;
    if (config.publicKey) loadRows();
  });

  $: if (filtersLoaded) localStorage.setItem(filtersStorageKey, JSON.stringify(filters));

  // Các giá trị dẫn xuất tự cập nhật theo dữ liệu và lựa chọn sắp xếp.
  $: totalValue = module.fieldConfig.totalValueField
    ? rows.reduce(
        (sum, row) => sum + (Number(row[module.fieldConfig.totalValueField!]) || 0),
        0,
      )
    : 0;
  // Bộ lọc do người dùng chọn/gõ theo từng cột đang hiển thị (id không có ô lọc riêng).
  $: filterFields = computeFilterFields(
    fields.filter((field) => field !== "id"),
    rows,
    module.fieldConfig,
  );
  $: activeFilterCount = countActiveFilters(filters, filterFields);
  $: filteredRows = rows.filter((row) => matchesFilters(row, filters, filterFields));
  $: sortedRows = sortRows(filteredRows, sortFields);
  $: connected = Boolean(config.publicKey) && !notice;
  $: statusLabel = loading
    ? "Đang tải"
    : config.publicKey
      ? notice
        ? "Lỗi kết nối"
        : "Đã đồng bộ"
      : "Chưa kết nối";
  $: connectionLabel = connected ? `Đã kết nối · ${config.table}` : "Chưa kết nối";

  function compareValue(
    left: ContractValue,
    right: ContractValue,
    field: string,
  ): number {
    if (!hasValue(left) && !hasValue(right)) return 0;
    if (!hasValue(left)) return 1;
    if (!hasValue(right)) return -1;
    return module.fieldConfig.numericFields.has(field)
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
    config = { ...config, table: config.table.trim() || module.defaultTable };
    localStorage.setItem(module.storageKey, JSON.stringify(config));
    savedText = "Đã lưu trên trình duyệt này";
    activeTab = "list";
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

  function updateFilter(key: string, value: string): void {
    filters = { ...filters, [key]: value };
  }

  function clearFilters(): void {
    filters = {};
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
              : module.fieldConfig.numericFields.has(field)
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

<svelte:head><title>{module.label}</title></svelte:head>

<section>
  <div class="flex flex-wrap items-start justify-between gap-3">
    <div>
      <h2 class="text-2xl font-semibold text-slate-900">{module.label}</h2>
    </div> 
      <div class="flex gap-2">
        <Button on:click={() => (showFilters = !showFilters)}
          >{showFilters === true ? "↑" : "↓"} Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}</Button
        >
        <Button on:click={loadRows}>↻ Làm mới</Button>
        <Button variant="primary" on:click={openCreate}>＋ Thêm hồ sơ</Button>
      </div>
  </div>

  <div class="mt-4 border-b border-slate-200">
    <nav class="-mb-px flex gap-6 overflow-x-auto" aria-label="Chuyển tab">
      {#each tabs as tab}
        <button
          type="button"
          class="whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium transition-colors {activeTab ===
          tab.id
            ? 'border-primary-600 text-primary-700'
            : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'}"
          on:click={() => (activeTab = tab.id)}
        >
          {tab.label}
        </button>
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
      <StatCards
        totalRows={rows.length}
        totalValueLabel={totalValue ? `${totalValue.toLocaleString("vi-VN")} đ` : "—"}
        {statusLabel}
      />
    </div>
  {:else if activeTab === "list"}
    <div class="mt-2 space-y-3">
      {#if showFilters}
        <ContractFilters
          {filterFields}
          {filters}
          activeCount={activeFilterCount}
          onChange={updateFilter}
          onClear={clearFilters}
        />
      {/if}
      {#if activeFilterCount > 0}
        <p class="text-xs text-slate-500">
          Hiển thị {sortedRows.length.toLocaleString("vi-VN")}/{rows.length.toLocaleString(
            "vi-VN",
          )} hồ sơ khớp bộ lọc.
        </p>
      {/if}
      <ContractTable
        {fields}
        rows={sortedRows}
        {sortFields}
        {loading}
        hasConnection={Boolean(config.publicKey)}
        fieldConfig={module.fieldConfig}
        onToggleSort={toggleSort}
        onEdit={openEdit}
      />
    </div>
  {:else}
    <div class="mt-2">
      <ConnectionSettingsPanel {config} {savedText} onSubmit={saveSettings} />
    </div>
  {/if}
</section>

{#if editRecord !== undefined}
  <ContractFormModal
    {fields}
    {editRecord}
    {formValues}
    {saveError}
    {saving}
    fieldConfig={module.fieldConfig}
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
