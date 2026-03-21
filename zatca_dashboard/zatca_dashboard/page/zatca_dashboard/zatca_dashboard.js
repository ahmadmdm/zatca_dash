frappe.pages["zatca-dashboard"].on_page_load = function (wrapper) {
	// Inject Google Fonts
	if (!document.querySelector('link[data-zatca-fonts]')) {
		const link = document.createElement("link");
		link.rel = "stylesheet";
		link.setAttribute("data-zatca-fonts", "1");
		link.href =
			"https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Sans+Arabic:wght@300;400;500;600;700&display=swap";
		document.head.appendChild(link);
	}

	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: "ZATCA Dashboard",
		single_column: true,
	});

	frappe.breadcrumbs.add("Zatca Dashboard");

	// Remove Frappe's default padding
	$(wrapper).find(".page-content").css({ padding: "0", margin: "0" });
	page.main.css({ padding: "0", margin: "0", "max-width": "100%" });

	const container = document.createElement("div");
	container.id = "zatca-dashboard-root";
	container.style.minHeight = "100vh";
	page.main.append(container);

	_loadZatcaApp().then(() => {
		window.ZATCADashboard.mount(container);
	}).catch((err) => {
		container.innerHTML = `
			<div style="display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:16px;font-family:sans-serif;">
				<div style="font-size:2rem;">⚠️</div>
				<div style="color:#ff4c61;font-weight:600;">Failed to load ZATCA Dashboard</div>
				<div style="color:#8892a4;font-size:0.85rem;">${err.message}</div>
			</div>
		`;
	});
};

let _appPromise = null;

function _loadZatcaApp() {
	if (window.ZATCADashboard) return Promise.resolve();
	if (_appPromise) return _appPromise;

	const v = "20260316_3";
	_appPromise = Promise.all([
		_injectStylesheet("/assets/zatca_dashboard/dist/zatca.bundle.css?v=" + v),
		_injectScript("/assets/zatca_dashboard/dist/zatca.bundle.js?v=" + v),
	]).then(
		() =>
			new Promise((resolve) => {
				const poll = () =>
					window.ZATCADashboard ? resolve() : setTimeout(poll, 50);
				poll();
			})
	);

	return _appPromise;
}

function _injectScript(src) {
	return new Promise((resolve, reject) => {
		if (document.querySelector(`script[src="${src}"]`)) return resolve();
		// Remove any old version of this script
		const base = src.split("?")[0];
		document.querySelectorAll(`script[src^="${base}"]`).forEach(el => el.remove());
		const s = document.createElement("script");
		s.src = src;
		s.onload = resolve;
		s.onerror = () => reject(new Error(`Script load failed: ${src}`));
		document.head.appendChild(s);
	});
}

function _injectStylesheet(href) {
	return new Promise((resolve) => {
		if (document.querySelector(`link[href="${href}"]`)) return resolve();
		// Remove any old version of this stylesheet
		const base = href.split("?")[0];
		document.querySelectorAll(`link[href^="${base}"]`).forEach(el => el.remove());
		const l = document.createElement("link");
		l.rel = "stylesheet";
		l.href = href;
		l.onload = resolve;
		l.onerror = resolve; // CSS failure is non-fatal
		document.head.appendChild(l);
	});
}
