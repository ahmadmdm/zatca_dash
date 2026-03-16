import { createApp } from "vue";
import App from "./App.vue";
import router from "./router";

function mount(target) {
	const el =
		typeof target === "string" ? document.querySelector(target) : target;
	if (!el) throw new Error("ZATCADashboard: mount target not found");
	const app = createApp(App);
	app.use(router);
	app.mount(el);
	return app;
}

window.ZATCADashboard = { mount };
export { mount };
