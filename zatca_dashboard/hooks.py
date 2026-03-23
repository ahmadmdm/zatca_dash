from . import __version__ as app_version


app_name = "zatca_dashboard"
app_title = "ZATCA Dashboard"
app_publisher = "Ahmad"
app_description = "Professional ZATCA Invoice Dashboard for Frappe 15"
app_email = "info@ideaorbit.net"
app_license = "MIT"

required_apps = ["frappe/erpnext"]

fixtures = [
	{
		"dt": "Number Card",
		"filters": [["name", "in", ["Today's Branch Sales", "Today's Branch Invoices"]]],
	},
]

scheduler_events = {
    "hourly": [
        "zatca_dashboard.api.alerts.run_zatca_alerts",
    ],
}

add_to_apps_screen = [
	{
		"name": "zatca_dashboard",
		"logo": "/assets/zatca_dashboard/images/logo.svg",
		"title": "ZATCA Dashboard",
		"route": "/app/zatca-dashboard",
	}
]
