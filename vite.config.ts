import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";
import { sample } from "./mock/plugin";

export default defineConfig({
  base: "./",
  plugins: [svelte(), sample()],
});
