from __future__ import annotations

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase

from zatca_dashboard.api import invoices


class TestZATCADashboardPermissions(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.created_users = []
		self.settings = frappe.get_single("ZATCA API Settings")
		self.settings_payload = {
			"base_url": self.settings.base_url or "https://za.ideaorbit.net",
			"default_limit": self.settings.default_limit or 100,
			"enable_sync_status": self.settings.enable_sync_status,
		}

	def tearDown(self):
		frappe.set_user("Administrator")
		for user in self.created_users:
			if frappe.db.exists("User", user):
				frappe.delete_doc("User", user, force=1, ignore_permissions=True)
		super().tearDown()

	def test_accounts_user_can_read_dashboard_metrics(self):
		user = self._make_user("accounts.user", ["Accounts User"])

		with patch.object(invoices, "_call_api_safe", return_value=([{"totalAmount": 125.5, "taxAmount": 18.83}], None)):
			frappe.set_user(user)
			self.assertEqual(invoices.get_today_branch_sales(), 125.5)

	def test_accounts_user_cannot_access_settings(self):
		user = self._make_user("accounts.user.settings", ["Accounts User"])

		frappe.set_user(user)
		self.assertRaises(frappe.PermissionError, invoices.get_settings)

	def test_accounts_manager_can_update_settings(self):
		user = self._make_user("accounts.manager", ["Accounts Manager"])

		frappe.set_user(user)
		result = invoices.save_settings(**self.settings_payload)
		self.assertEqual(result, {"success": True})

	def test_unprivileged_desk_user_cannot_read_dashboard_metrics(self):
		user = self._make_user("desk.user", [])

		with patch.object(invoices, "_call_api_safe", return_value=([{"totalAmount": 125.5, "taxAmount": 18.83}], None)):
			frappe.set_user(user)
			self.assertRaises(frappe.PermissionError, invoices.get_today_branch_sales)

	def test_accounts_user_cannot_access_journal_entry_helpers(self):
		user = self._make_user("accounts.user.je", ["Accounts User"])

		frappe.set_user(user)
		self.assertRaises(frappe.PermissionError, invoices.get_companies_for_je)

	def _make_user(self, prefix: str, roles: list[str]) -> str:
		email = f"zatca-perm-{prefix}@example.com"
		if frappe.db.exists("User", email):
			user = frappe.get_doc("User", email)
		else:
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": email,
					"first_name": prefix,
					"enabled": 1,
					"user_type": "System User",
					"send_welcome_email": 0,
				}
			)
		assigned_roles = ["Desk User", *roles]
		user.set("roles", [{"role": role} for role in assigned_roles])
		user.save(ignore_permissions=True)
		if email not in self.created_users:
			self.created_users.append(email)
		return email