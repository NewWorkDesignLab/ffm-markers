
export interface MarkerConfig {
	markerName: string;
	[key: string]: unknown;
}

const BASE = '/api';

async function request<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...((opts.headers as Record<string, string>) || {}),
	};
	const res = await fetch(BASE + path, { ...opts, headers });
	if (res.status === 401 || res.status === 403) {
		throw new Error('Unauthorized');
	}
	if (!res.ok) {
		const text = await res.text().catch(() => '');
		throw new Error(`${res.status} ${res.statusText} ${text}`);
	}
	const ct = res.headers.get('content-type') || '';
	return (ct.includes('application/json') ? res.json() : res.text()) as Promise<T>;
}

export const ffm = {
	async login(password: string): Promise<true> {
		const res = await fetch(BASE + '/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ password }),
		});
		if (res.status === 401) throw new Error('Invalid password');
		if (!res.ok) {
			const text = await res.text().catch(() => '');
			throw new Error(`${res.status} ${res.statusText} ${text}`);
		}
		const data = (await res.json().catch(() => ({}))) as { success?: boolean };
		if (!data.success) throw new Error('Login failed');
		return true;
	},
	health: () => request('/health'),
	listConfigs: () => request<{ markerConfigs: MarkerConfig[] }>('/get-configs'),
	saveConfig: (cfg: MarkerConfig) =>
		request('/save-config', {
			method: 'PUT',
			body: JSON.stringify(cfg),
		}),
	deleteConfig: (name: string) =>
		request(`/delete-config?name=${encodeURIComponent(name)}`, { method: 'DELETE' }),
	getOcclusion: () => request<{ useOcclusion: boolean }>('/get-occlusion'),
	setOcclusion: (useOcclusion: boolean) =>
		request('/set-occlusion', {
			method: 'PUT',
			body: JSON.stringify({ useOcclusion }),
		}),
};

