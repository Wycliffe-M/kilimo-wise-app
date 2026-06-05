import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    base: "/kilimo-wise-app/",
  },
  tanstackStart: {
    server: { entry: "server" },
  },
});
