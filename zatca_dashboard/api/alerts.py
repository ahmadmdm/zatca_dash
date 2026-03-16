"""
ZATCA Dashboard — Automated Alerts
Runs every hour via the Frappe scheduler.

Checks:
  1. Branches that have NOT submitted an invoice in the last 24 hours.
  2. POS devices reported as "not connected" (out of sync).

On finding issues, it sends a bilingual (Arabic + English) System Notification
to every active user who has the "Accounts Manager" or "Accounts User" role,
AND sends an email to the same users.

Deduplication: each alert type is sent at most ONCE per 24-hour window.
The last-sent timestamps are stored in frappe's cache (Site-level).
"""

import frappe
from datetime import datetime, timezone, timedelta
from zatca_dashboard.api.invoices import _get_api_credentials, _raw_fetch


# ─── role targets ────────────────────────────────────────────────────────────
ALERT_ROLES = ["Accounts Manager", "Accounts User"]

# ─── cache keys ──────────────────────────────────────────────────────────────
CACHE_KEY_BRANCH  = "zatca_alert_branch_last_sent"
CACHE_KEY_DEVICE  = "zatca_alert_device_last_sent"
ALERT_COOLDOWN_H  = 24          # hours between repeated alerts of the same type


# ─────────────────────────────────────────────────────────────────────────────
def _get_alert_users():
    """Return list of {name, email, full_name} for all active users with target roles."""
    users = frappe.db.sql(
        """
        SELECT DISTINCT u.name, u.email, u.full_name
        FROM   tabUser u
        JOIN   `tabHas Role` ur ON ur.parent = u.name AND ur.parenttype = 'User'
        WHERE  ur.role IN %(roles)s
          AND  u.enabled = 1
          AND  u.name != 'Administrator'
        """,
        {"roles": ALERT_ROLES},
        as_dict=True,
    )
    return users


def _cooldown_ok(cache_key):
    """Return True if enough time has passed since the last alert of this type."""
    last = frappe.cache().get_value(cache_key)
    if not last:
        return True
    try:
        last_dt = datetime.fromisoformat(last)
        if last_dt.tzinfo is None:
            last_dt = last_dt.replace(tzinfo=timezone.utc)
        return (datetime.now(timezone.utc) - last_dt) >= timedelta(hours=ALERT_COOLDOWN_H)
    except Exception:
        return True


def _mark_sent(cache_key):
    frappe.cache().set_value(
        cache_key,
        datetime.now(timezone.utc).isoformat(),
        expires_in_sec=ALERT_COOLDOWN_H * 3600
    )


def _send_notification(user_name, subject_en, subject_ar, body_en, body_ar):
    """Send a Frappe System Notification (bell icon) to a single user."""
    frappe.get_doc({
        "doctype":    "Notification Log",
        "subject":    f"{subject_ar} | {subject_en}",
        "email_content": f"<div dir='rtl'>{body_ar}</div><hr>{body_en}",
        "for_user":   user_name,
        "type":       "Alert",
        "document_type": "ZATCA API Settings",
        "document_name": "ZATCA API Settings",
    }).insert(ignore_permissions=True)


def _send_email(user_email, user_name, subject_en, subject_ar, body_en, body_ar):
    """Send a bilingual email to a single user."""
    if not user_email:
        return
    frappe.sendmail(
        recipients=[user_email],
        subject=f"[تنبيه ZATCA] {subject_ar} | {subject_en}",
        message=f"""
<div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; font-size:14px; color:#1a1a1a;">
  <h2 style="color:#c0392b;">⚠️ تنبيه ZATCA</h2>
  {body_ar}
  <hr style="margin:20px 0; border-color:#eee;" />
</div>
<div style="font-family: Arial, sans-serif; font-size:14px; color:#1a1a1a;">
  <h2 style="color:#c0392b;">⚠️ ZATCA Alert</h2>
  {body_en}
  <p style="color:#888; font-size:12px; margin-top:30px;">
    Sent automatically by ZATCA Dashboard · {datetime.now().strftime('%Y-%m-%d %H:%M')}
  </p>
</div>
""",
        now=True,
    )


def _notify_users(subject_en, subject_ar, body_en, body_ar):
    """Send system notification + email to all target users."""
    users = _get_alert_users()
    if not users:
        frappe.logger().warning("ZATCA Alerts: no target users found with roles %s", ALERT_ROLES)
        return

    for u in users:
        try:
            _send_notification(u.name, subject_en, subject_ar, body_en, body_ar)
        except Exception as e:
            frappe.logger().error("ZATCA Alerts: notification to %s failed: %s", u.name, e)
        try:
            _send_email(u.email, u.full_name, subject_en, subject_ar, body_en, body_ar)
        except Exception as e:
            frappe.logger().error("ZATCA Alerts: email to %s failed: %s", u.email, e)


# ─────────────────────────────────────────────────────────────────────────────
# Core check functions
# ─────────────────────────────────────────────────────────────────────────────

def _check_unsync_devices(branches):
    """Alert if any POS device is reported as not connected."""
    if not _cooldown_ok(CACHE_KEY_DEVICE):
        return

    disconnected = [b for b in branches if not b.get("connected")]
    if not disconnected:
        return

    names_ar = "\n".join(f"  • {b.get('name', b.get('code'))}" for b in disconnected)
    names_en = "\n".join(f"  • {b.get('name', b.get('code'))}" for b in disconnected)

    body_ar = f"""
<p>تم الكشف عن <strong>{len(disconnected)}</strong> جهاز POS غير متصل بنظام ZATCA:</p>
<ul>{"".join(f"<li>{b.get('name', b.get('code'))}</li>" for b in disconnected)}</ul>
<p>يرجى التحقق من الأجهزة وإعادة تشغيلها أو مراجعة اتصال الشبكة.</p>
"""
    body_en = f"""
<p><strong>{len(disconnected)}</strong> POS device(s) are currently <strong>offline</strong> and not syncing with ZATCA:</p>
<ul>{"".join(f"<li>{b.get('name', b.get('code'))}</li>" for b in disconnected)}</ul>
<p>Please check the devices and verify their network connectivity.</p>
"""

    _notify_users(
        subject_en=f"{len(disconnected)} POS Device(s) Out of Sync",
        subject_ar=f"{len(disconnected)} جهاز POS غير متزامن",
        body_en=body_en,
        body_ar=body_ar,
    )
    _mark_sent(CACHE_KEY_DEVICE)
    frappe.logger().info("ZATCA Alerts: device alert sent for %d disconnected device(s)", len(disconnected))


def _check_silent_branches(branches):
    """Alert if any branch has not submitted an invoice in the last 24 hours."""
    if not _cooldown_ok(CACHE_KEY_BRANCH):
        return

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(hours=24)
    silent = []

    for b in branches:
        last_sync_raw = b.get("last_sync_at") or b.get("last_sync_file")
        if not last_sync_raw:
            # Never synced
            silent.append({"branch": b.get("name", b.get("code")), "last": "لم يُرفع أي فاتورة / Never synced"})
            continue
        try:
            # Parse ISO datetime — add UTC timezone if naive
            last_dt = datetime.fromisoformat(str(last_sync_raw).replace("Z", "+00:00"))
            if last_dt.tzinfo is None:
                last_dt = last_dt.replace(tzinfo=timezone.utc)
            if last_dt < cutoff:
                hours_ago = int((now - last_dt).total_seconds() / 3600)
                silent.append({
                    "branch": b.get("name", b.get("code")),
                    "last":   f"منذ {hours_ago} ساعة / {hours_ago}h ago",
                })
        except Exception:
            # Can't parse — treat as never synced
            silent.append({"branch": b.get("name", b.get("code")), "last": "تاريخ غير معروف / Unknown"})

    if not silent:
        return

    rows_ar = "".join(f"<li><strong>{s['branch']}</strong> — {s['last']}</li>" for s in silent)
    rows_en = rows_ar  # bilingual already embedded

    body_ar = f"""
<p>الفروع التالية (<strong>{len(silent)}</strong>) لم ترفع أي فاتورة إلى ZATCA خلال آخر 24 ساعة:</p>
<ul>{rows_ar}</ul>
<p>يرجى متابعة هذه الفروع والتأكد من استمرار عمليات الرفع.</p>
"""
    body_en = f"""
<p>The following <strong>{len(silent)}</strong> branch(es) have NOT submitted any invoice to ZATCA in the last 24 hours:</p>
<ul>{rows_en}</ul>
<p>Please follow up with these branches to ensure invoices are being submitted.</p>
"""

    _notify_users(
        subject_en=f"{len(silent)} Branch(es) Silent for 24+ Hours",
        subject_ar=f"{len(silent)} فرع لم يرفع فواتير منذ أكثر من 24 ساعة",
        body_en=body_en,
        body_ar=body_ar,
    )
    _mark_sent(CACHE_KEY_BRANCH)
    frappe.logger().info("ZATCA Alerts: branch silence alert sent for %d branch(es)", len(silent))


# ─────────────────────────────────────────────────────────────────────────────
# Scheduler entry point
# ─────────────────────────────────────────────────────────────────────────────

def run_zatca_alerts():
    """
    Called every hour by the Frappe scheduler.
    Fetches branch sync status from ZATCA API and sends alerts as needed.
    """
    try:
        api_key, base_url = _get_api_credentials()
    except Exception as e:
        frappe.logger().warning("ZATCA Alerts: cannot get API credentials — %s", e)
        return

    # call /api/export/invoices?limit=1&sync=true to get syncStatus
    try:
        import requests as _req
        resp = _req.get(
            f"{base_url}/api/export/invoices",
            headers={"x-api-key": api_key},
            params={"limit": 1, "sync": "true"},
            timeout=20,
        )
        resp.raise_for_status()
        result = resp.json()
    except Exception as e:
        frappe.logger().error("ZATCA Alerts: API call failed — %s", e)
        return

    raw_branches = result.get("syncStatus", {}).get("branches", {})
    branches = []
    for code, info in raw_branches.items():
        branches.append({
            "code":          code,
            "name":          info.get("posDevice", code),
            "connected":     info.get("connected", False),
            "last_sync_at":  info.get("lastSyncAt"),
            "last_sync_file": info.get("lastSyncFile"),
        })

    if not branches:
        frappe.logger().info("ZATCA Alerts: no branch data returned from API")
        return

    _check_unsync_devices(branches)
    _check_silent_branches(branches)
    frappe.db.commit()
