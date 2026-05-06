export function showToast(el, msg, type = "") {
	el.textContent = msg;
	el.className = "toast show " + type;
	clearTimeout(showToast._t);
	showToast._t = setTimeout(() => { el.className = "toast " + type; }, 2200);
}

