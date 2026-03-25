# ZATCA Dashboard

Professional ZATCA Invoice Dashboard for Frappe 15.

Displays today / week / month / year sales KPIs pulled from the ZATCA export API with period-over-period comparisons. Built with Vue 3 + Frappe UI.

## Requirements

- Frappe v15
- ERPNext v15
- Python 3.10+

This app includes runtime frontend bundles under `zatca_dashboard/public/dist`, so it can run on a fresh system immediately after installation without requiring a frontend build first.

## Installation

```bash
cd $PATH_TO_YOUR_BENCH
bench get-app $URL_OF_THIS_REPO --branch main
bench --site YOUR_SITE install-app zatca_dashboard
bench build --app zatca_dashboard
bench --site YOUR_SITE clear-cache
```

If you later modify files inside `frontend/`, rebuild the Vue bundle manually:

```bash
cd apps/zatca_dashboard/frontend
yarn install
yarn build
cd ../..
bench build --app zatca_dashboard
```

## Permissions

The app now enforces role-based access in both metadata and backend APIs.

| Area | Allowed roles |
| --- | --- |
| ZATCA dashboard page | System Manager, Accounts Manager, Accounts User |
| Sales monitor page | System Manager, Accounts Manager |
| Dashboard/invoice read APIs | System Manager, Accounts Manager, Accounts User |
| Settings read/write APIs | System Manager, Accounts Manager |
| Journal entry helper APIs | System Manager, Accounts Manager |

Notes:

- `Accounts User` can view ZATCA dashboard data, invoice metrics, and branch status.
- `Accounts User` cannot open settings APIs or sales-monitor journal-entry helpers.
- `Accounts Manager` can view and update ZATCA settings and use the sales-monitor accounting helpers.
- `System Manager` retains full access.
- Sensitive write operations no longer use `ignore_permissions=True`, so Frappe document permissions are enforced during settings updates and journal entry creation.
