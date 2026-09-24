# SQLiteCloudFengBroAI

鋒兄 AI 的 SQLiteCloud 版本，先聚焦在「鋒兄訂閱」與「鋒兄設定」：

- 訂閱資料新增、編輯、刪除、搜尋與到期狀態檢視
- 訂閱依扣款狀態篩選（已過期、提醒天數內、30 天內、未設扣款日、不續訂），可一鍵延後一個月或複製成新訂閱
- 食品、筆記、常用、銀行、例行皆可全文搜尋並依模組篩選；食品可直接加減數量，例行可一鍵記錄「今天完成」
- 使用者可輸入 SQLiteCloud Connection String 與通知設定
- 內建 `subscription` table 建議格式與 SQL
- 使用 Next.js latest、React latest 與 App Router

## Development

```bash
npm install
npm run dev
```

## Vercel

Set `SQLITECLOUD_CONNECTION_STRING` in Vercel Project Settings. The app also accepts the legacy name `SQLITE_CLOUD_CONNECTION_STRING`.

The browser setting field is only an optional personal override. CSV import, reload, create, update, and delete all go through the SQLiteCloud API routes, so imported Appwrite CSV rows are written directly to the `subscription` table.

## Subscription Table

建議表名：`subscription`

```sql
CREATE TABLE IF NOT EXISTS subscription (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  site TEXT,
  price REAL NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'TWD',
  nextdate TEXT,
  account TEXT,
  note TEXT,
  continue INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_subscription_nextdate ON subscription(nextdate);
CREATE INDEX IF NOT EXISTS idx_subscription_continue ON subscription(continue);
```

## References

- Base repo: `huang1988pioneer/SQLiteCloudFengBroAI`
- Reference app: `goldshoot0720/fengbroaiappwrite`
- Design workflow reference: [Impeccable](https://impeccable.style/)
- Engineering workflow reference: [mattpocock/skills](https://github.com/mattpocock/skills)
