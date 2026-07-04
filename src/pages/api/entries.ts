import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { isValidDateISO, todayISO } from '../../lib/dates';
import { upsertEntry } from '../../lib/entries';

/**
 * POST /api/entries — upsert today's journal entry.
 *
 * Enforces the append-only rule: the server only accepts writes where
 * `date === today` (timezone-aware). Past entries are locked and return 403.
 *
 * Body: { "date": "YYYY-MM-DD", "content": string, "rating": 1–5 }
 */
export const POST: APIRoute = async ({ request }) => {
	const db = env.DB;
	const timezone = env.APP_TIMEZONE ?? 'UTC';

	let body: { date?: unknown; content?: unknown; rating?: unknown };
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Request body must be valid JSON.' }, 400);
	}

	const { date, content, rating } = body;

	// Validate date format
	if (typeof date !== 'string' || !isValidDateISO(date)) {
		return json({ error: '"date" must be a valid YYYY-MM-DD string.' }, 400);
	}

	// Append-only rule: only today's entry may be written or edited.
	const today = todayISO(timezone);
	if (date !== today) {
		return json(
			{
				error:
					"Only today's entry can be written or edited. Past entries are locked.",
			},
			403,
		);
	}

	// Validate content
	if (typeof content !== 'string' || content.trim().length === 0) {
		return json({ error: '"content" must not be empty.' }, 400);
	}

	// Validate rating
	if (
		typeof rating !== 'number' ||
		!Number.isInteger(rating) ||
		rating < 1 ||
		rating > 5
	) {
		return json({ error: '"rating" must be an integer from 1 to 5.' }, 400);
	}

	try {
		await upsertEntry(db, date, content.trim(), rating);
	} catch {
		return json({ error: 'Failed to save entry.' }, 500);
	}

	return json({ ok: true, date, content: content.trim(), rating }, 200);
};

/** Small helper for consistent JSON responses. */
function json(data: unknown, status: number): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}
