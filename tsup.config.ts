import { defineConfig } from "tsup";

// `{ resolve: true }` makes dts worker errors fatal (Phase 3 Item 8).
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: { resolve: true },
  clean: true,
  sourcemap: true,
});
