<script lang="ts">
  // "Nhạc trưởng" riêng cho tab "Cấu hình" — tách khỏi DataViewManager.svelte để file đó không
  // phải biết gì về ViewName/CRUD cột nữa (xem .claude/plans/field-config-tab-orchestrator-plan.md).
  // Vì DataViewManager chỉ render component này bên trong {#if activeTab === "config"}, Svelte
  // tự hủy/tạo mới component mỗi khi rời/vào lại tab — nên state ở đây (configViewId...) tự
  // "reset" đúng ý mỗi lần vào lại tab mà không cần logic đặc biệt nào.
  import { onMount } from "svelte";
  import {
    loadFieldConfigRows,
    createFieldConfigRow,
    updateFieldConfigRow,
    deleteFieldConfigRow,
  } from "$lib/services/field-config-service";
  import { DEFAULT_VIEW_ID, DEFAULT_VIEW_LABEL, type FieldConfigRow } from "$lib/types/field-config";
  import type { ConnectionConfig } from "$lib/types/data-view";
  import FieldConfigViewList from "./FieldConfigViewList.svelte";
  import FieldConfigPanel from "./FieldConfigPanel.svelte";
  import FieldConfigFormModal from "./FieldConfigFormModal.svelte";

  export let config: ConnectionConfig;
  // TableName cố định của module (module.defaultTable) — dùng để lọc/gán cf_field_config, khác
  // với config.table (tên bảng dữ liệu thật đang kết nối, người dùng có thể đổi ở tab Cài đặt).
  export let tableName: string;
  // View dữ liệu vừa xem trước khi bấm "Cấu hình" — chỉ dùng làm giá trị khởi tạo configViewId.
  export let initialViewId: string;
  // Gọi sau mỗi lần thêm/sửa/xóa/sắp xếp cột HOẶC view thành công, để DataViewManager tải lại
  // fieldConfigs (đã parse) — cập nhật tab "Danh sách" + hàng tab dữ liệu ngay, không cần F5.
  export let onChanged: () => void;
  // Đẩy lỗi lên banner `notice` chung của DataViewManager (cùng chỗ hiển thị lỗi load/lưu hồ sơ).
  export let onError: (message: string) => void;

  // Danh sách cột THÔ (chưa parse, kèm id/TableName thật) — nguồn duy nhất cho toàn bộ CRUD
  // View/cột trong tab này, độc lập với fieldConfigs (đã parse) mà DataViewManager giữ riêng.
  let fieldConfigRows: FieldConfigRow[] = [];
  let fieldConfigRowsLoading = false;
  let editFieldConfigRow: FieldConfigRow | null | undefined = undefined;
  let deleteFieldConfigRowTarget: FieldConfigRow | null = null;
  let fieldConfigSaveError = "";
  let fieldConfigSaving = false;

  // View đang chọn để xem/sửa cột — khởi tạo = initialViewId (view dữ liệu vừa xem trước khi
  // bấm "Cấu hình"), sau đó người dùng đổi tự do trong sidebar mà không ảnh hưởng tab dữ liệu
  // ngoài (DataViewManager không biết gì về configViewId).
  let configViewId = initialViewId;
  // Đặt trước khi mở modal thêm cột cho 1 view VỪA được tạo qua FieldConfigViewList (chưa có
  // cột nào nên chưa xuất hiện trong `viewsWithCount`) — null nghĩa là modal đang mở cho view đã
  // có sẵn (configViewId).
  let pendingNewView: { id: string; label: string } | null = null;

  onMount(loadRows);

  // Mỗi view kèm nhãn + số cột đang cấu hình, suy thẳng từ fieldConfigRows của chính component
  // này (không phụ thuộc fieldConfigs/views mà DataViewManager giữ riêng cho hàng tab dữ liệu
  // ngoài) — thứ tự giữ đúng thứ tự xuất hiện đầu tiên, vì loadFieldConfigRows() đã sắp theo
  // DefaultFieldOrderIndex.
  $: viewsWithCount = fieldConfigRows.reduce<{ id: string; label: string; columnCount: number }[]>(
    (acc, r) => {
      const id = r.ViewName?.[0] || DEFAULT_VIEW_ID;
      const label = r.ViewName?.[1] || DEFAULT_VIEW_LABEL;
      const existing = acc.find((v) => v.id === id);
      if (existing) existing.columnCount++;
      else acc.push({ id, label, columnCount: 1 });
      return acc;
    },
    [],
  );
  // Nếu view đang chọn không còn tồn tại (vừa xóa/vừa xóa hết cột), rơi về view đầu tiên.
  $: if (viewsWithCount.length && !viewsWithCount.some((v) => v.id === configViewId)) {
    configViewId = viewsWithCount[0].id;
  }
  // Danh sách THÔ đã lọc theo view đang chọn — dùng cho bảng cột, form thêm/sửa cột và
  // moveFieldConfigRow.
  $: fieldConfigRowsForConfigView = fieldConfigRows.filter(
    (r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === configViewId,
  );

  async function loadRows() {
    if (!config.url || !config.publicKey) return;
    fieldConfigRowsLoading = true;
    try {
      fieldConfigRows = await loadFieldConfigRows(config, tableName);
    } catch (error) {
      onError(
        `Không tải được cấu hình cột: ${error instanceof Error ? error.message : String(error)}`,
      );
      fieldConfigRows = [];
    } finally {
      fieldConfigRowsLoading = false;
    }
  }

  // Tải lại cột của chính tab này rồi báo DataViewManager tải lại fieldConfigs (đã parse) để
  // tab "Danh sách" + hàng tab dữ liệu cập nhật theo.
  async function refresh() {
    await loadRows();
    onChanged();
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
    pendingNewView = null;
  }

  async function saveFieldConfigRow(
    payload: Omit<FieldConfigRow, "id" | "TableName" | "DefaultFieldOrderIndex">,
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
          TableName: tableName,
          DefaultFieldOrderIndex: maxOrderIndex + 1,
        });
      }
      const createdViewId = pendingNewView?.id;
      closeFieldConfigEdit();
      if (createdViewId) configViewId = createdViewId;
      await refresh();
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
      await refresh();
    } catch (error) {
      deleteFieldConfigRowTarget = null;
      onError(`Không thể xóa cấu hình cột: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Đổi chỗ DefaultFieldOrderIndex với hàng liền kề (theo thứ tự đang hiển thị) — không kéo-thả,
  // chỉ hoán đổi 2 giá trị bằng 2 lệnh update chạy song song.
  async function moveFieldConfigRow(row: FieldConfigRow, direction: "up" | "down") {
    const index = fieldConfigRowsForConfigView.findIndex((item) => item.id === row.id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= fieldConfigRowsForConfigView.length)
      return;
    const target = fieldConfigRowsForConfigView[targetIndex];
    try {
      await Promise.all([
        updateFieldConfigRow(config, row.id, {
          DefaultFieldOrderIndex: target.DefaultFieldOrderIndex,
        }),
        updateFieldConfigRow(config, target.id, {
          DefaultFieldOrderIndex: row.DefaultFieldOrderIndex,
        }),
      ]);
      await refresh();
    } catch (error) {
      onError(`Không thể đổi thứ tự cột: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Sinh ViewID từ tên view người dùng gõ (bỏ dấu, thường hóa, nối gạch ngang), tự thêm hậu tố
  // nếu trùng view đã có — dùng khi tạo view mới từ FieldConfigViewList (xem handleCreateView).
  function slugifyViewId(label: string, existingIds: string[]): string {
    const base =
      label
        .trim()
        .toLowerCase()
        .replace(/đ/g, "d")
        .normalize("NFD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "view";
    let candidate = base;
    let suffix = 2;
    while (existingIds.includes(candidate)) {
      candidate = `${base}-${suffix++}`;
    }
    return candidate;
  }

  // "Tạo view" không có view rỗng thật sự (View chỉ tồn tại nhờ có ít nhất 1 cột trỏ tới) — bấm
  // "＋ Thêm view" chỉ hỏi tên, sinh ViewID, rồi mở luôn modal thêm cột với view đã khóa sẵn
  // (xem pendingNewView, dùng ở khối FieldConfigFormModal cuối file).
  function handleCreateView(label: string): void {
    pendingNewView = { id: slugifyViewId(label, viewsWithCount.map((v) => v.id)), label };
    editFieldConfigRow = null;
    fieldConfigSaveError = "";
  }

  // Đổi tên view = ghi ViewName mới lên MỌI dòng cột thuộc view đó, chạy song song — không có
  // bảng view riêng để sửa 1 chỗ (xem ghi chú "Không cần thêm cột/bảng mới" trong plan gốc).
  async function renameView(id: string, newLabel: string): Promise<void> {
    const rowsInView = fieldConfigRows.filter((r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === id);
    try {
      await Promise.all(
        rowsInView.map((r) => updateFieldConfigRow(config, r.id, { ViewName: [id, newLabel] })),
      );
      await refresh();
    } catch (error) {
      onError(`Không thể đổi tên view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Xóa view = xóa toàn bộ dòng cột thuộc view đó — dữ liệu thật trong bảng module không bị ảnh
  // hưởng, chỉ mất cấu hình hiển thị. Chỉ 1 nơi gọi thao tác này (nút 🗑 trong
  // FieldConfigViewList), nên ConfirmDialog xác nhận đặt luôn trong component đó — hàm này chỉ
  // lo phần thực thi sau khi đã xác nhận.
  async function deleteView(id: string): Promise<void> {
    const rowsInView = fieldConfigRows.filter((r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === id);
    try {
      await Promise.all(rowsInView.map((r) => deleteFieldConfigRow(config, r.id)));
      await refresh();
    } catch (error) {
      onError(`Không thể xóa view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Đổi chỗ 2 view liền kề trong hàng tab: đánh số lại liên tục DefaultFieldOrderIndex của toàn
  // bộ cột thuộc 2 view đó, giữ nguyên thứ tự cột bên trong từng view, chỉ hoán đổi thứ tự 2
  // khối cho nhau (không có cột "thứ tự view" riêng).
  async function moveView(id: string, direction: "up" | "down"): Promise<void> {
    const index = viewsWithCount.findIndex((v) => v.id === id);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (index === -1 || targetIndex < 0 || targetIndex >= viewsWithCount.length) return;
    const otherId = viewsWithCount[targetIndex].id;
    const firstId = direction === "up" ? id : otherId;
    const secondId = direction === "up" ? otherId : id;

    const rowsOfView = (viewId: string) =>
      fieldConfigRows
        .filter((r) => (r.ViewName?.[0] || DEFAULT_VIEW_ID) === viewId)
        .sort((a, b) => (a.DefaultFieldOrderIndex ?? 0) - (b.DefaultFieldOrderIndex ?? 0));

    const combined = [...rowsOfView(firstId), ...rowsOfView(secondId)];
    if (!combined.length) return;
    const startIndex = Math.min(...combined.map((r) => r.DefaultFieldOrderIndex ?? 0));

    try {
      await Promise.all(
        combined.map((row, i) =>
          updateFieldConfigRow(config, row.id, { DefaultFieldOrderIndex: startIndex + i }),
        ),
      );
      await refresh();
    } catch (error) {
      onError(`Không thể đổi thứ tự view: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
</script>

<div class="flex h-full min-h-0 flex-col gap-3 p-2 md:flex-row">
  <div class="w-full shrink-0 rounded border border-slate-200 bg-white p-2 md:w-56 md:overflow-y-auto">
    <FieldConfigViewList
      views={viewsWithCount}
      selectedViewId={configViewId}
      tableName={config.table}
      onSelect={(id) => (configViewId = id)}
      onCreate={handleCreateView}
      onRename={renameView}
      onDelete={deleteView}
      onMove={moveView}
    />
  </div>
  <div class="min-w-0 flex-1 overflow-hidden">
    <FieldConfigPanel
      rows={fieldConfigRowsForConfigView}
      loading={fieldConfigRowsLoading}
      tableName={config.table}
      bind:deleteTarget={deleteFieldConfigRowTarget}
      onCreate={openCreateFieldConfigRow}
      onEdit={openEditFieldConfigRow}
      onConfirmDelete={removeFieldConfigRow}
      onMove={moveFieldConfigRow}
    />
  </div>
</div>

{#if editFieldConfigRow !== undefined}
  {@const currentFieldConfigRow = editFieldConfigRow}
  {@const targetView =
    pendingNewView ??
    { id: configViewId, label: viewsWithCount.find((v) => v.id === configViewId)?.label ?? DEFAULT_VIEW_LABEL }}
  <FieldConfigFormModal
    row={currentFieldConfigRow}
    existingFieldNames={fieldConfigRowsForConfigView.map((row) => row.FieldName)}
    viewId={targetView.id}
    viewLabel={targetView.label}
    saveError={fieldConfigSaveError}
    saving={fieldConfigSaving}
    onClose={closeFieldConfigEdit}
    onSubmit={saveFieldConfigRow}
    onDelete={currentFieldConfigRow
      ? () => requestDeleteFieldConfigRow(currentFieldConfigRow)
      : undefined}
  />
{/if}
