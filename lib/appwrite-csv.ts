import type { Subscription, SubscriptionDraft } from "@/types/subscription";

export const appwriteCsvHeaders = ["name", "site", "price", "nextdate", "note", "account", "currency", "continue"] as const;

type AppwriteCsvHeader = (typeof appwriteCsvHeaders)[number];

export type CsvImportResult = {
  rows: SubscriptionDraft[];
  errors: string[];
};

function normalizeFullWidthDigits(value: string) {
  return value.replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10));
}

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function parseBoolean(value: string) {
  const normalized = value.trim().toLowerCase();
  if (["true", "1", "yes", "y", "續訂", "是"].includes(normalized)) return true;
  if (["false", "0", "no", "n", "停止", "否", ""].includes(normalized)) return false;
  return false;
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (inQuotes) {
      if (char === '"' && next === '"') {
        cell += '"';
        index += 1;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  row.push(cell);
  if (row.some((value) => value !== "") || rows.length === 0) {
    rows.push(row);
  }

  return rows;
}

export function parseAppwriteSubscriptionCsv(text: string): CsvImportResult {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  const errors: string[] = [];

  if (rows.length === 0) {
    return { rows: [], errors: ["CSV 是空的。"] };
  }

  const headers = rows[0].map(normalizeHeader);
  const missingHeaders = appwriteCsvHeaders.filter((header) => !headers.includes(header));
  if (missingHeaders.length > 0) {
    return {
      rows: [],
      errors: [`缺少 Appwrite subscription 欄位：${missingHeaders.join(", ")}`],
    };
  }

  const indexByHeader = new Map<AppwriteCsvHeader, number>();
  for (const header of appwriteCsvHeaders) {
    indexByHeader.set(header, headers.indexOf(header));
  }

  const imported = rows.slice(1).flatMap((row, rowIndex) => {
    const value = (header: AppwriteCsvHeader) => row[indexByHeader.get(header) ?? -1]?.trim() ?? "";
    const name = value("name");

    if (!name) {
      errors.push(`第 ${rowIndex + 2} 列缺少 name，已略過。`);
      return [];
    }

    const priceText = normalizeFullWidthDigits(value("price"));
    const price = Number(priceText || 0);
    if (Number.isNaN(price)) {
      errors.push(`第 ${rowIndex + 2} 列 price 不是數字，已用 0 匯入。`);
    }

    return [{
      name,
      site: value("site"),
      price: Number.isNaN(price) ? 0 : price,
      nextdate: value("nextdate"),
      note: value("note"),
      account: value("account"),
      currency: (value("currency") || "TWD").toUpperCase(),
      continue: parseBoolean(value("continue")),
    }];
  });

  return { rows: imported, errors };
}

export function stringifyAppwriteSubscriptionCsv(subscriptions: Subscription[]) {
  const headerLine = appwriteCsvHeaders.join(",");
  const body = subscriptions.map((subscription) =>
    [
      subscription.name,
      subscription.site,
      subscription.price,
      subscription.nextdate,
      subscription.note,
      subscription.account,
      subscription.currency || "TWD",
      subscription.continue ? "true" : "false",
    ].map(csvEscape).join(",")
  );

  return [headerLine, ...body].join("\r\n");
}
