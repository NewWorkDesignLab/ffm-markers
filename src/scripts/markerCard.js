import { icon } from "./icons.js";

export function defaultConfig(name) {
	return {
		markerName: name,
		positionOffset: { x: 0, y: 0, z: 0 },
		rotationOffset: { x: 0, y: 0, z: 0, w: 1 },
		scaleMultiplier: { x: 1, y: 1, z: 1 },
	};
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
		inp.step = "0.001";
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
	const card = document.createElement("div");
	card.className = "marker";
	if (isDirty) card.classList.add("dirty");

	const head = document.createElement("div");
	head.className = "marker-head";

	const nameWrap = document.createElement("div");
	nameWrap.className = "marker-name";
	nameWrap.innerHTML = `${icon("tag")}<span class="marker-name-text">${cfg.markerName}</span>`;
	head.appendChild(nameWrap);

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

	const markDirty = () => {
		saveBtn.disabled = false;
		card.classList.add("dirty");
		onDirtyChange(cfg.markerName);
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

	card.appendChild(vecRow("Position offset", "move", cfg.positionOffset, ["x", "y", "z"], markDirty));
	card.appendChild(vecRow(
		"Rotation offset (quaternion)",
		"rotate",
		cfg.rotationOffset,
		["x", "y", "z", "w"],
		markDirty,
		{
			readOnlyKeys: ["w"],
			onAfterEdit: (_k, inputs) => {
				const q = cfg.rotationOffset;
				const sum = (q.x ?? 0) ** 2 + (q.y ?? 0) ** 2 + (q.z ?? 0) ** 2;
				const w = Math.sqrt(Math.max(0, 1 - sum));
				q.w = w;
				inputs.w.value = String(Number(w.toFixed(6)));
			},
		},
	));
	card.appendChild(vecRow("Scale multiplier", "scale", cfg.scaleMultiplier, ["x", "y", "z"], markDirty));

	return card;
}

