import type { Config } from "tailwindcss";

const config: Config = {
  // Force light mode unless you explicitly add a `.dark` class somewhere.
  // This prevents OS-level dark mode from changing the UI.
  darkMode: "class",
  content: ["./src/**/*.{js,jsx,ts,tsx,mdx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

export default config;

