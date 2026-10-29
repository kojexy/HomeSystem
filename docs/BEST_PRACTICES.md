# Smart-home best practices (what we follow and why)

Collected from the Home Assistant community, 29 Oct 2026. Short rules, then where the app or config follows them.

## 1. Local first

- Automations run **inside Home Assistant**, not in the app. They keep working with the app closed and the internet down.
- Prefer devices with local control: Zigbee, Z-Wave, Matter/Thread, RTSP cameras. Cloud devices (most Mi Home, Tuya) stop when their server does.
- Never open router ports. Use Tailscale for access from outside home.

→ The app is only a remote control. `server/packages/homesystem.yaml` holds the brains.

## 2. Automations that do not break

- Use **built-in triggers and conditions** (state, numeric_state, time, sun) instead of templates. Templates skip validation and fail silently.
- Give every automation an `id`, so you can edit it later in the HA UI.
- Motion lights: `mode: restart` — new motion extends the timer instead of stacking copies.
- Use `for:` on triggers ("window open for 2 minutes") to ignore short blips.
- Keep **safety** (alarm, leaks, smoke) separate from **comfort** (lights, music). A "guest mode" switch pauses comfort only.

→ All seven ready-made automations follow these rules. The battery report is the one place a template is needed.

## 3. Dashboard design

- **Mobile first.** Most control happens on the phone, so the main buttons sit in thumb reach.
- **Organise by room and by function** (security, climate, energy), not one huge page.
- **At a glance first:** the most important states (alarm, open doors, lights on) at the top.
- **One clear control per device type:** toggle, slider, or a read-out. Keep states accurate so you trust them.
- **Show problems, hide noise.** Signal strength, uptime and similar sensors stay off the home screen.

→ The app has a bottom tab bar on the phone (left rail on PC), a status-chip row, "Needs attention", and per-room cards. Sensors are filtered to useful ones.

## 4. Security habits

- Arm/disarm with a **code** (Alarmo supports it). The app never stores the code.
- Ask before risky actions: the app asks "Unlock front door?" before unlocking.
- The one-tap "Leave home" mode never switches off plugs — one may be the fridge or the router.
- Camera passwords live only in go2rtc/HA config, never in Git.
- One long-lived token per device, named ("Phone", "PC"), so you can revoke one without the others.

## 5. Energy

- Measure first: smart plugs with power metering on the big users (washer, dryer, heater, PC).
- Pause heating or cooling when a window is open (ready-made automation).
- Turn off what is forgotten when everyone leaves (ready-made automation).
- The app's "Using power now" card and the "High power" note show the biggest users live.

## Sources

- [Home Assistant best practices skill (homeassistant-ai)](https://skills.sh/homeassistant-ai/skills/home-assistant-best-practices) — built-in triggers over templates
- [Home Assistant automations guide](https://raspberry.tips/en/raspberrypi-tutorials/home-assistant-automations-guide) — local automations survive internet outages
- [20 automation examples for beginners](https://www.pulse.bot/consumer-tech/blogs/20-home-assistant-automation-examples-for-beginners-5e67dfac-3fbd-4c36-94c5-8ddb8eaee9f0/) — restart mode for repeating sensors
- [Lovelace design skill](https://skills.cat/skills/markus41/claude/plugins-home-assistant-architect-skills-lovelace-design) — mobile first, group by room/function
- [Hemma dashboard](https://github.com/willsanderson/Hemma) — separate mobile layout, Apple Home style
- [How to create a dashboard that looks good (LazyAdmin)](https://lazyadmin.nl/smart-home/home-assistant-dashboard/)
- [HA 2026.6 beta: dashboard redesign](https://www.smarthomejunkie.net/home-assistant-2026-6-beta-dashboard-redesign-smarter-automations-and-ir-remotes-that-finally-listen/)
