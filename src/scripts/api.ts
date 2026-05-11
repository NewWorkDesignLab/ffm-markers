import { ffm, type MarkerConfig } from '../lib/ffm-client.ts';

const STORAGE_KEY = 'ffm-ar-pw';
const SESSION_KEY = 'ffm-ar-pw-session';

export class ApiClient {
	password: string;

	constructor() {
		this.password =
			localStorage.getItem(STORAGE_KEY) ||
			sessionStorage.getItem(SESSION_KEY) ||
			'';
	}

	hasStoredPassword(): boolean { return !!this.password; }

	rememberPassword(password: string, remember: boolean): void {
		this.password = password;
		if (remember) {
			localStorage.setItem(STORAGE_KEY, password);
			sessionStorage.removeItem(SESSION_KEY);
		} else {
			sessionStorage.setItem(SESSION_KEY, password);
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	forgetPassword(): void {
		this.password = '';
		localStorage.removeItem(STORAGE_KEY);
		sessionStorage.removeItem(SESSION_KEY);
	}

	private async _wrap<T>(promise: Promise<T>): Promise<T> {
		try {
			return await promise;
		} catch (e) {
			if (e instanceof Error && e.message === 'Unauthorized') this.forgetPassword();
			throw e;
		}
	}

	login(password: string) { return ffm.login(password); }
	health() { return this._wrap(ffm.health()); }
	listConfigs() { return this._wrap(ffm.listConfigs()); }
	saveConfig(cfg: MarkerConfig) { return this._wrap(ffm.saveConfig(cfg)); }
	deleteConfig(name: string) { return this._wrap(ffm.deleteConfig(name)); }

	async renameConfig(oldName: string, newName: string, cfg: MarkerConfig): Promise<MarkerConfig> {
		const next: MarkerConfig = { ...cfg, markerName: newName };
		await this.saveConfig(next);
		try {
			await this.deleteConfig(oldName);
		} catch (e) {
			await this.deleteConfig(newName).catch(() => {});
			throw e;
		}
		return next;
	}

	getOcclusion() { return this._wrap(ffm.getOcclusion()); }
	setOcclusion(value: boolean) { return this._wrap(ffm.setOcclusion(value)); }
}

