import type { APIRoute } from 'astro';
import { proxy } from './_helpers';

export const GET: APIRoute = () => proxy('/health');

