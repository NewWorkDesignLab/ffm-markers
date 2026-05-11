
import { ffm } from "../lib/ffm-client.ts";

const STORAGE_KEY = "ffm-ar-pw";
const SESSION_KEY = "ffm-ar-pw-session";

export class ApiClient {
	constructor() {
		this.password =
			localStorage.getItem(STORAGE_KEY) ||
			sessionStorage.getItem(SESSION_KEY) ||
			"";
	}

	hasStoredPassword() { return !!this.password; }

	rememberPassword(password, remember) {
		this.password = password;
		if (remember) {
			localStorage.setItem(STORAGE_KEY, password);
			sessionStorage.removeItem(SESSION_KEY);
		} else {
			sessionStorage.setItem(SESSION_KEY, password);
			localStorage.removeItem(STORAGE_KEY);
		}
	}

	forgetPassword() {
		this.password = "";
		localStorage.removeItem(STORAGE_KEY);
		sessionStorage.removeItem(SESSION_KEY);
	}

	async _wrap(promise) {
		try {
			return await promise;
		} catch (e) {
			if (e && e.message === "Unauthorized") this.forgetPassword();
			throw e;
		}
	}

	login(password) { return ffm.login(password); }
	health() { return this._wrap(ffm.health()); }
	listConfigs() { return this._wrap(ffm.listConfigs()); }
	saveConfig(cfg) { return this._wrap(ffm.saveConfig(cfg)); }
	deleteConfig(name) { return this._wrap(ffm.deleteConfig(name)); }
	async renameConfig(oldName, newName, cfg) {
		const next = Object.assign({}, cfg, { markerName: newName });
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
	setOcclusion(value) { return this._wrap(ffm.setOcclusion(value)); }
}

