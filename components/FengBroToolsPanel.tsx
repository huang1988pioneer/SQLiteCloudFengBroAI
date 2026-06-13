"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  AlertTriangle,
  BarChart3,
  ExternalLink,
  Landmark,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Smartphone,
  Trash2,
  Wrench,
} from "lucide-react";
import {
  DEFAULT_FENGBRO_TUBE_CHANNELS,
  getFengbroTubeFallbackTitle,
  normalizeFengbroTubeChannels,
  normalizeFengbroTubeSource,
  type FengbroTubeChannelConfig,
} from "@/lib/fengbroTubeChannels";

type ToolsTab = "price-compare" | "landtop" | "fengbro-tube" | "fengbro-finance";
type PriceSource = "local" | "biggo-api";

type PriceResult = {
  title: string;
  url: string;
  source: string;
  currency: string;
  currentPrice: number | null;
  notice?: string;
  matchedTitle?: string;
  matchedUrl?: string;
  resolvedAt: string;
  history: Array<{ date: string; price: number | null; currency?: string }>;
};

type MobileProduct = {
  id: string;
  brand: string;
  name: string;
  suggestedPrice?: number | null;
  landtopPrice?: number | null;
  landtopPriceLabel?: string | null;
  sourceUrl?: string | null;
  jyesPrice?: number | null;
  jyesPriceLabel?: string | null;
  jyesUrl?: string | null;
  bestPrice?: number | null;
  bestSourceLabel?: string | null;
};

type MobileResult = {
  source: string;
  query: string;
  total: number;
  fetchedAt: string;
  products: MobileProduct[];
  warnings?: string[];
  sourceUrls?: string[];
  historyAvailable?: boolean;
};

type TubeVideo = {
  videoId: string;
  title: string;
  url: string;
  publishedAt: string;
  updatedAt: string;
  thumbnail: string;
  channelTitle?: string;
};

type TubeChannel = {
  sourceUrl: string;
  channelId: string;
  title: string;
  videos: TubeVideo[];
  error?: string;
  downfallIndexUpdate?: {
    value: string;
    title: string;
    url: string;
    publishedAt: string;
  } | null;
};

type TubeResult = {
  fetchedAt: string;
  sourceCount: number;
  defaultSourceCount: number;
  channels: TubeChannel[];
  recentVideos: TubeVideo[];
};

type FinanceQuote = {
  id: string;
  name: string;
  displayName: string;
  symbol: string;
  sourceUrl: string;
  group: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  currency: string;
  high52: number | null;
  low52: number | null;
  lastUpdated: string;
  recordTag: "new-high" | "new-low" | null;
  isThresholdAlert?: boolean;
  alertMessage?: string;
  error?: string;
};

type FinanceResult = {
  fetchedAt: string;
  source: string;
  quotes: FinanceQuote[];
  financeAlerts: Array<{ id: string; message: string; sourceUrl: string }>;
  shillerPe: {
    current: number | null;
    recordHigh: number;
    recordHighDate: string;
    isRecordHigh: boolean;
  };
};

type CodeStats = {
  generatedAt: string;
  root: string;
  totalFiles: number;
  totalLines: number;
  totalBytes: number;
  byExtension: Array<{ extension: string; files: number; lines: number; bytes: number }>;
  topFiles: Array<{ path: string; extension: string; lines: number; bytes: number }>;
};

type Props = {
  financeMarginRate?: number | null;
  onFinanceMarginRateChange?: (value: number | null) => void;
  flash: (message: string) => void;
};

const tubeChannelsKey = "fengbro.tools.tube.channels";
const priceSourceKey = "fengbro.tools.price.source";

const toolTabs: Array<{ id: ToolsTab; label: string; icon: ReactNode }> = [
  { id: "price-compare", label: "鋒兄比價", icon: <Wrench size={17} /> },
  { id: "landtop", label: "手機比價", icon: <Smartphone size={17} /> },
  { id: "fengbro-tube", label: "鋒兄Tube", icon: <Play size={17} /> },
  { id: "fengbro-finance", label: "鋒兄金融", icon: <Landmark size={17} /> },
];

function formatPrice(value: number | null | undefined, currency = "TWD") {
  if (typeof value !== "number") return "-";
  if (!currency) return value.toLocaleString("zh-TW", { maximumFractionDigits: 2 });
  return new Intl.NumberFormat("zh-TW", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "TWD" ? 0 : 2,
  }).format(value);
}

function formatNumber(value: number | null | undefined, digits = 2) {
  return typeof value === "number" ? value.toLocaleString("zh-TW", { maximumFractionDigits: digits }) : "-";
}

function getSavedTubeChannels() {
  if (typeof window === "undefined") return DEFAULT_FENGBRO_TUBE_CHANNELS;
  try {
    const saved = window.localStorage.getItem(tubeChannelsKey);
    return saved ? normalizeFengbroTubeChannels(JSON.parse(saved)) : DEFAULT_FENGBRO_TUBE_CHANNELS;
  } catch {
    return DEFAULT_FENGBRO_TUBE_CHANNELS;
  }
}

function groupFinanceQuotes(quotes: FinanceQuote[]) {
  return quotes.reduce<Record<string, FinanceQuote[]>>((items, quote) => {
    items[quote.group] = [...(items[quote.group] || []), quote];
    return items;
  }, {});
}

export function FengBroToolsPanel({ financeMarginRate = null, onFinanceMarginRateChange, flash }: Props) {
  const [activeTab, setActiveTab] = useState<ToolsTab>("price-compare");
  const [priceUrl, setPriceUrl] = useState("https://24h.pchome.com.tw/prod/DRAHGT-A900GOJVX");
  const [priceSource, setPriceSource] = useState<PriceSource>("biggo-api");
  const [priceResult, setPriceResult] = useState<PriceResult | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [priceError, setPriceError] = useState("");
  const [mobileQuery, setMobileQuery] = useState("iPhone 17");
  const [mobileResult, setMobileResult] = useState<MobileResult | null>(null);
  const [mobileLoading, setMobileLoading] = useState(false);
  const [mobileError, setMobileError] = useState("");
  const [tubeResult, setTubeResult] = useState<TubeResult | null>(null);
  const [tubeLoading, setTubeLoading] = useState(false);
  const [tubeError, setTubeError] = useState("");
  const [tubeLoadedOnce, setTubeLoadedOnce] = useState(false);
  const [tubeChannels, setTubeChannels] = useState<FengbroTubeChannelConfig[]>(getSavedTubeChannels);
  const [tubeAliasDraft, setTubeAliasDraft] = useState("");
  const [tubeUrlDraft, setTubeUrlDraft] = useState("");
  const [financeResult, setFinanceResult] = useState<FinanceResult | null>(null);
  const [financeLoading, setFinanceLoading] = useState(false);
  const [financeError, setFinanceError] = useState("");
  const [financeLoadedOnce, setFinanceLoadedOnce] = useState(false);
  const [codeStats, setCodeStats] = useState<CodeStats | null>(null);
  const [codeStatsLoading, setCodeStatsLoading] = useState(false);
  const [codeStatsError, setCodeStatsError] = useState("");

  useEffect(() => {
    const saved = window.localStorage.getItem(priceSourceKey);
    if (saved === "local" || saved === "biggo-api") setPriceSource(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(priceSourceKey, priceSource);
  }, [priceSource]);

  useEffect(() => {
    window.localStorage.setItem(tubeChannelsKey, JSON.stringify(tubeChannels));
  }, [tubeChannels]);

  const priceSummary = useMemo(() => {
    if (!priceResult?.history.length) return null;
    const prices = priceResult.history
      .map((item) => item.price)
      .filter((item): item is number => typeof item === "number");
    if (!prices.length) return null;
    return {
      current: priceResult.currentPrice ?? prices.at(-1) ?? null,
      highest: Math.max(...prices),
      lowest: Math.min(...prices),
      count: prices.length,
    };
  }, [priceResult]);

  const financeGroups = useMemo(() => groupFinanceQuotes(financeResult?.quotes || []), [financeResult]);
  const headlineFinanceQuotes = useMemo(() => {
    const headlineIds = new Set(["taiex", "tsmc", "dow", "sp500", "nasdaq", "vix", "bitcoin", "usd-twd"]);
    return (financeResult?.quotes || []).filter((quote) => headlineIds.has(quote.id));
  }, [financeResult]);

  const loadCodeStats = useCallback(async () => {
    setCodeStatsLoading(true);
    setCodeStatsError("");
    try {
      const response = await fetch("/api/code-stats");
      const result = (await response.json()) as CodeStats & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "程式碼行數統計失敗");
      setCodeStats(result);
    } catch (error) {
      setCodeStatsError(error instanceof Error ? error.message : "程式碼行數統計失敗");
    } finally {
      setCodeStatsLoading(false);
    }
  }, []);

  const runPriceCompare = async () => {
    if (!priceUrl.trim()) {
      setPriceError("請輸入商品網址");
      return;
    }
    setPriceLoading(true);
    setPriceError("");
    try {
      const response = await fetch(`/api/resolve?url=${encodeURIComponent(priceUrl.trim())}&source=${priceSource}`);
      const result = (await response.json()) as PriceResult & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "比價查詢失敗");
      setPriceResult(result);
      flash("鋒兄比價查詢完成");
    } catch (error) {
      setPriceError(error instanceof Error ? error.message : "比價查詢失敗");
    } finally {
      setPriceLoading(false);
    }
  };

  const loadMobile = async (refresh = false, queryOverride = mobileQuery) => {
    setMobileLoading(true);
    setMobileError("");
    try {
      const response = await fetch(`/api/landtop?query=${encodeURIComponent(queryOverride)}${refresh ? "&refresh=1" : ""}`);
      const result = (await response.json()) as MobileResult & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "手機比價資料抓取失敗");
      setMobileResult(result);
      flash(`手機比價已載入 ${result.total} 筆`);
    } catch (error) {
      setMobileError(error instanceof Error ? error.message : "手機比價資料抓取失敗");
    } finally {
      setMobileLoading(false);
    }
  };

  const loadTube = useCallback(async () => {
    setTubeLoadedOnce(true);
    setTubeLoading(true);
    setTubeError("");
    try {
      const response = await fetch("/api/fengbro-tube", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channels: tubeChannels }),
      });
      const result = (await response.json()) as TubeResult & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "鋒兄Tube 讀取失敗");
      setTubeResult(result);
      flash(`鋒兄Tube 已讀取 ${result.sourceCount} 個頻道`);
    } catch (error) {
      setTubeError(error instanceof Error ? error.message : "鋒兄Tube 讀取失敗");
    } finally {
      setTubeLoading(false);
    }
  }, [flash, tubeChannels]);

  const loadFinance = useCallback(async () => {
    setFinanceLoadedOnce(true);
    setFinanceLoading(true);
    setFinanceError("");
    try {
      const response = await fetch("/api/fengbro-finance");
      const result = (await response.json()) as FinanceResult & { error?: string };
      if (!response.ok || result.error) throw new Error(result.error || "鋒兄金融讀取失敗");
      setFinanceResult(result);
      flash("鋒兄金融報價已更新");
    } catch (error) {
      setFinanceError(error instanceof Error ? error.message : "鋒兄金融讀取失敗");
    } finally {
      setFinanceLoading(false);
    }
  }, [flash]);

  useEffect(() => {
    void loadCodeStats();
  }, [loadCodeStats]);

  useEffect(() => {
    if (activeTab === "fengbro-tube" && !tubeLoadedOnce && !tubeLoading) {
      void loadTube();
    }
  }, [activeTab, loadTube, tubeLoadedOnce, tubeLoading]);

  useEffect(() => {
    if (activeTab === "fengbro-finance" && !financeLoadedOnce && !financeLoading) {
      void loadFinance();
    }
  }, [activeTab, financeLoadedOnce, financeLoading, loadFinance]);

  const saveTubeChannel = () => {
    const sourceUrl = normalizeFengbroTubeSource(tubeUrlDraft);
    if (!sourceUrl) {
      setTubeError("請輸入正確的 YouTube 頻道網址或 @handle");
      return;
    }
    setTubeChannels((items) =>
      normalizeFengbroTubeChannels([...items.filter((item) => item.sourceUrl !== sourceUrl), { alias: tubeAliasDraft, sourceUrl }])
    );
    setTubeAliasDraft("");
    setTubeUrlDraft("");
    setTubeResult(null);
  };

  return (
    <div className="module-body tool-menu-body">
      <div className="module-summary tool-menu-summary">
        <div>
          <strong>鋒兄工具</strong>
          <span>依照 Appwrite 版工具模組移植：鋒兄比價、手機比價、鋒兄Tube、鋒兄金融。</span>
        </div>
      </div>

      <section className="code-stats-panel" aria-label="程式碼行數統計">
        <div className="code-stats-heading">
          <strong><BarChart3 size={17} />程式碼行數</strong>
          <button className="button ghost" type="button" onClick={() => void loadCodeStats()} disabled={codeStatsLoading}>
            <RefreshCw size={16} />
            {codeStatsLoading ? "統計中..." : "重新統計"}
          </button>
        </div>
        {codeStatsError ? <div className="tool-error">{codeStatsError}</div> : null}
        {codeStats ? (
          <>
            <div className="code-stats-grid">
              <article>
                <span>總行數</span>
                <strong>{codeStats.totalLines.toLocaleString("zh-TW")}</strong>
              </article>
              <article>
                <span>檔案數</span>
                <strong>{codeStats.totalFiles.toLocaleString("zh-TW")}</strong>
              </article>
              <article>
                <span>專案</span>
                <strong>{codeStats.root}</strong>
              </article>
            </div>
            <div className="code-extension-list">
              {codeStats.byExtension.slice(0, 6).map((item) => (
                <span key={item.extension}>{item.extension} {item.lines.toLocaleString("zh-TW")} 行</span>
              ))}
            </div>
          </>
        ) : codeStatsLoading ? (
          <div className="tool-empty">正在統計目前 repo 的程式碼行數...</div>
        ) : null}
      </section>

      <div className="tool-tabs" role="tablist" aria-label="鋒兄工具">
        {toolTabs.map((tab) => (
          <button key={tab.id} className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)} type="button">
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "price-compare" ? (
        <section className="tool-section tool-section-price-compare">
          <div className="tool-section-heading">
            <div>
              <h3>鋒兄比價</h3>
              <p>貼上 momo / PChome 商品網址，可切換 BigGo API 或本地佔位模式。</p>
            </div>
            <select value={priceSource} onChange={(event) => setPriceSource(event.target.value as PriceSource)}>
              <option value="biggo-api">BigGo API</option>
              <option value="local">本地佔位</option>
            </select>
          </div>
          <div className="tool-search-row">
            <input value={priceUrl} onChange={(event) => setPriceUrl(event.target.value)} placeholder="商品網址" />
            <button className="button primary" onClick={() => void runPriceCompare()} disabled={priceLoading}>
              <Search size={16} />
              {priceLoading ? "查詢中..." : "查詢比價"}
            </button>
          </div>
          {priceError ? <div className="tool-error">{priceError}</div> : null}
          {priceResult ? (
            <div className="tool-result-grid">
              <article className="tool-result-card wide">
                <strong>{priceResult.title}</strong>
                <span>{priceResult.source} · {priceResult.resolvedAt ? new Date(priceResult.resolvedAt).toLocaleString("zh-TW") : ""}</span>
                {priceResult.notice ? <p>{priceResult.notice}</p> : null}
                {priceResult.matchedUrl ? (
                  <a href={priceResult.matchedUrl} target="_blank" rel="noreferrer">
                    BigGo 配對商品 <ExternalLink size={13} />
                  </a>
                ) : null}
              </article>
              <article className="tool-result-card">
                <span>目前價格</span>
                <strong>{formatPrice(priceSummary?.current ?? priceResult.currentPrice, priceResult.currency || "TWD")}</strong>
              </article>
              <article className="tool-result-card">
                <span>歷史高點</span>
                <strong>{formatPrice(priceSummary?.highest, priceResult.currency || "TWD")}</strong>
              </article>
              <article className="tool-result-card">
                <span>歷史低點</span>
                <strong>{formatPrice(priceSummary?.lowest, priceResult.currency || "TWD")}</strong>
              </article>
            </div>
          ) : null}
        </section>
      ) : activeTab === "landtop" ? (
        <section className="tool-section tool-section-landtop">
          <div className="tool-section-heading">
            <div>
              <h3>手機比價</h3>
              <p>整合地標網通與傑昇通信，可搜尋 iPhone、Samsung A17 等機型。</p>
            </div>
            <button className="button ghost" onClick={() => void loadMobile(true)} disabled={mobileLoading}>
              <RefreshCw size={16} />
              強制更新
            </button>
          </div>
          <div className="tool-search-row">
            <input value={mobileQuery} onChange={(event) => setMobileQuery(event.target.value)} placeholder="iPhone 17 / Samsung 26" />
            <button className="button primary" onClick={() => void loadMobile()} disabled={mobileLoading}>
              <Search size={16} />
              {mobileLoading ? "載入中..." : "搜尋手機"}
            </button>
          </div>
          <div className="tool-chip-row" aria-label="手機比價預設關鍵字">
            {["iPhone 17", "Samsung 26"].map((keyword) => (
              <button
                key={keyword}
                className={mobileQuery === keyword ? "active" : ""}
                type="button"
                onClick={() => {
                  setMobileQuery(keyword);
                  void loadMobile(false, keyword);
                }}
              >
                {keyword}
              </button>
            ))}
          </div>
          {mobileError ? <div className="tool-error">{mobileError}</div> : null}
          {mobileResult?.warnings?.map((warning) => <div className="tool-warning" key={warning}>{warning}</div>)}
          {!mobileResult && !mobileLoading ? <div className="tool-empty">預設可用 iPhone 17 或 Samsung 26 開始比價。</div> : null}
          <div className="phone-grid">
            {(mobileResult?.products || []).slice(0, 60).map((product) => (
              <article key={product.id} className="phone-card">
                <strong>{product.name}</strong>
                <span>{product.brand} · 最低 {formatPrice(product.bestPrice, "TWD")} {product.bestSourceLabel ? `(${product.bestSourceLabel})` : ""}</span>
                <div className="phone-price-row">
                  <small>建議 {formatPrice(product.suggestedPrice, "TWD")}</small>
                  <small>地標 {product.landtopPriceLabel || "-"}</small>
                  <small>傑昇 {product.jyesPriceLabel || "-"}</small>
                </div>
                <div className="tool-link-row">
                  {product.sourceUrl ? <a href={product.sourceUrl} target="_blank" rel="noreferrer">地標 <ExternalLink size={12} /></a> : null}
                  {product.jyesUrl ? <a href={product.jyesUrl} target="_blank" rel="noreferrer">傑昇 <ExternalLink size={12} /></a> : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : activeTab === "fengbro-tube" ? (
        <section className="tool-section tool-section-fengbro-tube">
          <div className="tool-section-heading">
            <div>
              <h3>鋒兄Tube</h3>
              <p>讀取預設與自訂 YouTube 頻道，整理三天內新影片與倒台指數更新。</p>
            </div>
            <button className="button primary" onClick={() => void loadTube()} disabled={tubeLoading}>
              <RefreshCw size={16} />
              {tubeLoading ? "讀取中..." : "重新整理"}
            </button>
          </div>
          <div className="tube-manager">
            <input value={tubeAliasDraft} onChange={(event) => setTubeAliasDraft(event.target.value)} placeholder="別名" />
            <input value={tubeUrlDraft} onChange={(event) => setTubeUrlDraft(event.target.value)} placeholder="@handle 或 YouTube 頻道網址" />
            <button className="button ghost" onClick={saveTubeChannel}><Save size={16} />儲存頻道</button>
            <button className="button ghost" onClick={() => setTubeChannels(DEFAULT_FENGBRO_TUBE_CHANNELS)}>
              <RotateCcw size={16} />
              還原預設
            </button>
          </div>
          {tubeError ? <div className="tool-error">{tubeError}</div> : null}
          <div className="tube-channel-list">
            {tubeChannels.map((channel) => (
              <div key={channel.sourceUrl} className="tube-channel-pill">
                <span>{channel.alias || getFengbroTubeFallbackTitle(channel.sourceUrl)}</span>
                <button aria-label="刪除頻道" onClick={() => setTubeChannels((items) => items.filter((item) => item.sourceUrl !== channel.sourceUrl))}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          {tubeLoading ? <div className="tool-empty">正在讀取 YouTube 影片列表...</div> : null}
          {tubeResult?.recentVideos?.length ? (
            <>
              <h4 className="tool-subheading">三天內新影片</h4>
              <div className="video-grid">
                {tubeResult.recentVideos.slice(0, 12).map((video) => (
                  <a key={`${video.channelTitle}-${video.videoId}`} className="video-card" href={video.url} target="_blank" rel="noreferrer">
                    {video.thumbnail ? <img src={video.thumbnail} alt="" /> : null}
                    <strong>{video.title}</strong>
                    <span>{video.channelTitle} · {video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("zh-TW") : ""}</span>
                  </a>
                ))}
              </div>
            </>
          ) : null}
          {tubeResult?.channels?.length ? (
            <div className="tool-result-grid">
              {tubeResult.channels.map((channel) => (
                <article key={channel.sourceUrl} className="tool-result-card">
                  <strong>{channel.title}</strong>
                  <span>{channel.videos.length} 支影片</span>
                  {channel.downfallIndexUpdate ? (
                    <p>倒台指數 {channel.downfallIndexUpdate.value}</p>
                  ) : channel.error ? (
                    <p>{channel.error}</p>
                  ) : null}
                  <a href={channel.sourceUrl} target="_blank" rel="noreferrer">頻道 <ExternalLink size={12} /></a>
                </article>
              ))}
            </div>
          ) : null}
          {tubeResult?.channels?.length ? (
            <>
              <h4 className="tool-subheading">頻道影片列表</h4>
              <div className="channel-video-list">
                {tubeResult.channels.map((channel) => (
                  <article key={`videos-${channel.sourceUrl}`} className="channel-video-card">
                    <strong>{channel.title}</strong>
                    {channel.videos.length ? (
                      channel.videos.slice(0, 5).map((video) => (
                        <a key={video.videoId} href={video.url} target="_blank" rel="noreferrer">
                          <span>{video.title}</span>
                          <small>{video.publishedAt ? new Date(video.publishedAt).toLocaleDateString("zh-TW") : "-"}</small>
                        </a>
                      ))
                    ) : (
                      <p>{channel.error || "目前沒有抓到影片，請重新整理或檢查頻道來源。"}</p>
                    )}
                  </article>
                ))}
              </div>
            </>
          ) : !tubeLoading ? (
            <div className="tool-empty">鋒兄Tube 會自動讀取影片列表，也可以按重新整理。</div>
          ) : null}
        </section>
      ) : (
        <section className="tool-section tool-section-fengbro-finance">
          <div className="tool-section-heading">
            <div>
              <h3>鋒兄金融</h3>
              <p>CNBC / Yahoo Finance / Multpl 報價，保留 Appwrite 版警戒門檻與 Shiller PE 追蹤。</p>
            </div>
            <button className="button primary" onClick={() => void loadFinance()} disabled={financeLoading}>
              <RefreshCw size={16} />
              {financeLoading ? "讀取中..." : "更新報價"}
            </button>
          </div>
          <div className="finance-margin-control">
            <label className="field">
              <span>大盤融資維持率</span>
              <input
                type="number"
                min="0"
                step="0.1"
                value={financeMarginRate === null ? "" : String(financeMarginRate)}
                placeholder="例如 139.8"
                onChange={(event) => {
                  const value = event.target.value.trim();
                  const rate = Number(value);
                  onFinanceMarginRateChange?.(value && !Number.isNaN(rate) ? rate : null);
                }}
              />
            </label>
            {financeMarginRate !== null && financeMarginRate <= 140 ? (
              <div className="finance-tool-warning"><AlertTriangle size={16} /><span>140% 以下，首頁會提示使用者。</span></div>
            ) : null}
          </div>
          {financeError ? <div className="tool-error">{financeError}</div> : null}
          {financeResult?.financeAlerts?.length ? (
            <div className="finance-alert-list">
              {financeResult.financeAlerts.map((alert) => (
                <a href={alert.sourceUrl} target="_blank" rel="noreferrer" key={alert.id}>
                  <AlertTriangle size={15} />
                  {alert.message}
                </a>
              ))}
            </div>
          ) : null}
          {financeLoading ? <div className="tool-empty">正在讀取市場指數與金融報價...</div> : null}
          {headlineFinanceQuotes.length ? (
            <>
              <h4 className="tool-subheading">市場指數</h4>
              <div className="finance-index-grid">
                {headlineFinanceQuotes.map((quote) => (
                  <a href={quote.sourceUrl} target="_blank" rel="noreferrer" key={`headline-${quote.id}`}>
                    <span>{quote.name}</span>
                    <strong>{formatNumber(quote.price, quote.group === "rates" ? 3 : 2)} {quote.currency}</strong>
                    <small className={(quote.changePercent || 0) < 0 ? "negative" : "positive"}>
                      {quote.changePercent == null ? "-" : `${quote.changePercent.toFixed(2)}%`}
                    </small>
                  </a>
                ))}
              </div>
            </>
          ) : !financeLoading && !financeResult ? (
            <div className="tool-empty">鋒兄金融會自動載入台股、美股、匯率與 Shiller PE 指數。</div>
          ) : null}
          {financeResult ? (
            <div className="tool-result-grid">
              <article className="tool-result-card">
                <span>Shiller PE</span>
                <strong>{formatNumber(financeResult.shillerPe.current)}</strong>
                <p>歷史高點 {financeResult.shillerPe.recordHigh} ({financeResult.shillerPe.recordHighDate})</p>
              </article>
              {Object.entries(financeGroups).map(([group, quotes]) => (
                <article className="tool-result-card wide" key={group}>
                  <strong>{group.toUpperCase()}</strong>
                  <div className="finance-quote-list">
                    {quotes.map((quote) => (
                      <a href={quote.sourceUrl} target="_blank" rel="noreferrer" key={quote.id} className={quote.isThresholdAlert ? "is-alert" : ""}>
                        <span>{quote.name}</span>
                        <strong>{formatNumber(quote.price, group === "rates" ? 3 : 2)} {quote.currency}</strong>
                        <small>{quote.changePercent == null ? "-" : `${quote.changePercent.toFixed(2)}%`}</small>
                      </a>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </section>
      )}
    </div>
  );
}
