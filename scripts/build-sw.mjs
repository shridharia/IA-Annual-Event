import { readFileSync, writeFileSync } from "node:fs";
import { execSync } from "node:child_process";
let build = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8);
if (!build) { try { build = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch { build = "dev"; } }
build += "-" + Date.now().toString(36);
const src = readFileSync(new URL("./sw.template.js", import.meta.url), "utf8");
writeFileSync(new URL("../public/sw.js", import.meta.url), src.replaceAll("__BUILD__", build));
console.log("sw.js built:", build);
