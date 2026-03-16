<script setup>
import { ref, watch, computed } from "vue";
import { useI18n } from "../i18n.js";

const { t, fmtNum } = useI18n();

const props = defineProps({
	data: Object,
	loading: Boolean,
});

// ── Animated counter ────────────────────────────────────────
const displayTotal = ref(0);
const displayCount = ref(0);

function animateTo(refVal, target, duration = 900) {
	const start = refVal.value;
	const startTime = performance.now();
	const step = (now) => {
		const t = Math.min((now - startTime) / duration, 1);
		const e = 1 - Math.pow(1 - t, 3); // ease-out-cubic
		refVal.value = start + (target - start) * e;
		if (t < 1) requestAnimationFrame(step);
		else refVal.value = target;
	};
	requestAnimationFrame(step);
}

watch(() => props.data?.total, (v) => { if (v != null) animateTo(displayTotal, v); }, { immediate: true });
watch(() => props.data?.count, (v) => { if (v != null) animateTo(displayCount, v); }, { immediate: true });

// ── Color map ────────────────────────────────────────────────
const palettes = {
	cyan:    { border: "#00d4ff", glow: "rgba(0,212,255,0.18)",    text: "#00d4ff",  bg: "rgba(0,212,255,0.07)"    },
	purple:  { border: "#818cf8", glow: "rgba(129,140,248,0.18)",  text: "#a5b4fc",  bg: "rgba(129,140,248,0.07)"  },
	emerald: { border: "#34d399", glow: "rgba(52,211,153,0.18)",   text: "#34d399",  bg: "rgba(52,211,153,0.07)"   },
	amber:   { border: "#fbbf24", glow: "rgba(251,191,36,0.18)",   text: "#fbbf24",  bg: "rgba(251,191,36,0.07)"   },
};

const pal = computed(() => palettes[props.data?.color || "cyan"]);

const totalUp  = computed(() => (props.data?.total_change ?? 0) >= 0);
const countUp  = computed(() => (props.data?.count_change ?? 0) >= 0);

function fmt(n) {
	return fmtNum(n);
}

function fmtChg(v) {
	if (v == null) return "0%";
	const abs = Math.abs(v);
	return abs >= 1000 ? ">999%" : `${abs}%`;
}
</script>

<template>
	<div
		class="kpi-card fade-up"
		:style="{
			'--kc': pal.border,
			'--kg': pal.glow,
			'--kb': pal.bg,
			'--kt': pal.text,
		}"
	>
		<!-- Colored top bar -->
		<div class="kpi-topbar" />

		<!-- Loading skeleton -->
		<template v-if="loading">
			<div class="kpi-head">
				<div class="zd-skeleton" style="width:60px;height:14px" />
			</div>
			<div class="zd-skeleton" style="width:80%;height:36px;margin:16px 0 8px" />
			<div class="zd-skeleton" style="width:50%;height:13px" />
		</template>

		<!-- Content -->
		<template v-else-if="data">
			<div class="kpi-head">
				<span class="kpi-label">{{ data.label }}</span>
				<div
					class="kpi-change-pill"
					:class="totalUp ? 'up' : 'down'"
				>
					<span>{{ totalUp ? "▲" : "▼" }}</span>
					{{ fmtChg(data.total_change) }}
				</div>
			</div>

			<div class="kpi-amount">
				<span class="kpi-num">{{ fmt(displayTotal) }}</span>
				<span class="kpi-unit">{{ t("sar") }}</span>
			</div>

			<div class="kpi-vs">
				<span class="kpi-vs-label">{{ t("comparedTo") }}</span>
				<span class="kpi-vs-val">{{ fmt(data.prev_total) }} {{ t("sar") }}</span>
			</div>

			<div class="kpi-divider" />

			<div class="kpi-stats">
				<div class="kpi-stat">
					<div class="kpi-stat-val">{{ Math.round(displayCount) }}</div>
					<div class="kpi-stat-lbl">{{ t("invoice") }}</div>
				</div>
				<div class="kpi-stat-sep" />
				<div class="kpi-stat">
					<div class="kpi-stat-val">{{ fmt(data.avg) }}</div>
					<div class="kpi-stat-lbl">{{ t("average") }}</div>
				</div>
				<div class="kpi-stat-sep" />
				<div class="kpi-stat">
					<div class="kpi-stat-val">{{ fmt(data.tax) }}</div>
					<div class="kpi-stat-lbl">{{ t("tax") }}</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.kpi-card {
	background: var(--zd-card);
	border: 1px solid var(--zd-border);
	border-radius: var(--zd-r);
	overflow: hidden;
	padding: 0;
	transition: transform 0.2s, box-shadow 0.2s, border-color 0.2s;
	position: relative;
}
.kpi-card:hover {
	transform: translateY(-3px);
	border-color: var(--kc);
	box-shadow: 0 0 28px var(--kg);
}

.kpi-topbar {
	height: 3px;
	background: var(--kc);
	box-shadow: 0 0 12px var(--kc);
}

.kpi-head {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 18px 20px 0;
}
.kpi-label {
	font-size: 0.78rem;
	font-weight: 600;
	color: var(--zd-t2);
	text-transform: uppercase;
	letter-spacing: 0.08em;
}

.kpi-change-pill {
	display: inline-flex;
	align-items: center;
	gap: 3px;
	padding: 2px 8px;
	border-radius: 100px;
	font-size: 0.72rem;
	font-weight: 700;
}
.kpi-change-pill.up   { background: rgba(52,211,153,0.12); color: var(--zd-emerald); }
.kpi-change-pill.down { background: rgba(248,113,113,0.12); color: var(--zd-rose); }

.kpi-amount {
	display: flex;
	align-items: baseline;
	gap: 6px;
	padding: 14px 20px 6px;
}
.kpi-num {
	font-family: "Space Grotesk", monospace;
	font-size: clamp(1.6rem, 2.5vw, 2rem);
	font-weight: 800;
	color: var(--kt);
	line-height: 1;
}
.kpi-unit { font-size: 0.82rem; color: var(--zd-t2); font-weight: 500; }

.kpi-vs {
	padding: 0 20px 16px;
	display: flex;
	align-items: center;
	gap: 6px;
}
.kpi-vs-label { font-size: 0.75rem; color: var(--zd-t3); }
.kpi-vs-val   { font-size: 0.75rem; color: var(--zd-t2); font-family: "Space Grotesk", monospace; }

.kpi-divider { height: 1px; background: var(--zd-border); margin: 0 20px; }

.kpi-stats {
	display: flex;
	align-items: center;
	padding: 14px 20px;
	gap: 0;
}
.kpi-stat        { flex: 1; text-align: center; }
.kpi-stat-val    {
	font-family: "Space Grotesk", monospace;
	font-size: 0.9rem;
	font-weight: 700;
	color: var(--zd-t1);
}
.kpi-stat-lbl    { font-size: 0.68rem; color: var(--zd-t3); margin-top: 3px; }
.kpi-stat-sep    { width: 1px; height: 30px; background: var(--zd-border); }
</style>
