<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import KpiCard    from "../components/KpiCard.vue";
import SalesChart from "../components/SalesChart.vue";
import { useI18n } from "../i18n.js";

const { t, isAr, locale, fmtNum, fmtDate, relTime, statusLabel } = useI18n();

// ── State ────────────────────────────────────────────────────
const kpiData      = ref(null);
const kpiLoading   = ref(true);
const chartData    = ref(null);
const chartLoading = ref(true);
const branches     = ref([]);
const branchLoad   = ref(true);
const recent       = ref([]);
const recentLoad   = ref(true);

const chartPeriod  = ref("week");
const chartType    = ref("bar");
const isRefreshing = ref(false);

const PERIODS = [
	{ key: "week",    label: t("weekTab")    },
	{ key: "month",   label: t("monthTab")   },
	{ key: "quarter", label: t("quarterTab") },
	{ key: "year",    label: t("yearTab")    },
];

// ── Frappe.call wrapper ──────────────────────────────────────
function fCall(method, args = {}) {
	return new Promise((resolve, reject) => {
		window.frappe.call({
			method,
			args,
			callback: (r) => resolve(r.message),
			error:    reject,
		});
	});
}

// ── Fetchers ─────────────────────────────────────────────────
async function fetchKpi() {
	kpiLoading.value = true;
	try { kpiData.value = await fCall("zatca_dashboard.api.invoices.get_kpi_data"); }
	catch (e) { console.error(e); }
	finally { kpiLoading.value = false; }
}

async function fetchChart(period = chartPeriod.value) {
	chartLoading.value = true;
	try { chartData.value = await fCall("zatca_dashboard.api.invoices.get_chart_data", { period }); }
	catch (e) { console.error(e); }
	finally { chartLoading.value = false; }
}

async function fetchBranches() {
	branchLoad.value = true;
	try { branches.value = await fCall("zatca_dashboard.api.invoices.get_branch_status"); }
	catch (e) { console.error(e); }
	finally { branchLoad.value = false; }
}

async function fetchRecent() {
	recentLoad.value = true;
	try {
		const r = await fCall("zatca_dashboard.api.invoices.get_invoices", { limit: 10 });
		recent.value = r?.data || [];
	} catch (e) { console.error(e); }
	finally { recentLoad.value = false; }
}

async function refreshAll() {
	isRefreshing.value = true;
	await Promise.all([fetchKpi(), fetchChart(), fetchBranches(), fetchRecent()]);
	isRefreshing.value = false;
}

async function selectPeriod(p) {
	chartPeriod.value = p;
	await fetchChart(p);
}

// ── Lifecycle ────────────────────────────────────────────────
onMounted(() => {
	fetchKpi();
	fetchChart();
	fetchBranches();
	fetchRecent();
	// Auto-refresh every 90 seconds
	refreshTimer = setInterval(() => {
		fetchKpi(); fetchBranches(); fetchRecent();
	}, 90000);
});

let refreshTimer;
onBeforeUnmount(() => clearInterval(refreshTimer));

// ── Live clock ───────────────────────────────────────────────
const now = ref(new Date());
const clockTimer = setInterval(() => (now.value = new Date()), 1000);
onBeforeUnmount(() => clearInterval(clockTimer));

const displayDate = computed(() =>
	now.value.toLocaleDateString(locale, {
		weekday: "long", year: "numeric", month: "long", day: "numeric",
	})
);
const displayTime = computed(() =>
	now.value.toLocaleTimeString(locale, {
		hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
	})
);

// ── Computed helpers ─────────────────────────────────────────
const kpiCards = computed(() => {
	if (!kpiData.value) return Array(4).fill(null);
	const { today, week, month, year } = kpiData.value;
	return [today, week, month, year].filter(Boolean);
});

const connectedBranches = computed(
	() => branches.value.filter((b) => b.connected).length
);

// Branch code → name map (for recent invoices table)
const branchMap = computed(() =>
	Object.fromEntries(branches.value.map((b) => [b.code, b.name]))
);

const chartSummary = computed(() => {
	if (!chartData.value) return null;
	const pct = chartData.value.total_previous === 0
		? 100
		: Math.round(((chartData.value.total_current - chartData.value.total_previous) / chartData.value.total_previous) * 100);
	return { pct, up: pct >= 0 };
});

// ── Formatters ───────────────────────────────────────────────
function fmt(n) { return fmtNum(n); }

function relativeTime(iso) { return relTime(iso); }
</script>

<template>
	<div class="dash">

		<!-- ══ Header ════════════════════════════════════════════ -->
		<header class="dash-header">
			<div>
				<h1 class="dash-title">{{ t("dashboard") }}</h1>
				<p class="dash-meta">{{ displayDate }} · <span class="dash-clock">{{ displayTime }}</span></p>
			</div>
			<div class="dash-header-actions">
				<span v-if="kpiData?.as_of" class="dash-updated">
					{{ t("lastUpdated") }}: {{ kpiData.as_of }}
				</span>
				<button class="zd-btn zd-btn-ghost" @click="refreshAll" :disabled="isRefreshing">
					<svg :class="{ spin: isRefreshing }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
					{{ t("refresh") }}
				</button>
			</div>
		</header>

		<!-- ══ KPI Cards ═════════════════════════════════════════ -->
		<div class="kpi-grid">
			<KpiCard
				v-for="(card, i) in kpiCards"
				:key="i"
				:data="card"
				:loading="kpiLoading"
			/>
		</div>

		<!-- ══ Chart + Branch status ═════════════════════════════ -->
		<div class="mid-grid">

			<!-- Chart -->
			<div class="zd-card chart-card">
				<div class="chart-card-head">
					<div>
							<div class="zd-section-title">{{ t("salesComparison") }}</div>
						<div v-if="chartSummary" class="chart-comparison">
							<span :class="chartSummary.up ? 'trend-up' : 'trend-down'">
								{{ chartSummary.up ? "▲" : "▼" }} {{ Math.abs(chartSummary.pct) }}%
							</span>
								{{ t("comparedToPrev") }}
						</div>
					</div>
					<div class="chart-controls">
						<div class="period-tabs">
							<button
								v-for="p in PERIODS"
								:key="p.key"
								class="period-tab"
								:class="{ active: chartPeriod === p.key }"
								@click="selectPeriod(p.key)"
							>{{ p.label }}</button>
						</div>
						<div class="type-toggle">
							<button :class="{ active: chartType === 'bar'  }" @click="chartType = 'bar'">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="8" width="5" height="14"/><rect x="10" y="4" width="5" height="18"/><rect x="18" y="12" width="5" height="10"/></svg>
							</button>
							<button :class="{ active: chartType === 'line' }" @click="chartType = 'line'">
								<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
							</button>
						</div>
					</div>
				</div>
				<SalesChart :data="chartData" :type="chartType" :loading="chartLoading" />
				<div v-if="chartData" class="chart-foot">
					<div class="chart-foot-item">
						<div class="chart-foot-val">{{ fmt(chartData.total_current) }} {{ t("sar") }}</div>
						<div class="chart-foot-lbl">{{ t("currentPeriod") }}</div>
					</div>
					<div class="chart-foot-sep" />
					<div class="chart-foot-item">
						<div class="chart-foot-val" style="color:var(--zd-t2)">{{ fmt(chartData.total_previous) }} {{ t("sar") }}</div>
						<div class="chart-foot-lbl">{{ t("previousPeriod") }}</div>
					</div>
				</div>
			</div>

			<!-- Branch Status -->
			<div class="zd-card branch-card">
				<div class="zd-section-header">
					<div>
							<div class="zd-section-title">{{ t("branchStatus") }}</div>
						<div class="zd-section-sub" v-if="!branchLoad">
							<span style="color:var(--zd-emerald)">{{ connectedBranches }}</span>
							/ {{ branches.length }} {{ t("connected") }}
						</div>
					</div>
					<div class="conn-pill" v-if="!branchLoad">
						<span
							class="conn-dot"
							:class="connectedBranches === branches.length ? 'all-ok' : 'partial'"
						/>
							{{ connectedBranches === branches.length ? t("allConnected") : t("someDisconnected") }}
					</div>
				</div>

				<div v-if="branchLoad" class="branch-skeletons">
					<div v-for="i in 5" :key="i" class="zd-skeleton" style="height:52px;border-radius:10px;margin-bottom:8px" />
				</div>

				<div v-else class="branch-list">
					<div
						v-for="b in branches"
						:key="b.code"
						class="branch-row"
						:class="{ connected: b.connected }"
					>
						<div class="branch-status-dot" :class="b.connected ? 'on' : 'off'" />
						<div class="branch-info">
							<div class="branch-name">{{ b.name }}</div>
								<div class="branch-sync">{{ b.connected ? relativeTime(b.last_sync_at) : t("disconnected") }}</div>
						</div>
					</div>
						<div v-if="!branches.length" class="empty-state-sm">{{ t("noBranchData") }}</div>
				</div>
			</div>
		</div>

		<!-- ══ Recent Invoices ════════════════════════════════════ -->
		<div class="zd-card recent-card">
			<div class="zd-section-header">
				<div>
						<div class="zd-section-title">{{ t("recentInvoices") }}</div>
						<div class="zd-section-sub">{{ t("last10") }}</div>
				</div>
				<RouterLink to="/invoices" class="zd-btn zd-btn-ghost" style="font-size:.8rem;padding:7px 14px">
					{{ t("viewAll") }}
				</RouterLink>
			</div>

			<div v-if="recentLoad">
				<div v-for="i in 5" :key="i" class="zd-skeleton" style="height:44px;border-radius:8px;margin-bottom:6px" />
			</div>

			<div v-else-if="recent.length" class="table-wrap">
				<table class="zd-table">
					<thead>
						<tr>
						<th>{{ t("invoiceNo") }}</th>
						<th>{{ t("date") }}</th>
						<th>{{ t("branch") }}</th>
						<th>{{ t("amount") }}</th>
						<th>{{ t("taxAmount") }}</th>
						<th>{{ t("status") }}</th>
						</tr>
					</thead>
					<tbody>
						<tr v-for="inv in recent" :key="inv.invoiceNumber">
							<td class="mono">{{ inv.invoiceNumber }}</td>
							<td>{{ fmtDate(inv.issueDate) }}</td>
							<td>
								<span class="branch-tag">{{ branchMap[inv.branch] || inv.branch }}</span>
							</td>
							<td class="amount">{{ fmt(inv.totalAmount) }} <small style="font-size:.7rem;color:var(--zd-t3)">{{ t("sar") }}</small></td>
							<td style="color:var(--zd-t2)">{{ fmt(inv.taxAmount) }}</td>
							<td>
								<span class="zd-badge" :class="`badge-${inv.status}`">
									{{ statusLabel(inv.status) }}
								</span>
							</td>
						</tr>
					</tbody>
				</table>
			</div>

			<div v-else class="empty-state">
				<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--zd-t3)"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
				<p>{{ t("noInvoices") }}</p>
			</div>
		</div>

	</div>
</template>

<style scoped>
.dash {
	padding: 32px 28px;
	max-width: 1400px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

/* ── Header ────────────────────────────────────────────────── */
.dash-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	flex-wrap: wrap;
	gap: 12px;
}
.dash-title {
	font-size: 1.55rem;
	font-weight: 800;
	color: var(--zd-t1);
	letter-spacing: -0.02em;
}
.dash-meta {
	font-size: 0.8rem;
	color: var(--zd-t2);
	margin-top: 4px;
}
.dash-clock {
	font-family: "Space Grotesk", monospace;
	color: var(--zd-cyan);
	font-weight: 600;
}
.dash-header-actions {
	display: flex;
	align-items: center;
	gap: 12px;
}
.dash-updated {
	font-size: 0.75rem;
	color: var(--zd-t3);
}

/* ── KPI Grid ───────────────────────────────────────────────── */
.kpi-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 18px;
}

/* ── Mid grid ───────────────────────────────────────────────── */
.mid-grid {
	display: grid;
	grid-template-columns: 1fr 320px;
	gap: 18px;
	align-items: start;
}

/* ── Chart card ─────────────────────────────────────────────── */
.chart-card { padding: 22px 22px 18px; }
.chart-card-head {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	margin-bottom: 20px;
	flex-wrap: wrap;
	gap: 12px;
}
.chart-comparison {
	font-size: 0.78rem;
	color: var(--zd-t2);
	margin-top: 5px;
	display: flex;
	gap: 6px;
	align-items: center;
}
.trend-up   { color: var(--zd-emerald); font-weight: 700; }
.trend-down { color: var(--zd-rose);    font-weight: 700; }

.chart-controls { display: flex; align-items: center; gap: 10px; }

.period-tabs {
	display: flex;
	background: var(--zd-bg3);
	border: 1px solid var(--zd-border);
	border-radius: 8px;
	padding: 3px;
	gap: 2px;
}
.period-tab {
	padding: 5px 12px;
	border-radius: 6px;
	font-size: 0.78rem;
	font-weight: 500;
	cursor: pointer;
	border: none;
	background: transparent;
	color: var(--zd-t2);
	transition: all 0.15s;
}
.period-tab:hover  { color: var(--zd-t1); }
.period-tab.active { background: var(--zd-cyan); color: #070b14; font-weight: 700; }

.type-toggle {
	display: flex;
	background: var(--zd-bg3);
	border: 1px solid var(--zd-border);
	border-radius: 8px;
	padding: 3px;
	gap: 2px;
}
.type-toggle button {
	width: 30px; height: 30px;
	border-radius: 6px;
	border: none; cursor: pointer;
	background: transparent; color: var(--zd-t3);
	display: flex; align-items: center; justify-content: center;
	transition: all 0.15s;
}
.type-toggle button:hover  { color: var(--zd-t1); }
.type-toggle button.active { background: var(--zd-card-h); color: var(--zd-cyan); }

.chart-foot {
	display: flex;
	align-items: center;
	gap: 0;
	padding-top: 16px;
	margin-top: 16px;
	border-top: 1px solid var(--zd-border);
}
.chart-foot-item { flex: 1; text-align: center; }
.chart-foot-val  { font-family: "Space Grotesk", monospace; font-size: 0.95rem; font-weight: 700; color: var(--zd-cyan); }
.chart-foot-lbl  { font-size: 0.72rem; color: var(--zd-t3); margin-top: 3px; }
.chart-foot-sep  { width: 1px; height: 32px; background: var(--zd-border); }

/* ── Branch card ─────────────────────────────────────────────── */
.branch-card { padding: 20px; }

.conn-pill {
	display: flex; align-items: center; gap: 6px;
	padding: 4px 10px; border-radius: 100px;
	background: var(--zd-bg3); border: 1px solid var(--zd-border);
	font-size: 0.73rem; color: var(--zd-t2);
}
.conn-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.conn-dot.all-ok  { background: var(--zd-emerald); box-shadow: 0 0 8px var(--zd-emerald); }
.conn-dot.partial { background: var(--zd-amber); box-shadow: 0 0 8px var(--zd-amber); }

.branch-list { display: flex; flex-direction: column; gap: 6px; }
.branch-row {
	display: flex; align-items: center; gap: 10px;
	padding: 10px 12px; border-radius: 10px;
	background: var(--zd-bg3); border: 1px solid var(--zd-border);
	transition: border-color 0.18s;
}
.branch-row.connected { border-color: rgba(52,211,153,0.2); }
.branch-status-dot {
	width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
}
.branch-status-dot.on  { background: var(--zd-emerald); box-shadow: 0 0 6px var(--zd-emerald); }
.branch-status-dot.off { background: var(--zd-t3); }

.branch-info { flex: 1; min-width: 0; }
.branch-name { font-size: 0.82rem; font-weight: 600; color: var(--zd-t1); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.branch-sync { font-size: 0.7rem; color: var(--zd-t3); margin-top: 2px; }
.branch-code {
	font-family: "Space Grotesk", monospace;
	font-size: 0.7rem; font-weight: 700;
	color: var(--zd-t3); background: var(--zd-card);
	padding: 2px 7px; border-radius: 5px; flex-shrink: 0;
}

/* ── Recent card ─────────────────────────────────────────────── */
.recent-card { padding: 20px 20px 8px; }
.table-wrap  { overflow-x: auto; }

.branch-tag {
	font-family: "Space Grotesk", monospace;
	font-size: 0.72rem; font-weight: 700;
	background: rgba(129,140,248,0.1); color: var(--zd-purple);
	border: 1px solid rgba(129,140,248,0.2);
	padding: 2px 8px; border-radius: 5px;
}

.empty-state {
	display: flex; flex-direction: column; align-items: center;
	gap: 12px; padding: 48px 0; color: var(--zd-t3);
	font-size: 0.88rem;
}
.empty-state-sm { text-align: center; padding: 20px 0; color: var(--zd-t3); font-size: 0.82rem; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 1200px) {
	.kpi-grid  { grid-template-columns: repeat(2, 1fr); }
	.mid-grid  { grid-template-columns: 1fr; }
}
@media (max-width: 700px) {
	.dash { padding: 16px; }
	.kpi-grid { grid-template-columns: 1fr; }
}
</style>
