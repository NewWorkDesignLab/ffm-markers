const STORAGE_KEY = "ffm-ar-pw";
const SESSION_KEY = "ffm-ar-pw-session";

export class ApiClient {
	constructor(baseUrl, apiKey) {
		this.baseUrl = baseUrl;
		this.apiKey = apiKey || "";
		this.password = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(SESSION_KEY) || "";
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

	async request(path, opts = {}) {
		const headers = Object.assign({ "Content-Type": "application/json" }, opts.headers || {});
		if (path !== "/health") headers["X-API-Key"] = this.apiKey;
		const res = await fetch(this.baseUrl + path, Object.assign({}, opts, { headers }));
		if (res.status === 401 || res.status === 403) {
			this.forgetPassword();
			throw new Error("Unauthorized");
		}
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(`${res.status} ${res.statusText} ${text}`);
		}
		const ct = res.headers.get("content-type") || "";
		return ct.includes("application/json") ? res.json() : res.text();
	}

	async login(password) {
		const headers = { "Content-Type": "application/json", "X-API-Key": this.apiKey };
		const res = await fetch(this.baseUrl + "/auth/login", {
			method: "POST",
			headers,
			body: JSON.stringify({ password }),
		});
		if (res.status === 401) throw new Error("Invalid password");
		if (!res.ok) {
			const text = await res.text().catch(() => "");
			throw new Error(`${res.status} ${res.statusText} ${text}`);
		}
		const data = await res.json().catch(() => ({}));
		if (!data.success) throw new Error("Login failed");
		return true;
	}

	health() { return this.request("/health"); }
	listConfigs() { return this.request("/configs"); }
	saveConfig(cfg) {
		return this.request("/configs/" + encodeURIComponent(cfg.markerName), {
			method: "PUT",
			body: JSON.stringify(cfg),
		});
	}
	deleteConfig(name) {
		return this.request("/configs/" + encodeURIComponent(name), { method: "DELETE" });
	}
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
	getOcclusion() { return this.request("/settings/occlusion"); }
	setOcclusion(value) {
		return this.request("/settings/occlusion", {
			method: "PUT",
			body: JSON.stringify({ useOcclusion: value }),
		});
	}
}

