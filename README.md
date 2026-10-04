# Permission-free Auto Refresh

A Chrome extension that refreshes a tab on a timer. Seconds, minutes, hours or days.

**It requests zero permissions.** Open `manifest.json` and check. There is no `permissions` key and no `host_permissions` key. Chrome shows no warning when you install it.

## Why this exists

Most auto refresh extensions ask to "read and change all your data on all websites." Some started clean and picked up that permission after a change of ownership. This one does not need it and never will.

## Features

- Set any interval in seconds, minutes, hours or days
- Run a separate timer on as many tabs as you like
- Countdown shown on the toolbar badge for each tab
- Active tabs list with jump-to-tab and stop buttons
- Dark mode by default with a light mode toggle
- No network requests and no tracking

## Install

1. Download or clone this repo.
2. Open `chrome://extensions` and turn on Developer mode.
3. Click Load unpacked and pick the folder that contains `manifest.json`.
4. Pin the extension from the puzzle piece menu.

Keep the folder somewhere permanent. Chrome loads it from disk every time it starts. Avoid cloud synced folders such as OneDrive.

## Use

Open the tab you want to refresh and click the icon. Pick a unit and a number. Click Start.

## How it works without permissions

- `chrome.tabs.reload()` works without the `tabs` permission. That permission only unlocks tab titles and URLs.
- A once a second badge update keeps Chrome's background service worker alive. The `alarms` permission is not needed.
- The popup saves your theme and last interval with `localStorage`. The `storage` permission is not needed.

## Limitations

- Timers live in memory. They stop when Chrome restarts or if Chrome ends the background worker.
- Tabs are listed by position (Tab 3) instead of page title. Reading titles needs the `tabs` permission.
- Pages that block reloads with an unsaved changes prompt may ask before refreshing.

## Promise

If a future version ever needs a permission it will be called something else. The name "Permission-free" has to stay true.

## License

MIT. See `LICENSE`.
