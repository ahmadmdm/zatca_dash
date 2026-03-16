<script setup>
import { computed } from "vue";
import { RouterView, useRoute, RouterLink } from "vue-router";
import { useI18n } from "./i18n.js";

const route = useRoute();
const { t, dir } = useI18n();

const navItems = [
	{ path: "/",         label: t("dashboard"), icon: "grid"     },
	{ path: "/invoices", label: t("invoices"),  icon: "list"     },
	{ path: "/branches", label: t("branches"),  icon: "activity" },
	{ path: "/settings", label: t("settings"),  icon: "settings" },
];

const userName = computed(
	() => window.frappe?.session?.user_fullname || window.frappe?.session?.user || t("adminFallback")
);
const userInitial = computed(() => (userName.value[0] || "A").toUpperCase());

const icons = {
	grid: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>`,
	list: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>`,
	activity: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
	settings: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
};
</script>

<template>
	<div class="zd-app" :dir="dir">
		<!-- ── Sidebar ─────────────────────────────────────────── -->
		<aside class="zd-sidebar">
			<div class="zd-brand">
				<div class="zd-brand-badge">Z</div>
				<div class="zd-brand-text">
					<span class="zd-brand-name">ZATCA</span>
					<span class="zd-brand-sub">Dashboard</span>
				</div>
			</div>

			<nav class="zd-nav">
				<RouterLink
					v-for="item in navItems"
					:key="item.path"
					:to="item.path"
					class="zd-nav-link"
					:class="{ active: route.path === item.path }"
				>
					<span class="zd-nav-icon" v-html="icons[item.icon]" />
					{{ item.label }}
				</RouterLink>
			</nav>

			<div class="zd-sidebar-footer">
				<div class="zd-user">
					<div class="zd-avatar">{{ userInitial }}</div>
					<div class="zd-user-info">
						<div class="zd-user-name">{{ userName }}</div>
						<div class="zd-user-role">{{ t("role") }}</div>
					</div>
				</div>
			</div>
		</aside>

		<!-- ── Main ───────────────────────────────────────────── -->
		<main class="zd-main">
			<RouterView v-slot="{ Component }">
				<Transition name="page" mode="out-in">
					<component :is="Component" />
				</Transition>
			</RouterView>
		</main>
	</div>
</template>

<style>
/* ══════════════════════════════════════════════════════════════
   ZATCA DASHBOARD — Global Design System  (Ramotion-inspired)
   ══════════════════════════════════════════════════════════════ */
:root {
	/* Background layers */
	--zd-bg:      #070b14;
	--zd-bg2:     #0d1321;
	--zd-bg3:     #111827;
	--zd-card:    rgba(255,255,255,0.04);
	--zd-card-h:  rgba(255,255,255,0.07);

	/* Borders */
	--zd-border:  rgba(255,255,255,0.07);
	--zd-border2: rgba(255,255,255,0.13);

	/* Accent palette */
	--zd-cyan:    #00d4ff;
	--zd-purple:  #818cf8;
	--zd-emerald: #34d399;
	--zd-amber:   #fbbf24;
	--zd-rose:    #f87171;

	/* Text */
	--zd-t1:  #f1f5f9;
	--zd-t2:  #94a3b8;
	--zd-t3:  #475569;

	/* Layout */
	--zd-sidebar: 230px;
	--zd-r:  14px;
	--zd-r2: 8px;
}

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

html, body {
	background: var(--zd-bg);
	color: var(--zd-t1);
	font-family: "IBM Plex Sans Arabic", "Readex Pro", system-ui, sans-serif;
}

a { text-decoration: none; color: inherit; }

/* ── Layout shell ───────────────────────────────────────────── */
.zd-app {
	display: grid;
	grid-template-columns: var(--zd-sidebar) 1fr;
	min-height: 100vh;
}

/* ── Sidebar ─────────────────────────────────────────────────── */
.zd-sidebar {
	background: var(--zd-bg2);
	border-inline-end: 1px solid var(--zd-border);
	display: flex;
	flex-direction: column;
	padding: 20px 14px;
	position: sticky;
	top: 0;
	height: 100vh;
	overflow-y: auto;
}

.zd-brand {
	display: flex;
	align-items: center;
	gap: 11px;
	padding: 6px 8px 24px;
}
.zd-brand-badge {
	width: 38px; height: 38px;
	background: linear-gradient(135deg, var(--zd-cyan), var(--zd-purple));
	border-radius: 10px;
	display: flex; align-items: center; justify-content: center;
	font-family: "Space Grotesk", monospace;
	font-weight: 900; font-size: 1.15rem; color: #fff;
	flex-shrink: 0;
	box-shadow: 0 0 20px rgba(0,212,255,0.25);
}
.zd-brand-text { line-height: 1.15; }
.zd-brand-name {
	display: block;
	font-family: "Space Grotesk", monospace;
	font-weight: 800; font-size: 0.95rem; color: var(--zd-t1);
	letter-spacing: 0.06em;
}
.zd-brand-sub { display: block; font-size: 0.68rem; color: var(--zd-t3); }

.zd-nav { flex: 1; display: flex; flex-direction: column; gap: 3px; }
.zd-nav-link {
	display: flex; align-items: center; gap: 10px;
	padding: 10px 12px; border-radius: var(--zd-r2);
	color: var(--zd-t2); font-size: 0.875rem; font-weight: 500;
	transition: background 0.18s, color 0.18s;
}
.zd-nav-link:hover          { background: var(--zd-card); color: var(--zd-t1); }
.zd-nav-link.active         { background: rgba(0,212,255,0.1); color: var(--zd-cyan); font-weight: 600; }
.zd-nav-icon                { width: 17px; height: 17px; opacity: 0.6; flex-shrink: 0; }
.zd-nav-link.active .zd-nav-icon { opacity: 1; }

.zd-sidebar-footer { padding-top: 14px; border-top: 1px solid var(--zd-border); }
.zd-user { display: flex; align-items: center; gap: 10px; padding: 10px 10px; }
.zd-avatar {
	width: 30px; height: 30px;
	background: linear-gradient(135deg, var(--zd-purple), var(--zd-cyan));
	border-radius: 8px;
	display: flex; align-items: center; justify-content: center;
	font-weight: 700; font-size: 0.78rem; color: #fff;
	flex-shrink: 0;
}
.zd-user-name { font-size: 0.82rem; font-weight: 600; color: var(--zd-t1); }
.zd-user-role { font-size: 0.68rem; color: var(--zd-t3); }

/* ── Main area ───────────────────────────────────────────────── */
.zd-main { background: var(--zd-bg); min-height: 100vh; overflow-y: auto; }

/* ── Page transitions ────────────────────────────────────────── */
.page-enter-active, .page-leave-active { transition: opacity 0.18s, transform 0.18s; }
.page-enter-from { opacity: 0; transform: translateY(10px); }
.page-leave-to   { opacity: 0; transform: translateY(-5px); }

/* ── Shared: Card ────────────────────────────────────────────── */
.zd-card {
	background: var(--zd-card);
	border: 1px solid var(--zd-border);
	border-radius: var(--zd-r);
	backdrop-filter: blur(12px);
}
.zd-card:hover { border-color: var(--zd-border2); }

/* ── Shared: Status badges ───────────────────────────────────── */
.zd-badge {
	display: inline-flex; align-items: center; gap: 5px;
	padding: 3px 10px; border-radius: 100px;
	font-size: 0.73rem; font-weight: 600; white-space: nowrap;
}
.zd-badge-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }

.badge-REPORTED  { background: rgba(52,211,153,0.12); color: var(--zd-emerald); border: 1px solid rgba(52,211,153,0.25); }
.badge-CLEARED   { background: rgba(0,212,255,0.12);  color: var(--zd-cyan);    border: 1px solid rgba(0,212,255,0.25); }
.badge-FAILED    { background: rgba(248,113,113,0.12); color: var(--zd-rose);   border: 1px solid rgba(248,113,113,0.25); }
.badge-REJECTED  { background: rgba(251,191,36,0.12); color: var(--zd-amber);   border: 1px solid rgba(251,191,36,0.25); }
.badge-PENDING   { background: rgba(148,163,184,0.1); color: var(--zd-t2);      border: 1px solid rgba(148,163,184,0.2); }
.badge-SIGNED    { background: rgba(129,140,248,0.12); color: var(--zd-purple); border: 1px solid rgba(129,140,248,0.25); }

/* ── Shared: Buttons ────────────────────────────────────────── */
.zd-btn {
	display: inline-flex; align-items: center; gap: 7px;
	padding: 8px 18px; border-radius: var(--zd-r2);
	font-size: 0.85rem; font-weight: 600; cursor: pointer;
	border: none; transition: all 0.18s;
}
.zd-btn-primary  { background: var(--zd-cyan); color: #070b14; }
.zd-btn-primary:hover  { background: #22e8ff; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,212,255,.3); }
.zd-btn-ghost    { background: var(--zd-card); color: var(--zd-t1); border: 1px solid var(--zd-border); }
.zd-btn-ghost:hover    { background: var(--zd-card-h); border-color: var(--zd-border2); }
.zd-btn-danger   { background: rgba(248,113,113,0.15); color: var(--zd-rose); border: 1px solid rgba(248,113,113,0.25); }

/* ── Shared: Loading skeleton ────────────────────────────────── */
@keyframes shimmer {
	from { background-position: -200% 0; }
	to   { background-position: 200% 0; }
}
.zd-skeleton {
	background: linear-gradient(90deg, rgba(255,255,255,0.04) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 75%);
	background-size: 200% 100%;
	animation: shimmer 1.6s infinite;
	border-radius: 6px;
}

/* ── Shared: Section header ──────────────────────────────────── */
.zd-section-header {
	display: flex; align-items: center; justify-content: space-between;
	margin-bottom: 20px;
}
.zd-section-title { font-size: 1rem; font-weight: 700; color: var(--zd-t1); }
.zd-section-sub   { font-size: 0.8rem; color: var(--zd-t3); margin-top: 2px; }

/* ── Shared: Table ───────────────────────────────────────────── */
.zd-table { width: 100%; border-collapse: collapse; }
.zd-table th {
	padding: 10px 14px; text-align: right;
	font-size: 0.72rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
	color: var(--zd-t3); border-bottom: 1px solid var(--zd-border);
	white-space: nowrap;
}
.zd-table td {
	padding: 13px 14px; font-size: 0.83rem; color: var(--zd-t2);
	border-bottom: 1px solid var(--zd-border);
	white-space: nowrap;
}
.zd-table td.mono { font-family: "Space Grotesk", monospace; font-size: 0.78rem; }
.zd-table tr:hover td { background: rgba(255,255,255,0.02); }
.zd-table td.amount { color: var(--zd-t1); font-weight: 600; font-family: "Space Grotesk", monospace; }

/* ── Shared: Scrollbar ───────────────────────────────────────── */
::-webkit-scrollbar       { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.18); }

/* ── Shared: Input ───────────────────────────────────────────── */
.zd-input {
	background: var(--zd-bg3); color: var(--zd-t1);
	border: 1px solid var(--zd-border2); border-radius: var(--zd-r2);
	padding: 9px 14px; font-size: 0.875rem;
	font-family: inherit; width: 100%;
	transition: border-color 0.18s, box-shadow 0.18s;
	outline: none;
}
.zd-input:focus { border-color: var(--zd-cyan); box-shadow: 0 0 0 3px rgba(0,212,255,0.12); }
.zd-input::placeholder { color: var(--zd-t3); }

/* ── Shared: Select ──────────────────────────────────────────── */
.zd-select {
	appearance: none;
	background: var(--zd-bg3) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat left 12px center;
	padding-left: 32px;
}

/* ── Shared: Spin animation ─────────────────────────────────── */
@keyframes spin { to { transform: rotate(360deg); } }
.spin { animation: spin 1s linear infinite; }

/* ── Shared: fade-in ────────────────────────────────────────── */
@keyframes fadeUp { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
.fade-up { animation: fadeUp 0.3s ease both; }
</style>
