import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Pruebas de la lógica pura del CRM (sin interfaz ni navegador).
 * Comando: `bun run test`.
 */
export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
