// Entry for the standalone page (public/index.html, the build that runs on the
// phone): the elements come from the HTML, exactly as they did before.
//
// The site does not use this — apps/main mounts src/components/App.tsx instead.
import { mount } from "./client/main";

const root = document.querySelector<HTMLElement>("#app");
const fx = document.querySelector("#fx");
if (root && fx instanceof HTMLCanvasElement) mount(root, fx);
