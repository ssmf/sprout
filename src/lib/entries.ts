/**
 * Data-access layer for journal entries, backed by Cloudflare D1.
 *
 * The D1 binding is passed in from the calling Astro context (accessed via
 * `import { env } from 'cloudflare:workers'` then `env.DB`) to keep this
 * module decoupled from Astro globals and easy to reason about.
 */

export interface Entry {
  date: string; // 'YYYY-MM-DD'
  content: string;
  rating: number; // 1–5
  created_at: string;
  updated_at: string;
}

/**
 * Fetches all entries for a given month, returned as a Map keyed by date
 * for O(1) lookup when rendering the calendar grid.
 */
export async function listEntriesForMonth(
  db: D1Database,
  year: number,
  month: number, // 0-indexed
): Promise<Map<string, Entry>> {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const { results } = await db
    .prepare(
      'SELECT date, content, rating, created_at, updated_at FROM entries WHERE date LIKE ?1 ORDER BY date ASC',
    )
    .bind(`${prefix}-%`)
    .all<Entry>();
  return new Map(results.map((e) => [e.date, e]));
}

/** Fetches a single entry by date, or null if none exists. */
export async function getEntryByDate(db: D1Database, date: string): Promise<Entry | null> {
  return await db
    .prepare(
      'SELECT date, content, rating, created_at, updated_at FROM entries WHERE date = ?1',
    )
    .bind(date)
    .first<Entry>();
}

/**
 * Inserts or updates an entry (upsert by date).
 *
 * The caller is responsible for enforcing the append-only rule (`date === today`)
 * — this function itself does not check, so the policy lives in the API route
 * where it can return a proper HTTP error.
 */
export async function upsertEntry(
  db: D1Database,
  date: string,
  content: string,
  rating: number,
): Promise<void> {
  await db
    .prepare(
      `INSERT INTO entries (date, content, rating, created_at, updated_at)
       VALUES (?1, ?2, ?3, datetime('now'), datetime('now'))
       ON CONFLICT(date) DO UPDATE SET
         content = excluded.content,
         rating = excluded.rating,
         updated_at = datetime('now')`,
    )
    .bind(date, content, rating)
    .run();
}
