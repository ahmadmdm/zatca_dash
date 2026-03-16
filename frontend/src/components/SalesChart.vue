<script setup>
import {
	Chart as ChartJS,
	CategoryScale, LinearScale,
	BarElement, LineElement, PointElement,
	BarController, LineController,
	Title, Tooltip, Legend, Filler,
} from "chart.js";
import { ref, watch, onMounted, onBeforeUnmount, nextTick } from "vue";

ChartJS.register(
	CategoryScale, LinearScale,
	BarElement, LineElement, PointElement,
	BarController, LineController,
	Title, Tooltip, Legend, Filler
);

const props = defineProps({
	data:    Object,  // { categories, current, previous, total_current, total_previous }
	type:    { type: String, default: "bar" },
	loading: Boolean,
});

const canvasRef = ref(null);
let chart = null;

function destroy() {
	if (chart) { chart.destroy(); chart = null; }
}

function build() {
	if (!canvasRef.value || !props.data?.categories?.length) return;
	destroy();

	const ctx = canvasRef.value.getContext("2d");
	const w   = canvasRef.value.width;

	// Gradient for current period fill
	const grad = ctx.createLinearGradient(0, 0, 0, 260);
	grad.addColorStop(0, "rgba(0,212,255,0.45)");
	grad.addColorStop(1, "rgba(0,212,255,0.0)");

	const isBar = props.type === "bar";

	chart = new ChartJS(ctx, {
		type: isBar ? "bar" : "line",
		data: {
			labels: props.data.categories,
			datasets: [
				{
					label:                "الفترة الحالية",
					data:                 props.data.current,
					backgroundColor:      isBar ? "rgba(0,212,255,0.75)" : grad,
					borderColor:          "rgba(0,212,255,1)",
					borderWidth:          isBar ? 0 : 2,
					borderRadius:         isBar ? 6 : 0,
					hoverBackgroundColor: isBar ? "rgba(0,212,255,0.95)" : undefined,
					fill:                 !isBar,
					tension:              0.4,
					pointRadius:          isBar ? 0 : 3,
					pointHoverRadius:     5,
					pointBackgroundColor: "rgba(0,212,255,1)",
				},
				{
					label:           "الفترة السابقة",
					data:            props.data.previous,
					backgroundColor: isBar ? "rgba(148,163,184,0.18)" : "transparent",
					borderColor:     "rgba(148,163,184,0.45)",
					borderWidth:     isBar ? 0 : 1.5,
					borderRadius:    isBar ? 6 : 0,
					borderDash:      isBar ? [] : [5, 4],
					fill:            false,
					tension:         0.4,
					pointRadius:     0,
					pointHoverRadius: 4,
					pointBackgroundColor: "rgba(148,163,184,0.7)",
				},
			],
		},
		options: {
			responsive:          true,
			maintainAspectRatio: false,
			animation: { duration: 600, easing: "easeOutQuart" },
			interaction: { intersect: false, mode: "index" },
			plugins: {
				legend: {
					position: "top",
					align:    "end",
					labels: {
						color:       "#94a3b8",
						font:        { family: "IBM Plex Sans Arabic", size: 12 },
						padding:     16,
						boxWidth:    10,
						boxHeight:   10,
						usePointStyle: true,
					},
				},
				tooltip: {
					backgroundColor:  "rgba(13,19,33,0.95)",
					borderColor:      "rgba(0,212,255,0.3)",
					borderWidth:      1,
					titleColor:       "#f1f5f9",
					bodyColor:        "#94a3b8",
					padding:          12,
					cornerRadius:     10,
					displayColors:    true,
					callbacks: {
						label: (ctx) =>
							` ${ctx.dataset.label}: ${new Intl.NumberFormat("ar-SA", { minimumFractionDigits: 0 }).format(Math.round(ctx.raw))} ر.س`,
					},
				},
			},
			scales: {
				x: {
					grid:  { color: "rgba(255,255,255,0.04)", drawBorder: false },
					ticks: { color: "#64748b", font: { family: "IBM Plex Sans Arabic", size: 11 } },
					border: { display: false },
				},
				y: {
					grid:    { color: "rgba(255,255,255,0.04)", drawBorder: false },
					border:  { display: false, dash: [4, 4] },
					ticks: {
						color: "#64748b",
						font:  { family: "Space Grotesk", size: 11 },
						callback: (v) =>
							v >= 1000
								? `${(v / 1000).toLocaleString("ar-SA")}k`
								: v.toLocaleString("ar-SA"),
					},
				},
			},
		},
	});
}

watch(() => props.data, () => nextTick(build), { deep: true });
watch(() => props.type, () => nextTick(build));
onMounted(() => nextTick(build));
onBeforeUnmount(destroy);
</script>

<template>
	<div class="sc-wrap">
		<div v-if="loading" class="sc-loading">
			<div class="zd-skeleton" style="width:100%;height:100%;border-radius:12px" />
		</div>
		<canvas v-else ref="canvasRef" class="sc-canvas" />
	</div>
</template>

<style scoped>
.sc-wrap    { position: relative; width: 100%; height: 250px; }
.sc-loading { position: absolute; inset: 0; }
.sc-canvas  { width: 100% !important; height: 100% !important; }
</style>
