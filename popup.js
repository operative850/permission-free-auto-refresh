const $ = (id) => document.getElementById(id);

const UNITS = {
  s: { ms: 1000, one: "second", many: "seconds" },
  m: { ms: 60000, one: "minute", many: "minutes" },
  h: { ms: 3600000, one: "hour", many: "hours" },
  d: { ms: 86400000, one: "day", many: "days" }
};

const ICONS = {
  sun: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/></svg>',
  moon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/></svg>',
  go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7M9 7h8v8"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>'
};

let unit = "s";
let tabId = null;
let windowId = null;
let timers = {};
let tabInfo = {};

// ---------- storage helpers (localStorage needs no permission) ----------
function load(key, fallback) {
  try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
}
function save(key, value) {
  try { localStorage.setItem(key, value); } catch (e) {}
}

// ---------- formatting ----------
function longTime(ms) {
  let s = Math.max(0, Math.ceil(ms / 1000));
  const d = Math.floor(s / 86400); s %= 86400;
  const h = Math.floor(s / 3600); s %= 3600;
  const m = Math.floor(s / 60); s %= 60;
  const parts = [];
  if (d) parts.push(d + "d");
  if (h) parts.push(h + "h");
  if (m) parts.push(m + "m");
  if (s || parts.length === 0) parts.push(s + "s");
  return parts.slice(0, 2).join(" ");
}

// ---------- theme ----------
function paintThemeButton() {
  const light = document.documentElement.dataset.theme === "light";
  $("theme").innerHTML = light ? ICONS.moon : ICONS.sun;
  $("theme").title = light ? "Switch to dark mode" : "Switch to light mode";
}
$("theme").addEventListener("click", () => {
  const light = document.documentElement.dataset.theme !== "light";
  if (light) document.documentElement.dataset.theme = "light";
  else delete document.documentElement.dataset.theme;
  save("theme", light ? "light" : "dark");
  paintThemeButton();
});

// ---------- unit picker ----------
function setUnit(u) {
  unit = u;
  document.querySelectorAll("#units button").forEach((b) => b.classList.toggle("on", b.dataset.u === u));
  const v = parseFloat($("value").value);
  $("unitWord").textContent = v === 1 ? UNITS[u].one : UNITS[u].many;
}
$("units").addEventListener("click", (e) => {
  const b = e.target.closest("button");
  if (b) setUnit(b.dataset.u);
});
$("value").addEventListener("input", () => setUnit(unit));

// Pick the largest unit that divides the interval evenly.
function fillFrom(ms) {
  for (const u of ["d", "h", "m", "s"]) {
    if (ms % UNITS[u].ms === 0) {
      $("value").value = ms / UNITS[u].ms;
      setUnit(u);
      return;
    }
  }
  $("value").value = Math.round(ms / 1000);
  setUnit("s");
}

// ---------- talking to the background worker ----------
async function send(msg) {
  timers = (await chrome.runtime.sendMessage({ ...msg })) || {};
  // Tab index and window are readable without the tabs permission.
  // Titles and URLs are not, so tabs are labeled by position.
  tabInfo = {};
  await Promise.all(Object.keys(timers).map((id) =>
    chrome.tabs.get(Number(id))
      .then((t) => { tabInfo[id] = { index: t.index, windowId: t.windowId }; })
      .catch(() => {})
  ));
  render();
}

// ---------- rendering ----------
function render() {
  const cur = timers[tabId];
  const now = Date.now();

  $("status").classList.toggle("running", !!cur);
  $("statusText").textContent = cur
    ? "Every " + longTime(cur.interval) + "  ·  next in " + longTime(cur.next - now)
    : "Not running on this tab";
  $("start").textContent = cur ? "Update timer" : "Start refreshing this tab";
  $("stop").classList.toggle("hidden", !cur);

  const ids = Object.keys(timers);
  $("activeWrap").classList.toggle("hidden", ids.length === 0);
  $("activeLabel").textContent = "Active tabs (" + ids.length + ")";

  const list = $("list");
  list.innerHTML = "";
  ids
    .sort((a, b) => (tabInfo[a]?.index ?? 0) - (tabInfo[b]?.index ?? 0))
    .forEach((id) => {
      const t = timers[id];
      const info = tabInfo[id] || {};
      const isThis = Number(id) === tabId;
      const otherWin = info.windowId !== undefined && info.windowId !== windowId;

      const row = document.createElement("div");
      row.className = "row";
      row.innerHTML =
        '<div class="meta">' +
          '<div class="name"></div>' +
          '<div class="sub"></div>' +
        "</div>" +
        (isThis ? "" : '<button class="icon-btn go" title="Go to tab">' + ICONS.go + "</button>") +
        '<button class="icon-btn stop" title="Stop">' + ICONS.stop + "</button>";

      const name = row.querySelector(".name");
      name.textContent = "Tab " + ((info.index ?? 0) + 1);
      if (isThis || otherWin) {
        const tag = document.createElement("em");
        tag.textContent = isThis ? "this tab" : "other window";
        name.appendChild(tag);
      }
      row.querySelector(".sub").textContent =
        "every " + longTime(t.interval) + "  ·  next " + longTime(t.next - now).split(" ")[0] +
        "  ·  " + t.count + " refresh" + (t.count === 1 ? "" : "es");

      const go = row.querySelector(".go");
      if (go) go.addEventListener("click", async () => {
        await chrome.tabs.update(Number(id), { active: true });
        if (info.windowId !== undefined) await chrome.windows.update(info.windowId, { focused: true });
        window.close();
      });
      row.querySelector(".stop").addEventListener("click", () => send({ type: "stop", tabId: Number(id) }));
      list.appendChild(row);
    });
}

// ---------- actions ----------
$("start").addEventListener("click", () => {
  const v = parseFloat($("value").value);
  const ms = Math.round(v * UNITS[unit].ms);
  if (!(ms >= 1000)) {
    $("err").textContent = "Set at least 1 second";
    $("err").classList.remove("hidden");
    return;
  }
  $("err").classList.add("hidden");
  save("unit", unit);
  save("value", String(v));
  send({ type: "start", tabId, interval: ms });
});
$("stop").addEventListener("click", () => send({ type: "stop", tabId }));
$("stopAll").addEventListener("click", () => send({ type: "stopAll" }));

// ---------- init ----------
(async () => {
  paintThemeButton();
  $("value").value = load("value", "30");
  setUnit(load("unit", "s"));

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  tabId = tab.id;
  windowId = tab.windowId;

  await send({ type: "get" });
  if (timers[tabId]) fillFrom(timers[tabId].interval);
  setInterval(render, 1000);
})();
