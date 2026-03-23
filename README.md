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
