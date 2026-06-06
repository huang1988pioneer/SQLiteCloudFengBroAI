"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  Check,
  Copy,
  Database,
  Download,
  ExternalLink,
  KeyRound,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Table2,
  Trash2,
  Upload,
  WalletCards,
} from "lucide-react";
import {
  appwriteCsvHeaders,
  parseAppwriteSubscriptionCsv,
  stringifyAppwriteSubscriptionCsv,
} from "@/lib/appwrite-csv";
import { subscriptionCreateTableSql, subscriptionSchema } from "@/lib/subscription-schema";
import type { FengBroSettings, Subscription, SubscriptionDraft } from "@/types/subscription";

const settingsKey = "fengbro.sqlitecloud.settings";
const localSubscriptionsKey = "fengbro.sqlitecloud.subscriptions";

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
  apiKey: "",
  databaseName: "",
  adminEmail: "",
  notificationDays: 7,
};

const seedSubscriptions: Subscription[] = [
  {
    id: "seed-openai",
    name: "ChatGPT Plus",
    site: "https://chatgpt.com",
    price: 20,
    currency: "USD",
    nextdate: "2026-06-18",
    account: "fengbro@example.com",
    note: "主要 AI 助理帳號",
    continue: true,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "seed-storage",
    name: "SQLite Cloud",
    site: "https://sqlitecloud.io",
    price: 29,
    currency: "USD",
    nextdate: "2026-06-25",
    account: "admin@fengbro.ai",
    note: "訂閱資料庫服務",
    continue: true,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  },
  {
    id: "seed-design",
    name: "Impeccable",
    site: "https://impeccable.style",
    price: 0,
    currency: "TWD",
    nextdate: "",
    account: "",
    note: "設計流程參考",
    continue: false,
    created_at: "2026-06-01T00:00:00.000Z",
    updated_at: "2026-06-01T00:00:00.000Z",
  },
];

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

function buildSubscription(draft: SubscriptionDraft, id?: string): Subscription {
  const now = new Date().toISOString();
  return {
    id: id || crypto.randomUUID(),
    ...draft,
    currency: (draft.currency || "TWD").toUpperCase(),
    created_at: now,
    updated_at: now,
  };
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
  const [subscriptions, setSubscriptions] = useState<Subscription[]>(seedSubscriptions);
  const [settings, setSettings] = useState<FengBroSettings>(defaultSettings);
  const [draft, setDraft] = useState<SubscriptionDraft>(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [savedSignal, setSavedSignal] = useState("");
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const [creatingTable, setCreatingTable] = useState(false);
  const [syncingCloud, setSyncingCloud] = useState(false);

  useEffect(() => {
    const savedSettings = localStorage.getItem(settingsKey);
    const savedSubscriptions = localStorage.getItem(localSubscriptionsKey);
    if (savedSettings) setSettings(JSON.parse(savedSettings) as FengBroSettings);
    if (savedSubscriptions) setSubscriptions(JSON.parse(savedSubscriptions) as Subscription[]);
  }, []);

  useEffect(() => {
    localStorage.setItem(localSubscriptionsKey, JSON.stringify(subscriptions));
  }, [subscriptions]);

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
    return { active: active.length, soon: soon.length, total };
  }, [settings.notificationDays, subscriptions]);

  const flash = (message: string) => {
    setSavedSignal(message);
    window.setTimeout(() => setSavedSignal(""), 1800);
  };

  const saveSettings = () => {
    localStorage.setItem(settingsKey, JSON.stringify(settings));
    flash("鋒兄設定已儲存");
  };

  const getCloudHeaders = () => {
    const connectionString = settings.connectionString.trim();
    if (!connectionString) {
      throw new Error("請先輸入 SQLiteCloud Connection String");
    }
    return { "x-sqlitecloud-connection": connectionString };
  };

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

  const createSubscriptionTable = async () => {
    setCreatingTable(true);
    try {
      saveSettings();
      await setupSubscriptionTable();
      flash("Table subscription 已建立或確認存在");
    } catch (error) {
      flash(error instanceof Error ? error.message : "建立 Table Subscription 失敗");
    } finally {
      setCreatingTable(false);
    }
  };

  const loadCloudSubscriptions = async () => {
    setSyncingCloud(true);
    try {
      saveSettings();
      const response = await fetch(`/api/subscription?t=${Date.now()}`, {
        headers: getCloudHeaders(),
        cache: "no-store",
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        throw new Error(result.error || "從 SQLiteCloud 載入失敗");
      }
      const nextSubscriptions = (Array.isArray(result) ? result : []).map(normalizeCloudSubscription);
      setSubscriptions(nextSubscriptions);
      flash(`已從 SQLiteCloud 載入 ${nextSubscriptions.length} 筆`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "從 SQLiteCloud 載入失敗");
    } finally {
      setSyncingCloud(false);
    }
  };

  const syncLocalToCloud = async () => {
    setSyncingCloud(true);
    try {
      saveSettings();
      await setupSubscriptionTable();
      for (const subscription of subscriptions) {
        const draftForCloud: SubscriptionDraft = {
          name: subscription.name,
          site: subscription.site,
          price: subscription.price,
          currency: subscription.currency,
          nextdate: subscription.nextdate,
          account: subscription.account,
          note: subscription.note,
          continue: subscription.continue,
        };
        const response = await fetch("/api/subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getCloudHeaders(),
          },
          body: JSON.stringify({ id: subscription.id, ...draftForCloud }),
        });
        const result = await response.json();
        if (!response.ok || result.error) {
          throw new Error(result.error || `同步 ${subscription.name} 失敗`);
        }
      }
      flash(`已同步 ${subscriptions.length} 筆到 SQLiteCloud`);
    } catch (error) {
      flash(error instanceof Error ? error.message : "同步到 SQLiteCloud 失敗");
    } finally {
      setSyncingCloud(false);
    }
  };

  const saveDraft = async () => {
    if (!draft.name.trim()) return;
    if (editingId) {
      if (settings.connectionString.trim()) {
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
      }
      setSubscriptions((items) =>
        items.map((item) =>
          item.id === editingId
            ? { ...item, ...draft, currency: (draft.currency || "TWD").toUpperCase(), updated_at: new Date().toISOString() }
            : item
        )
      );
    } else {
      if (settings.connectionString.trim()) {
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
        setSubscriptions((items) => [normalizeCloudSubscription(result), ...items]);
      } else {
        setSubscriptions((items) => [buildSubscription(draft), ...items]);
      }
    }
    setDraft(emptyDraft);
    setEditingId(null);
  };

  const deleteSubscriptionById = async (id: string) => {
    if (settings.connectionString.trim()) {
      const response = await fetch(`/api/subscription/${id}`, {
        method: "DELETE",
        headers: getCloudHeaders(),
      });
      const result = await response.json();
      if (!response.ok || result.error) {
        flash(result.error || "刪除 SQLiteCloud 訂閱失敗");
        return;
      }
    }
    setSubscriptions((items) => items.filter((item) => item.id !== id));
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

  const copySql = async () => {
    await navigator.clipboard.writeText(subscriptionCreateTableSql);
    flash("SQL 已複製");
  };

  const exportCsv = () => {
    const csv = stringifyAppwriteSubscriptionCsv(subscriptions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `appwrite-subscription-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    flash("已匯出 Appwrite CSV");
  };

  const importCsvFile = async (file: File) => {
    const text = await file.text();
    const result = parseAppwriteSubscriptionCsv(text);
    setCsvErrors(result.errors);
    if (result.rows.length === 0) {
      flash("沒有可匯入的訂閱資料");
      return;
    }
    const imported = result.rows.map((row) => buildSubscription(row));
    setSubscriptions((items) => [...imported, ...items]);
    flash(`已匯入 ${imported.length} 筆 Appwrite CSV`);
  };

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">鋒</div>
          <div>
            <strong>鋒兄 AI</strong>
            <span>SQLiteCloud Workspace</span>
          </div>
        </div>
        <nav aria-label="主選單">
          <a className="nav-item active" href="#subscriptions"><WalletCards size={18} />鋒兄訂閱</a>
          <a className="nav-item" href="#settings"><Settings size={18} />鋒兄設定</a>
          <a className="nav-item" href="#schema"><Table2 size={18} />Table 建議</a>
        </nav>
        <div className="sidebar-note">
          <Database size={18} />
          <p>使用者輸入的 connection string 與 API key 會先存在瀏覽器 localStorage，便於個人部署測試。</p>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <h1>鋒兄訂閱</h1>
            <p>相容 Appwrite 版 subscription CSV，並改為 SQLiteCloud 導向的精簡產品工作台。</p>
          </div>
          <button className="button primary" onClick={saveDraft}>
            <Plus size={17} />
            {editingId ? "儲存修改" : "新增訂閱"}
          </button>
        </header>

        <section className="metrics" aria-label="訂閱摘要">
          <div className="metric">
            <span>啟用訂閱</span>
            <strong>{stats.active}</strong>
          </div>
          <div className="metric">
            <span>提醒天數內</span>
            <strong>{stats.soon}</strong>
          </div>
          <div className="metric">
            <span>約當月費</span>
            <strong>{currencyLabel(stats.total, "TWD")}</strong>
          </div>
        </section>

        <section className="content-grid">
          <div className="main-column">
            <section id="subscriptions" className="panel">
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
                  <button className="button ghost" onClick={() => importInputRef.current?.click()}>
                    <Upload size={16} />
                    匯入 CSV
                  </button>
                  <button className="button ghost" onClick={exportCsv}>
                    <Download size={16} />
                    匯出 CSV
                  </button>
                  <button className="button ghost" onClick={loadCloudSubscriptions} disabled={syncingCloud}>
                    <RefreshCw size={16} />
                    載入 Cloud
                  </button>
                  <button className="button ghost" onClick={syncLocalToCloud} disabled={syncingCloud}>
                    <Database size={16} />
                    同步到 Cloud
                  </button>
                </div>
              </div>

              <div className="csv-hint">
                <strong>Appwrite CSV 相容欄位</strong>
                <code>{appwriteCsvHeaders.join(",")}</code>
                <span>支援 quoted 多行備註，例如你的 `note` 欄含換行、逗號或全形數字都可匯入並原樣匯出。</span>
              </div>

              {csvErrors.length > 0 ? (
                <div className="csv-errors">
                  {csvErrors.map((error) => <div key={error}>{error}</div>)}
                </div>
              ) : null}

              <div className="form-strip">
                <Field label="服務名稱" value={draft.name} placeholder="ChatGPT Plus" onChange={(value) => setDraft({ ...draft, name: value })} />
                <Field label="網站" value={draft.site} placeholder="https://example.com" onChange={(value) => setDraft({ ...draft, site: value })} />
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
              </div>

              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>服務名稱</th>
                      <th>網站</th>
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
                            <strong>{subscription.name}</strong>
                            <small>{subscription.id}</small>
                          </td>
                          <td>
                            {subscription.site ? (
                              <a href={subscription.site} target="_blank" rel="noreferrer">
                                開啟 <ExternalLink size={13} />
                              </a>
                            ) : "-"}
                          </td>
                          <td>{subscription.account || "-"}</td>
                          <td>{currencyLabel(subscription.price, subscription.currency)}</td>
                          <td><span className={days <= settings.notificationDays ? "due hot" : "due"}>{status}</span></td>
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

            <section id="schema" className="panel">
              <div className="panel-heading">
                <div>
                  <h2>Table Subscription 建議格式</h2>
                  <p>對齊參考專案 subscription 欄位，SQLiteCloud 以 SQLite 型別儲存。</p>
                </div>
                <button className="button ghost" onClick={copySql}><Copy size={16} />複製 SQL</button>
              </div>
              <div className="schema-grid">
                {subscriptionSchema.map((field) => (
                  <div className="schema-row" key={field.name}>
                    <code>{field.name}</code>
                    <span>{field.type}</span>
                    <span>{field.required ? "必填" : "可空"}</span>
                    <small>{field.note}</small>
                  </div>
                ))}
              </div>
              <pre className="sql-block">{subscriptionCreateTableSql}</pre>
            </section>
          </div>

          <aside id="settings" className="settings-panel">
            <div className="panel-heading compact">
              <div>
                <h2>鋒兄設定</h2>
                <p>給使用者輸入 API key 等資料。</p>
              </div>
              <KeyRound size={20} />
            </div>
            <Field label="SQLiteCloud Connection String" value={settings.connectionString} placeholder="sqlitecloud://..." onChange={(value) => setSettings({ ...settings, connectionString: value })} />
            <Field label="API Key" type="password" value={settings.apiKey} placeholder="輸入 API key" onChange={(value) => setSettings({ ...settings, apiKey: value })} />
            <Field label="Database Name" value={settings.databaseName} placeholder="fengbro_ai" onChange={(value) => setSettings({ ...settings, databaseName: value })} />
            <Field label="Admin Email" type="email" value={settings.adminEmail} placeholder="you@example.com" onChange={(value) => setSettings({ ...settings, adminEmail: value })} />
            <Field label="到期提醒天數" type="number" value={settings.notificationDays} onChange={(value) => setSettings({ ...settings, notificationDays: Number(value || 0) })} />
            <div className="settings-actions">
              <button className="button primary" onClick={saveSettings}><Check size={16} />儲存設定</button>
              <button className="button ghost" onClick={() => flash("連線測試入口已建立，可接 SQLiteCloud route")}>
                <RefreshCw size={16} />
                測試
              </button>
            </div>
            <button className="button setup-button" onClick={createSubscriptionTable} disabled={creatingTable}>
              <Database size={16} />
              {creatingTable ? "生成中..." : "一鍵生成 Table Subscription"}
            </button>
            <div className="notice">
              <Bell size={17} />
              <p>部署後可將 connection string 設為 `SQLITE_CLOUD_CONNECTION_STRING`，或由前端設定透過 header 傳給 API route。</p>
            </div>
          </aside>
        </section>
      </section>
      {savedSignal ? <div className="toast">{savedSignal}</div> : null}
    </main>
  );
}
