"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  Database,
  Download,
  ExternalLink,
  Pencil,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from "lucide-react";
import {
  appwriteCsvHeaders,
  parseAppwriteSubscriptionCsv,
  stringifyAppwriteSubscriptionCsv,
} from "@/lib/appwrite-csv";
import { WorkspaceModulePanel, type WorkspaceMetric } from "@/components/WorkspaceModulePanel";
import { downloadCsvFile } from "@/lib/download-file";
import type { FengBroSettings, Subscription, SubscriptionDraft } from "@/types/subscription";

const settingsKey = "fengbro.sqlitecloud.settings";
const financeKey = "fengbro.finance.margin-maintenance-rate";

const emptyDraft: SubscriptionDraft = {
  name: "",
  site: "",
  price: 0,
  currency: "TWD",
  nextdate: "",
  account: "",
  note: "",
  continue: true,
};

const defaultSettings: FengBroSettings = {
  connectionString: "",
  notificationDays: 7,
};

type ImportProgress = {
  phase: "idle" | "parsing" | "creating-table" | "importing" | "reloading" | "done" | "error";
  current: number;
  total: number;
  label: string;
};

function daysUntil(dateValue: string) {
  if (!dateValue) return Number.POSITIVE_INFINITY;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(dateValue);
  date.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}

function currencyLabel(price: number, currency: string) {
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency: currency || "TWD",
    maximumFractionDigits: currency === "TWD" ? 0 : 2,
  }).format(Number(price || 0));
}

function toTwd(subscription: Subscription) {
  const rate: Record<string, number> = { TWD: 1, USD: 32, JPY: 0.22, HKD: 4.1, CNY: 4.4 };
  return Number(subscription.price || 0) * (rate[(subscription.currency || "TWD").toUpperCase()] || 1);
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder = "",
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function Home() {
  const importInputRef = useRef<HTMLInputElement>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [settings, setSettings] = useState<FengBroSettings>(defaultSettings);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [draft, setDraft] = useState<SubscriptionDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savedSignal, setSavedSignal] = useState("");
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress>({
    phase: "idle",
    current: 0,
    total: 0,
    label: "",
  });
  const [creatingTable, setCreatingTable] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);
  const [financeMarginRate, setFinanceMarginRate] = useState<number | null>(null);
  const [dashboardMetrics, setDashboardMetrics] = useState<WorkspaceMetric[]>([]);

  useEffect(() => {
    const savedSettings = localStorage.getItem(settingsKey);
    if (savedSettings) {
      const parsed = JSON.parse(savedSettings) as Partial<FengBroSettings>;
      setSettings({
        connectionString: parsed.connectionString || "",
        notificationDays: Number(parsed.notificationDays || defaultSettings.notificationDays),
      });
    }
    const savedMarginRate = Number(localStorage.getItem(financeKey) || "");
    if (!Number.isNaN(savedMarginRate) && savedMarginRate > 0) {
      setFinanceMarginRate(savedMarginRate);
    }
    setSettingsLoaded(true);
  }, []);

  const filteredSubscriptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return subscriptions
      .filter((subscription) => {
        if (!normalized) return true;
        return [subscription.name, subscription.site, subscription.account, subscription.note, subscription.currency]
          .join(" ")
          .toLowerCase()
          .includes(normalized);
      })
      .sort((left, right) => daysUntil(left.nextdate) - daysUntil(right.nextdate));
  }, [query, subscriptions]);

  const stats = useMemo(() => {
    const active = subscriptions.filter((item) => item.continue);
    const soon = active.filter((item) => {
      const days = daysUntil(item.nextdate);
      return days >= 0 && days <= settings.notificationDays;
    });
    const total = active.reduce((sum, item) => sum + toTwd(item), 0);
    return { active: subscriptions.length, soon: soon.length, total };
  }, [settings.notificationDays, subscriptions]);
  const subscriptionMetrics = useMemo<WorkspaceMetric[]>(() => [
    { label: "訂閱總數", value: stats.active },
    { label: "提醒天數內", value: stats.soon },
    { label: "約當月費", value: currencyLabel(stats.total, "TWD") },
  ], [stats.active, stats.soon, stats.total]);
  const visibleMetrics = dashboardMetrics.length > 0 ? dashboardMetrics : subscriptionMetrics;

  const importPercent = importProgress.total
    ? Math.min(100, Math.round((importProgress.current / importProgress.total) * 100))
    : importProgress.phase === "done"
      ? 100
      : 0;
  const shouldWarnFinanceMargin = financeMarginRate !== null && financeMarginRate <= 140;

  const flash = (message: string) => {
    setSavedSignal(message);
    window.setTimeout(() => setSavedSignal(""), 1800);
  };

  const saveSettings = ({ silent = false } = {}) => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    if (!silent) flash("鋒兄設定已儲存");
  };

  const getCloudHeaders = useCallback((): Record<string, string> => {
    const connectionString = settings.connectionString.trim();
    return connectionString ? { "x-sqlitecloud-connection": connectionString } : {};
  }, [settings.connectionString]);

  const updateFinanceMarginRate = useCallback((value: number | null) => {
    setFinanceMarginRate(value);
    if (value === null) {
      localStorage.removeItem(financeKey);
      return;
    }
    localStorage.setItem(financeKey, String(value));
  }, []);

  const normalizeCloudSubscription = (item: Subscription): Subscription => ({
    ...item,
    id: String(item.id),
    site: item.site || "",
    price: Number(item.price || 0),
    currency: (item.currency || "TWD").toUpperCase(),
    nextdate: item.nextdate || "",
    account: item.account || "",
    note: item.note || "",
    continue: item.continue === true || (item.continue as unknown) === 1 || String(item.continue).toLowerCase() === "true",
    created_at: item.created_at || "",
    updated_at: item.updated_at || "",
  });

  const setupSubscriptionTable = async () => {
    const response = await fetch("/api/subscription/setup", {
      method: "POST",
      headers: getCloudHeaders(),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || "建立 Table Subscription 失敗");
    }
    return result;
  };

  const createAllTables = async () => {
    setCreatingTable(true);
    try {
      saveSettings({ silent: true });
      const response = await fetch("/api/workspace/setup", {
        method: "POST",
        headers: getCloudHeaders(),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "鋒兄全部資料表建立失敗");
      }
      flash("鋒兄全部 Tables 已建立或確認存在");
    } catch (error) {
      flash(error instanceof Error ? error.message : "鋒兄全部資料表建立失敗");
    } finally {
      setCreatingTable(false);
    }
  };

  const fetchCloudSubscriptions = async () => {
    const response = await fetch(`/api/subscription?t=${Date.now()}`, {
      headers: getCloudHeaders(),
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      throw new Error(result.error || "從 SQLiteCloud 載入失敗");
    }
    return (Array.isArray(result) ? result : []).map(normalizeCloudSubscription);
  };

  const loadCloudSubscriptions = async ({ silent = false } = {}) => {
    setSyncingCloud(true);
    try {
      if (!silent) saveSettings();
      const nextSubscriptions = await fetchCloudSubscriptions();
      setSubscriptions(nextSubscriptions);
      if (!silent) flash(`已重新載入 ${nextSubscriptions.length} 筆 SQLiteCloud 資料`);
    } catch (error) {
      if (!silent) flash(error instanceof Error ? error.message : "從 SQLiteCloud 載入失敗");
    } finally {
      setSyncingCloud(false);
    }
  };

  useEffect(() => {
    if (!settingsLoaded) return;
    if (settings.connectionString.trim()) {
      void loadCloudSubscriptions({ silent: true });
      return;
    }
    const loadDefaultConnection = async () => {
      const response = await fetch("/api/subscription/config", { cache: "no-store" });
      const result = await response.json();
      if (result.hasDefaultConnectionString) {
        await loadCloudSubscriptions({ silent: true });
      }
    };
    void loadDefaultConnection();
  }, [settings.connectionString, settingsLoaded]);

  const importRowsToCloud = async (rows: SubscriptionDraft[], onProgress?: (current: number, row: SubscriptionDraft) => void) => {
    await setupSubscriptionTable();
    const importedCloudRows: Subscription[] = [];
    for (const [index, row] of rows.entries()) {
      onProgress?.(index + 1, row);
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCloudHeaders(),
        },
        body: JSON.stringify(row),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || `匯入 ${row.name} 到 SQLiteCloud 失敗`);
      }
      importedCloudRows.push(normalizeCloudSubscription(result));
    }
    return importedCloudRows;
  };

  const saveDraft = async () => {
    if (!draft.name.trim()) return;
    if (editingId) {
      const response = await fetch(`/api/subscription/${editingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getCloudHeaders(),
        },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        flash(result.error || "更新 SQLiteCloud 訂閱失敗");
        return;
      }
      setSubscriptions(await fetchCloudSubscriptions());
      flash("已確定修改並寫入 SQLiteCloud 資料庫");
    } else {
      const response = await fetch("/api/subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getCloudHeaders(),
        },
        body: JSON.stringify(draft),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        flash(result.error || "新增 SQLiteCloud 訂閱失敗");
        return;
      }
      setSubscriptions(await fetchCloudSubscriptions());
      flash("已新增並寫入 SQLiteCloud 資料庫");
    }
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const deleteSubscriptionById = async (id: string) => {
    const subscription = subscriptions.find((item) => item.id === id);
    const name = subscription?.name || id;
    if (!window.confirm(`確定刪除「${name}」？此操作會直接刪除 SQLiteCloud 資料庫資料。`)) return;
    const response = await fetch(`/api/subscription/${id}`, {
      method: "DELETE",
      headers: getCloudHeaders(),
    });
    const result = await response.json();
    if (!response.ok || result.error) {
      flash(result.error || "刪除 SQLiteCloud 訂閱失敗");
      return;
    }
    setSubscriptions(await fetchCloudSubscriptions());
    flash("已刪除 SQLiteCloud 資料庫資料");
  };

  const cancelEdit = () => {
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const editSubscription = (subscription: Subscription) => {
    setEditingId(subscription.id);
    setDraft({
      name: subscription.name,
      site: subscription.site,
      price: subscription.price,
      currency: subscription.currency,
      nextdate: subscription.nextdate,
      account: subscription.account,
      note: subscription.note,
      continue: subscription.continue,
    });
  };

  const exportCsv = () => {
    const csv = stringifyAppwriteSubscriptionCsv(subscriptions);
    downloadCsvFile(`appwrite-subscription-${new Date().toISOString().slice(0, 10)}.csv`, csv);
    flash("已匯出 Appwrite CSV");
  };

  const importCsvFile = async (file: File) => {
    setImportProgress({ phase: "parsing", current: 0, total: 0, label: `正在解析 ${file.name}` });
    const text = await file.text();
    const result = parseAppwriteSubscriptionCsv(text);
    setCsvErrors(result.errors);
    if (result.rows.length === 0) {
      setImportProgress({ phase: "error", current: 0, total: 0, label: "CSV 沒有可匯入的訂閱資料" });
      flash("沒有可匯入的訂閱資料");
      return;
    }
    let importedCount = 0;
    setSyncingCloud(true);
    try {
      saveSettings({ silent: true });
      setImportProgress({
        phase: "creating-table",
        current: 0,
        total: result.rows.length,
        label: "正在確認 SQLiteCloud subscription table",
      });
      const importedCloudRows = await importRowsToCloud(result.rows, (current, row) => {
        importedCount = current;
        setImportProgress({
          phase: "importing",
          current,
          total: result.rows.length,
          label: `正在匯入 ${row.name || `第 ${current} 筆`}`,
        });
      });
      setImportProgress({
        phase: "reloading",
        current: importedCloudRows.length,
        total: result.rows.length,
        label: "正在重新載入 SQLiteCloud 資料",
      });
      const nextSubscriptions = await fetchCloudSubscriptions();
      setSubscriptions(nextSubscriptions);
      setImportProgress({
        phase: "done",
        current: importedCloudRows.length,
        total: result.rows.length,
        label: `已匯入 ${importedCloudRows.length} 筆到 SQLiteCloud 資料庫`,
      });
      flash(`已直接匯入 ${importedCloudRows.length} 筆到 SQLiteCloud 資料庫`);
    } catch (error) {
      setImportProgress({
        phase: "error",
        current: importedCount,
        total: result.rows.length,
        label: error instanceof Error ? error.message : "匯入 SQLiteCloud 失敗",
      });
      flash(error instanceof Error ? error.message : "匯入 SQLiteCloud 失敗");
    } finally {
      setSyncingCloud(false);
    }
  };

  return (
    <main className="app-shell">
      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>鋒兄工作台</h1>
            <p>訂閱、食品、筆記、常用、銀行、例行與工具統一放在 SQLiteCloud 導向的工作台。</p>
          </div>
        </header>

      <section className="metrics" aria-label="訂閱摘要">
          {visibleMetrics.map((metric) => (
            <div className="metric" key={metric.label}>
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
            </div>
          ))}
      </section>

      {shouldWarnFinanceMargin ? (
        <section className="home-alert finance-alert" role="alert" aria-live="polite">
          <Bell size={19} />
          <div>
            <strong>大盤融資維持率 {financeMarginRate.toFixed(1)}%，已低於 140% 警戒線</strong>
            <span>請留意追繳與市場波動風險，必要時降低槓桿或補足保證金。</span>
          </div>
        </section>
      ) : financeMarginRate !== null ? (
        <section className="home-alert finance-ok" aria-live="polite">
          <Check size={19} />
          <div>
            <strong>大盤融資維持率 {financeMarginRate.toFixed(1)}%</strong>
            <span>目前高於 140% 警戒線。</span>
          </div>
        </section>
      ) : null}

        <WorkspaceModulePanel
          getCloudHeaders={getCloudHeaders}
          flash={flash}
          syncReady={settingsLoaded}
          financeMarginRate={financeMarginRate}
          onFinanceMarginRateChange={updateFinanceMarginRate}
          subscriptionMetrics={subscriptionMetrics}
          onMetricsChange={setDashboardMetrics}
          settingsPanel={
            <section id="settings" className="module-body module-settings-panel">
              <div className="module-summary settings-summary">
                <div>
                  <strong>鋒兄設定</strong>
                  <span>設定 SQLiteCloud 連線覆蓋值與提醒天數；留空時使用 Vercel 預設環境變數。</span>
                </div>
              </div>
              <div className="module-form settings-form">
                <Field label="SQLiteCloud Connection String" value={settings.connectionString} placeholder="留空使用 Vercel SQLITECLOUD_CONNECTION_STRING" onChange={(value) => setSettings({ ...settings, connectionString: value })} />
                <Field label="到期提醒天數" type="number" value={settings.notificationDays} onChange={(value) => setSettings({ ...settings, notificationDays: Number(value || 0) })} />
                <div className="settings-actions">
                  <button className="button primary" onClick={() => saveSettings()}><Check size={16} />儲存設定</button>
                  <button className="button ghost" onClick={() => flash("連線測試入口已建立，可接 SQLiteCloud route")}>
                    <RefreshCw size={16} />
                    測試
                  </button>
                </div>
                <button className="button setup-button" onClick={createAllTables} disabled={creatingTable}>
                  <Database size={16} />
                  {creatingTable ? "生成中..." : "一鍵生成全部 Tables"}
                </button>
              </div>
              <div className="notice">
                <Bell size={17} />
                <p>部署到 Vercel 時請設定 `SQLITECLOUD_CONNECTION_STRING`；也相容舊名 `SQLITE_CLOUD_CONNECTION_STRING`。前端欄位只作為個人覆蓋值。</p>
              </div>
            </section>
          }
          subscriptionPanel={
            <section id="subscriptions" className="subscription-module-panel">
              <div className="panel-heading">
                <div>
                  <h2>訂閱清單</h2>
                  <p>管理服務、帳號、扣款日期、續訂狀態與備註。</p>
                </div>
                <div className="panel-tools">
                  <div className="search">
                    <Search size={17} />
                    <input value={query} placeholder="搜尋服務、帳號、備註" onChange={(event) => setQuery(event.target.value)} />
                  </div>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="file-input"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void importCsvFile(file);
                      event.currentTarget.value = "";
                    }}
                  />
                  <button className="button ghost" onClick={() => importInputRef.current?.click()} disabled={syncingCloud}>
                    <Upload size={16} />
                    {syncingCloud ? "匯入中..." : "匯入 CSV"}
                  </button>
                  <button className="button ghost" onClick={exportCsv}>
                    <Download size={16} />
                    匯出 CSV
                  </button>
                  <button className="button ghost" onClick={() => void loadCloudSubscriptions()} disabled={syncingCloud}>
                    <RefreshCw size={16} />
                    重新載入
                  </button>
                </div>
              </div>

              <div className="csv-hint">
                <strong>Appwrite CSV 相容欄位</strong>
                <code>{appwriteCsvHeaders.join(",")}</code>
                <span>CSV 匯入會直接寫入 SQLiteCloud；可用鋒兄設定覆蓋，或在 Vercel 設定 SQLITECLOUD_CONNECTION_STRING。</span>
              </div>

              {importProgress.phase !== "idle" ? (
                <div className={`import-progress import-progress-${importProgress.phase}`} role="status" aria-live="polite">
                  <div className="import-progress-copy">
                    <strong>
                      {importProgress.phase === "done"
                        ? "匯入完成"
                        : importProgress.phase === "error"
                          ? "匯入發生問題"
                          : "匯入進度"}
                    </strong>
                    <span>{importProgress.label}</span>
                  </div>
                  <div className="import-progress-count">
                    {importProgress.total > 0 ? `${importProgress.current} / ${importProgress.total}` : "準備中"}
                  </div>
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

              <div className="form-strip">
                <Field label="服務名稱" value={draft.name} placeholder="ChatGPT Plus" onChange={(value) => setDraft({ ...draft, name: value })} />
                <Field label="金額" type="number" value={draft.price} onChange={(value) => setDraft({ ...draft, price: Number(value) })} />
                <Field label="幣別" value={draft.currency} placeholder="TWD" onChange={(value) => setDraft({ ...draft, currency: value.toUpperCase() })} />
                <Field label="下次扣款" type="date" value={draft.nextdate} onChange={(value) => setDraft({ ...draft, nextdate: value })} />
                <Field label="帳號 / Email" value={draft.account} onChange={(value) => setDraft({ ...draft, account: value })} />
                <label className="field field-wide">
                  <span>備註</span>
                  <textarea value={draft.note} placeholder="付款方式、方案或提醒" onChange={(event) => setDraft({ ...draft, note: event.target.value })} />
                </label>
                <label className="toggle">
                  <input type="checkbox" checked={draft.continue} onChange={(event) => setDraft({ ...draft, continue: event.target.checked })} />
                  <span>續訂</span>
                </label>
                <div className="form-actions">
                  <button className="button primary" type="button" onClick={saveDraft}>
                    <Check size={16} />
                    {editingId ? "確定修改" : "新增訂閱"}
                  </button>
                  {editingId ? (
                    <button className="button ghost" type="button" onClick={cancelEdit}>
                      取消
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>服務名稱</th>
                      <th>帳號</th>
                      <th>金額</th>
                      <th>下次扣款</th>
                      <th>續訂</th>
                      <th>備註</th>
                      <th>操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSubscriptions.map((subscription) => {
                      const days = daysUntil(subscription.nextdate);
                      const status = !subscription.nextdate
                        ? "未設定"
                        : days < 0
                          ? `已過期 ${Math.abs(days)} 天`
                          : days === 0
                            ? "今天扣款"
                            : `${days} 天後`;
                      return (
                        <tr key={subscription.id}>
                          <td>
                            {subscription.site ? (
                              <a href={subscription.site} target="_blank" rel="noreferrer" style={{ fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                                {subscription.name} <ExternalLink size={13} />
                              </a>
                            ) : (
                              <strong>{subscription.name}</strong>
                            )}
                            <small>{subscription.id}</small>
                          </td>
                          <td>{subscription.account || "-"}</td>
                          <td>{currencyLabel(subscription.price, subscription.currency)}</td>
                          <td>
                            <div className="nextdate-stack">
                              <span>{subscription.nextdate || "-"}</span>
                              <span className={days <= settings.notificationDays ? "due hot" : "due"}>{status}</span>
                            </div>
                          </td>
                          <td><span className={subscription.continue ? "pill ok" : "pill muted"}>{subscription.continue ? "續訂" : "停止"}</span></td>
                          <td className="note-cell">{subscription.note || "-"}</td>
                          <td>
                            <div className="row-actions">
                              <button aria-label="編輯" onClick={() => editSubscription(subscription)}><Pencil size={15} /></button>
                              <button aria-label="刪除" onClick={() => void deleteSubscriptionById(subscription.id)}><Trash2 size={15} /></button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          }
        />
      </section>
      {savedSignal ? <div className="toast">{savedSignal}</div> : null}
    </main>
  );
}
