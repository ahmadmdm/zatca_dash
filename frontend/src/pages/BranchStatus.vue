<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from "vue";
import { useI18n } from "../i18n.js";

const { t, tf, locale, fmtDate, relTime } = useI18n();

// ── State ─────────────────────────────────────────────────────
const branches  = ref([]);
const loading   = ref(true);
const error     = ref(null);
const lastFetch = ref(null);

// ── Fetch ─────────────────────────────────────────────────────
async function fetchBranches() {
	loading.value = true;
	error.value   = null;
	try {
		const r = await new Promise((resolve, reject) => {
			window.frappe.call({
				method:   "zatca_dashboard.api.invoices.get_branch_status",
				callback: resolve,
				error:    reject,
			});
		});
		branches.value  = r.message || [];
		lastFetch.value = new Date();
	} catch (e) {
		error.value = String(e);
	} finally {
		loading.value = false;
	}
}

// ── Auto-refresh every 60s ────────────────────────────────────
let timer;
onMounted(() => {
	fetchBranches();
	timer = setInterval(fetchBranches, 60000);
});
onBeforeUnmount(() => clearInterval(timer));

// ── Computed stats ────────────────────────────────────────────
const totalBranches    = computed(() => branches.value.length);
const connectedCount   = computed(() => branches.value.filter((b) => b.connected).length);
const disconnectedCount = computed(() => totalBranches.value - connectedCount.value);
const allConnected     = computed(() => connectedCount.value === totalBranches.value && totalBranches.value > 0);
const noneConnected    = computed(() => connectedCount.value === 0 && totalBranches.value > 0);

const healthPct        = computed(() =>
	totalBranches.value ? Math.round((connectedCount.value / totalBranches.value) * 100) : 0
);

// ── Time formatting ───────────────────────────────────────────
function relTimeLocal(iso) { return relTime(iso); }

function fmtDateTime(iso) {
	return fmtDate(iso);
}

// ── Last fetch time display ───────────────────────────────────
const lastFetchDisplay = computed(() => {
	if (!lastFetch.value) return "—";
	return lastFetch.value.toLocaleTimeString(locale, {
		hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
	});
});
</script>

<template>
	<div class="bsp">

		<!-- ══ Header ══════════════════════════════════════════ -->
		<header class="bsp-header">
			<div>
				<h1 class="bsp-title">{{ t("branchStatus") }}</h1>
				<p class="bsp-sub">{{ t("lastUpdated") }}: {{ lastFetchDisplay }} · {{ t("autoRefresh") }}</p>
			</div>
			<button class="zd-btn zd-btn-primary" @click="fetchBranches" :disabled="loading">
				<svg :class="{ spin: loading }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
				{{ t("refresh") }}
			</button>
		</header>

		<!-- ══ Error ════════════════════════════════════════════ -->
		<div v-if="error" class="zd-card error-bar">
			<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
			{{ error }}
		</div>

		<!-- ══ Summary cards ═══════════════════════════════════ -->
		<div v-if="!loading" class="summary-row">

			<!-- Health gauge card -->
			<div class="health-card zd-card">
				<div class="health-gauge-wrap">
					<svg class="gauge-svg" viewBox="0 0 100 56" fill="none">
						<!-- Track arc (180° top arch) -->
						<path d="M10 50 A40 40 0 0 1 90 50" stroke="rgba(255,255,255,0.07)" stroke-width="7" stroke-linecap="round" />
						<!-- Progress arc -->
						<path
							class="gauge-arc"
							d="M10 50 A40 40 0 0 1 90 50"
							:stroke="allConnected ? '#34d399' : noneConnected ? '#f87171' : '#fbbf24'"
							stroke-width="7"
							stroke-linecap="round"
							:stroke-dasharray="`${(healthPct / 100) * 125.7} 125.7`"
						/>
					</svg>
					<div class="gauge-center">
						<div class="gauge-pct" :style="{ color: allConnected ? 'var(--zd-emerald)' : noneConnected ? 'var(--zd-rose)' : 'var(--zd-amber)' }">
							{{ healthPct }}%
						</div>
						<div class="gauge-lbl">{{ t("connectionLabel") }}</div>
					</div>
				</div>
				<div class="health-status-text">
					<span v-if="allConnected">{{ t("allBranchesOk") }}</span>
					<span v-else-if="noneConnected">{{ t("noBranchesOk") }}</span>
					<span v-else>{{ tf("xOfY", connectedCount, totalBranches) }}</span>
				</div>
			</div>

			<!-- Stat counters -->
			<div class="stat-card zd-card" style="--kpi-accent: var(--zd-emerald)">
				<div class="stat-icon" style="background: rgba(52,211,153,0.1)">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
				</div>
				<div class="stat-num">{{ connectedCount }}</div>
				<div class="stat-lbl">{{ t("connected") }}</div>
			</div>

			<div class="stat-card zd-card" style="--kpi-accent: var(--zd-rose)">
				<div class="stat-icon" style="background: rgba(248,113,113,0.1)">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
				</div>
				<div class="stat-num">{{ disconnectedCount }}</div>
				<div class="stat-lbl">{{ t("disconnected") }}</div>
			</div>

			<div class="stat-card zd-card">
				<div class="stat-icon" style="background: rgba(129,140,248,0.1)">
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#818cf8" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 9v12"/></svg>
				</div>
				<div class="stat-num">{{ totalBranches }}</div>
				<div class="stat-lbl">{{ t("totalBranches") }}</div>
			</div>
		</div>

		<!-- ══ Branch Grid ══════════════════════════════════════ -->
		<div class="branch-grid">

			<!-- Skeletons while loading -->
			<div v-if="loading" class="zd-skeleton" v-for="i in 9" :key="i" style="height: 140px; border-radius: 14px;" />

			<!-- Branch cards -->
			<template v-else>
				<div
					v-for="branch in branches"
					:key="branch.code"
					class="branch-card zd-card"
					:class="branch.connected ? 'connected' : 'disconnected'"
				>
					<!-- Status indicator line at top -->
					<div class="branch-top-bar" :class="branch.connected ? 'bar-on' : 'bar-off'" />

					<div class="branch-card-body">
						<!-- Header row -->
						<div class="branch-card-head">
							<div class="branch-status-pill" :class="branch.connected ? 'pill-on' : 'pill-off'">
								<span class="branch-dot" :class="branch.connected ? 'dot-on' : 'dot-off'" />
								{{ branch.connected ? t("connected") : t("disconnected") }}
							</div>
						</div>

						<!-- Branch name -->
						<div class="branch-device-name" :title="branch.name">{{ branch.name }}</div>

						<!-- Sync info -->
						<div class="branch-meta">
							<div class="branch-meta-row">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
								<span>{{ relTimeLocal(branch.last_sync_at) }}</span>
							</div>
							<div class="branch-meta-row" v-if="branch.last_sync_at">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
								<span>{{ fmtDateTime(branch.last_sync_at) }}</span>
							</div>
							<div class="branch-meta-row" v-if="branch.last_sync_file">
								<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
								<span class="mono-xs">{{ branch.last_sync_file }}</span>
							</div>
						</div>
					</div>
				</div>

				<!-- Empty state -->
				<div v-if="!branches.length" class="empty-state" style="grid-column: 1 / -1">
					<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--zd-t3)"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>
							<div style="color:var(--zd-t2); font-weight:600">{{ t("noBranchData") }}</div>
							<div style="color:var(--zd-t3); font-size:.82rem">{{ t("checkSettings") }}</div>
				</div>
			</template>
		</div>

	</div>
</template>

<style scoped>
.bsp {
	padding: 32px 28px;
	max-width: 1400px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

/* ── Header ─────────────────────────────────────────────────── */
.bsp-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.bsp-title  { font-size: 1.55rem; font-weight: 800; color: var(--zd-t1); }
.bsp-sub    { font-size: 0.78rem; color: var(--zd-t3); margin-top: 4px; }

/* ── Error bar ──────────────────────────────────────────────── */
.error-bar {
	padding: 12px 18px; display: flex; align-items: center; gap: 10px;
	color: var(--zd-rose); border-color: rgba(248,113,113,0.25); font-size: 0.875rem;
}

/* ── Summary row ────────────────────────────────────────────── */
.summary-row {
	display: flex; gap: 16px; flex-wrap: wrap; align-items: stretch;
}

/* Health gauge card */
.health-card {
	flex: 0 0 220px; padding: 20px;
	display: flex; flex-direction: column; align-items: center; gap: 12px;
	position: relative; overflow: hidden;
}
.health-gauge-wrap { position: relative; width: 140px; height: 80px; }
.gauge-svg         { width: 100%; height: 100%; }
.gauge-arc         { transition: stroke-dasharray 0.8s ease; }
.gauge-center {
	position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
	text-align: center; pointer-events: none;
}
.gauge-pct { font-family: "Space Grotesk", monospace; font-size: 1.4rem; font-weight: 900; transition: color 0.4s; }
.gauge-lbl { font-size: 0.68rem; color: var(--zd-t3); }
.health-status-text { font-size: 0.83rem; font-weight: 600; color: var(--zd-t2); text-align: center; }

/* Stat cards */
.stat-card {
	flex: 1; min-width: 110px;
	padding: 20px; display: flex; flex-direction: column;
	align-items: center; gap: 10px; text-align: center;
}
.stat-icon {
	width: 42px; height: 42px; border-radius: 10px;
	display: flex; align-items: center; justify-content: center;
}
.stat-num  { font-family: "Space Grotesk", monospace; font-size: 1.8rem; font-weight: 900; color: var(--zd-t1); }
.stat-lbl  { font-size: 0.75rem; color: var(--zd-t3); }

/* ── Branch grid ────────────────────────────────────────────── */
.branch-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
	gap: 16px;
}

/* Branch card */
.branch-card {
	overflow: hidden; padding: 0;
	transition: border-color 0.2s, transform 0.2s, box-shadow 0.2s;
}
.branch-card:hover { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
.branch-card.connected    { border-color: rgba(52,211,153,0.25); }
.branch-card.disconnected { border-color: rgba(248,113,113,0.1); }

.branch-top-bar { height: 3px; width: 100%; }
.bar-on  { background: linear-gradient(90deg, var(--zd-emerald), rgba(52,211,153,0.3)); }
.bar-off { background: var(--zd-bg3); }

.branch-card-body { padding: 16px; display: flex; flex-direction: column; gap: 12px; }

.branch-card-head {
	display: flex; align-items: center; justify-content: space-between;
}
.branch-code-badge {
	font-family: "Space Grotesk", monospace; font-weight: 800;
	font-size: 0.85rem; color: var(--zd-cyan);
	background: rgba(0,212,255,0.1); border: 1px solid rgba(0,212,255,0.2);
	padding: 3px 10px; border-radius: 6px;
}

.branch-status-pill {
	display: flex; align-items: center; gap: 5px;
	padding: 3px 10px; border-radius: 100px;
	font-size: 0.72rem; font-weight: 600;
}
.pill-on  { background: rgba(52,211,153,0.1);  color: var(--zd-emerald); border: 1px solid rgba(52,211,153,0.25); }
.pill-off { background: rgba(148,163,184,0.08); color: var(--zd-t3);      border: 1px solid rgba(148,163,184,0.15); }

.branch-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.dot-on  { background: var(--zd-emerald); box-shadow: 0 0 6px var(--zd-emerald); animation: pulse 2s infinite; }
.dot-off { background: var(--zd-t3); }

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50%       { opacity: 0.5; }
}

.branch-device-name {
	font-size: 0.88rem; font-weight: 600; color: var(--zd-t1);
	white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}

.branch-meta {
	display: flex; flex-direction: column; gap: 5px;
}
.branch-meta-row {
	display: flex; align-items: center; gap: 6px;
	font-size: 0.73rem; color: var(--zd-t3);
}
.branch-meta-row svg { flex-shrink: 0; }
.mono-xs { font-family: "Space Grotesk", monospace; font-size: 0.66rem; line-height: 1.4; }

/* ── Empty state ────────────────────────────────────────────── */
.empty-state {
	display: flex; flex-direction: column; align-items: center; gap: 12px;
	padding: 64px 20px;
}

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 700px) {
	.bsp { padding: 16px; }
	.health-card { flex: 0 0 100%; }
}
</style>
