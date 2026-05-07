import { icon } from "./icons.js";
import * as THREE from "three";

export function defaultConfig(name) {
	return {
		markerName: name,
		positionOffset: { x: 0, y: 0, z: 0 },
		rotationOffset: { x: 0, y: 0, z: 0, w: 1 },
		scaleMultiplier: { x: 1, y: 1, z: 1 },
	};
}

function quatToEulerDeg(q) {
	const round = (v) => Math.round(v * 100) / 100;
	const xq = q.x || 0;
	const yq = q.y || 0;
	const zq = q.z || 0;
	const wq = q.w ?? 1;
	const outOfRange =
		Math.abs(xq) > 1 || Math.abs(yq) > 1 || Math.abs(zq) > 1 || Math.abs(wq) > 1;
	if (outOfRange) {
		return { x: round(xq), y: round(yq), z: round(zq) };
	}
	const e = new THREE.Euler().setFromQuaternion(
		new THREE.Quaternion(xq, yq, zq, wq).normalize(),
		"XYZ",
	);
	const r = 180 / Math.PI;
	return { x: round(e.x * r), y: round(e.y * r), z: round(e.z * r) };
}

function eulerDegToQuat(eDeg) {
	const r = Math.PI / 180;
	const e = new THREE.Euler((eDeg.x || 0) * r, (eDeg.y || 0) * r, (eDeg.z || 0) * r, "XYZ");
	const q = new THREE.Quaternion().setFromEuler(e);
	return { x: q.x, y: q.y, z: q.z, w: q.w };
}

function vecRow(label, iconName, obj, keys, onChange, options = {}) {
	const { readOnlyKeys = [], onAfterEdit = null } = options;
	const wrap = document.createElement("div");
	wrap.className = "field-group";
	const lab = document.createElement("label");
	lab.innerHTML = `${icon(iconName)}<span>${label}</span>`;
	lab.style.display = "inline-flex";
	lab.style.alignItems = "center";
	lab.style.gap = "5px";
	wrap.appendChild(lab);
	const grid = document.createElement("div");
	grid.className = "vec";
	const inputs = {};
	keys.forEach((k) => {
		const cell = document.createElement("div");
		const sub = document.createElement("label");
		sub.textContent = k;
		const inp = document.createElement("input");
		inp.type = "number";
		inp.step = "1";
		inp.value = String(obj[k] ?? 0);
		inputs[k] = inp;
		if (readOnlyKeys.includes(k)) {
			inp.readOnly = true;
			inp.tabIndex = -1;
			inp.classList.add("readonly");
			inp.title = "Computed value, not editable";
		} else {
			inp.addEventListener("input", () => {
				const v = parseFloat(inp.value);
				obj[k] = isNaN(v) ? 0 : v;
				if (onAfterEdit) onAfterEdit(k, inputs);
				onChange();
			});
		}
		cell.appendChild(sub);
		cell.appendChild(inp);
		grid.appendChild(cell);
	});
	wrap.appendChild(grid);
	return wrap;
}

function makeBtn(iconName, label, className = "") {
	const b = document.createElement("button");
	if (className) b.className = className;
	b.innerHTML = `${icon(iconName)}${label ? `<span>${label}</span>` : ""}`;
	b.title = label || iconName;
	if (!label) b.classList.add("icon-only");
	return b;
}

export function createMarkerCard(cfg, { isDirty, onSave, onDelete, onRename, onDirtyChange }) {
	{
		const q = cfg.rotationOffset || { x: 0, y: 0, z: 0, w: 1 };
		if (
			Math.abs(q.x || 0) > 1 || Math.abs(q.y || 0) > 1 ||
			Math.abs(q.z || 0) > 1 || Math.abs(q.w ?? 1) > 1
		) {
			cfg.rotationOffset = eulerDegToQuat({ x: q.x || 0, y: q.y || 0, z: q.z || 0 });
		}
	}
	const card = document.createElement("div");
	card.className = "marker collapsed";
	if (isDirty) card.classList.add("dirty");

	const head = document.createElement("div");
	head.className = "marker-head";

	const headLeft = document.createElement("div");
	headLeft.className = "marker-head-left";

	const toggleBtn = document.createElement("button");
	toggleBtn.type = "button";
	toggleBtn.className = "ghost icon-only marker-toggle";
	toggleBtn.title = "Expand";
	toggleBtn.setAttribute("aria-expanded", "false");
	toggleBtn.innerHTML = icon("chevron");

	const nameWrap = document.createElement("div");
	nameWrap.className = "marker-name";
	nameWrap.innerHTML = `${icon("tag")}<span class="marker-name-text">${cfg.markerName}</span>`;
	nameWrap.style.cursor = "pointer";

	headLeft.appendChild(toggleBtn);
	headLeft.appendChild(nameWrap);
	head.appendChild(headLeft);

	const actions = document.createElement("div");
	actions.className = "actions";

	const renameBtn = makeBtn("pencil", "", "ghost icon-only");
	renameBtn.title = "Rename";
	const saveBtn = makeBtn("save", "Save");
	saveBtn.disabled = !isDirty;
	const delBtn = makeBtn("trash", "", "danger icon-only");
	delBtn.title = "Delete";

	actions.appendChild(renameBtn);
	actions.appendChild(saveBtn);
	actions.appendChild(delBtn);
	head.appendChild(actions);
	card.appendChild(head);

	const body = document.createElement("div");
	body.className = "marker-body";
	card.appendChild(body);

	const viewportEl = document.createElement("div");
	viewportEl.className = "marker-viewport";

	let viewport = null;
	let viewportLoading = false;

	const ensureViewport = () => {
		if (viewport || viewportLoading) return;
		viewportLoading = true;
		import("./markerViewport.js")
			.then((mod) => {
				viewport = mod.createMarkerViewport(viewportEl, cfg);
			})
			.catch((err) => {
				console.error("Viewport load failed:", err);
			})
			.finally(() => {
				viewportLoading = false;
			});
	};

	const expand = () => {
		if (!card.classList.contains("collapsed")) return;
		card.classList.remove("collapsed");
		toggleBtn.setAttribute("aria-expanded", "true");
		toggleBtn.title = "Collapse";
		requestAnimationFrame(ensureViewport);
	};
	const collapse = () => {
		card.classList.add("collapsed");
		toggleBtn.setAttribute("aria-expanded", "false");
		toggleBtn.title = "Expand";
	};
	const toggle = () => {
		if (card.classList.contains("collapsed")) expand(); else collapse();
	};
	toggleBtn.addEventListener("click", toggle);
	nameWrap.addEventListener("click", toggle);

	const markDirty = () => {
		saveBtn.disabled = false;
		card.classList.add("dirty");
		onDirtyChange(cfg.markerName);
		if (viewport) viewport.update(cfg);
	};

	saveBtn.addEventListener("click", () => onSave(cfg, saveBtn, card));
	delBtn.addEventListener("click", () => onDelete(cfg.markerName));

	renameBtn.addEventListener("click", () => {
		if (head.querySelector(".rename-row")) return;
		const row = document.createElement("div");
		row.className = "rename-row";
		const inp = document.createElement("input");
		inp.type = "text";
		inp.value = cfg.markerName;
		const okBtn = makeBtn("check", "", "icon-only");
		okBtn.title = "Confirm rename";
		const cancelBtn = makeBtn("x", "", "ghost icon-only");
		cancelBtn.title = "Cancel";
		row.appendChild(inp);
		row.appendChild(okBtn);
		row.appendChild(cancelBtn);

		nameWrap.replaceWith(row);
		inp.focus();
		inp.select();

		const cancel = () => {
			row.replaceWith(nameWrap);
		};
		const confirm = async () => {
			const newName = inp.value.trim();
			if (!newName || newName === cfg.markerName) { cancel(); return; }
			okBtn.disabled = true;
			cancelBtn.disabled = true;
			try {
				await onRename(cfg, newName, card, nameWrap);
			} finally {
				okBtn.disabled = false;
				cancelBtn.disabled = false;
			}
		};
		cancelBtn.addEventListener("click", cancel);
		okBtn.addEventListener("click", confirm);
		inp.addEventListener("keydown", (e) => {
			if (e.key === "Enter") confirm();
			else if (e.key === "Escape") cancel();
		});
	});

	body.appendChild(vecRow("Position offset", "move", cfg.positionOffset, ["x", "y", "z"], markDirty));

	const eulerState = quatToEulerDeg(cfg.rotationOffset);
	body.appendChild(vecRow(
		"Rotation offset (Euler °)",
		"rotate",
		eulerState,
		["x", "y", "z"],
		() => {
			Object.assign(cfg.rotationOffset, eulerDegToQuat(eulerState));
			markDirty();
		},
	));

	body.appendChild(vecRow("Scale multiplier", "scale", cfg.scaleMultiplier, ["x", "y", "z"], markDirty));
	body.appendChild(viewportEl);

	return card;
}

