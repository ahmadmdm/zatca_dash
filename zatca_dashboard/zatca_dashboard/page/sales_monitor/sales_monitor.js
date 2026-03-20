// ─────────────────────────────────────────────────────────────────────────────
// Sales Monitor Page  –  Frappe-native UI (no Vue, no external fonts)
// Route: /app/sales-monitor
// ─────────────────────────────────────────────────────────────────────────────

frappe.pages["sales-monitor"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent:        wrapper,
		title:         __("مراقبة المبيعات"),
		single_column: true,
	});

	const SM = new SalesMonitorPage(page, wrapper);
	SM.init();
	wrapper._sales_monitor = SM;   // keep reference
};

frappe.pages["sales-monitor"].on_page_show = function (wrapper) {
	if (wrapper._sales_monitor) {
		wrapper._sales_monitor.refresh();
	}
};

// ─────────────────────────────────────────────────────────────────────────────
class SalesMonitorPage {
	constructor(page, wrapper) {
		this.page    = page;
		this.wrapper = wrapper;
		this.period  = "week";  // default chart period
		this._chart  = null;
		this._refresh_timer = null;
	}

	// ── Init ─────────────────────────────────────────────────────────────────
	init() {
		this._build_toolbar();
		this._build_skeleton();
		this.refresh();
		// auto-refresh every 90 s
		this._refresh_timer = setInterval(() => this.refresh(), 90_000);
	}

	// ── Toolbar buttons ──────────────────────────────────────────────────────
	_build_toolbar() {
		const self = this;

		this.page.add_inner_button(__("تحديث"), () => {
			self.refresh();
		}, __("")).prepend(frappe.utils.icon("refresh", "xs") + " ");

		// Period selector
		const periods = [
			{ key: "week",    label: __("أسبوع")  },
			{ key: "month",   label: __("شهر")    },
			{ key: "quarter", label: __("ربع سنة")},
			{ key: "year",    label: __("سنة")    },
		];
		periods.forEach(p => {
			this.page.add_inner_button(p.label, () => {
				self.period = p.key;
				self._load_chart();
				// update active styling
				self.wrapper.querySelectorAll(".sm-period-btn").forEach(b => {
					b.classList.toggle("btn-primary",  b.dataset.period === p.key);
					b.classList.toggle("btn-default",  b.dataset.period !== p.key);
				});
			}, __("الفترة"));
		});
	}

	// ── Build the HTML skeleton ───────────────────────────────────────────────
	_build_skeleton() {
		this.page.main.css({ "max-width": "100%" });

		const html = `
<div class="sm-root container-fluid" style="padding:16px 20px;">

	<!-- KPI Cards -->
	<div class="sm-kpi-row row" id="sm-kpi-row">
		${[0,1,2,3].map(i => this._kpi_placeholder(i)).join("")}
	</div>

	<!-- Chart + Branch Status -->
	<div class="row" style="margin-top:20px;">
		<div class="col-sm-8 col-xs-12">
			<div class="frappe-card sm-card" id="sm-chart-card">
				<div class="sm-card-head">
					<div>
						<div class="sm-section-title">${__("مقارنة المبيعات")}</div>
						<div id="sm-chart-summary" class="text-muted small" style="margin-top:2px"></div>
					</div>
					<div class="sm-period-tabs" id="sm-period-tabs">
						<button class="btn btn-xs btn-primary sm-period-btn" data-period="week"   >${__("أسبوع")}</button>
						<button class="btn btn-xs btn-default sm-period-btn" data-period="month"  >${__("شهر")}</button>
						<button class="btn btn-xs btn-default sm-period-btn" data-period="quarter">${__("ربع سنة")}</button>
						<button class="btn btn-xs btn-default sm-period-btn" data-period="year"   >${__("سنة")}</button>
					</div>
				</div>
				<div id="sm-chart-wrap" style="min-height:220px;display:flex;align-items:center;justify-content:center;">
					<div class="sm-spinner">${frappe.utils.icon("spinner", "lg")}</div>
				</div>
			</div>
		</div>
		<div class="col-sm-4 col-xs-12" style="margin-top:0;">
			<div class="frappe-card sm-card" id="sm-branches-card">
				<div class="sm-card-head">
					<div class="sm-section-title">${__("حالة الفروع")}</div>
					<span id="sm-connected-badge" class="indicator-pill green" style="display:none"></span>
				</div>
				<div id="sm-branches-list" style="min-height:120px;">
					<div style="text-align:center;padding:30px 0">${frappe.utils.icon("spinner", "lg")}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Recent Invoices Table -->
	<div class="row" style="margin-top:20px;">
		<div class="col-xs-12">
			<div class="frappe-card sm-card" id="sm-invoices-card">
				<div class="sm-card-head">
					<div class="sm-section-title">${__("آخر الفواتير")}</div>
					<div class="input-group input-group-sm" style="width:220px;">
						<input type="text" id="sm-invoice-search"
							class="form-control"
							placeholder="${__("بحث برقم الفاتورة أو الفرع")}">
					</div>
				</div>
				<div id="sm-invoices-wrap">
					<div style="text-align:center;padding:30px 0">${frappe.utils.icon("spinner", "lg")}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Status bar -->
	<div class="text-muted small" style="margin-top:12px;text-align:right;" id="sm-status-bar">
		${__("جارٍ التحميل…")}
	</div>
</div>
`;
		this.page.main.html(html);

		// Wire period buttons
		const self = this;
		this.page.main[0].querySelectorAll(".sm-period-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				self.period = btn.dataset.period;
				self._load_chart();
				self.page.main[0].querySelectorAll(".sm-period-btn").forEach(b => {
					b.classList.toggle("btn-primary", b.dataset.period === self.period);
					b.classList.toggle("btn-default",  b.dataset.period !== self.period);
				});
			});
		});

		// Wire search
		let searchTimer;
		const searchInput = this.page.main[0].querySelector("#sm-invoice-search");
		if (searchInput) {
			searchInput.addEventListener("input", () => {
				clearTimeout(searchTimer);
				searchTimer = setTimeout(() => self._filter_invoices(searchInput.value), 300);
			});
		}
	}

	_kpi_placeholder(i) {
		const colors = ["blue","green","orange","purple"];
		return `
<div class="col-sm-3 col-xs-6 sm-kpi-col" style="margin-bottom:16px;">
	<div class="frappe-card sm-kpi-card" id="sm-kpi-${i}" data-color="${colors[i]}">
		<div class="sm-kpi-skeleton">
			<div class="sm-skel-line sm-skel-sm"></div>
			<div class="sm-skel-line sm-skel-lg" style="margin-top:10px;"></div>
			<div class="sm-skel-line sm-skel-sm" style="margin-top:8px;width:60%;"></div>
		</div>
	</div>
</div>`;
	}

	// ── Refresh all data ─────────────────────────────────────────────────────
	refresh() {
		this._load_kpi();
		this._load_chart();
		this._load_branches();
		this._load_invoices();
	}

	// ── API helpers ──────────────────────────────────────────────────────────
	_call(method, args = {}) {
		return new Promise((resolve, reject) => {
			frappe.call({
				method,
				args,
				callback: r => resolve(r.message),
				error:    reject,
			});
		});
	}

	// ── KPI Cards ────────────────────────────────────────────────────────────
	async _load_kpi() {
		try {
			const data = await this._call("zatca_dashboard.api.invoices.get_kpi_data");
			if (!data) return;
			this._render_kpi(data);
			const bar = this.page.main[0].querySelector("#sm-status-bar");
			if (bar) bar.textContent = __("آخر تحديث") + ": " + data.as_of;
		} catch(e) {
			this._kpi_error();
		}
	}

	_render_kpi(data) {
		const slots = [
			{ key: "today",  label: __("اليوم"),    icon: "calendar",  col: "var(--blue)"   },
			{ key: "week",   label: __("الأسبوع"),  icon: "trend-up",  col: "var(--green)"  },
			{ key: "month",  label: __("الشهر"),    icon: "pie-chart", col: "var(--orange)" },
			{ key: "year",   label: __("السنة"),    icon: "bar-chart", col: "var(--purple)" },
		];
		slots.forEach((slot, i) => {
			const d     = data[slot.key];
			if (!d) return;
			const card  = this.page.main[0].querySelector(`#sm-kpi-${i}`);
			if (!card)  return;
			const pctCls = d.total_change >= 0 ? "text-success" : "text-danger";
			const arrow  = d.total_change >= 0 ? "▲" : "▼";
			const pctAbs = Math.abs(d.total_change).toFixed(1);
			const total  = frappe.format(d.total, { fieldtype: "Currency" });
			const count  = frappe.format(d.count, { fieldtype: "Int" });

			card.innerHTML = `
<div class="sm-kpi-inner">
	<div class="sm-kpi-top">
		<span class="sm-kpi-label">${slot.label}</span>
		<span class="sm-kpi-icon" style="color:${slot.col};">${frappe.utils.icon(slot.icon, "md")}</span>
	</div>
	<div class="sm-kpi-value">${total}</div>
	<div class="sm-kpi-meta">
		<span class="indicator-pill green" style="font-size:11px;">${count} ${__("فاتورة")}</span>
		<span class="${pctCls}" style="font-size:11px;margin-${frappe.utils.is_rtl() ? "right" : "left"}:8px;">
			${arrow} ${pctAbs}%
		</span>
	</div>
</div>
<div class="sm-kpi-bar" style="background:${slot.col};opacity:.18;"></div>
`;
		});
	}

	_kpi_error() {
		for (let i = 0; i < 4; i++) {
			const card = this.page.main[0].querySelector(`#sm-kpi-${i}`);
			if (card) card.innerHTML = `<div class="text-muted small" style="padding:16px;">${__("تعذّر التحميل")}</div>`;
		}
	}

	// ── Chart ────────────────────────────────────────────────────────────────
	async _load_chart() {
		const wrap = this.page.main[0].querySelector("#sm-chart-wrap");
		if (!wrap) return;
		wrap.innerHTML = `<div style="text-align:center;padding:50px 0;">${frappe.utils.icon("spinner", "lg")}</div>`;

		try {
			const data = await this._call(
				"zatca_dashboard.api.invoices.get_chart_data",
				{ period: this.period }
			);
			if (!data) return;
			this._render_chart(wrap, data);
		} catch(e) {
			wrap.innerHTML = `<div class="text-muted" style="padding:40px;">${__("تعذّر تحميل الرسم البياني")}</div>`;
		}
	}

	_render_chart(wrap, data) {
		wrap.innerHTML = `<div id="sm-chart-inner" style="width:100%;"></div>`;
		const el = wrap.querySelector("#sm-chart-inner");

		// Frappe Charts
		if (window.frappe && frappe.Chart) {
			if (this._chart) {
				try { this._chart.destroy && this._chart.destroy(); } catch(e) {}
			}
			this._chart = new frappe.Chart(el, {
				type: "bar",
				height: 240,
				data: {
					labels:   data.categories,
					datasets: [
						{ name: __("الفترة الحالية"), values: data.current,  chartType: "bar"  },
						{ name: __("الفترة السابقة"), values: data.previous, chartType: "line" },
					],
				},
				colors:     ["#5e64ff", "#a3b0cc"],
				barOptions: { spaceRatio: 0.4 },
				tooltipOptions: {
					formatTooltipX: d => d,
					formatTooltipY: d => frappe.format(d, { fieldtype: "Currency" }),
				},
			});
		} else {
			// Fallback: simple HTML table chart
			this._render_fallback_chart(wrap, data);
		}

		// Update summary
		const summaryEl = this.page.main[0].querySelector("#sm-chart-summary");
		if (summaryEl && data.total_previous !== undefined) {
			const pct = data.total_previous === 0
				? (data.total_current > 0 ? 100 : 0)
				: Math.round(((data.total_current - data.total_previous) / data.total_previous) * 100);
			const cls = pct >= 0 ? "text-success" : "text-danger";
			summaryEl.innerHTML = `
				<span class="${cls}">${pct >= 0 ? "▲" : "▼"} ${Math.abs(pct)}%</span>
				&nbsp;${__("مقارنةً بالفترة السابقة")}
			`;
		}
	}

	_render_fallback_chart(wrap, data) {
		const max = Math.max(...data.current, ...data.previous, 1);
		const bars = data.categories.map((lbl, i) => {
			const hC = Math.round((data.current[i]  / max) * 120);
			const hP = Math.round((data.previous[i] / max) * 120);
			return `
<div style="display:inline-flex;flex-direction:column;align-items:center;margin:0 6px;vertical-align:bottom;min-width:32px;">
	<div style="display:flex;align-items:flex-end;gap:2px;height:120px;">
		<div title="${frappe.format(data.current[i],{fieldtype:'Currency'})}"
			style="width:14px;height:${hC}px;background:#5e64ff;border-radius:3px 3px 0 0;"></div>
		<div title="${frappe.format(data.previous[i],{fieldtype:'Currency'})}"
			style="width:14px;height:${hP}px;background:#a3b0cc;border-radius:3px 3px 0 0;"></div>
	</div>
	<div style="font-size:10px;color:var(--text-muted);margin-top:4px;">${lbl}</div>
</div>`;
		}).join("");

		wrap.innerHTML = `
<div style="padding:16px;overflow-x:auto;">
	<div style="display:flex;align-items:flex-end;border-bottom:1px solid var(--border-color);padding-bottom:4px;gap:0;">
		${bars}
	</div>
	<div style="margin-top:12px;display:flex;gap:16px;font-size:12px;">
		<span><span style="display:inline-block;width:12px;height:12px;background:#5e64ff;border-radius:2px;margin-left:4px;"></span>${__("الفترة الحالية")}</span>
		<span><span style="display:inline-block;width:12px;height:12px;background:#a3b0cc;border-radius:2px;margin-left:4px;"></span>${__("الفترة السابقة")}</span>
	</div>
</div>`;
	}

	// ── Branch Status ────────────────────────────────────────────────────────
	async _load_branches() {
		try {
			const branches = await this._call("zatca_dashboard.api.invoices.get_branch_status");
			if (!branches) return;
			this._render_branches(branches);
		} catch(e) {
			const el = this.page.main[0].querySelector("#sm-branches-list");
			if (el) el.innerHTML = `<div class="text-muted small" style="padding:16px;">${__("تعذّر التحميل")}</div>`;
		}
	}

	_render_branches(branches) {
		const el = this.page.main[0].querySelector("#sm-branches-list");
		if (!el) return;

		const connected = branches.filter(b => b.connected).length;
		const badge = this.page.main[0].querySelector("#sm-connected-badge");
		if (badge) {
			badge.style.display = "";
			badge.className = connected === branches.length ? "indicator-pill green" : "indicator-pill orange";
			badge.textContent = `${connected} / ${branches.length} ${__("متصل")}`;
		}

		if (!branches.length) {
			el.innerHTML = `<div class="text-muted small" style="padding:16px;">${__("لا توجد فروع")}</div>`;
			return;
		}

		el.innerHTML = branches.map(b => `
<div class="sm-branch-row">
	<span class="indicator ${b.connected ? "green" : "red"}"></span>
	<div class="sm-branch-info">
		<div class="sm-branch-name">${b.name || b.code}</div>
		${b.last_sync_at
			? `<div class="text-muted" style="font-size:11px;">${__("آخر مزامنة")}: ${frappe.datetime.prettyDate(b.last_sync_at)}</div>`
			: `<div class="text-muted" style="font-size:11px;">${__("لم يتصل بعد")}</div>`
		}
	</div>
	<span class="indicator-pill ${b.connected ? "green" : "red"}" style="font-size:10px;">
		${b.connected ? __("متصل") : __("غير متصل")}
	</span>
</div>
`).join("<div style='height:1px;background:var(--border-color);margin:0 4px;'></div>");
	}

	// ── Invoices Table ───────────────────────────────────────────────────────
	async _load_invoices() {
		try {
			const res = await this._call(
				"zatca_dashboard.api.invoices.get_invoices",
				{ limit: 20 }
			);
			this._all_invoices = (res && res.data) ? res.data : [];
			this._render_invoices(this._all_invoices);
		} catch(e) {
			const el = this.page.main[0].querySelector("#sm-invoices-wrap");
			if (el) el.innerHTML = `<div class="text-muted" style="padding:20px;">${__("تعذّر تحميل الفواتير")}</div>`;
		}
	}

	_filter_invoices(q) {
		if (!this._all_invoices) return;
		const term = (q || "").toLowerCase();
		const filtered = term
			? this._all_invoices.filter(inv =>
				(inv.invoiceNumber||"").toLowerCase().includes(term) ||
				(inv.buyerName||"").toLowerCase().includes(term)    ||
				(inv.branch||"").toLowerCase().includes(term)
			)
			: this._all_invoices;
		this._render_invoices(filtered);
	}

	_render_invoices(invoices) {
		const el = this.page.main[0].querySelector("#sm-invoices-wrap");
		if (!el) return;

		if (!invoices.length) {
			el.innerHTML = `<div class="text-muted" style="padding:20px;text-align:center;">${__("لا توجد فواتير")}</div>`;
			return;
		}

		const STATUS_MAP = {
			"CLEARED":   { cls: "green",  lbl: __("مُعتمدة")   },
			"REPORTED":  { cls: "blue",   lbl: __("مُبلَّغة")  },
			"SIGNED":    { cls: "orange", lbl: __("موقّعة")    },
			"NOT_SUBMITTED": { cls: "grey", lbl: __("مسودة")   },
		};

		const rows = invoices.map(inv => {
			const st    = STATUS_MAP[inv.status] || { cls: "grey", lbl: inv.status || "—" };
			const total = frappe.format(inv.totalAmount || 0, { fieldtype: "Currency" });
			const tax   = frappe.format(inv.taxAmount   || 0, { fieldtype: "Currency" });
			const date  = inv.issueDate ? inv.issueDate.slice(0, 10) : "—";
			return `
<tr>
	<td class="text-muted" style="font-size:12px;">${date}</td>
	<td><b>${inv.invoiceNumber || inv.name || "—"}</b></td>
	<td>${inv.buyerName || "—"}</td>
	<td>${inv.branch || "—"}</td>
	<td class="text-right">${total}</td>
	<td class="text-right text-muted">${tax}</td>
	<td><span class="indicator-pill ${st.cls}">${st.lbl}</span></td>
</tr>`;
		}).join("");

		el.innerHTML = `
<div style="overflow-x:auto;">
<table class="table table-hover" style="margin:0;">
	<thead><tr>
		<th>${__("التاريخ")}</th>
		<th>${__("رقم الفاتورة")}</th>
		<th>${__("العميل")}</th>
		<th>${__("الفرع")}</th>
		<th class="text-right">${__("الإجمالي")}</th>
		<th class="text-right">${__("الضريبة")}</th>
		<th>${__("الحالة")}</th>
	</tr></thead>
	<tbody>${rows}</tbody>
</table>
</div>`;
	}
}
