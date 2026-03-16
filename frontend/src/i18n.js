/**
 * Lightweight i18n composable.
 * Detects Frappe system language and returns translated strings + locale-aware helpers.
 */

const translations = {
	ar: {
		// Nav
		dashboard: "لوحة التحكم",
		invoices:  "الفواتير",
		branches:  "الفروع",
		settings:  "الإعدادات",
		// Common
		refresh:     "تحديث",
		loading:     "جارٍ التحميل...",
		saving:      "جارٍ الحفظ...",
		testing:     "جارٍ الاختبار...",
		lastUpdated: "آخر تحديث",
		cancel:      "إلغاء",
		// KPI labels
		sar:        "ر.س",
		comparedTo: "مقارنةً بـ",
		invoice:    "فاتورة",
		average:    "متوسط",
		tax:        "ضريبة",
		// Dashboard
		salesComparison:   "المبيعات والمقارنة",
		comparedToPrev:    "مقارنةً بالفترة السابقة",
		currentPeriod:     "الفترة الحالية",
		previousPeriod:    "الفترة السابقة",
		branchStatus:      "حالة الفروع",
		connected:         "متصل",
		disconnected:      "غير متصل",
		allConnected:      "جميعها متصلة",
		someDisconnected:  "بعضها غير متصل",
		recentInvoices:    "أحدث الفواتير",
		last10:            "آخر 10 فواتير مرسلة للهيئة",
		viewAll:           "عرض الكل ←",
		noInvoices:        "لا توجد فواتير",
		// Period tabs
		weekTab:    "أسبوع",
		monthTab:   "شهر",
		quarterTab: "ربع سنة",
		yearTab:    "سنة",
		// Table headers
		invoiceNo:   "رقم الفاتورة",
		dateTime:    "التاريخ والوقت",
		date:        "التاريخ",
		branch:      "الفرع",
		amount:      "المبلغ",
		totalAmount: "المبلغ الإجمالي",
		taxAmount:   "الضريبة",
		netAmount:   "الصافي",
		status:      "الحالة",
		// Relative time
		now:         "الآن",
		minutesAgo:  (n) => `منذ ${n} دقيقة`,
		hoursAgo:    (h) => `منذ ${h} ساعة`,
		daysAgo:     (d) => `منذ ${d} يوم`,
		notSyncedYet: "لم يتزامن بعد",
		// User / sidebar
		adminFallback: "المدير",
		role:          "مدير النظام",
		// Status labels
		REPORTED: "مُبلَّغ",
		CLEARED:  "مُعتمد",
		FAILED:   "فشل",
		REJECTED: "مرفوض",
		PENDING:  "بانتظار",
		SIGNED:   "موقّع",
		// BranchStatus page
		autoRefresh:    "يتجدد تلقائياً كل دقيقة",
		totalBranches:  "إجمالي الفروع",
		allBranchesOk:  "جميع الفروع متصلة ✓",
		noBranchesOk:   "جميع الفروع منقطعة ✗",
		xOfY:           (c, tot) => `${c} من ${tot} متصل`,
		noBranchData:   "لا توجد بيانات فروع",
		checkSettings:  "تأكد من تفعيل مزامنة الحالة في الإعدادات",
		connectionLabel: "اتصال",
		// InvoiceList page
		showingOf:    (shown, total) => `عرض ${shown} من أصل ${total} فاتورة`,
		allBranches:  "كل الفروع",
		allStatuses:  "كل الحالات",
		search:       "بحث",
		reset:        "إعادة",
		fromDate:     "من تاريخ",
		toDate:       "إلى تاريخ",
		maxRecords:   "الحد الأقصى",
		records:      (n) => `${n} سجل`,
		totalInvoices: "إجمالي الفواتير",
		totalSales:    "إجمالي المبيعات · ر.س",
		totalTax:      "إجمالي الضريبة · ر.س",
		reportedCleared: "مُبلَّغ / مُعتمد",
		failedRejected:  "فشل / مرفوض",
		customer:       "العميل",
		itemCount:      "عدد الأصناف",
		paymentMethod:  "طريقة الدفع",
		invoiceType:    "نوع الفاتورة",
		zatcaStatus:    "حالة ZATCA",
		invoiceItems:   "أصناف الفاتورة",
		item:           "الصنف",
		qty:            "الكمية",
		price:          "السعر",
		total:          "الإجمالي",
		noInvoicesTitle: "لا توجد فواتير",
		noInvoicesSub:   "جرّب تغيير الفلاتر أو توسيع نطاق التاريخ",
		// Settings page
		settingsTitle:    "الإعدادات",
		settingsSubtitle: "إعداد الاتصال بواجهة برمجة ZATCA",
		apiSettings:      "إعدادات API",
		baseUrl:          "رابط الخادم (Base URL)",
		baseUrlHint:      "رابط نظام ZATCA الخاص بك",
		apiKey:           "مفتاح API",
		keySaved:         "تم الحفظ",
		keyPlaceholderExisting: "••••••••••• (اتركه فارغاً للإبقاء على القديم)",
		keyPlaceholderNew:      "أدخل مفتاح API الخاص بك",
		keyHint:          "المفتاح مخزّن ومشفّر على الخادم ولا يُرسل إلى المتصفح أبداً",
		advancedOptions:  "خيارات متقدمة",
		defaultLimit:     "الحد الأقصى الافتراضي للسجلات",
		limitHint:        "الحد الأقصى لعدد الفواتير في كل طلب API (1000 كحد أعلى)",
		enableSync:       "تفعيل حالة المزامنة",
		enableSyncHint:   "جلب بيانات اتصال الفروع (يُبطئ الطلبات قليلاً)",
		saveSettings:     "حفظ الإعدادات",
		testConnection:   "اختبار الاتصال",
		testConnectionNow: "اختبار الاتصال الآن",
		testDesc:         "اضغط الزر لاختبار الاتصال بواجهة API. ستُستخدم القيم المدخلة أعلاه (أو المفتاح المحفوظ إن لم تُدخل مفتاحاً جديداً).",
		infoTitle:        "معلومات",
		infoKeySecurity:  "أمان المفتاح",
		infoKeyBody:      "يُخزَّن مفتاح API مشفراً في قاعدة البيانات ولا يصل إلى المتصفح أبداً.",
		infoParallel:     "طلبات متوازية",
		infoParallelBody: "لوحة التحكم تُنفّذ حتى 8 طلبات API بالتوازي لسرعة أعلى.",
		infoAutoRefresh:  "تحديث تلقائي",
		infoAutoRefreshBody: "تتجدد بيانات لوحة الفروع كل 60 ثانية تلقائياً.",
		// Settings error/success messages
		errLoadSettings:  (e) => `خطأ في تحميل الإعدادات: ${e}`,
		errNoUrl:         "يرجى إدخال رابط API",
		errSaveFailed:    (e) => `فشل الحفظ: ${e}`,
		successSaved:     "تم حفظ الإعدادات بنجاح ✓",
	},

	en: {
		// Nav
		dashboard: "Dashboard",
		invoices:  "Invoices",
		branches:  "Branches",
		settings:  "Settings",
		// Common
		refresh:     "Refresh",
		loading:     "Loading...",
		saving:      "Saving...",
		testing:     "Testing...",
		lastUpdated: "Last updated",
		cancel:      "Cancel",
		// KPI labels
		sar:        "SAR",
		comparedTo: "vs",
		invoice:    "Invoices",
		average:    "Average",
		tax:        "Tax",
		// Dashboard
		salesComparison:   "Sales & Comparison",
		comparedToPrev:    "vs previous period",
		currentPeriod:     "Current Period",
		previousPeriod:    "Previous Period",
		branchStatus:      "Branch Status",
		connected:         "Connected",
		disconnected:      "Disconnected",
		allConnected:      "All Connected",
		someDisconnected:  "Some Disconnected",
		recentInvoices:    "Recent Invoices",
		last10:            "Last 10 invoices submitted to ZATCA",
		viewAll:           "View All →",
		noInvoices:        "No invoices found",
		// Period tabs
		weekTab:    "Week",
		monthTab:   "Month",
		quarterTab: "Quarter",
		yearTab:    "Year",
		// Table headers
		invoiceNo:   "Invoice No.",
		dateTime:    "Date & Time",
		date:        "Date",
		branch:      "Branch",
		amount:      "Amount",
		totalAmount: "Total",
		taxAmount:   "Tax",
		netAmount:   "Net",
		status:      "Status",
		// Relative time
		now:         "Just now",
		minutesAgo:  (n) => `${n}m ago`,
		hoursAgo:    (h) => `${h}h ago`,
		daysAgo:     (d) => `${d}d ago`,
		notSyncedYet: "Never synced",
		// User / sidebar
		adminFallback: "Admin",
		role:          "System Manager",
		// Status labels
		REPORTED: "Reported",
		CLEARED:  "Cleared",
		FAILED:   "Failed",
		REJECTED: "Rejected",
		PENDING:  "Pending",
		SIGNED:   "Signed",
		// BranchStatus page
		autoRefresh:    "Auto-refreshes every minute",
		totalBranches:  "Total Branches",
		allBranchesOk:  "All branches connected ✓",
		noBranchesOk:   "All branches disconnected ✗",
		xOfY:           (c, tot) => `${c} of ${tot} connected`,
		noBranchData:   "No branch data",
		checkSettings:  "Make sure connection status sync is enabled in Settings",
		connectionLabel: "Connected",
		// InvoiceList page
		showingOf:    (shown, total) => `Showing ${shown} of ${total} invoices`,
		allBranches:  "All Branches",
		allStatuses:  "All Statuses",
		search:       "Search",
		reset:        "Reset",
		fromDate:     "From Date",
		toDate:       "To Date",
		maxRecords:   "Max Records",
		records:      (n) => `${n} records`,
		totalInvoices: "Total Invoices",
		totalSales:    "Total Sales · SAR",
		totalTax:      "Total Tax · SAR",
		reportedCleared: "Reported / Cleared",
		failedRejected:  "Failed / Rejected",
		customer:       "Customer",
		itemCount:      "Items",
		paymentMethod:  "Payment Method",
		invoiceType:    "Invoice Type",
		zatcaStatus:    "ZATCA Status",
		invoiceItems:   "Invoice Items",
		item:           "Item",
		qty:            "Qty",
		price:          "Price",
		total:          "Total",
		noInvoicesTitle: "No invoices found",
		noInvoicesSub:   "Try adjusting filters or expanding the date range",
		// Settings page
		settingsTitle:    "Settings",
		settingsSubtitle: "Configure ZATCA API connection",
		apiSettings:      "API Settings",
		baseUrl:          "Server URL (Base URL)",
		baseUrlHint:      "Your ZATCA system URL",
		apiKey:           "API Key",
		keySaved:         "Saved",
		keyPlaceholderExisting: "••••••••••• (leave blank to keep existing)",
		keyPlaceholderNew:      "Enter your API key",
		keyHint:          "Key is stored encrypted on the server and never sent to the browser",
		advancedOptions:  "Advanced Options",
		defaultLimit:     "Default Records Limit",
		limitHint:        "Max invoices per API request (1000 max)",
		enableSync:       "Enable connection status sync",
		enableSyncHint:   "Fetch branch connection data (slightly slows requests)",
		saveSettings:     "Save Settings",
		testConnection:   "Test Connection",
		testConnectionNow: "Test Connection Now",
		testDesc:         "Click the button to test the API connection. Values entered above will be used (or the saved key if no new key is entered).",
		infoTitle:        "Information",
		infoKeySecurity:  "Key Security",
		infoKeyBody:      "The API key is stored encrypted in the database and never reaches the browser.",
		infoParallel:     "Parallel Requests",
		infoParallelBody: "The dashboard executes up to 8 API requests in parallel for faster loading.",
		infoAutoRefresh:  "Auto Refresh",
		infoAutoRefreshBody: "Branch dashboard data refreshes every 60 seconds automatically.",
		// Settings error/success messages
		errLoadSettings:  (e) => `Error loading settings: ${e}`,
		errNoUrl:         "Please enter an API URL",
		errSaveFailed:    (e) => `Save failed: ${e}`,
		successSaved:     "Settings saved successfully ✓",
	},
};

export function useI18n() {
	const lang   = window.frappe?.boot?.lang || window.frappe?.lang || "ar";
	const isAr   = lang === "ar" || lang.startsWith("ar");
	const locale = isAr ? "ar-SA" : "en-US";
	const dict   = isAr ? translations.ar : translations.en;
	const dir    = isAr ? "rtl" : "ltr";

	/** Translate a key; falls back to the key itself */
	function t(key) {
		const val = dict[key];
		return (val != null && typeof val !== "function") ? val : key;
	}

	/** Call a function-valued translation with arguments */
	function tf(key, ...args) {
		const fn = dict[key];
		return typeof fn === "function" ? fn(...args) : key;
	}

	/** Format a number */
	function fmtNum(n) {
		if (n == null) return "—";
		return new Intl.NumberFormat(locale, {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0,
		}).format(Math.round(n));
	}

	/** Format a date-time string */
	function fmtDate(iso, opts) {
		if (!iso) return "—";
		return new Date(iso).toLocaleString(locale, opts || {
			month: "short", day: "numeric",
			hour: "2-digit", minute: "2-digit", hour12: false,
		});
	}

	/** Relative time from an ISO string */
	function relTime(iso) {
		if (!iso) return dict.notSyncedYet;
		const diff = Math.floor((Date.now() - new Date(iso)) / 60000);
		if (diff < 1)    return dict.now;
		if (diff < 60)   return dict.minutesAgo(diff);
		if (diff < 1440) return dict.hoursAgo(Math.floor(diff / 60));
		return dict.daysAgo(Math.floor(diff / 1440));
	}

	/** Map ZATCA status code → translated label */
	function statusLabel(s) {
		return dict[s] || s;
	}

	return { t, tf, isAr, dir, locale, fmtNum, fmtDate, relTime, statusLabel };
}
