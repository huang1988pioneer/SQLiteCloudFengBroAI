"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Download, Pencil, Plus, RefreshCw, Trash2, Upload } from "lucide-react";
import { parseWorkspaceCsv, stringifyWorkspaceCsv } from "@/lib/workspace-csv";
import { workspaceModules, workspaceToolItems } from "@/lib/workspace-modules";
import type { WorkspaceModule, WorkspaceRecord } from "@/types/workspace";

type ImportProgress = {
  phase: "idle" | "parsing" | "creating-table" | "importing" | "reloading" | "done" | "error";
  current: number;
  total: number;
  label: string;
};

type Props = {
  getCloudHeaders: () => Record<string, string>;
  flash: (message: string) => void;
  syncReady?: boolean;
};

function emptyRecord(module: WorkspaceModule) {
  return Object.fromEntries(module.fields.map((field) => [field.name, field.type === "number" ? 0 : ""]));
}

function primaryValue(record: WorkspaceRecord, module: WorkspaceModule) {
  const field = module.fields.find((item) => item.required) || module.fields[0];
  return String(record[field?.name || "id"] || record.id);
}

function stringifyCell(value: unknown) {
  if (value === null || value === undefined || value === "") return "-";
  return String(value);
}

export function WorkspaceModulePanel({ getCloudHeaders, flash, syncReady = true }: Props) {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [activeKey, setActiveKey] = useState(workspaceModules[0].key);
  const toolsActive = activeKey === "tools";
  const activeModule = workspaceModules.find((module) => module.key === activeKey) || workspaceModules[0];
  const [recordsByModule, setRecordsByModule] = useState<Record<string, WorkspaceRecord[]>>({});
  const [draftByModule, setDraftByModule] = useState<Record<string, Record<string, unknown>>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ phase: "idle", current: 0, total: 0, label: "" });
  const [csvErrors, setCsvErrors] = useState<string[]>([]);

  const records = recordsByModule[activeModule.key] || [];
  const draft = draftByModule[activeModule.key] || emptyRecord(activeModule);
  const requiredField = activeModule.fields.find((field) => field.required);
  const importPercent = importProgress.total
    ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))
    : importProgress.phase === "done"
      ? 100
      : 0;

  const totals = useMemo(() => {
    const amountField = activeModule.fields.find((field) => ["amount", "deposit", "price"].includes(field.name));
    const total = amountField ? records.reduce((sum, record) => sum + Number(record[amountField.name] || 0), 0) : records.length;
    return { count: records.length, total, totalLabel: amountField ? amountField.label : "筆數" };
  }, [activeModule, records]);

  const setDraftValue = (field: string, value: unknown) => {
    setDraftByModule((items) => ({
      ...items,
      [activeModule.key]: { ...draft, [field]: value },
    }));
  };

  const fetchRecords = useCallback(async (module = activeModule, silent = false) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/${module.key}?t=${Date.now()}`, {
        headers: getCloudHeaders(),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || `${module.title} 載入失敗`);
      setRecordsByModule((items) => ({ ...items, [module.key]: Array.isArray(result) ? result : [] }));
      if (!silent) flash(`已載入 ${module.title} ${Array.isArray(result) ? result.length : 0} 筆`);
      return Array.isArray(result) ? result : [];
    } catch (error) {
      if (!silent) flash(error instanceof Error ? error.message : `${module.title} 載入失敗`);
      return [];
    } finally {
      setLoading(false);
    }
  }, [activeModule, flash, getCloudHeaders]);

  useEffect(() => {
    if (!syncReady || toolsActive) return;
    void fetchRecords(activeModule, true);
  }, [activeModule, fetchRecords, syncReady, toolsActive]);

  useEffect(() => {
    if (!syncReady || toolsActive) return;

    const refreshVisibleModule = () => {
      if (document.visibilityState === "visible") {
        void fetchRecords(activeModule, true);
      }
    };

    const intervalId = window.setInterval(refreshVisibleModule, 15_000);
    window.addEventListener("focus", refreshVisibleModule);
    document.addEventListener("visibilitychange", refreshVisibleModule);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshVisibleModule);
      document.removeEventListener("visibilitychange", refreshVisibleModule);
    };
  }, [activeModule, fetchRecords, syncReady, toolsActive]);

  const setupTables = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/workspace/setup", { method: "POST", headers: getCloudHeaders() });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || "鋒兄模組資料表建立失敗");
      flash("已建立或確認所有鋒兄模組資料表");
    } catch (error) {
      flash(error instanceof Error ? error.message : "鋒兄模組資料表建立失敗");
    } finally {
      setLoading(false);
    }
  };

  const saveRecord = async () => {
    if (requiredField && !String(draft[requiredField.name] || "").trim()) {
      flash(`請先填寫 ${requiredField.label}`);
      return;
    }
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/${activeModule.key}${editingId ? `/${editingId}` : ""}`, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCloudHeaders(),
        },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || `${activeModule.title} 儲存失敗`);
      await fetchRecords(activeModule, true);
      setDraftByModule((items) => ({ ...items, [activeModule.key]: emptyRecord(activeModule) }));
      setEditingId(null);
      flash(`${activeModule.title} 已寫入 SQLiteCloud`);
    } catch (error) {
      flash(error instanceof Error ? error.message : `${activeModule.title} 儲存失敗`);
    } finally {
      setLoading(false);
    }
  };

  const editRecord = (record: WorkspaceRecord) => {
    setEditingId(record.id);
    setDraftByModule((items) => ({ ...items, [activeModule.key]: { ...record } }));
  };

  const deleteRecord = async (record: WorkspaceRecord) => {
    if (!window.confirm(`確定刪除「${primaryValue(record, activeModule)}」？此操作會直接刪除 SQLiteCloud 資料庫資料。`)) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/workspace/${activeModule.key}/${record.id}`, {
        method: "DELETE",
        headers: getCloudHeaders(),
      });
      const result = await response.json();
      if (!response.ok || result.error) throw new Error(result.error || `${activeModule.title} 刪除失敗`);
      await fetchRecords(activeModule, true);
      flash(`${activeModule.title} 已刪除`);
    } catch (error) {
      flash(error instanceof Error ? error.message : `${activeModule.title} 刪除失敗`);
    } finally {
      setLoading(false);
    }
  };

  const importCsv = async (file: File) => {
    setImportProgress({ phase: "parsing", current: 0, total: 0, label: `正在解析 ${file.name}` });
    const text = await file.text();
    const result = parseWorkspaceCsv(text, activeModule);
    setCsvErrors(result.errors);
    if (result.records.length === 0) {
      setImportProgress({ phase: "error", current: 0, total: 0, label: "CSV 沒有可匯入資料" });
      flash("CSV 沒有可匯入資料");
      return;
    }
    setLoading(true);
    let imported = 0;
    try {
      setImportProgress({ phase: "creating-table", current: 0, total: result.records.length, label: "正在確認 SQLiteCloud table" });
      await fetch("/api/workspace/setup", { method: "POST", headers: getCloudHeaders() });
      for (const [index, record] of result.records.entries()) {
        imported = index + 1;
        setImportProgress({
          phase: "importing",
          current: imported,
          total: result.records.length,
          label: `正在匯入 ${primaryValue(record as WorkspaceRecord, activeModule)}`,
        });
        const response = await fetch(`/api/workspace/${activeModule.key}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCloudHeaders(),
          },
          body: JSON.stringify(record),
        });
        const saved = await response.json();
        if (!response.ok || saved.error) throw new Error(saved.error || `${activeModule.title} 匯入失敗`);
      }
      setImportProgress({ phase: "reloading", current: imported, total: result.records.length, label: "正在重新載入 SQLiteCloud 資料" });
      await fetchRecords(activeModule, true);
      setImportProgress({ phase: "done", current: imported, total: result.records.length, label: `已匯入 ${imported} 筆 ${activeModule.title}` });
      flash(`已匯入 ${imported} 筆 ${activeModule.title}`);
    } catch (error) {
      setImportProgress({
        phase: "error",
        current: imported,
        total: result.records.length,
        label: error instanceof Error ? error.message : `${activeModule.title} 匯入失敗`,
      });
      flash(error instanceof Error ? error.message : `${activeModule.title} 匯入失敗`);
    } finally {
      setLoading(false);
    }
  };

  const exportCsv = () => {
    const csv = stringifyWorkspaceCsv(records, activeModule);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${activeModule.csvName}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flash(`已匯出 ${activeModule.title} CSV`);
  };

  const switchModule = (module: WorkspaceModule) => {
    setActiveKey(module.key);
    setEditingId(null);
    setCsvErrors([]);
    setImportProgress({ phase: "idle", current: 0, total: 0, label: "" });
    if (!recordsByModule[module.key]) void fetchRecords(module, true);
  };

  const switchTools = () => {
    setActiveKey("tools");
    setEditingId(null);
    setCsvErrors([]);
    setImportProgress({ phase: "idle", current: 0, total: 0, label: "" });
  };

  return (
    <section id="workspace-modules" className="panel module-panel">
      <div className="panel-heading module-heading">
        <div>
          <h2>鋒兄工作台</h2>
          <p>食品、筆記、常用、銀行、例行直接寫入 SQLiteCloud；鋒兄工具提供比價、手機、Tube、金融子項目。</p>
        </div>
        <button className="button primary" onClick={setupTables} disabled={loading}>
          <Check size={16} />
          一鍵生成全部 Tables
        </button>
      </div>

      <div className="module-tabs">
        <button onClick={() => document.getElementById("subscriptions")?.scrollIntoView({ behavior: "smooth", block: "start" })}>
          訂閱
        </button>
        {workspaceModules.map((module) => (
          <button
            key={module.key}
            className={!toolsActive && module.key === activeModule.key ? "active" : ""}
            onClick={() => switchModule(module)}
          >
            {module.shortTitle}
          </button>
        ))}
        <button className={toolsActive ? "active" : ""} onClick={switchTools}>
          工具
        </button>
      </div>

      {toolsActive ? (
        <div className="module-body tool-menu-body">
          <div className="module-summary tool-menu-summary">
            <div>
              <strong>鋒兄工具</strong>
              <span>工具不是 SQLiteCloud table；下列為子項目入口，避免與資料表模組混在一起。</span>
            </div>
          </div>
          <div className="tool-child-grid">
            {workspaceToolItems.map((item) => (
              <button key={item.key} className="tool-child-card" type="button" onClick={() => flash(`${item.title} 子項目入口已建立`)}>
                <strong>{item.title}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
      <div className="module-body">
        <div className="module-summary">
          <div>
            <strong>{activeModule.title}</strong>
            <span>{activeModule.description}</span>
          </div>
          <div className="module-stat">
            <span>{records.length} 筆</span>
            <span>{totals.totalLabel}: {totals.total}</span>
          </div>
          <div className="module-tools">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,text/csv"
              className="file-input"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void importCsv(file);
                event.currentTarget.value = "";
              }}
            />
            <button className="button ghost" onClick={() => importInputRef.current?.click()} disabled={loading}>
              <Upload size={16} />
              {loading ? "處理中..." : "匯入 CSV"}
            </button>
            <button className="button ghost" onClick={exportCsv}>
              <Download size={16} />
              匯出 CSV
            </button>
            <button className="button ghost" onClick={() => void fetchRecords()} disabled={loading}>
              <RefreshCw size={16} />
              重新載入
            </button>
          </div>
        </div>

        <div className="csv-hint module-csv-hint">
          <strong>{activeModule.csvName} 欄位</strong>
          <code>{activeModule.fields.map((field) => field.name).join(",")}</code>
        </div>

        {importProgress.phase !== "idle" ? (
          <div className={`import-progress import-progress-${importProgress.phase}`} role="status" aria-live="polite">
            <div className="import-progress-copy">
              <strong>{importProgress.phase === "done" ? "匯入完成" : importProgress.phase === "error" ? "匯入發生問題" : "匯入進度"}</strong>
              <span>{importProgress.label}</span>
            </div>
            <div className="import-progress-count">{importProgress.total > 0 ? `${importProgress.current} / ${importProgress.total}` : "準備中"}</div>
            <div className="import-progress-track" aria-hidden="true">
              <div style={{ width: `${importPercent}%` }} />
            </div>
          </div>
        ) : null}

        {csvErrors.length > 0 ? (
          <div className="csv-errors">
            {csvErrors.map((error) => <div key={error}>{error}</div>)}
          </div>
        ) : null}

        <div className="module-form">
          {activeModule.fields.map((field) => (
            <label key={field.name} className={`field ${field.multiline ? "field-wide" : ""}`}>
              <span>{field.label}</span>
              {field.multiline ? (
                <textarea
                  value={String(draft[field.name] ?? "")}
                  onChange={(event) => setDraftValue(field.name, event.target.value)}
                />
              ) : (
                <input
                  type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
                  value={String(draft[field.name] ?? "")}
                  onChange={(event) => setDraftValue(field.name, field.type === "number" ? Number(event.target.value) : event.target.value)}
                />
              )}
            </label>
          ))}
          <div className="form-actions">
            <button className="button primary" type="button" onClick={saveRecord} disabled={loading}>
              <Plus size={16} />
              {editingId ? "確定修改" : `新增${activeModule.shortTitle}`}
            </button>
            {editingId ? (
              <button className="button ghost" type="button" onClick={() => { setEditingId(null); setDraftByModule((items) => ({ ...items, [activeModule.key]: emptyRecord(activeModule) })); }}>
                取消
              </button>
            ) : null}
          </div>
        </div>

        <div className="table-wrap module-table">
          <table>
            <thead>
              <tr>
                {activeModule.displayFields.map((fieldName) => (
                  <th key={fieldName}>{activeModule.fields.find((field) => field.name === fieldName)?.label || fieldName}</th>
                ))}
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map((record) => (
                <tr key={record.id}>
                  {activeModule.displayFields.map((fieldName) => (
                    <td key={fieldName}>{stringifyCell(record[fieldName])}</td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button aria-label="編輯" onClick={() => editRecord(record)}><Pencil size={15} /></button>
                      <button aria-label="刪除" onClick={() => void deleteRecord(record)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 ? (
                <tr>
                  <td colSpan={activeModule.displayFields.length + 1} className="empty-cell">尚無資料，請匯入 CSV 或新增一筆。</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
      )}
    </section>
  );
}
