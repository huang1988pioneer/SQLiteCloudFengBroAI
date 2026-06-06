import { parseCsv } from "@/lib/appwrite-csv";
import type { WorkspaceModule, WorkspaceRecord } from "@/types/workspace";

function normalizeHeader(value: string) {
  return value.replace(/^\uFEFF/, "").trim();
}

function csvEscape(value: unknown) {
  const text = String(value ?? "");
  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function normalizeValue(value: string, type: string) {
  const trimmed = value.trim();
  if (type === "number") {
    const normalized = trimmed.replace(/[０-９]/g, (char) => String(char.charCodeAt(0) - 0xff10)).replaceAll(",", "");
    const number = Number(normalized || 0);
    return Number.isNaN(number) ? 0 : number;
  }
  if (type === "date" && trimmed.includes("T")) {
    return trimmed.slice(0, 10);
  }
  return trimmed;
}

export function parseWorkspaceCsv(text: string, module: WorkspaceModule) {
  const rows = parseCsv(text).filter((row) => row.some((cell) => cell.trim() !== ""));
  const errors: string[] = [];

  if (rows.length === 0) {
    return { records: [], errors: ["CSV 是空的"] };
  }

  const headers = rows[0].map(normalizeHeader);
  const missingHeaders = module.fields.filter((field) => field.required && !headers.includes(field.name));
  if (missingHeaders.length > 0) {
    return {
      records: [],
      errors: [`缺少 ${module.title} 必要欄位：${missingHeaders.map((field) => field.name).join(", ")}`],
    };
  }

  const imported = rows.slice(1).flatMap((row, rowIndex) => {
    const record: Record<string, unknown> = {};
    for (const field of module.fields) {
      const index = headers.indexOf(field.name);
      record[field.name] = index >= 0 ? normalizeValue(row[index] ?? "", field.type) : "";
    }

    if (module.key === "routine") {
      const linkIndex = headers.indexOf("link");
      const link = linkIndex >= 0 ? String(normalizeValue(row[linkIndex] ?? "", "url")).trim() : "";
      const name = String(record.name ?? "").trim();
      if (link && name && !name.includes(link)) {
        record.name = `${name} ${link}`;
      }
    }

    const requiredField = module.fields.find((field) => field.required);
    if (requiredField && !String(record[requiredField.name] ?? "").trim()) {
      errors.push(`第 ${rowIndex + 2} 列缺少 ${requiredField.name}，已略過`);
      return [];
    }
    return [record];
  });

  return { records: imported, errors };
}

export function stringifyWorkspaceCsv(records: WorkspaceRecord[], module: WorkspaceModule) {
  const headerLine = module.fields.map((field) => field.name).join(",");
  const body = records.map((record) => module.fields.map((field) => csvEscape(record[field.name])).join(","));
  return [headerLine, ...body].join("\r\n");
}
