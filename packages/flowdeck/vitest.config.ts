import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fsModuleCachePath: "node_modules/.vitest-cache",
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
  },
});
