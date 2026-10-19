import fs from "node:fs";
import path from "node:path";
const root = process.cwd();
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const required = ["index.html", "experiences.html", "trips.html", "nearby-map.html", "manifest.webmanifest", "sw.js", "register-sw.js", "rev-app-icon.svg"];
const failures = [];
for (const file of required) if (!fs.existsSync(path.join(root, file))) failures.push("Missing: " + file);
const hrefs = [...html.matchAll(/\bhref\s*=\s*["']([^"'#]+)["']/gi)].map(m => m[1]);
for (const href of hrefs) {
  if (/^https:\/\//i.test(href)) continue;
  const target = path.resolve(root, href.split("?")[0]);
  if (!target.startsWith(root + path.sep) && target !== root) failures.push("Local link escapes repository: " + href);
  else if (!fs.existsSync(target)) failures.push("Broken local link: " + href);
}
if (!html.includes('dir="rtl"')) failures.push("Missing RTL direction");
if (!html.includes('name="viewport"')) failures.push("Missing viewport");
if (!html.includes('src="./register-sw.js"')) failures.push("Service worker registration script missing");
const vm = require("node:vm");
for (const file of ["experiences.html", "trips.html", "nearby-map.html"]) {
  const source = fs.readFileSync(path.join(root, file), "utf8");
  const scripts = [...source.matchAll(/<script\\b([^>]*)>([\\s\\S]*?)<\\/script>/gi)];
  let index = 0;
  for (const match of scripts) {
    if (/\\bsrc\\s*=/.test(match[1])) continue;
    const body = match[2].trim();
    if (!body) continue;
    try { new vm.Script(body, { filename: file + ":inline-script-" + (++index) }); }
    catch (error) { failures.push("JavaScript syntax error in " + file + ": " + error.message); }
  }
}
const manifest = JSON.parse(fs.readFileSync(path.join(root, "manifest.webmanifest"), "utf8"));
if (manifest.scope !== "./" || manifest.start_url !== "./index.html") failures.push("PWA scope/start URL must stay inside this repository");
const sw = fs.readFileSync(path.join(root, "sw.js"), "utf8");
if (!sw.includes('url.pathname.includes("/api/")') || sw.includes("cache.put(request")) failures.push("Unsafe broad API caching detected");
if (failures.length) { console.error(failures.join("\n")); process.exit(1); }
console.log("REV mobile checks passed; " + required.length + " required files; " + hrefs.length + " links checked.");
