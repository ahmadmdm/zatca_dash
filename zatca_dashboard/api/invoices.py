import frappe
import requests
from datetime import date, timedelta
import calendar
from concurrent.futures import ThreadPoolExecutor, as_completed


# ─────────────────────────────────────────────────────────────────────────────
# Internal helpers
# ─────────────────────────────────────────────────────────────────────────────

def _get_settings():
	try:
		return frappe.get_single("ZATCA API Settings")
	except Exception:
		frappe.throw("ZATCA API Settings not found. Please install the app properly.")


def _call_api(params=None, sync=False, timeout=30):
	"""Makes a GET request to the ZATCA export API. API key never leaves the server."""
	s = _get_settings()

	api_key = None
	if s.api_key:
		try:
			api_key = s.get_password("api_key")
		except Exception:
			api_key = s.api_key

	if not api_key:
		frappe.throw(
			"ZATCA API Key is not configured. Go to ZATCA Dashboard → Settings.",
			title="Missing API Key"
		)

	base_url = (s.base_url or "https://za.ideaorbit.net").rstrip("/")
	p = dict(params or {})
	p.setdefault("limit", 1000)
	if not sync:
		p.setdefault("sync", "false")

	try:
		resp = requests.get(
			f"{base_url}/api/export/invoices",
			headers={"x-api-key": api_key},
			params=p,
			timeout=timeout,
		)
		resp.raise_for_status()
		return resp.json()
	except requests.exceptions.Timeout:
		frappe.throw("ZATCA API request timed out.")
	except requests.exceptions.ConnectionError:
		frappe.throw("Cannot connect to ZATCA API server.")
	except requests.exceptions.HTTPError as exc:
		code = exc.response.status_code
		if code == 401:
			frappe.throw("Invalid API Key — update it in Settings.")
		frappe.throw(f"ZATCA API returned HTTP {code}.")


def _raw_fetch(api_key, base_url, params=None, sync=False):
	"""Pure HTTP fetch — NO frappe context. Safe to call from worker threads."""
	p = dict(params or {})
	p.setdefault("limit", 1000)
	if not sync:
		p.setdefault("sync", "false")
	try:
		resp = requests.get(
			f"{base_url}/api/export/invoices",
			headers={"x-api-key": api_key},
			params=p,
			timeout=25,
		)
		resp.raise_for_status()
		d = resp.json()
		return d.get("data", []), None
	except Exception as exc:
		return [], str(exc)


def _get_api_credentials():
	"""Fetch API key + base URL from Frappe settings (MAIN thread only)."""
	s = _get_settings()
	api_key = None
	if s.api_key:
		try:
			api_key = s.get_password("api_key")
		except Exception:
			api_key = s.api_key
	if not api_key:
		frappe.throw("ZATCA API Key is not configured. Go to Settings.")
	base_url = (s.base_url or "https://za.ideaorbit.net").rstrip("/")
	return api_key, base_url


def _call_api_safe(params=None, sync=False):
	"""Thread-safe version — returns (data_list, error_str) without frappe.throw.
	NOTE: only call this from the MAIN thread when you need a single fetch.
	For parallel calls use _raw_fetch with pre-fetched credentials."""
	api_key, base_url = _get_api_credentials()
	return _raw_fetch(api_key, base_url, params=params, sync=sync)


def _agg(invoices):
	total = round(sum(inv.get("totalAmount", 0) for inv in invoices), 2)
	tax   = round(sum(inv.get("taxAmount",   0) for inv in invoices), 2)
	count = len(invoices)
	net   = round(total - tax, 2)
	avg   = round(total / count, 2) if count else 0
	return {"count": count, "total": total, "tax": tax, "net": net, "avg": avg}


def _pct(current, previous):
	if previous == 0:
		return 100.0 if current > 0 else 0.0
	return round(((current - previous) / previous) * 100, 1)


def _build_kpi(cur_invs, prev_invs, label, color):
	c = _agg(cur_invs)
	p = _agg(prev_invs)
	return {
		"label":        label,
		"color":        color,
		**c,
		"prev_total":   p["total"],
		"prev_count":   p["count"],
		"prev_avg":     p["avg"],
		"total_change": _pct(c["total"], p["total"]),
		"count_change": _pct(c["count"], p["count"]),
		"avg_change":   _pct(c["avg"],   p["avg"]),
	}


def _last_month(today):
	if today.month == 1:
		y, m = today.year - 1, 12
	else:
		y, m = today.year, today.month - 1
	_, ld = calendar.monthrange(y, m)
	return date(y, m, 1), date(y, m, ld)


# ─────────────────────────────────────────────────────────────────────────────
# Whitelisted API Methods
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_kpi_data():
	"""Returns aggregated KPI data for Today / Week / Month / Year with period comparisons.
	Credentials are fetched once in the main thread; all 8 API calls run in parallel."""
	today = date.today()
	# Saudi week starts on Sunday (Python weekday: Sunday=6)
	days_since_sunday = (today.weekday() + 1) % 7   # 0 on Sun, 1 on Mon, … 6 on Sat
	week_start        = today - timedelta(days=days_since_sunday)
	prev_week_start   = week_start - timedelta(7)
	prev_week_end     = week_start - timedelta(1)
	lm_s, lm_e = _last_month(today)

	ranges = {
		"today":      (today,           today),
		"yesterday":  (today - timedelta(1), today - timedelta(1)),
		"week":       (week_start,      today),
		"prev_week":  (prev_week_start, prev_week_end),
		"month":      (date(today.year, today.month, 1),   today),
		"prev_month": (lm_s,                               lm_e),
		"year":       (date(today.year, 1, 1),             today),
		"prev_year":  (date(today.year - 1, 1, 1),         date(today.year - 1, 12, 31)),
	}

	# Fetch credentials ONCE in main thread (Frappe context available here)
	api_key, base_url = _get_api_credentials()

	data = {}

	def fetch(key, s, e):
		# Worker: no Frappe context — use _raw_fetch
		invs, _ = _raw_fetch(api_key, base_url, {"startDate": s.isoformat(), "endDate": e.isoformat()})
		return key, invs

	with ThreadPoolExecutor(max_workers=8) as ex:
		futures = {ex.submit(fetch, k, s, e): k for k, (s, e) in ranges.items()}
		for fut in as_completed(futures):
			key, invs = fut.result()
			data[key] = invs

	return {
		"today": _build_kpi(data["today"],  data["yesterday"],  "اليوم",   "cyan"),
		"week":  _build_kpi(data["week"],   data["prev_week"],  "الأسبوع", "purple"),
		"month": _build_kpi(data["month"],  data["prev_month"], "الشهر",   "emerald"),
		"year":  _build_kpi(data["year"],   data["prev_year"],  "السنة",   "amber"),
		"as_of": frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M"),
	}


@frappe.whitelist()
def get_chart_data(period="week"):
	"""Returns daily/weekly/monthly totals for chart rendering with comparison."""
	today = date.today()

	if period == "year":
		return _yearly_chart(today)

	days = {"week": 7, "month": 30, "quarter": 90}.get(period, 7)
	start = today - timedelta(days=days - 1)

	# Fetch credentials once in main thread
	api_key, base_url = _get_api_credentials()

	def fetch_period(s, e):
		invs, _ = _raw_fetch(api_key, base_url, {"startDate": s.isoformat(), "endDate": e.isoformat()})
		return invs

	with ThreadPoolExecutor(max_workers=2) as ex:
		f_cur  = ex.submit(fetch_period, start, today)
		f_prev = ex.submit(fetch_period, start - timedelta(days), today - timedelta(days))
		cur_invs  = f_cur.result()
		prev_invs = f_prev.result()

	def daily_agg(invs):
		d = {}
		for inv in invs:
			dt = inv["issueDate"][:10]
			if dt not in d:
				d[dt] = {"total": 0, "count": 0}
			d[dt]["total"] = round(d[dt]["total"] + inv.get("totalAmount", 0), 2)
			d[dt]["count"] += 1
		return d

	cur_map  = daily_agg(cur_invs)
	prev_map = daily_agg(prev_invs)

	categories, current, current_counts, previous, dates = [], [], [], [], []
	for i in range(days):
		d      = today - timedelta(days=days - 1 - i)
		p      = d - timedelta(days=days)
		lbl    = d.strftime("%a") if days <= 7 else d.strftime("%d/%m")
		categories.append(lbl)
		dates.append(d.isoformat())
		current.append(cur_map.get(d.isoformat(), {}).get("total", 0))
		current_counts.append(cur_map.get(d.isoformat(), {}).get("count", 0))
		previous.append(prev_map.get(p.isoformat(), {}).get("total", 0))

	return {
		"categories":     categories,
		"current":        current,
		"current_counts": current_counts,
		"previous":       previous,
		"dates":          dates,
		"total_current":  round(sum(current), 2),
		"total_previous": round(sum(previous), 2),
	}


def _yearly_chart(today):
	categories, current, current_counts, previous = [], [], [], []

	# Fetch credentials once (this function is called from main thread)
	api_key, base_url = _get_api_credentials()

	def fetch_month(year, m):
		_, ld = calendar.monthrange(year, m)
		end = date(year, m, ld) if (year < today.year or m < today.month) else today
		invs, _ = _raw_fetch(api_key, base_url, {"startDate": date(year, m, 1).isoformat(), "endDate": end.isoformat()})
		return invs

	months = range(1, today.month + 1)
	with ThreadPoolExecutor(max_workers=12) as ex:
		fcur  = {m: ex.submit(fetch_month, today.year,     m) for m in months}
		fprev = {m: ex.submit(fetch_month, today.year - 1, m) for m in months}

	for m in months:
		ci = fcur[m].result()
		pi = fprev[m].result()
		categories.append(date(2000, m, 1).strftime("%b"))
		current.append(round(sum(i.get("totalAmount", 0) for i in ci), 2))
		current_counts.append(len(ci))
		previous.append(round(sum(i.get("totalAmount", 0) for i in pi), 2))

	return {
		"categories":     categories,
		"current":        current,
		"current_counts": current_counts,
		"previous":       previous,
		"dates":          [],
		"total_current":  round(sum(current), 2),
		"total_previous": round(sum(previous), 2),
	}


@frappe.whitelist()
def get_invoices(branch=None, start_date=None, end_date=None, status=None, limit=100):
	params = {"limit": int(limit)}
	if branch and branch != "all":   params["branch"]    = branch
	if start_date:                   params["startDate"] = start_date
	if end_date:                     params["endDate"]   = end_date
	if status and status != "all":   params["status"]    = status

	result = _call_api(params)
	return {"data": result.get("data", []), "count": result.get("count", 0)}


@frappe.whitelist()
def get_branch_status():
	result = _call_api({"limit": 1}, sync=True)
	branches = result.get("syncStatus", {}).get("branches", {})
	out = []
	for code, info in sorted(branches.items()):
		out.append({
			"code":           code,
			"name":           info.get("posDevice", code),
			"connected":      info.get("connected", False),
			"last_sync_file": info.get("lastSyncFile"),
			"last_sync_at":   info.get("lastSyncAt"),
		})
	return out


@frappe.whitelist()
def get_settings():
	s = _get_settings()
	return {
		"base_url":            s.base_url or "https://za.ideaorbit.net",
		"default_limit":       s.default_limit or 100,
		"enable_sync_status":  s.enable_sync_status,
		"has_api_key":         bool(s.api_key),
	}


@frappe.whitelist()
def save_settings(base_url, api_key=None, default_limit=100, enable_sync_status=1):
	s = _get_settings()
	s.base_url           = base_url
	s.default_limit      = int(default_limit)
	s.enable_sync_status = int(enable_sync_status)
	if api_key:
		s.api_key = api_key
	s.save(ignore_permissions=True)
	return {"success": True}


@frappe.whitelist()
def test_connection(api_key=None, base_url=None):
	try:
		s = _get_settings()
		key = api_key
		if not key and s.api_key:
			try:
				key = s.get_password("api_key")
			except Exception:
				key = s.api_key
		if not key:
			return {"success": False, "message": "API Key not set"}

		url = (base_url or s.base_url or "https://za.ideaorbit.net").rstrip("/")
		resp = requests.get(
			f"{url}/api/export/invoices",
			headers={"x-api-key": key},
			params={"limit": 1, "sync": "false"},
			timeout=10,
		)
		if resp.status_code == 200:
			d = resp.json()
			return {"success": True, "message": f"✓ Connected — {d.get('count', 0)} records available"}
		elif resp.status_code == 401:
			return {"success": False, "message": "✗ Unauthorized — Invalid API Key"}
		else:
			return {"success": False, "message": f"✗ HTTP {resp.status_code}"}
	except Exception as exc:
		return {"success": False, "message": str(exc)}


# ─────────────────────────────────────────────────────────────────────────────
# Number Card Methods — return a plain number for Frappe Number Card widgets
# ─────────────────────────────────────────────────────────────────────────────

@frappe.whitelist()
def get_branch_sales(period=None, start_date=None, end_date=None):
	"""Returns per-branch aggregated sales for a date range.
	Accepts start_date/end_date (YYYY-MM-DD) or period (today/week/month/year).
	"""
	today = date.today()
	if start_date and end_date:
		start = date.fromisoformat(start_date)
		end   = date.fromisoformat(end_date)
	else:
		period = period or "today"
		if period == "today":
			start = end = today
		elif period == "week":
			days_since_sunday = (today.weekday() + 1) % 7
			start = today - timedelta(days=days_since_sunday)
			end = today
		elif period == "month":
			start = date(today.year, today.month, 1)
			end = today
		elif period == "year":
			start = date(today.year, 1, 1)
			end = today
		else:
			start = end = today

	# Fetch code → full branch name mapping
	try:
		status_result = _call_api({"limit": 1}, sync=True)
		branches_info = status_result.get("syncStatus", {}).get("branches", {})
		code_to_name = {code: info.get("posDevice", code) for code, info in branches_info.items()}
	except Exception:
		code_to_name = {}

	invs, err = _call_api_safe({"startDate": start.isoformat(), "endDate": end.isoformat()})
	if err:
		frappe.throw(err)

	branches = {}
	for inv in invs:
		code   = inv.get("branch") or "غير محدد"
		branch = code_to_name.get(code, code)   # resolve code → full name
		if branch not in branches:
			branches[branch] = {"total": 0.0, "tax": 0.0, "count": 0}
		branches[branch]["total"] = round(branches[branch]["total"] + (inv.get("totalAmount") or 0), 2)
		branches[branch]["tax"]   = round(branches[branch]["tax"]   + (inv.get("taxAmount")   or 0), 2)
		branches[branch]["count"] += 1

	result = []
	for name, agg in sorted(branches.items(), key=lambda x: -x[1]["total"]):
		result.append({
			"branch": name,
			"total":  agg["total"],
			"tax":    agg["tax"],
			"net":    round(agg["total"] - agg["tax"], 2),
			"count":  agg["count"],
		})

	return {
		"data":        result,
		"start":       start.isoformat(),
		"end":         end.isoformat(),
		"grand_total": round(sum(b["total"] for b in result), 2),
		"grand_count": sum(b["count"] for b in result),
	}


@frappe.whitelist()
def get_companies_for_je():
	"""Returns companies with their income + cash/bank accounts for JE dialog."""
	companies = frappe.db.sql("SELECT name, abbr FROM `tabCompany` ORDER BY name", as_dict=True)
	result = []
	for c in companies:
		income_accs = frappe.db.sql(
			"SELECT name FROM `tabAccount` WHERE root_type='Income' AND is_group=0 AND company=%s ORDER BY name",
			c.name, as_list=True)
		debit_accs = frappe.db.sql(
			"SELECT name FROM `tabAccount` WHERE account_type IN ('Cash','Bank','Receivable') AND is_group=0 AND company=%s ORDER BY name",
			c.name, as_list=True)
		if not income_accs and not debit_accs:
			continue
		result.append({
			"company":         c.name,
			"abbr":            c.abbr,
			"income_accounts": [a[0] for a in income_accs],
			"debit_accounts":  [a[0] for a in debit_accs],
		})
	return result


@frappe.whitelist()
def post_branch_journal_entry(branch, posting_date, company, rows, narration=None):
	"""Creates a draft Journal Entry for a branch's daily sales.
	rows: JSON list of {account, debit, credit, remark}
	"""
	import json
	if isinstance(rows, str):
		rows = json.loads(rows)

	total_debit  = round(sum(float(r.get("debit",  0)) for r in rows), 2)
	total_credit = round(sum(float(r.get("credit", 0)) for r in rows), 2)
	if abs(total_debit - total_credit) > 0.01:
		frappe.throw(f"القيد غير متوازن — المدين: {total_debit} ≠ الدائن: {total_credit}")

	je = frappe.get_doc({
		"doctype":      "Journal Entry",
		"voucher_type": "Journal Entry",
		"posting_date": posting_date,
		"company":      company,
		"narration":    narration or f"مبيعات فرع {branch} بتاريخ {posting_date}",
		"accounts": [{
			"account":                         r["account"],
			"debit_in_account_currency":       float(r.get("debit",  0)),
			"credit_in_account_currency":      float(r.get("credit", 0)),
			"user_remark":                     r.get("remark", ""),
		} for r in rows],
	})
	je.insert(ignore_permissions=True)
	return {"name": je.name, "status": "Draft"}


@frappe.whitelist()
def get_today_branch_sales():
	"""Returns today's total sales (SAR) from ZATCA API — used by Number Card."""
	today = date.today().isoformat()
	invs, err = _call_api_safe({"startDate": today, "endDate": today})
	if err:
		return 0
	return round(sum(inv.get("totalAmount", 0) for inv in invs), 2)


@frappe.whitelist()
def get_today_branch_invoice_count():
	"""Returns today's invoice count from ZATCA API — used by Number Card."""
	today = date.today().isoformat()
	invs, err = _call_api_safe({"startDate": today, "endDate": today})
	if err:
		return 0
	return len(invs)

