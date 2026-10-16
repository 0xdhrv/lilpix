import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, lazyPlugins } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    sortPackageJson: true,
    ignorePatterns: ["dist/**", "node_modules/**", "public/anatomy/**", "figures/anatomy/kit/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", "node_modules/**", "public/anatomy/**", "figures/anatomy/kit/**"],
    plugins: ["react", "typescript", "oxc", "import"],
    categories: { correctness: "error" },
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
  plugins: lazyPlugins(() => [
    react(),
    tailwindcss(),
    {
      // The page sweep (src/sweep.ts) must be listening before first render.
      // Vite drops blocking="render" from entry scripts on build; put it back.
      name: "render-blocking-entry",
      apply: "build",
      transformIndexHtml: {
        order: "post",
        handler: (html) =>
          html.replace(/<script type="module" crossorigin/g, '$& blocking="render"'),
      },
    },
  ]),
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
