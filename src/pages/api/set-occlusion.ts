import type { APIRoute } from 'astro';
import { json, proxy } from './_helpers';

export const PUT: APIRoute = async ({ request }) => {
	let body: any;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid JSON body' }, 400);
	}
	if (typeof body?.useOcclusion !== 'boolean') {
		return json({ error: 'Missing boolean useOcclusion' }, 400);
	}
	return proxy('/settings/occlusion', {
		method: 'PUT',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({ useOcclusion: body.useOcclusion }),
	});
};

