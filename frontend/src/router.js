import { createRouter, createMemoryHistory } from "vue-router";
import Dashboard from "./pages/Dashboard.vue";
import InvoiceList from "./pages/InvoiceList.vue";
import BranchStatus from "./pages/BranchStatus.vue";
import Settings from "./pages/Settings.vue";

const routes = [
	{ path: "/",          component: Dashboard,    name: "dashboard" },
	{ path: "/invoices",  component: InvoiceList,  name: "invoices"  },
	{ path: "/branches",  component: BranchStatus, name: "branches"  },
	{ path: "/settings",  component: Settings,     name: "settings"  },
];

export default createRouter({
	history: createMemoryHistory(),
	routes,
});
