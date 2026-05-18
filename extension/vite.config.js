"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vite_1 = require("vite");
const plugin_react_1 = require("@vitejs/plugin-react");
const vite_plugin_1 = require("@crxjs/vite-plugin");
const manifest_json_1 = require("./manifest.json");
exports.default = (0, vite_1.defineConfig)({
    plugins: [
        (0, plugin_react_1.default)(),
        (0, vite_plugin_1.crx)({ manifest: manifest_json_1.default })
    ],
    build: {
        outDir: 'dist',
        sourcemap: true,
        minify: 'terser'
    },
    server: {
        port: 5173,
        hmr: {
            host: 'localhost',
            port: 5173
        }
    }
});
//# sourceMappingURL=vite.config.js.map