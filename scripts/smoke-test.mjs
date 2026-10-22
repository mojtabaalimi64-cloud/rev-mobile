import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.cwd();
const required = [
  "index.html", "experiences.html", "trips.html", "nearby-map.html",
  "profile.html", "businesses.html", "manifest.webmanifest", "sw.js",
  "register-sw.js", "rev-app-icon.svg", "rev-auth-guard.js", "rev-app-mode.js", "tow-driver.html", "rev-mobile-theme.css", "energy-assistant.html", "rev-energy-core.js", "rev-energy-map.js"
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
    !sw.includes("rev-mobile-shell-v78") || !sw.includes('"./energy-assistant.html"') || !sw.includes('"./rev-energy-core.js"')) {
  failures.push("Service-worker shell must include core mobile pages and use a fresh cache version");
}
if (!mapPage.includes('id="details-drag-handle"') ||
    !mapPage.includes("rev-details-expanded") ||
    !mapPage.includes("bottom:calc(74px + env(safe-area-inset-bottom))")) {
  failures.push("Mobile map details must use an accessible, expandable bottom drawer");
}

const energyPage = fs.readFileSync(path.join(root, "energy-assistant.html"), "utf8");
const energyMap = fs.readFileSync(path.join(root, "rev-energy-map.js"), "utf8");
const energyContext = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "rev-energy-core.js"), "utf8"), energyContext);
const energy = energyContext.REVEnergy;
if (!energy || energy.version !== "1.0.0" || !energyPage.includes('id="calculate"') ||
    !energyPage.includes("rev-energy-core.js") || !energyMap.includes("revEnergyLaunch") ||
    !mapPage.includes("rev-energy-map.js") || !energyPage.includes("./rev-auth-guard.js") || !energyPage.includes("resumeNav=1") || !mapPage.includes("rev_energy_resume_route_v1") || !energyMap.includes("function resumeNavigation()")) {
  failures.push("REV energy assistant is not fully connected to its shared core and navigation entry point");
}
try {
  const result = energy.calculate({capacityKwh:60,soc:80,consumption:18,distanceKm:100,reserveSoc:15,factor:1});
  if (Math.abs(result.energyKwh-18)>1e-9 || Math.abs(result.arrivalSoc-50)>1e-9 ||
      Math.abs(result.totalRangeKm-(60*80/100/18*100))>1e-9 || result.reachable !== true) {
    failures.push("REV energy calculation regression: expected 18 kWh, 50% arrival SOC and reachable route");
  }
  const unsafe = energy.calculate({capacityKwh:40,soc:30,consumption:25,distanceKm:50,reserveSoc:15,factor:1});
  if (unsafe.reachable !== false || unsafe.arrivalSoc >= 15) {
    failures.push("REV energy calculation must flag routes below the selected reserve");
  }
  let rejected = false;
  try { energy.calculate({capacityKwh:0,soc:80,consumption:18,distanceKm:10,reserveSoc:15,factor:1}); } catch (_) { rejected = true; }
  if (!rejected) failures.push("REV energy calculation must reject invalid battery capacity");
} catch (error) {
  failures.push("REV energy calculation tests threw: " + error.message);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("REV mobile checks passed; " + required.length + " required files; " + htmlFiles.length + " HTML pages parsed; " + linksChecked + " local links checked.");
