// ─────────────────────────────────────────────────────────────────────────────
// Sales Monitor Page  –  Frappe-native UI (no Vue, no external fonts)
// Route: /app/sales-monitor
// ─────────────────────────────────────────────────────────────────────────────

frappe.pages["sales-monitor"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent:        wrapper,
		title:         __("Sales Monitor"),
		single_column: true,
	});

	frappe.breadcrumbs.add("Zatca Dashboard");

	const SM = new SalesMonitorPage(page, wrapper);
	SM.init();
	wrapper._sales_monitor = SM;   // keep reference
};

frappe.pages["sales-monitor"].on_page_show = function (wrapper) {
	frappe.breadcrumbs.add("Zatca Dashboard");
	if (wrapper._sales_monitor) {
		wrapper._sales_monitor.refresh();
	}
};

// ─────────────────────────────────────────────────────────────────────────────
class SalesMonitorPage {
	constructor(page, wrapper) {
		this.page            = page;
		this.wrapper         = wrapper;
		this.period          = "week";   // chart period
		this.branch_start    = frappe.datetime.get_today();
		this.branch_end      = frappe.datetime.get_today();
		this._chart          = null;
		this._refresh_timer  = null;
		this._companies_data = null;
	}

	// ── Init ─────────────────────────────────────────────────────────────────
	init() {
		this._ensure_currency_styles();
		this._build_toolbar();
		this._build_skeleton();
		this.refresh();
		// auto-refresh every 90 s
		this._refresh_timer = setInterval(() => this.refresh(), 90_000);
	}

	// ── Toolbar buttons ──────────────────────────────────────────────────────
	_build_toolbar() {
		const self = this;

		this.page.add_inner_button(__("Refresh"), () => {
			self.refresh();
		}, __("")).prepend(frappe.utils.icon("refresh", "xs") + " ");

		// Period selector
		const periods = [
			{ key: "week",    label: __("Week")    },
			{ key: "month",   label: __("Month")   },
			{ key: "quarter", label: __("Quarter") },
			{ key: "year",    label: __("Year")    },
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
			}, __("Period"));
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

	<!-- Branch Sales Table -->
	<div class="row" style="margin-top:20px;">
		<div class="col-xs-12">
			<div class="frappe-card sm-card" id="sm-branch-sales-card">
				<div class="sm-card-head">
					<div class="sm-section-title">${__("Branch Sales")}</div>
					<div class="sm-date-range-wrap">
						<label class="text-muted small" style="margin:0 4px;">${__("From")}</label>
						<input type="date" id="sm-bs-from" class="form-control input-sm sm-date-input" />
						<label class="text-muted small" style="margin:0 4px;">${__("To")}</label>
						<input type="date" id="sm-bs-to" class="form-control input-sm sm-date-input" />
						<button class="btn btn-sm btn-primary" id="sm-bs-apply" style="white-space:nowrap;">${__("Apply")}</button>
					</div>
				</div>
				<div id="sm-branch-sales-wrap" style="min-height:80px;">
					<div style="text-align:center;padding:30px 0">${frappe.utils.icon("spinner", "lg")}</div>
				</div>
			</div>
		</div>
	</div>

	<!-- Chart + Branch Status -->
	<div class="row" style="margin-top:20px;">
		<div class="col-sm-8 col-xs-12">
			<div class="frappe-card sm-card" id="sm-chart-card">
				<div class="sm-card-head">
					<div>
						<div class="sm-section-title">${__("Sales Comparison")}</div>
						<div id="sm-chart-summary" class="text-muted small" style="margin-top:2px"></div>
					</div>
					<div class="sm-period-tabs" id="sm-period-tabs">
						<button class="btn btn-xs btn-primary sm-period-btn" data-period="week"   >${__("Week")}</button>
						<button class="btn btn-xs btn-default sm-period-btn" data-period="month"  >${__("Month")}</button>
						<button class="btn btn-xs btn-default sm-period-btn" data-period="quarter">${__("Quarter")}</button>
						<button class="btn btn-xs btn-default sm-period-btn" data-period="year"   >${__("Year")}</button>
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
					<div class="sm-section-title">${__("Branch Status")}</div>
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
					<div class="sm-section-title">${__("Recent Invoices")}</div>
					<div class="input-group input-group-sm" style="width:220px;">
						<input type="text" id="sm-invoice-search"
							class="form-control"
							placeholder="${__("Search by invoice or branch")}">
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
		${__("Loading...")}
	</div>
</div>
`;
		this.page.main.html(html);

		// Wire branch date-range filter
		const self = this;
		const todayStr  = frappe.datetime.get_today();
		const fromInput = this.page.main[0].querySelector("#sm-bs-from");
		const toInput   = this.page.main[0].querySelector("#sm-bs-to");
		if (fromInput) fromInput.value = todayStr;
		if (toInput)   toInput.value   = todayStr;

		const applyBtn = this.page.main[0].querySelector("#sm-bs-apply");
		if (applyBtn) {
			applyBtn.addEventListener("click", () => {
				const from = fromInput ? fromInput.value : self.branch_start;
				const to   = toInput   ? toInput.value   : self.branch_end;
				if (!from || !to) { frappe.msgprint(__("Please set the From and To dates")); return; }
				if (from > to)    { frappe.msgprint(__("Start date must be before end date")); return; }
				self.branch_start = from;
				self.branch_end   = to;
				self._load_branch_sales(from, to);
			});
		}

		// Wire chart period buttons
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
		this._load_branch_sales(this.branch_start, this.branch_end);
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

	_ensure_currency_styles() {
		if (document.getElementById("sm-riyal-symbol-style")) return;

		const style = document.createElement("style");
		style.id = "sm-riyal-symbol-style";
		style.textContent = `
			.sm-riyal-amount {
				display: inline-flex;
				align-items: baseline;
				gap: 0.2em;
				direction: ltr;
				unicode-bidi: isolate;
				white-space: nowrap;
			}

			.sm-riyal-icon {
				display: inline-block;
				width: 0.78em;
				height: 0.9em;
				flex: 0 0 0.78em;
				background-color: currentColor;
				background-repeat: no-repeat;
				background-position: center;
				background-size: contain;
				-webkit-mask: url("/assets/ramotion_theme/images/saudi_riyal_symbol.svg") center / contain no-repeat;
				mask: url("/assets/ramotion_theme/images/saudi_riyal_symbol.svg") center / contain no-repeat;
				vertical-align: -0.08em;
			}

			.sm-riyal-number {
				direction: ltr;
				unicode-bidi: isolate;
			}
		`;

		document.head.appendChild(style);
	}

	_format_currency_markup(value) {
		return this._decorate_currency_markup(frappe.format(value, { fieldtype: "Currency" }));
	}

	_decorate_currency_markup(formatted) {
		if (!formatted || typeof formatted !== "string") return formatted;

		const wrapAmount = number => (
			`<span class="sm-riyal-amount"><span class="sm-riyal-icon" aria-hidden="true"></span><span class="sm-riyal-number">${number}</span></span>`
		);

		return formatted
			.replace(/(?:ر\.س|﷼|ê)\s*([0-9][0-9,]*(?:\.[0-9]+)?)/g, (_, number) => wrapAmount(number))
			.replace(/([0-9][0-9,]*(?:\.[0-9]+)?)\s*(?:ر\.س|﷼|ê)/g, (_, number) => wrapAmount(number));
	}

	// ── Branch Sales Table ──────────────────────────────────────────────────
	async _load_branch_sales(start_date, end_date) {
		const wrap = this.page.main[0].querySelector("#sm-branch-sales-wrap");
		if (!wrap) return;
		wrap.innerHTML = `<div style="text-align:center;padding:24px 0">${frappe.utils.icon("spinner", "lg")}</div>`;
		try {
			const data = await this._call(
				"zatca_dashboard.api.invoices.get_branch_sales",
				{ start_date, end_date }
			);
			if (!data) return;
			this._render_branch_sales(wrap, data);
		} catch(e) {
			wrap.innerHTML = `<div class="text-muted" style="padding:20px;">${__("Failed to load branch sales")}</div>`;
		}
	}

	_render_branch_sales(wrap, data) {
		if (!data.data || !data.data.length) {
			wrap.innerHTML = `<div class="text-muted" style="padding:20px;text-align:center;">${__("No sales for this period")}</div>`;
			return;
		}
		const self = this;
		const pLabel = data.start === data.end ? data.start : `${data.start} → ${data.end}`;
		const rows = data.data.map(b => {
			const total = this._format_currency_markup(b.total);
			const net   = this._format_currency_markup(b.net);
			const tax   = this._format_currency_markup(b.tax);
			const bData = encodeURIComponent(JSON.stringify(b));
			return `
<tr>
	<td class="sm-bst-branch"><b>${frappe.utils.xss_sanitise(b.branch)}</b></td>
	<td class="sm-bst-count">${b.count}</td>
	<td class="sm-bst-num">${net}</td>
	<td class="sm-bst-num sm-bst-muted">${tax}</td>
	<td class="sm-bst-num"><b>${total}</b></td>
	<td class="sm-bst-center">
		<button class="btn btn-xs btn-default sm-post-je-btn"
			data-branch="${frappe.utils.xss_sanitise(b.branch)}"
			data-bdata="${bData}"
			data-date="${data.end}"
			style="white-space:nowrap;">
			${frappe.utils.icon("accounting", "xs")} ${__("Post JE")}
		</button>
	</td>
</tr>`;
		}).join("");

		const grand_total = this._format_currency_markup(data.grand_total);

		wrap.innerHTML = `
<div style="overflow-x:auto;">
<table class="table table-hover sm-branch-sales-table">
	<colgroup>
		<col class="sm-bst-col-branch" />
		<col class="sm-bst-col-count" />
		<col class="sm-bst-col-net" />
		<col class="sm-bst-col-tax" />
		<col class="sm-bst-col-total" />
		<col class="sm-bst-col-je" />
	</colgroup>
	<thead><tr>
		<th class="sm-bst-branch">${__("Branch")}</th>
		<th class="sm-bst-count">${__("Invoices")}</th>
		<th class="sm-bst-num">${__("Net Sales")}</th>
		<th class="sm-bst-num">${__("VAT Tax")}</th>
		<th class="sm-bst-num">${__("Total")}</th>
		<th class="sm-bst-center">${__("Journal Entry")}</th>
	</tr></thead>
	<tbody>${rows}</tbody>
	<tfoot><tr>
		<td class="sm-bst-branch"><b>${__("Grand Total")}</b></td>
		<td class="sm-bst-count">${data.grand_count}</td>
		<td class="sm-bst-num"></td>
		<td class="sm-bst-num"></td>
		<td class="sm-bst-num"><b>${grand_total}</b></td>
		<td></td>
	</tr></tfoot>
</table>
</div>
<div class="text-muted small" style="padding:6px 12px;">${__("Period")}: ${pLabel}</div>`;

		// Wire posting buttons
		wrap.querySelectorAll(".sm-post-je-btn").forEach(btn => {
			btn.addEventListener("click", () => {
				const bdata = JSON.parse(decodeURIComponent(btn.dataset.bdata));
				self._show_je_dialog(bdata, btn.dataset.date);
			});
		});
	}

	// ── Journal Entry Dialog ─────────────────────────────────────────────────
	async _show_je_dialog(branch_data, posting_date) {
		// Load companies data if not cached
		if (!this._companies_data) {
			try {
				this._companies_data = await this._call("zatca_dashboard.api.invoices.get_companies_for_je");
			} catch(e) {
				this._companies_data = [];
			}
		}

		const companies = (this._companies_data || []);
		const companyNames = companies.map(c => c.company);

		let selected_company = companies[0] || null;

		const get_accounts = (company_name) => {
			const c = companies.find(x => x.company === company_name);
			return c || { income_accounts: [], debit_accounts: [] };
		};

		const totalFmt   = this._format_currency_markup(branch_data.total);
		const netFmt     = this._format_currency_markup(branch_data.net);
		const taxFmt     = this._format_currency_markup(branch_data.tax);

		const d = new frappe.ui.Dialog({
			title: `${__("Post Sales")} — ${branch_data.branch}`,
			size: "large",
			fields: [
				{ fieldtype: "HTML", options: `
					<div class="sm-je-summary">
						<div class="sm-je-sum-row">
							<span>${__("الفرع")}</span><b>${frappe.utils.xss_sanitise(branch_data.branch)}</b>
						</div>
						<div class="sm-je-sum-row">
							<span>${__("صافي المبيعات")}</span><b>${netFmt}</b>
						</div>
						<div class="sm-je-sum-row">
							<span>${__("الضريبة (VAT)")}</span><b>${taxFmt}</b>
						</div>
						<div class="sm-je-sum-row" style="border-top:1px solid var(--border-color);padding-top:6px;">
							<span>${__("الإجمالي")}</span><b style="color:var(--blue);font-size:15px;">${totalFmt}</b>
						</div>
					</div>` },
				{ fieldtype: "Section Break", label: __("Entry Settings") },
				{ label: __("Company"), fieldname: "company", fieldtype: "Select",
				  options: companyNames.join("\n"), reqd: 1,
				  default: companyNames[0] || "" },
				{ label: __("Posting Date"), fieldname: "posting_date", fieldtype: "Date",
				  reqd: 1, default: posting_date },
				{ label: __("Narration"), fieldname: "narration", fieldtype: "Small Text",
				  default: `مبيعات فرع ${branch_data.branch} بتاريخ ${posting_date}` },
				{ fieldtype: "Section Break", label: __("Credit Account (Sales)") },
				{ label: __("Sales Account (Credit)"), fieldname: "credit_account",
				  fieldtype: "Select", reqd: 1,
				  options: (selected_company ? selected_company.income_accounts : []).join("\n") },
				{ fieldtype: "Section Break", label: __("Payment Methods (Debit)") },
				{ fieldtype: "HTML", fieldname: "je_rows_html",
				  options: this._build_je_rows_html(branch_data, selected_company) },
			],
				primary_action_label: __("Create Entry"),
				primary_action: async (values) => {
				// Collect rows from DOM
				const rows = this._collect_je_rows(d, values);
				if (!rows) return;
				try {
					d.disable_primary_action();
					d.set_title(`${__("Creating...")}`); 
					const res = await this._call(
						"zatca_dashboard.api.invoices.post_branch_journal_entry",
						{
							branch:        branch_data.branch,
							posting_date:  values.posting_date,
							company:       values.company,
							rows:          JSON.stringify(rows),
							narration:     values.narration,
						}
					);
					d.hide();
					const link = frappe.utils.get_form_link("Journal Entry", res.name, true);
					frappe.msgprint({
						title: __("Journal Entry created successfully"),
						message: `${__("Entry No.")}: <b><a href="${link}">${res.name}</a></b><br>${__("Status")}: ${__("Draft")}`,
						indicator: "green",
					});
				} catch(e) {
					d.enable_primary_action();
					d.set_title(`${__("Post Sales")} — ${branch_data.branch}`);
				}
			},
		});

		d.show();

		// When company changes, update account dropdowns
		d.get_field("company").df.onchange = () => {
			const co_name = d.get_value("company");
			const co = get_accounts(co_name);
			// Update credit account options
			const cf = d.get_field("credit_account");
			cf.df.options = co.income_accounts.join("\n");
			cf.refresh();
			// Re-render rows html
			const hf = d.get_field("je_rows_html");
			hf.$wrapper.find(".form-html").html(this._build_je_rows_html(branch_data, co));
			this._wire_je_rows(d);
		};
		// Wire add-row button
		this._wire_je_rows(d);
	}

	_build_je_rows_html(branch_data, company) {
		const debit_accounts = company ? (company.debit_accounts || []) : [];
		const options_html = debit_accounts.map(a =>
			`<option value="${frappe.utils.xss_sanitise(a)}">${frappe.utils.xss_sanitise(a)}</option>`
		).join("");

		// Default first row with total amount
		const def_row = `
<tr class="sm-je-row">
	<td><select class="form-control input-xs sm-je-account">${options_html}</select></td>
	<td><input type="text" class="form-control input-xs sm-je-remark" placeholder="${__("Description")}" /></td>
	<td><input type="number" class="form-control input-xs sm-je-amount" value="${branch_data.total}" step="0.01" min="0" /></td>
	<td><button class="btn btn-xs btn-danger sm-rm-row" style="padding:2px 6px;">✕</button></td>
</tr>`;

		return `
<div class="sm-je-rows-wrap">
	<table class="table table-condensed" style="margin:0;">
		<thead><tr>
			<th style="width:45%;">${__("Account (Debit)")}</th>
			<th style="width:30%;">${__("Payment Method / Description")}</th>
			<th style="width:18%;">${__("Amount")}</th>
			<th style="width:7%;"></th>
		</tr></thead>
		<tbody id="sm-je-tbody">${def_row}</tbody>
	</table>
	<button class="btn btn-xs btn-default sm-add-row" style="margin:6px 0;">
		+ ${__("Add Row")}
	</button>
	<div id="sm-je-balance-msg" style="font-size:12px;margin-top:4px;"></div>
</div>`;
	}

	_wire_je_rows(dialog) {
		const wrap = dialog.$wrapper[0].querySelector(".sm-je-rows-wrap");
		if (!wrap) return;
		const self = this;

		// Add row
		const addBtn = wrap.querySelector(".sm-add-row");
		if (addBtn) {
			addBtn.onclick = () => {
				const tbody = wrap.querySelector("#sm-je-tbody");
				const firstRow = tbody.querySelector(".sm-je-row");
				const cloneHTML = firstRow ? firstRow.outerHTML.replace(/value="[^"]*"/, 'value=""').replace(/type="number"/, 'type="number" value="0"') : "";
				const tr = document.createElement("tr");
				tr.className = "sm-je-row";
				tr.innerHTML = firstRow
					? `<td>${firstRow.querySelector("td:nth-child(1)").innerHTML}</td><td><input type="text" class="form-control input-xs sm-je-remark" placeholder="${__("Description")}" /></td><td><input type="number" class="form-control input-xs sm-je-amount" value="0" step="0.01" min="0" /></td><td><button class="btn btn-xs btn-danger sm-rm-row" style="padding:2px 6px;">✕</button></td>`
					: "";
				tbody.appendChild(tr);
				self._wire_je_rows(dialog);
			};
		}

		// Remove row
		wrap.querySelectorAll(".sm-rm-row").forEach(btn => {
			btn.onclick = () => {
				const tbody = wrap.querySelector("#sm-je-tbody");
				if (tbody.querySelectorAll(".sm-je-row").length > 1) {
					btn.closest(".sm-je-row").remove();
				}
			};
		});
	}

	_collect_je_rows(dialog, values) {
		const wrap = dialog.$wrapper[0].querySelector(".sm-je-rows-wrap");
		if (!wrap) { frappe.msgprint(__("Error: rows container not found")); return null; }

		const credit_account = values.credit_account;
		if (!credit_account) { frappe.msgprint(__("Please select the sales (credit) account")); return null; }

		const rows_dom = wrap.querySelectorAll(".sm-je-row");
		let total_debit = 0;
		const rows = [];

		for (const tr of rows_dom) {
			const account = tr.querySelector(".sm-je-account")?.value;
			const remark  = tr.querySelector(".sm-je-remark")?.value  || "";
			const amount  = parseFloat(tr.querySelector(".sm-je-amount")?.value) || 0;
			if (!account) { frappe.msgprint(__("Please select an account for each row")); return null; }
			if (amount > 0) {
				rows.push({ account, remark, debit: amount, credit: 0 });
				total_debit = round(total_debit + amount, 2);
			}
		}

		if (!rows.length) { frappe.msgprint(__("No valid rows")); return null; }

		// Add credit row
		rows.push({ account: credit_account, remark: __("Total Sales"), debit: 0, credit: total_debit });
		return rows;

		function round(v, d) { return Math.round(v * Math.pow(10,d)) / Math.pow(10,d); }
	}

	// ── KPI Cards ────────────────────────────────────────────────────────────
	async _load_kpi() {
		try {
			const data = await this._call("zatca_dashboard.api.invoices.get_kpi_data");
			if (!data) return;
			this._render_kpi(data);
			const bar = this.page.main[0].querySelector("#sm-status-bar");
			if (bar) bar.textContent = __("Last updated") + ": " + data.as_of;
		} catch(e) {
			this._kpi_error();
		}
	}

	_render_kpi(data) {
		const slots = [
			{ key: "today",  label: __("Today"),      icon: "calendar",  col: "var(--blue)"   },
			{ key: "week",   label: __("This Week"),   icon: "trend-up",  col: "var(--green)"  },
			{ key: "month",  label: __("This Month"),  icon: "pie-chart", col: "var(--orange)" },
			{ key: "year",   label: __("This Year"),   icon: "bar-chart", col: "var(--purple)" },
		];
		slots.forEach((slot, i) => {
			const d     = data[slot.key];
			if (!d) return;
			const card  = this.page.main[0].querySelector(`#sm-kpi-${i}`);
			if (!card)  return;
			const pctCls = d.total_change >= 0 ? "text-success" : "text-danger";
			const arrow  = d.total_change >= 0 ? "▲" : "▼";
			const pctAbs = Math.abs(d.total_change).toFixed(1);
			const total  = this._format_currency_markup(d.total);
			const count  = frappe.format(d.count, { fieldtype: "Int" });

			card.innerHTML = `
<div class="sm-kpi-inner">
	<div class="sm-kpi-top">
		<span class="sm-kpi-label">${slot.label}</span>
		<span class="sm-kpi-icon" style="color:${slot.col};">${frappe.utils.icon(slot.icon, "md")}</span>
	</div>
	<div class="sm-kpi-value">${total}</div>
	<div class="sm-kpi-meta">
			<span class="indicator-pill green" style="font-size:11px;">${count} ${__("invoices")}</span>
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
			if (card) card.innerHTML = `<div class="text-muted small" style="padding:16px;">${__("Failed to load")}</div>`;
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
			wrap.innerHTML = `<div class="text-muted" style="padding:40px;">${__("Failed to load chart")}</div>`;
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
						{ name: __("Current Period"), values: data.current,  chartType: "bar"  },
						{ name: __("Previous Period"), values: data.previous, chartType: "line" },
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
				&nbsp;${__("vs previous period")}
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
		<span><span style="display:inline-block;width:12px;height:12px;background:#5e64ff;border-radius:2px;margin-left:4px;"></span>${__("Current Period")}</span>
		<span><span style="display:inline-block;width:12px;height:12px;background:#a3b0cc;border-radius:2px;margin-left:4px;"></span>${__("Previous Period")}</span>
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
			if (el) el.innerHTML = `<div class="text-muted small" style="padding:16px;">${__("Failed to load")}</div>`;
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
			badge.textContent = `${connected} / ${branches.length} ${__("Connected")}`;
		}

		if (!branches.length) {
			el.innerHTML = `<div class="text-muted small" style="padding:16px;">${__("No branches")}</div>`;
			return;
		}

		el.innerHTML = branches.map(b => `
<div class="sm-branch-row">
	<span class="indicator ${b.connected ? "green" : "red"}"></span>
	<div class="sm-branch-info">
		<div class="sm-branch-name">${b.name || b.code}</div>
		${b.last_sync_at
			? `<div class="text-muted" style="font-size:11px;">${__("Last sync")}: ${frappe.datetime.prettyDate(b.last_sync_at)}</div>`
				: `<div class="text-muted" style="font-size:11px;">${__("Never synced")}</div>`
		}
	</div>
	<span class="indicator-pill ${b.connected ? "green" : "red"}" style="font-size:10px;">
		${b.connected ? __("Connected") : __("Disconnected")}
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
			if (el) el.innerHTML = `<div class="text-muted" style="padding:20px;">${__("Failed to load invoices")}</div>`;
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
			el.innerHTML = `<div class="text-muted" style="padding:20px;text-align:center;">${__("No invoices")}</div>`;
			return;
		}

		const STATUS_MAP = {
			"CLEARED":       { cls: "green",  lbl: __("Cleared")       },
			"REPORTED":      { cls: "blue",   lbl: __("Reported")      },
			"SIGNED":        { cls: "orange", lbl: __("Signed")        },
			"NOT_SUBMITTED": { cls: "grey",   lbl: __("Not Submitted") },
		};

		const rows = invoices.map(inv => {
			const st    = STATUS_MAP[inv.status] || { cls: "grey", lbl: inv.status || "—" };
			const total = this._format_currency_markup(inv.totalAmount || 0);
			const tax   = this._format_currency_markup(inv.taxAmount   || 0);
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
		<th>${__("Date")}</th>
		<th>${__("Invoice No.")}</th>
		<th>${__("Customer")}</th>
		<th>${__("Branch")}</th>
		<th class="text-right">${__("Total")}</th>
		<th class="text-right">${__("Tax")}</th>
		<th>${__("Status")}</th>
	</tr></thead>
	<tbody>${rows}</tbody>
</table>
</div>`;
	}
}
