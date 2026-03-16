<script setup>
import { ref, computed, onMounted } from "vue";
import { useI18n } from "../i18n.js";

const { t, tf, fmtNum, fmtDate, statusLabel } = useI18n();

// ── State ────────────────────────────────────────────────────
const invoices   = ref([]);
const loading    = ref(true);
const error      = ref(null);
const totalCount = ref(0);

// ── Filters ──────────────────────────────────────────────────
const filters = ref({
	branch:     "all",
	status:     "all",
	start_date: "",
	end_date:   "",
	limit:      100,
});

// Dynamic branches loaded from API
const branchList = ref([]);
const branchMap  = ref({});   // { br1: "Subway Kharj 1", ... }

const BRANCHES = computed(() => [
	{ value: "all", label: t("allBranches") },
	...branchList.value.map((b) => ({ value: b.code, label: b.name })),
]);

async function fetchBranchList() {
	try {
		const r = await new Promise((resolve, reject) => {
			window.frappe.call({
				method:   "zatca_dashboard.api.invoices.get_branch_status",
				callback: resolve,
				error:    reject,
			});
		});
		branchList.value = r.message || [];
		branchMap.value  = Object.fromEntries(branchList.value.map((b) => [b.code, b.name]));
	} catch (_) {}
}

const STATUSES = computed(() => [
	{ value: "all",      label: t("allStatuses") },
	{ value: "REPORTED", label: t("REPORTED")     },
	{ value: "CLEARED",  label: t("CLEARED")      },
	{ value: "FAILED",   label: t("FAILED")       },
	{ value: "REJECTED", label: t("REJECTED")     },
	{ value: "PENDING",  label: t("PENDING")      },
	{ value: "SIGNED",   label: t("SIGNED")       },
]);

const LIMITS = [50, 100, 200, 500, 1000];

// ── Expanded row ──────────────────────────────────────────────
const expandedRow = ref(null);

function toggleRow(inv) {
	expandedRow.value = expandedRow.value?.invoiceNumber === inv.invoiceNumber ? null : inv;
}

// ── Fetch ────────────────────────────────────────────────────
async function fetchInvoices() {
	loading.value = true;
	error.value   = null;
	try {
		const r = await new Promise((resolve, reject) => {
			window.frappe.call({
				method: "zatca_dashboard.api.invoices.get_invoices",
				args: {
					branch:     filters.value.branch,
					start_date: filters.value.start_date || null,
					end_date:   filters.value.end_date   || null,
					status:     filters.value.status,
					limit:      filters.value.limit,
				},
				callback: resolve,
				error:    reject,
			});
		});
		invoices.value   = r.message?.data  || [];
		totalCount.value = r.message?.count || 0;
	} catch (e) {
		error.value = String(e);
	} finally {
		loading.value = false;
	}
}

// ── Default date range = last 7 days ─────────────────────────
function initDates() {
	const today = new Date();
	const week  = new Date(today - 7 * 86400000);
	filters.value.end_date   = today.toISOString().slice(0, 10);
	filters.value.start_date = week.toISOString().slice(0, 10);
}

onMounted(() => {
	initDates();
	fetchBranchList();
	fetchInvoices();
});

// ── Stats ────────────────────────────────────────────────────
const stats = computed(() => {
	if (!invoices.value.length) return null;
	const total = invoices.value.reduce((s, i) => s + (i.totalAmount || 0), 0);
	const tax   = invoices.value.reduce((s, i) => s + (i.taxAmount   || 0), 0);
	const reported = invoices.value.filter((i) => ["REPORTED","CLEARED"].includes(i.status)).length;
	const failed   = invoices.value.filter((i) => ["FAILED","REJECTED"].includes(i.status)).length;
	return {
		count:    invoices.value.length,
		total:    Math.round(total),
		tax:      Math.round(tax),
		reported,
		failed,
	};
});

// ── Formatters ────────────────────────────────────────────────
function fmt(n) { return fmtNum(n); }

function fmtDateLocal(iso) { return fmtDate(iso, {
	year: "numeric", month: "short", day: "numeric",
	hour: "2-digit", minute: "2-digit", hour12: false,
}); }

function statusLabelLocal(s) { return statusLabel(s); }

// ── Reset filters ────────────────────────────────────────────
function resetFilters() {
	filters.value.branch = "all";
	filters.value.status = "all";
	filters.value.limit  = 100;
	initDates();
	fetchInvoices();
}
</script>

<template>
	<div class="ilp">

		<!-- ══ Header ══════════════════════════════════════════ -->
		<header class="ilp-header">
			<div>
				<h1 class="ilp-title">{{ t("invoices") }}</h1>
				<p class="ilp-sub" v-if="!loading">
					{{ tf("showingOf", invoices.length, totalCount) }}
				</p>
			</div>
			<button class="zd-btn zd-btn-primary" @click="fetchInvoices" :disabled="loading">
				<svg :class="{ spin: loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
				{{ loading ? t("loading") : t("refresh") }}
			</button>
		</header>

		<!-- ══ Filter Bar ══════════════════════════════════════ -->
		<div class="zd-card filter-bar">
			<div class="filter-row">
				<div class="filter-field">
					<label class="filter-label">{{ t("branch") }}</label>
					<select v-model="filters.branch" class="zd-input zd-select">
						<option v-for="b in BRANCHES" :key="b.value" :value="b.value">{{ b.label }}</option>
					</select>
				</div>

				<div class="filter-field">
					<label class="filter-label">{{ t("status") }}</label>
					<select v-model="filters.status" class="zd-input zd-select">
						<option v-for="s in STATUSES" :key="s.value" :value="s.value">{{ s.label }}</option>
					</select>
				</div>

				<div class="filter-field">
					<label class="filter-label">{{ t("fromDate") }}</label>
					<input type="date" v-model="filters.start_date" class="zd-input" dir="ltr" />
				</div>

				<div class="filter-field">
					<label class="filter-label">{{ t("toDate") }}</label>
					<input type="date" v-model="filters.end_date" class="zd-input" dir="ltr" />
				</div>

				<div class="filter-field">
					<label class="filter-label">{{ t("maxRecords") }}</label>
					<select v-model.number="filters.limit" class="zd-input zd-select">
						<option v-for="l in LIMITS" :key="l" :value="l">{{ tf("records", l) }}</option>
					</select>
				</div>

				<div class="filter-actions">
					<button class="zd-btn zd-btn-primary" @click="fetchInvoices" :disabled="loading">{{ t("search") }}</button>
					<button class="zd-btn zd-btn-ghost"   @click="resetFilters"  :disabled="loading">{{ t("reset") }}</button>
				</div>
			</div>
		</div>

		<!-- ══ Summary Stats ═══════════════════════════════════ -->
		<div v-if="stats && !loading" class="stats-row">
			<div class="stat-chip">
				<div class="stat-chip-val" style="color:var(--zd-cyan)">{{ fmt(stats.count) }}</div>
				<div class="stat-chip-lbl">{{ t("totalInvoices") }}</div>
			</div>
			<div class="stat-chip">
				<div class="stat-chip-val" style="color:var(--zd-emerald)">{{ fmt(stats.total) }}</div>
				<div class="stat-chip-lbl">{{ t("totalSales") }}</div>
			</div>
			<div class="stat-chip">
				<div class="stat-chip-val" style="color:var(--zd-amber)">{{ fmt(stats.tax) }}</div>
				<div class="stat-chip-lbl">{{ t("totalTax") }}</div>
			</div>
			<div class="stat-chip">
				<div class="stat-chip-val" style="color:var(--zd-purple)">{{ stats.reported }}</div>
				<div class="stat-chip-lbl">{{ t("reportedCleared") }}</div>
			</div>
			<div class="stat-chip" v-if="stats.failed > 0">
				<div class="stat-chip-val" style="color:var(--zd-rose)">{{ stats.failed }}</div>
				<div class="stat-chip-lbl">{{ t("failedRejected") }}</div>
			</div>
		</div>

		<!-- ══ Error ════════════════════════════════════════════ -->
		<div v-if="error" class="zd-card error-box">
			<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			{{ error }}
		</div>

		<!-- ══ Table ════════════════════════════════════════════ -->
		<div class="zd-card table-card">

			<!-- Loading skeletons -->
			<div v-if="loading" class="table-skeletons">
				<div v-for="i in 8" :key="i" class="zd-skeleton" style="height: 48px; border-radius: 6px;" />
			</div>

			<!-- Invoice Table -->
			<div v-else-if="invoices.length" class="table-wrap">
				<table class="zd-table">
					<thead>
						<tr>
							<th style="width:24px" />
							<th>{{ t("invoiceNo") }}</th>
							<th>{{ t("dateTime") }}</th>
							<th>{{ t("branch") }}</th>
							<th>{{ t("totalAmount") }}</th>
							<th>{{ t("taxAmount") }}</th>
							<th>{{ t("netAmount") }}</th>
							<th>{{ t("status") }}</th>
						</tr>
					</thead>
					<tbody>
						<template v-for="inv in invoices" :key="inv.invoiceNumber">
							<!-- Main row -->
							<tr class="inv-row" @click="toggleRow(inv)" :class="{ expanded: expandedRow?.invoiceNumber === inv.invoiceNumber }">
								<td>
									<svg class="row-chevron" :class="{ open: expandedRow?.invoiceNumber === inv.invoiceNumber }" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"/></svg>
								</td>
								<td class="mono" style="color:var(--zd-t1)">{{ inv.invoiceNumber }}</td>
								<td>{{ fmtDateLocal(inv.issueDate) }}</td>
								<td>
									<span class="branch-chip">{{ branchMap[inv.branch] || inv.branch }}</span>
								</td>
								<td class="amount">{{ fmt(inv.totalAmount) }} <small class="sar">{{ t("sar") }}</small></td>
								<td style="color:var(--zd-amber)">{{ fmt(inv.taxAmount) }}</td>
								<td style="color:var(--zd-t2)">{{ fmt((inv.totalAmount || 0) - (inv.taxAmount || 0)) }}</td>
								<td>
									<span class="zd-badge" :class="`badge-${inv.status}`">
										{{ statusLabelLocal(inv.status) }}
									</span>
								</td>
							</tr>

							<!-- Expanded detail row -->
							<tr v-if="expandedRow?.invoiceNumber === inv.invoiceNumber" class="detail-row">
								<td colspan="8">
									<div class="detail-grid">
										<div class="detail-item" v-if="inv.uuid">
											<div class="detail-lbl">UUID</div>
											<div class="detail-val mono-sm">{{ inv.uuid }}</div>
										</div>
										<div class="detail-item" v-if="inv.customerName">
											<div class="detail-lbl">{{ t("customer") }}</div>
											<div class="detail-val">{{ inv.customerName }}</div>
										</div>
										<div class="detail-item" v-if="inv.items?.length">
											<div class="detail-lbl">{{ t("itemCount") }}</div>
											<div class="detail-val">{{ inv.items.length }}</div>
										</div>
										<div class="detail-item" v-if="inv.paymentMethod">
											<div class="detail-lbl">{{ t("paymentMethod") }}</div>
											<div class="detail-val">{{ inv.paymentMethod }}</div>
										</div>
										<div class="detail-item" v-if="inv.invoiceType">
											<div class="detail-lbl">{{ t("invoiceType") }}</div>
											<div class="detail-val">{{ inv.invoiceType }}</div>
										</div>
										<div class="detail-item" v-if="inv.zatcaStatus">
											<div class="detail-lbl">{{ t("zatcaStatus") }}</div>
											<div class="detail-val">{{ inv.zatcaStatus }}</div>
										</div>
									</div>

									<!-- Items table -->
									<div v-if="inv.items?.length" class="items-table-wrap">
										<div class="items-title">{{ t("invoiceItems") }}</div>
										<table class="items-table">
											<thead>
												<tr>
													<th>{{ t("item") }}</th>
													<th>{{ t("qty") }}</th>
													<th>{{ t("price") }}</th>
													<th>{{ t("total") }}</th>
												</tr>
											</thead>
											<tbody>
												<tr v-for="(item, idx) in inv.items" :key="idx">
													<td>{{ item.name || item.itemName || "—" }}</td>
													<td>{{ item.quantity ?? "—" }}</td>
											<td>{{ fmt(item.price ?? item.unitPrice) }} {{ t("sar") }}</td>
											<td>{{ fmt(item.total ?? item.lineTotal) }} {{ t("sar") }}</td>
												</tr>
											</tbody>
										</table>
									</div>
								</td>
							</tr>
						</template>
					</tbody>
				</table>
			</div>

			<!-- Empty state -->
			<div v-else class="empty-state">
				<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--zd-t3)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
				<div class="empty-title">{{ t("noInvoicesTitle") }}</div>
				<div class="empty-sub">{{ t("noInvoicesSub") }}</div>
			</div>
		</div>

	</div>
</template>

<style scoped>
.ilp {
	padding: 32px 28px;
	max-width: 1400px;
	display: flex;
	flex-direction: column;
	gap: 20px;
}

/* ── Header ─────────────────────────────────────────────────── */
.ilp-header {
	display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
}
.ilp-title { font-size: 1.55rem; font-weight: 800; color: var(--zd-t1); }
.ilp-sub   { font-size: 0.8rem;  color: var(--zd-t2); margin-top: 4px; }

/* ── Filter bar ─────────────────────────────────────────────── */
.filter-bar { padding: 18px 20px; }
.filter-row {
	display: flex; flex-wrap: wrap; gap: 12px; align-items: flex-end;
}
.filter-field { display: flex; flex-direction: column; gap: 6px; min-width: 140px; flex: 1; }
.filter-label { font-size: 0.72rem; font-weight: 600; color: var(--zd-t3); text-transform: uppercase; letter-spacing: 0.06em; }
.filter-actions { display: flex; gap: 8px; margin-top: auto; }

/* ── Stats row ──────────────────────────────────────────────── */
.stats-row {
	display: flex; flex-wrap: wrap; gap: 12px;
}
.stat-chip {
	flex: 1; min-width: 120px;
	background: var(--zd-card); border: 1px solid var(--zd-border);
	border-radius: 10px; padding: 14px 18px;
	text-align: center;
}
.stat-chip-val { font-family: "Space Grotesk", monospace; font-size: 1.3rem; font-weight: 800; }
.stat-chip-lbl { font-size: 0.72rem; color: var(--zd-t3); margin-top: 4px; }

/* ── Error ──────────────────────────────────────────────────── */
.error-box {
	padding: 14px 18px; display: flex; align-items: center; gap: 10px;
	color: var(--zd-rose); border-color: rgba(248,113,113,0.25);
	font-size: 0.875rem;
}

/* ── Table card ─────────────────────────────────────────────── */
.table-card    { overflow: hidden; padding: 0; }
.table-wrap    { overflow-x: auto; }
.table-skeletons { display: flex; flex-direction: column; gap: 6px; padding: 16px; }

.inv-row { cursor: pointer; transition: background 0.12s; }
.inv-row:hover td { background: rgba(255,255,255,0.025); }
.inv-row.expanded td { background: rgba(0,212,255,0.04); }

.row-chevron { color: var(--zd-t3); transition: transform 0.2s; display: block; }
.row-chevron.open  { transform: rotate(180deg); color: var(--zd-cyan); }

.branch-chip {
	background: rgba(129,140,248,0.1); color: var(--zd-purple);
	border: 1px solid rgba(129,140,248,0.2);
	padding: 2px 9px; border-radius: 5px;
	font-family: "Space Grotesk", monospace; font-size: 0.72rem; font-weight: 700;
}
.sar { font-size: 0.7rem; color: var(--zd-t3); }

/* ── Detail row ─────────────────────────────────────────────── */
.detail-row td {
	background: rgba(0,212,255,0.02) !important;
	border-top: none !important;
	border-bottom: 1px solid var(--zd-border) !important;
	padding: 18px 20px !important;
}
.detail-grid {
	display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 14px;
}
.detail-item { min-width: 160px; }
.detail-lbl  { font-size: 0.68rem; color: var(--zd-t3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 4px; }
.detail-val  { font-size: 0.83rem; color: var(--zd-t1); font-weight: 500; }
.mono-sm     { font-family: "Space Grotesk", monospace; font-size: 0.7rem; word-break: break-all; }

.items-title { font-size: 0.72rem; color: var(--zd-t3); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 10px; }
.items-table-wrap { overflow-x: auto; }
.items-table { width: 100%; border-collapse: collapse; }
.items-table th, .items-table td { padding: 8px 14px; font-size: 0.78rem; border-bottom: 1px solid var(--zd-border); text-align: right; }
.items-table th { color: var(--zd-t3); font-weight: 600; }
.items-table td { color: var(--zd-t2); }

/* ── Empty state ────────────────────────────────────────────── */
.empty-state {
	display: flex; flex-direction: column; align-items: center; gap: 10px;
	padding: 64px 20px; text-align: center;
}
.empty-title { font-size: 1rem; font-weight: 600; color: var(--zd-t2); }
.empty-sub   { font-size: 0.83rem; color: var(--zd-t3); }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 800px) {
	.ilp { padding: 16px; }
	.filter-field { min-width: 100%; }
}
</style>
