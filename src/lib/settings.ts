/**
 * Data-access layer for app settings, backed by Cloudflare D1.
 *
 * A simple key/value store (table `settings`) used for site-wide configuration
 * such as the homepage countdown deadline. The D1 binding is passed in from the
 * calling Astro context (accessed via `import { env } from 'cloudflare:workers'`
 * then `env.DB`) to keep this module decoupled from Astro globals, mirroring the
 * pattern in `entries.ts`.
 */

/**
 * Fetches the value for a setting key, or null if none exists.
 */
export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare('SELECT value FROM settings WHERE key = ?1')
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

/**
 * Upserts a setting value by key.
 */
export async function setSetting(db: D1Database, key: string, value: string): Promise<void> {
  await db
    .prepare(
      `INSERT INTO settings (key, value, updated_at)
       VALUES (?1, ?2, datetime('now'))
       ON CONFLICT(key) DO UPDATE SET
         value = excluded.value,
         updated_at = datetime('now')`,
    )
    .bind(key, value)
    .run();
}

/**
 * Removes a setting row by key, if it exists.
 */
export async function deleteSetting(db: D1Database, key: string): Promise<void> {
  await db
    .prepare('DELETE FROM settings WHERE key = ?1')
    .bind(key)
    .run();
}
