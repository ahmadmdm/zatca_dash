app_name = "zatca_dashboard"
app_title = "ZATCA Dashboard"
app_publisher = "Ahmad"
app_description = "Professional ZATCA Invoice Dashboard for Frappe 15"
app_email = "info@ideaorbit.net"
app_license = "MIT"
app_version = "1.0.0"

required_apps = ["frappe"]

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
