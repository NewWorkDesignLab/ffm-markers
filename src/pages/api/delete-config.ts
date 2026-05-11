import type { APIRoute } from 'astro';
import { json, proxy } from './_helpers';

const NAME_RE = /^[A-Za-z0-9_\-]+$/;

export const DELETE: APIRoute = async ({ request }) => {
	const name = new URL(request.url).searchParams.get('name');
	if (!name || !NAME_RE.test(name)) {
		return json({ error: 'Invalid or missing name' }, 400);
	}
	return proxy(`/configs/${encodeURIComponent(name)}`, { method: 'DELETE' });
};

