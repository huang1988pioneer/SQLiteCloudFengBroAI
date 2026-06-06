import type { WorkspaceField, WorkspaceModule } from "@/types/workspace";

const commonSites: WorkspaceField[] = Array.from({ length: 37 }, (_, index) => {
  const number = String(index + 1).padStart(2, "0");
  return [
    { name: `site${number}`, label: `常用 ${number}`, type: "text" as const },
    { name: `note${number}`, label: `備註 ${number}`, type: "textarea" as const, multiline: true },
  ];
}).flat();

export const workspaceModules: WorkspaceModule[] = [
  {
    key: "food",
    title: "鋒兄食品",
    shortTitle: "食品",
    table: "food",
    description: "食品效期、數量、價格、商店與照片，兼作商品庫存。",
    csvName: "appwrite-food",
    fields: [
      { name: "name", label: "食品 / 商品名稱", type: "text", required: true },
      { name: "amount", label: "數量", type: "number" },
      { name: "todate", label: "到期日", type: "date" },
      { name: "photo", label: "照片網址", type: "url" },
      { name: "price", label: "價格", type: "number" },
      { name: "shop", label: "商店", type: "text" },
      { name: "photohash", label: "照片 Hash", type: "text" },
    ],
    displayFields: ["name", "amount", "todate", "price", "shop"],
  },
  {
    key: "article",
    title: "鋒兄筆記",
    shortTitle: "筆記",
    table: "article",
    description: "筆記、文章、附件欄位與參考連結。",
    csvName: "appwrite-article",
    fields: [
      { name: "title", label: "標題", type: "text", required: true },
      { name: "content", label: "內容", type: "textarea", multiline: true },
      { name: "ai_summary", label: "AI 摘要", type: "textarea", multiline: true },
      { name: "category", label: "分類", type: "text" },
      { name: "newDate", label: "日期", type: "date" },
      { name: "pinned", label: "釘選", type: "number" },
      { name: "url1", label: "連結 1", type: "url" },
      { name: "url2", label: "連結 2", type: "url" },
      { name: "url3", label: "連結 3", type: "url" },
      { name: "file1", label: "檔案 1", type: "url" },
      { name: "file1name", label: "檔案 1 名稱", type: "text" },
      { name: "file1type", label: "檔案 1 類型", type: "text" },
      { name: "file2", label: "檔案 2", type: "url" },
      { name: "file2name", label: "檔案 2 名稱", type: "text" },
      { name: "file2type", label: "檔案 2 類型", type: "text" },
      { name: "file3", label: "檔案 3", type: "url" },
      { name: "file3name", label: "檔案 3 名稱", type: "text" },
      { name: "file3type", label: "檔案 3 類型", type: "text" },
    ],
    displayFields: ["title", "category", "newDate", "url1"],
  },
  {
    key: "common",
    title: "鋒兄常用",
    shortTitle: "常用",
    table: "commonaccount",
    description: "帳號與常用網站清單，相容 site01/note01 到 site37/note37。",
    csvName: "appwrite-commonaccount",
    fields: [{ name: "name", label: "帳號 / 名稱", type: "text", required: true }, ...commonSites],
    displayFields: ["name", "site01", "site02", "site03", "site04"],
  },
  {
    key: "bank",
    title: "鋒兄銀行",
    shortTitle: "銀行",
    table: "bank",
    description: "銀行、餘額、轉帳提款優惠、金融卡與電子票證。",
    csvName: "appwrite-bank",
    fields: [
      { name: "name", label: "銀行 / 票證", type: "text", required: true },
      { name: "deposit", label: "餘額", type: "number" },
      { name: "site", label: "網站", type: "url" },
      { name: "address", label: "地址", type: "text" },
      { name: "withdrawals", label: "提款次數", type: "number" },
      { name: "transfer", label: "轉帳次數", type: "number" },
      { name: "activity", label: "活動網址", type: "url" },
      { name: "card", label: "卡片 / 電子票證", type: "text" },
      { name: "account", label: "帳號備註", type: "text" },
    ],
    displayFields: ["name", "deposit", "card", "account", "site"],
  },
  {
    key: "routine",
    title: "鋒兄例行",
    shortTitle: "例行",
    table: "routine",
    description: "例行事項、最近日期、連結與照片。",
    csvName: "appwrite-routine",
    fields: [
      { name: "name", label: "例行事項", type: "text", required: true },
      { name: "note", label: "備註", type: "textarea", multiline: true },
      { name: "lastdate1", label: "日期 1", type: "date" },
      { name: "lastdate2", label: "日期 2", type: "date" },
      { name: "lastdate3", label: "日期 3", type: "date" },
      { name: "link", label: "連結", type: "url" },
      { name: "photo", label: "照片", type: "url" },
    ],
    displayFields: ["name", "lastdate1", "lastdate2", "link"],
  },
];

export const workspaceToolItems = [
  {
    key: "price",
    title: "鋒兄比價",
    description: "一般商品價格紀錄與比價入口。",
  },
  {
    key: "mobile",
    title: "手機比價",
    description: "手機、電腦與 3C 設備比價入口。",
  },
  {
    key: "tube",
    title: "鋒兄Tube",
    description: "影片、頻道與觀看整理入口。",
  },
  {
    key: "finance",
    title: "鋒兄金融",
    description: "金融資訊、資產與常用金融工具入口。",
  },
];

export function getWorkspaceModule(key: string) {
  return workspaceModules.find((module) => module.key === key);
}
