import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const required = [
  "index.html", "experiences.html", "trips.html", "nearby-map.html",
  "profile.html", "businesses.html", "manifest.webmanifest", "sw.js",
  "register-sw.js", "rev-app-icon.svg", "rev-auth-guard.js", "rev-app-mode.js", "tow-driver.html", "rev-mobile-theme.css"
];
const failures = [];
const htmlFiles = fs.readdirSync(root).filter(file => file.endsWith(".html"));

for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) failures.push("Missing required file: " + file);
}

let linksChecked = 0;
for (const file of htmlFiles) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  if (file === "index.html") {
    if (!source.includes('dir="rtl"')) failures.push("index.html: missing RTL direction");
    if (!source.includes('name="viewport"')) failures.push("index.html: missing viewport metadata");
    if (!source.includes('src="./register-sw.js"')) failures.push("index.html: service worker registration script missing");
  }

  const hrefs = [...source.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)].map(match => match[1].trim());
  for (const href of hrefs) {
    if (!href || href.startsWith("#") || /^(?:https?:|mailto:|tel:|javascript:|data:|blob:)/i.test(href)) continue;
    const pathname = href.split(/[?#]/, 1)[0];
    if (!pathname) continue;
    let decoded;
    try { decoded = decodeURIComponent(pathname); }
    catch { failures.push(file + ": malformed encoded link: " + href); continue; }
    const target = path.resolve(root, decoded);
    if (target !== root && !target.startsWith(root + path.sep)) {
      failures.push(file + ": local link escapes repository: " + href);
    } else if (!fs.existsSync(target)) {
      failures.push(file + ": broken local link: " + href);
    }
    linksChecked++;
  }

  const scripts = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
  let scriptIndex = 0;
  for (const match of scripts) {
    if (/\bsrc\s*=/.test(match[1])) continue;
    if (/\btype\s*=\s*["'](?:application\/json|application\/ld\+json|importmap)["']/i.test(match[1])) continue;
    const body = match[2].trim();
    if (!body) continue;
    try {
      new vm.Script(body, { filename: file + ":inline-script-" + (++scriptIndex) });
    } catch (error) {
      failures.push("JavaScript syntax error in " + file + ": " + error.message);
    }
  }
}

try {
  const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
  if (manifest.scope !== "./" || manifest.start_url !== "./index.html") {
    failures.push("PWA scope/start URL must stay inside this repository");
  }
} catch (error) {
  failures.push("Invalid manifest.webmanifest: " + error.message);
}

const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
if (!sw.includes('url.pathname.includes("/api/")') || sw.includes("cache.put(request")) {
  failures.push("Unsafe broad API caching detected");
}
const profile = fs.readFileSync(path.join(root, "profile.html"), "utf8");
if (profile.includes('register("./service-worker.js")')) {
  failures.push("profile.html references missing service-worker.js instead of sw.js");
}
const guard = fs.readFileSync(path.join(root, "rev-auth-guard.js"), "utf8");
if (!guard.includes("showConnectionError") || !guard.includes("10000")) {
  failures.push("Authentication guard must provide a timeout and visible recovery state");
}
if (!guard.split("\n").some(line => line.trim().startsWith("if (path === 'index.html'") &&
    line.includes("path === 'tow-driver.html'"))) {
  failures.push("Auth guard bypass must be executable code, not text inside a comment");
}


const tripPlannerPage = fs.readFileSync(path.join(root, "trips.html"), "utf8");
if (!tripPlannerPage.includes("https://mojtabaalimi64-cloud.github.io/rev/trip.html") ||
    !tripPlannerPage.includes("searchParams.set('from','rev-mobile')")) {
  failures.push("Mobile trip planner must hand off to the full EV planner with a return marker");
}
const mapPage = fs.readFileSync(path.join(root, "nearby-map.html"), "utf8");
if (!mapPage.includes("revChargingStopsLayer") || !mapPage.includes("plan.stops")) {
  failures.push("Mobile navigation map must render saved EV charging stops");
}

const towPage = fs.readFileSync(path.join(root, "tow-driver.html"), "utf8");
if (!towPage.includes("function shiftCall(on)") ||
    !towPage.includes("if(onShift){startPolling()}") ||
    !towPage.includes("shiftCall(!onShift)")) {
  failures.push("Tow-driver shift must start polling only after server confirmation");
}
if (!sw.includes('"./nearby-map.html"') || !sw.includes('"./profile.html"') ||
    !sw.includes("rev-mobile-shell-v76")) {
  failures.push("Service-worker shell must include core mobile pages and use a fresh cache version");
}
if (!mapPage.includes('id="details-drag-handle"') ||
    !mapPage.includes("rev-details-expanded") ||
    !mapPage.includes("bottom:calc(74px + env(safe-area-inset-bottom))")) {
  failures.push("Mobile map details must use an accessible, expandable bottom drawer");
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("REV mobile checks passed; " + required.length + " required files; " + htmlFiles.length + " HTML pages parsed; " + linksChecked + " local links checked.");
