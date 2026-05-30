import { getApiUrl } from '../../lib/endpoint-config';

export function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

export function getKey(): string | null {
	return (import.meta.env.FFM_API_KEY as string | undefined)
		|| (typeof process !== 'undefined' ? process.env.FFM_API_KEY : undefined)
		|| null;
}

export async function proxy(
	upstreamPath: string,
	init: RequestInit = {},
): Promise<Response> {
	const key = getKey();
	if (!key) return json({ error: 'API key not configured' }, 500);
	const headers: Record<string, string> = {
		'X-API-Key': key,
		...((init.headers as Record<string, string>) || {}),
	};
	const r = await fetch(getApiUrl() + upstreamPath, { ...init, headers });
	const body = await r.text();
	return new Response(body, {
		status: r.status,
		headers: {
			'Content-Type': r.headers.get('content-type') || 'application/json',
		},
	});
}

