import yaml from 'js-yaml';
import fs from 'node:fs';
import path from 'node:path';

export interface EndpointsConfig {
	api: { base_url: string; prefix: string };
}

let cached: EndpointsConfig | null = null;

function load(): EndpointsConfig {
	if (cached) return cached;
	const p = path.resolve(process.cwd(), 'endpoints.yaml');
	cached = yaml.load(fs.readFileSync(p, 'utf8')) as EndpointsConfig;
	return cached;
}

export function getApiUrl(): string {
	const { api } = load();
	return `${api.base_url}${api.prefix}`;
}

