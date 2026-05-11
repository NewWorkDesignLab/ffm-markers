import type { APIRoute } from 'astro';
import { json, proxy } from './_helpers';

export const POST: APIRoute = async ({ request }) => {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	if (!body || typeof (body as { password?: unknown }).password !== 'string') {
		return json({ error: 'Missing password' }, 400);
	}
	return proxy('/auth/login', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
};

