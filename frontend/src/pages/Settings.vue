<script setup>
import { ref, onMounted } from "vue";
import { useI18n } from "../i18n.js";

const { t, tf } = useI18n();

// ── State ─────────────────────────────────────────────────────
const form = ref({
	api_key:             "",
	base_url:            "https://za.ideaorbit.net",
	default_limit:       100,
	enable_sync_status:  true,
});

const hasExistingKey    = ref(false);
const showApiKey        = ref(false);
const loadingSettings   = ref(true);
const savingSettings    = ref(false);
const testingConnection = ref(false);

const saveMsg     = ref(null);
const saveMsgType = ref("success");
const testResult  = ref(null);

// ── Helpers ───────────────────────────────────────────────────
function fCall(method, args = {}) {
	return new Promise((resolve, reject) => {
		window.frappe.call({
			method,
			args,
			callback: resolve,
			error:    reject,
		});
	});
}

function showMsg(msg, type = "success") {
	saveMsg.value     = msg;
	saveMsgType.value = type;
	setTimeout(() => { saveMsg.value = null; }, 4000);
}

// ── Load current settings ────────────────────────────────────
async function loadSettings() {
	loadingSettings.value = true;
	try {
		const r = await fCall("zatca_dashboard.api.invoices.get_settings");
		const d = r.message;
		if (d) {
			form.value.base_url           = d.base_url           || "https://za.ideaorbit.net";
			form.value.default_limit      = d.default_limit      || 100;
			form.value.enable_sync_status = !!d.enable_sync_status;
			hasExistingKey.value          = d.has_api_key;
		}
	} catch (e) {
		showMsg(tf("errLoadSettings", e), "error");
	} finally {
		loadingSettings.value = false;
	}
}

// ── Save settings ─────────────────────────────────────────────
async function saveSettings() {
	if (!form.value.base_url) {
		showMsg(t("errNoUrl"), "error");
		return;
	}

	savingSettings.value = true;
	try {
		const r = await fCall("zatca_dashboard.api.invoices.save_settings", {
			base_url:            form.value.base_url,
			api_key:             form.value.api_key || null,
			default_limit:       form.value.default_limit,
			enable_sync_status:  form.value.enable_sync_status ? 1 : 0,
		});

		if (r.message?.success) {
			showMsg(t("successSaved"), "success");
			if (form.value.api_key) {
				hasExistingKey.value = true;
				form.value.api_key   = "";
			}
		}
	} catch (e) {
		showMsg(tf("errSaveFailed", e), "error");
	} finally {
		savingSettings.value = false;
	}
}

// ── Test connection ───────────────────────────────────────────
async function testConnection() {
	testingConnection.value = true;
	testResult.value        = null;
	try {
		const r = await fCall("zatca_dashboard.api.invoices.test_connection", {
			api_key:  form.value.api_key  || null,
			base_url: form.value.base_url || null,
		});
		testResult.value = r.message;
	} catch (e) {
		testResult.value = { success: false, message: String(e) };
	} finally {
		testingConnection.value = false;
	}
}

onMounted(loadSettings);
</script>

<template>
	<div class="stp">

		<!-- ══ Header ══════════════════════════════════════════ -->
		<header class="stp-header">
			<div>
				<h1 class="stp-title">{{ t("settingsTitle") }}</h1>
				<p class="stp-sub">{{ t("settingsSubtitle") }}</p>
			</div>
		</header>

		<!-- ══ Loading ══════════════════════════════════════════ -->
		<div v-if="loadingSettings" class="zd-card load-card">
			<div v-for="i in 4" :key="i" class="zd-skeleton" style="height: 52px; border-radius: 8px;" />
		</div>

		<!-- ══ Settings Form ════════════════════════════════════ -->
		<template v-else>
			<div class="settings-layout">

				<!-- Left: Main form -->
				<div class="form-col">

					<!-- API Settings card -->
					<div class="zd-card form-card">
						<div class="form-card-title">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
							{{ t("apiSettings") }}
						</div>

						<!-- Base URL -->
						<div class="field-group">
								<label class="field-label">{{ t("baseUrl") }}</label>
								<input
									v-model="form.base_url"
									class="zd-input"
									type="url"
									placeholder="https://za.ideaorbit.net"
									dir="ltr"
								/>
								<div class="field-hint">{{ t("baseUrlHint") }}</div>
						</div>

						<!-- API Key -->
						<div class="field-group">
							<label class="field-label">
									{{ t("apiKey") }}
									<span v-if="hasExistingKey" class="key-status">
										<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#34d399" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
										{{ t("keySaved") }}
								</span>
							</label>
							<div class="input-group">
								<input
									v-model="form.api_key"
									class="zd-input input-group-field"
									:type="showApiKey ? 'text' : 'password'"
									:placeholder="hasExistingKey ? t('keyPlaceholderExisting') : t('keyPlaceholderNew')"
									dir="ltr"
									autocomplete="new-password"
								/>
								<button class="input-group-btn" @click="showApiKey = !showApiKey" type="button">
									<svg v-if="!showApiKey" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
									<svg v-else             width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
								</button>
							</div>
						<div class="field-hint">{{ t("keyHint") }}</div>
						</div>
					</div>

					<!-- Options card -->
					<div class="zd-card form-card" style="margin-top: 16px;">
						<div class="form-card-title">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
							{{ t("advancedOptions") }}
						</div>

						<!-- Default Limit -->
						<div class="field-group">
						<label class="field-label">{{ t("defaultLimit") }}</label>
						<select v-model.number="form.default_limit" class="zd-input zd-select">
							<option v-for="n in [50, 100, 200, 500, 1000]" :key="n" :value="n">{{ tf("records", n) }}</option>
						</select>
						<div class="field-hint">{{ t("limitHint") }}</div>
						</div>

						<!-- Enable Sync Status -->
						<div class="field-group">
							<div class="toggle-row">
								<div>
									<div class="toggle-label">{{ t("enableSync") }}</div>
									<div class="toggle-hint">{{ t("enableSyncHint") }}</div>
								</div>
								<button
									class="toggle-btn"
									:class="{ on: form.enable_sync_status }"
									@click="form.enable_sync_status = !form.enable_sync_status"
									type="button"
									:aria-pressed="form.enable_sync_status"
								>
									<span class="toggle-knob" />
								</button>
							</div>
						</div>
					</div>

					<!-- Save message -->
					<div v-if="saveMsg" class="save-msg" :class="`msg-${saveMsgType}`">
						<svg v-if="saveMsgType === 'success'" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
						<svg v-else                           width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
						{{ saveMsg }}
					</div>

					<!-- Action buttons -->
					<div class="form-actions">
						<button class="zd-btn zd-btn-primary" @click="saveSettings" :disabled="savingSettings">
							<svg :class="{ spin: savingSettings }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
							{{ savingSettings ? t("saving") : t("saveSettings") }}
						</button>
						<button class="zd-btn zd-btn-ghost" @click="loadSettings" :disabled="loadingSettings">
							إلغاء
						</button>
					</div>
				</div>

				<!-- Right: Test Connection panel -->
				<div class="info-col">

					<!-- Test Connection -->
					<div class="zd-card test-card">
						<div class="form-card-title">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
								{{ t("testConnection") }}
						</div>
						<p class="test-desc">{{ t("testDesc") }}</p>
						<button
							class="zd-btn zd-btn-ghost test-btn"
							@click="testConnection"
							:disabled="testingConnection"
						>
							<svg :class="{ spin: testingConnection }" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
							{{ testingConnection ? t("testing") : t("testConnectionNow") }}
						</button>

						<!-- Test result -->
						<div v-if="testResult" class="test-result" :class="testResult.success ? 'result-ok' : 'result-err'">
							<div class="result-icon">
								<svg v-if="testResult.success" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
								<svg v-else                    width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
							</div>
							<div class="result-text">{{ testResult.message }}</div>
						</div>
					</div>

					<!-- Info card -->
					<div class="zd-card info-card" style="margin-top: 16px;">
						<div class="form-card-title">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
							{{ t("infoTitle") }}
						</div>
						<div class="info-items">
							<div class="info-item">
								<div class="info-item-icon">🔒</div>
								<div>
									<div class="info-item-title">{{ t("infoKeySecurity") }}</div>
									<div class="info-item-body">{{ t("infoKeyBody") }}</div>
								</div>
							</div>
							<div class="info-item">
								<div class="info-item-icon">⚡</div>
								<div>
									<div class="info-item-title">{{ t("infoParallel") }}</div>
									<div class="info-item-body">{{ t("infoParallelBody") }}</div>
								</div>
							</div>
							<div class="info-item">
								<div class="info-item-icon">🔄</div>
								<div>
									<div class="info-item-title">{{ t("infoAutoRefresh") }}</div>
									<div class="info-item-body">{{ t("infoAutoRefreshBody") }}</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</template>
	</div>
</template>

<style scoped>
.stp {
	padding: 32px 28px;
	max-width: 1100px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

/* ── Header ─────────────────────────────────────────────────── */
.stp-header { }
.stp-title  { font-size: 1.55rem; font-weight: 800; color: var(--zd-t1); }
.stp-sub    { font-size: 0.8rem; color: var(--zd-t2); margin-top: 4px; }

/* ── Layout ─────────────────────────────────────────────────── */
.settings-layout {
	display: grid;
	grid-template-columns: 1fr 320px;
	gap: 20px;
	align-items: start;
}

/* ── Form card ──────────────────────────────────────────────── */
.form-card { padding: 24px; }
.form-card-title {
	display: flex; align-items: center; gap: 8px;
	font-size: 0.9rem; font-weight: 700; color: var(--zd-t1);
	margin-bottom: 22px;
	padding-bottom: 14px;
	border-bottom: 1px solid var(--zd-border);
}

/* ── Field ──────────────────────────────────────────────────── */
.field-group { margin-bottom: 20px; }
.field-label {
	display: flex; align-items: center; gap: 8px;
	font-size: 0.78rem; font-weight: 600; color: var(--zd-t2);
	margin-bottom: 7px; text-transform: uppercase; letter-spacing: 0.05em;
}
.field-hint  { font-size: 0.73rem; color: var(--zd-t3); margin-top: 6px; }

.key-status {
	display: inline-flex; align-items: center; gap: 4px;
	font-size: 0.7rem; color: var(--zd-emerald);
	background: rgba(52,211,153,0.1); border: 1px solid rgba(52,211,153,0.2);
	padding: 1px 7px; border-radius: 100px; font-weight: 500;
	letter-spacing: 0;
}

/* Input group with button */
.input-group { display: flex; }
.input-group-field { border-radius: var(--zd-r2) var(--zd-r2) 0 0; border-radius: 8px 0 0 8px; flex: 1; }
.input-group-btn {
	width: 44px; flex-shrink: 0;
	background: var(--zd-bg3); border: 1px solid var(--zd-border2);
	border-right: none; border-radius: 0 8px 8px 0;
	color: var(--zd-t3); cursor: pointer;
	display: flex; align-items: center; justify-content: center;
	transition: color 0.15s;
}
.input-group-btn:hover { color: var(--zd-t1); }

/* ── Toggle ─────────────────────────────────────────────────── */
.toggle-row {
	display: flex; align-items: center; justify-content: space-between;
	gap: 16px;
}
.toggle-label { font-size: 0.88rem; font-weight: 600; color: var(--zd-t1); }
.toggle-hint  { font-size: 0.73rem; color: var(--zd-t3); margin-top: 4px; }

.toggle-btn {
	width: 44px; height: 24px; flex-shrink: 0;
	background: var(--zd-bg3); border: 1px solid var(--zd-border2);
	border-radius: 100px; cursor: pointer;
	position: relative; transition: background 0.25s, border-color 0.25s;
}
.toggle-btn.on { background: rgba(0,212,255,0.25); border-color: var(--zd-cyan); }
.toggle-knob {
	position: absolute; top: 2px; right: 2px;
	width: 18px; height: 18px; border-radius: 50%;
	background: var(--zd-t3);
	transition: transform 0.25s, background 0.25s;
}
.toggle-btn.on .toggle-knob { transform: translateX(-20px); background: var(--zd-cyan); }

/* ── Save message ───────────────────────────────────────────── */
.save-msg {
	display: flex; align-items: center; gap: 8px;
	padding: 11px 16px; border-radius: var(--zd-r2);
	font-size: 0.875rem; font-weight: 500;
}
.msg-success { background: rgba(52,211,153,0.1); color: var(--zd-emerald); border: 1px solid rgba(52,211,153,0.25); }
.msg-error   { background: rgba(248,113,113,0.1); color: var(--zd-rose);    border: 1px solid rgba(248,113,113,0.25); }

/* ── Form actions ───────────────────────────────────────────── */
.form-actions { display: flex; gap: 10px; }
.load-card { padding: 24px; display: flex; flex-direction: column; gap: 12px; }

/* ── Test card ──────────────────────────────────────────────── */
.test-card { padding: 24px; }
.test-desc { font-size: 0.82rem; color: var(--zd-t2); line-height: 1.6; margin-bottom: 16px; }
.test-btn  { width: 100%; justify-content: center; }

.test-result {
	margin-top: 14px; padding: 14px;
	border-radius: var(--zd-r2); display: flex; align-items: flex-start; gap: 12px;
}
.result-ok  { background: rgba(52,211,153,0.08); color: var(--zd-emerald); border: 1px solid rgba(52,211,153,0.2); }
.result-err { background: rgba(248,113,113,0.08); color: var(--zd-rose);    border: 1px solid rgba(248,113,113,0.2); }

.result-icon { flex-shrink: 0; opacity: 0.9; }
.result-text { font-size: 0.83rem; font-weight: 500; line-height: 1.5; }

/* ── Info card ──────────────────────────────────────────────── */
.info-card { padding: 24px; }
.info-items { display: flex; flex-direction: column; gap: 16px; }
.info-item {
	display: flex; gap: 12px; align-items: flex-start;
}
.info-item-icon { font-size: 1.1rem; flex-shrink: 0; margin-top: 1px; }
.info-item-title { font-size: 0.83rem; font-weight: 600; color: var(--zd-t1); margin-bottom: 3px; }
.info-item-body  { font-size: 0.75rem; color: var(--zd-t3); line-height: 1.5; }

/* ── Responsive ─────────────────────────────────────────────── */
@media (max-width: 900px) {
	.settings-layout { grid-template-columns: 1fr; }
	.stp { padding: 16px; }
}
</style>
