import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type FileStat = {
  path: string;
  extension: string;
  lines: number;
  bytes: number;
};

const ignoredDirs = new Set([".git", ".next", ".vercel", ".playwright-mcp", "node_modules"]);
const ignoredFiles = new Set(["next-env.d.ts", "package-lock.json"]);
const codeExtensions = new Set([".css", ".js", ".jsx", ".json", ".md", ".ts", ".tsx"]);

async function collectCodeFiles(directory: string, root: string): Promise<FileStat[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (ignoredDirs.has(entry.name)) return [];
        return collectCodeFiles(absolutePath, root);
      }

      if (!entry.isFile() || ignoredFiles.has(entry.name)) return [];
      const extension = path.extname(entry.name).toLowerCase();
      if (!codeExtensions.has(extension)) return [];

      const content = await readFile(absolutePath, "utf8");
      return [
        {
          path: path.relative(root, absolutePath).replaceAll(path.sep, "/"),
          extension: extension || "none",
          lines: content.length ? content.split(/\r\n|\r|\n/).length : 0,
          bytes: Buffer.byteLength(content),
        },
      ];
    })
  );

  return files.flat();
}

export async function GET() {
  const root = process.cwd();
  const files = await collectCodeFiles(root, root);
  const byExtension = Array.from(
    files.reduce<Map<string, { extension: string; files: number; lines: number; bytes: number }>>((items, file) => {
      const current = items.get(file.extension) || {
        extension: file.extension,
        files: 0,
        lines: 0,
        bytes: 0,
      };
      current.files += 1;
      current.lines += file.lines;
      current.bytes += file.bytes;
      items.set(file.extension, current);
      return items;
    }, new Map()).values()
  ).sort((left, right) => right.lines - left.lines);

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    root: path.basename(root),
    totalFiles: files.length,
    totalLines: files.reduce((sum, file) => sum + file.lines, 0),
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    byExtension,
    topFiles: [...files].sort((left, right) => right.lines - left.lines).slice(0, 10),
  });
}
