import { ApiClient } from './api.ts';
import { showToast } from './toast.ts';
import { createMarkerCard, defaultConfig } from './markerCard.ts';
import type { MarkerConfig } from '../lib/ffm-client.ts';

const api = new ApiClient();

const $ = (id: string) => document.getElementById(id)!;
const loginEl = $('login');
const appEl = $('app');
const listEl = $('list');
const toastEl = $('toast');

const state: { configs: MarkerConfig[]; dirty: Set<string> } = {
	configs: [],
	dirty: new Set(),
};

function toast(msg: string, type: string) { showToast(toastEl, msg, type); }

async function checkHealth() {
	const el = $('health');
	try {
		await api.health();
		el.innerHTML = '<span class="dot"></span><span>API online</span>';
		el.className = 'health ok';
	} catch {
		el.innerHTML = '<span class="dot"></span><span>API offline</span>';
		el.className = 'health bad';
	}
}

function renderList() {
	listEl.innerHTML = '';
	$('count').textContent = `${state.configs.length} marker${state.configs.length === 1 ? '' : 's'}`;
	state.configs.forEach((markerCfg) => {
		const card = createMarkerCard(markerCfg, {
			isDirty: state.dirty.has(markerCfg.markerName),
			onSave: saveOne,
			onDelete: deleteOne,
			onRename: renameOne,
			onDirtyChange: (name) => state.dirty.add(name),
		});
		listEl.appendChild(card);
	});
}

async function loadAll() {
	try {
		const data = await api.listConfigs();
		state.configs = (data && data.markerConfigs) ? data.markerConfigs : [];
		state.dirty.clear();
		renderList();

		const occ = await api.getOcclusion();
		($('useOcclusion') as HTMLInputElement).checked = !!(occ && occ.useOcclusion);
	} catch (e) {
		toast((e as Error).message, 'error');
		if ((e as Error).message === 'Unauthorized') signOut();
	}
}

async function saveOne(markerCfg: MarkerConfig, btn: HTMLButtonElement, card: HTMLElement) {
	btn.disabled = true;
	try {
		await api.saveConfig(markerCfg);
		state.dirty.delete(markerCfg.markerName);
		card.classList.remove('dirty');
		toast('Saved ' + markerCfg.markerName, 'ok');
	} catch (e) {
		btn.disabled = false;
		toast((e as Error).message, 'error');
	}
}

async function deleteOne(name: string) {
	if (!confirm(`Delete "${name}"?`)) return;
	try {
		await api.deleteConfig(name);
		state.configs = state.configs.filter((c) => c.markerName !== name);
		state.dirty.delete(name);
		renderList();
		toast('Deleted ' + name, 'ok');
	} catch (e) {
		toast((e as Error).message, 'error');
	}
}

async function renameOne(markerCfg: MarkerConfig, newName: string) {
	if (state.configs.some((c) => c.markerName === newName)) {
		toast(`"${newName}" already exists`, 'error');
		return;
	}
	const oldName = markerCfg.markerName;
	try {
		await api.renameConfig(oldName, newName, markerCfg);
		markerCfg.markerName = newName;
		if (state.dirty.has(oldName)) {
			state.dirty.delete(oldName);
			state.dirty.add(newName);
		}
		renderList();
		toast(`Renamed to ${newName}`, 'ok');
	} catch (e) {
		toast('Rename failed: ' + (e as Error).message, 'error');
	}
}

async function addNew() {
	const input = $('newName') as HTMLInputElement;
	const raw = input.value.trim().replace(/^ffm_/, '');
	if (!raw) { toast('Name required', 'error'); return; }
	const name = `ffm_${raw}`;
	if (state.configs.some((c) => c.markerName === name)) {
		toast('Marker already exists', 'error');
		return;
	}
	const newCfg = defaultConfig(name);
	try {
		await api.saveConfig(newCfg);
		state.configs.push(newCfg);
		input.value = '';
		renderList();
		toast('Created ' + name, 'ok');
	} catch (e) {
		toast((e as Error).message, 'error');
	}
}

async function saveOcclusion() {
	try {
		await api.setOcclusion(($('useOcclusion') as HTMLInputElement).checked);
		toast('Occlusion saved', 'ok');
	} catch (e) {
		toast((e as Error).message, 'error');
	}
}

function signOut() {
	api.forgetPassword();
	appEl.classList.add('hidden');
	loginEl.classList.remove('hidden');
	const pw = $('password') as HTMLInputElement | null;
	if (pw) pw.value = '';
}

async function trySignIn() {
	const password = ($('password') as HTMLInputElement).value;
	const remember = ($('remember') as HTMLInputElement).checked;
	const msg = $('loginMsg');
	if (!password) { msg.textContent = 'Enter the password.'; return; }
	msg.textContent = 'Signing in…';
	try {
		await api.login(password);
		api.rememberPassword(password, remember);
		msg.textContent = '';
		enterApp();
	} catch (e) {
		msg.textContent = 'Sign in failed: ' + (e as Error).message;
	}
}

function enterApp() {
	loginEl.classList.add('hidden');
	appEl.classList.remove('hidden');
	checkHealth();
	loadAll();
}

$('loginBtn').addEventListener('click', trySignIn);
($('password') as HTMLInputElement).addEventListener('keydown', (e) => { if (e.key === 'Enter') trySignIn(); });
$('logoutBtn').addEventListener('click', signOut);
$('reloadBtn').addEventListener('click', loadAll);
$('addBtn').addEventListener('click', addNew);
($('newName') as HTMLInputElement).addEventListener('keydown', (e) => { if (e.key === 'Enter') addNew(); });
$('saveOcclusionBtn').addEventListener('click', saveOcclusion);

if (api.hasStoredPassword()) {
	(async () => {
		try {
			await api.login(api.password);
			enterApp();
		} catch {
			signOut();
		}
	})();
}

