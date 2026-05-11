let _timer: ReturnType<typeof setTimeout> | undefined;

export function showToast(el: HTMLElement, msg: string, type = ''): void {
	el.textContent = msg;
	el.className = 'toast show ' + type;
	clearTimeout(_timer);
	_timer = setTimeout(() => { el.className = 'toast ' + type; }, 2200);
}

