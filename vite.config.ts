import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["dist/**", "node_modules/**", "public/anatomy/**", "figures/anatomy/kit/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", "public/anatomy/**", "figures/anatomy/kit/**"],
    plugins: ["react", "typescript", "oxc"],
    rules: {
      "react/rules-of-hooks": "error",
      "react/only-export-components": [
        "warn",
        {
          allowConstantExport: true,
        },
      ],
      "vite-plus/prefer-vite-plus-imports": "error",
    },
    options: {
      typeAware: true,
      typeCheck: true,
    },
    jsPlugins: [
      {
        name: "vite-plus",
        specifier: "vite-plus/oxlint-plugin",
      },
    ],
  },
  plugins: lazyPlugins(() => [react()]),
  build: {
    rolldownOptions: {
      // Two pages: the 3D app and a static about page.
      input: {
        main: "index.html",
        about: "about/index.html",
      },
    },
  },
});
