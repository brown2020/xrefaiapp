import js from "@eslint/js";
import nextPlugin from "@next/eslint-plugin-next";
import reactHooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";

/**
 * ESLint 10 flat config.
 *
 * We deliberately DO NOT pull in `eslint-config-next` because that package
 * bundles `eslint-plugin-react@7.x` which is not yet compatible with
 * ESLint 10 (see vercel/next.js#89764, jsx-eslint/eslint-plugin-react#3977).
 *
 * Instead we compose the bits we actually want directly:
 *  - `@eslint/js` recommended          — baseline JS rules.
 *  - `typescript-eslint` recommended   — TS-aware rules (ESLint 10 compatible).
 *  - `@next/eslint-plugin-next` core-web-vitals — Next-specific rules only.
 *  - `eslint-plugin-react-hooks` v7    — hooks rules (ESLint 10 compatible).
 *
 * `eslint-plugin-react-hooks@7` ships many new React-Compiler-oriented
 * rules (`purity`, `set-state-in-effect`, `preserve-manual-memoization`,
 * etc.) via `configs.recommended`. This project does NOT use React
 * Compiler, so those rules generate noise on standard patterns (SSR-safe
 * `setIsClient(true)` in a mount effect, reset-on-uid-change, etc.).
 * We keep only the two classic, broadly-accepted hooks rules here.
 */
export default tseslint.config(
  {
    ignores: [
      ".next/**",
      "out/**",
      "node_modules/**",
      "coverage/**",
      "next-env.d.ts",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "@next/next": nextPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs["core-web-vitals"].rules,
      // Only the two classic hooks rules (works with or without Compiler).
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
  {
    languageOptions: {
      globals: {
        // Node globals used in server code.
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        fetch: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        Request: "readonly",
        Response: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        crypto: "readonly",
        Blob: "readonly",
        FormData: "readonly",
        // Browser globals used in client code.
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        navigator: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLSelectElement: "readonly",
        HTMLFormElement: "readonly",
        HTMLDivElement: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        MessageEvent: "readonly",
        StorageEvent: "readonly",
        Event: "readonly",
        EventTarget: "readonly",
        Node: "readonly",
        Image: "readonly",
        File: "readonly",
        ChangeEvent: "readonly",
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Small number of places use `any` for Firestore/admin SDK generics.
      "@typescript-eslint/no-explicit-any": "warn",
      "no-empty": ["warn", { allowEmptyCatch: true }],
    },
  }
);
