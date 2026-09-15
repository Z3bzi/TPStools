import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Relativ base gjør at samme build fungerer både på GitHub Pages
// (https://<bruker>.github.io/TPStools/) og på et eget domene som tstools.no.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
