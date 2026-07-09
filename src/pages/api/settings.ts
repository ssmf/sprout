import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isValidDateISO } from '../../lib/dates';
import { setSetting, deleteSetting } from '../../lib/settings';

/**
 * POST /api/settings — save or clear a site-wide setting.
 *
 * Currently the only supported key is `deadline` (value = 'YYYY-MM-DD'), which
 * drives the homepage countdown. The key/value shape is generic so future
 * settings can be added to the allowlist below without changing the endpoint.
 *
 * Body: { "key": "deadline", "value": "2026-08-15" }
 *   - `value` may be null or an empty string to clear the setting.
 *
 * Responses:
 *   200 { ok: true, key, value }   — saved (value) or cleared (null)
 *   400 { error: string }          — invalid key or value
 *   500 { error: string }          — persist failure
 */

/** Keys this endpoint is allowed to write. */
const ALLOWED_KEYS = ['deadline'] as const;
type AllowedKey = (typeof ALLOWED_KEYS)[number];

/** Keys whose value must be a valid 'YYYY-MM-DD' date. */
const DATE_KEYS: AllowedKey[] = ['deadline'];

export const POST: APIRoute = async ({ request }) => {
	const db = env.DB;

	let body: { key?: unknown; value?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Request body must be valid JSON.' }, 400);
	}

	const { key, value } = body;

	// Validate key against the allowlist.
	if (typeof key !== 'string' || !ALLOWED_KEYS.includes(key as AllowedKey)) {
		return json({ error: '"key" is not a recognised setting.' }, 400);
	}
	const typedKey = key as AllowedKey;

	// A null/empty value clears the setting; otherwise validate per key.
	const clearing = value === null || value === '';

	if (!clearing) {
		if (DATE_KEYS.includes(typedKey)) {
			if (typeof value !== 'string' || !isValidDateISO(value)) {
				return json({ error: '"value" must be a valid YYYY-MM-DD string.' }, 400);
			}
		} else if (typeof value !== 'string') {
			return json({ error: '"value" must be a string.' }, 400);
		}
	}

	try {
		if (clearing) {
			await deleteSetting(db, typedKey);
			return json({ ok: true, key: typedKey, value: null }, 200);
		}
		await setSetting(db, typedKey, value as string);
		return json({ ok: true, key: typedKey, value: value as string }, 200);
	} catch {
		return json({ error: 'Failed to save setting.' }, 500);
	}
};

/** Small helper for consistent JSON responses. */
function json(data: unknown, status: number): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
