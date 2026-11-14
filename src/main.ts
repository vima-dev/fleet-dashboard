import { mount } from "svelte";
import App from "./App.svelte";
import "./app.css";
import { start } from "./lib/state.svelte";

start();
mount(App, { target: document.getElementById("app")! });
