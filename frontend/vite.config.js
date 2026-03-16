import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";

export default defineConfig({
	plugins: [vue()],
	resolve: {
		alias: {
			"@": path.resolve(__dirname, "src"),
		},
	},
	define: {
		// frappe-ui and some deps reference process.env.NODE_ENV at runtime
		"process.env.NODE_ENV": JSON.stringify("production"),
		"process.env": "{}",
	},
	build: {
		outDir: "../zatca_dashboard/public/dist",
		emptyOutDir: true,
		cssCodeSplit: false,
		lib: {
			entry: path.resolve(__dirname, "src/main.js"),
			formats: ["iife"],
			name: "ZATCADashboard",
			fileName: () => "zatca.bundle.js",
		},
		rollupOptions: {
			output: {
				assetFileNames: (info) =>
					info.name === "style.css" ? "zatca.bundle.css" : "[name][extname]",
			},
		},
	},
});
