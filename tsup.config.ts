// tsup.config.ts
import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  outDir: "dist",
  format: ["esm"],
  target: "node18",
  splitting: false,
  clean: true,
  dts: false,
});
