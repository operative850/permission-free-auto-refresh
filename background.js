// tabId -> { interval: ms, next: timestamp, count: reloads so far }
const timers = {};
let ticker = null;

function shortTime(ms) {
  const s = Math.max(0, Math.ceil(ms / 1000));
  if (s >= 86400) return Math.floor(s / 86400) + "d";
  if (s >= 3600) return Math.floor(s / 3600) + "h";
  if (s >= 60) return Math.floor(s / 60) + "m";
  return s + "s";
}

// Runs once a second while any timer is active.
// The badge update is an extension API call. Each call resets Chrome's
// 30 second service worker idle timer, which keeps this worker alive
// without needing the alarms permission.
function tick() {
  const now = Date.now();
  for (const key of Object.keys(timers)) {
    const tabId = Number(key);
    const t = timers[key];
    if (now >= t.next) {
      t.next = now + t.interval;
      t.count++;
      chrome.tabs.reload(tabId).catch(() => stop(tabId));
    }
    chrome.action.setBadgeText({ tabId, text: shortTime(t.next - now) }).catch(() => {});
  }
}

function start(tabId, interval) {
  timers[tabId] = { interval, next: Date.now() + interval, count: 0 };
  chrome.action.setBadgeBackgroundColor({ tabId, color: "#2563eb" }).catch(() => {});
  if (chrome.action.setBadgeTextColor) {
    chrome.action.setBadgeTextColor({ tabId, color: "#ffffff" }).catch(() => {});
  }
  if (!ticker) ticker = setInterval(tick, 1000);
  tick();
}

function stop(tabId) {
  delete timers[tabId];
  chrome.action.setBadgeText({ tabId, text: "" }).catch(() => {});
  if (Object.keys(timers).length === 0 && ticker) {
    clearInterval(ticker);
    ticker = null;
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "start") start(msg.tabId, msg.interval);
  if (msg.type === "stop") stop(msg.tabId);
  if (msg.type === "stopAll") Object.keys(timers).forEach((id) => stop(Number(id)));
  sendResponse(timers);
});

chrome.tabs.onRemoved.addListener((tabId) => stop(tabId));
