import type { APIRoute } from 'astro';
import { json, proxy } from './_helpers';

const NAME_RE = /^[A-Za-z0-9_\-]+$/;

export const PUT: APIRoute = async ({ request }) => {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	const name = body?.markerName;
	if (typeof name !== 'string' || !NAME_RE.test(name)) {
		return json({ error: 'Invalid or missing markerName' }, 400);
	}
	return proxy(`/configs/${encodeURIComponent(name)}`, {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
	});
};

