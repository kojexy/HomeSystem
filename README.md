# HomeSystem

My own smart home: cameras, alarm, lights and every other device, controlled from my phone and my PC with my own design.

- **Server:** [Home Assistant](https://www.home-assistant.io/) runs on one PC at home. It works without the internet. Three ways to install it, including a ready Docker kit in `server/`: [docs/SETUP.md](docs/SETUP.md#2-install-home-assistant-on-the-server-pc).
- **App:** one app in `app/` (React + TypeScript) for every screen. It talks to Home Assistant over its WebSocket API.
  - **Android:** a real APK (`app/android`, Capacitor), built by GitHub Actions.
  - **PC:** open it in Chrome or Edge → "Install app".
- **Cameras and AI:** [Frigate](https://frigate.video/) records 24/7, finds people, cars and animals, and can describe each event with AI. Live video through its go2rtc.
- **Automations:** 14 ready-made ones in `server/packages/homesystem.yaml` — they run inside HA, even with the app closed.
- **Cloud:** event photos and alert clips are copied to Google Drive, Dropbox or Yandex Disk. The 24/7 video stays at home.

```
 phone / PC  ──WebSocket──►  Home Assistant (server PC)  ──►  Zigbee sensors, siren, plugs, lights, Alarmo, UPS
     │                              │  MQTT
     └────── live video ──────►  Frigate + go2rtc  ──RTSP──►  4 cameras
                                    │  AI: detection at home · descriptions (Gemini or local Ollama)
                                    └──►  cloud backup of events (rclone)
```

## Try it now (no hardware needed)

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. It starts in **Demo home** mode: a pretend flat with lights, heating, blinds, a lock, a TV, a robot vacuum, sensors, power meters, two cameras and an alarm.
On the phone, open `http://<mac-ip>:5173` on the same Wi-Fi.

## The app

| Tab | What it does |
|---|---|
| **Home** | What the cameras noticed today · status chips (alarm, lights, doors, temperature, power) · one-tap modes **Leave home / Good night / I'm home** · **Needs attention** with one-tap fixes · main camera · alarm · what is on now · biggest power users |
| **Rooms** | Every device grouped by its Home Assistant area, with room temperature and "Lights off" per room |
| **Cameras** | All cameras; still frames every 2 s, **Go live** (through Home Assistant, or faster with Frigate), full screen · **AI events**: who and what the cameras saw, with photos, clips and an AI sentence |
| **Devices** | Search and filter all devices by type |
| **Automations** | Turn automations on/off, run them now, start scenes and scripts |

Device types: lights (brightness), switches/plugs, fans, blinds (open/stop/close), climate (mode, target °), locks (asks before unlocking), TV/media (play/pause, volume, off), robot vacuums, door/window/motion/leak/smoke sensors, temperature/humidity/power/battery readings.

"Needs attention" finds: alarm going off · door unlocked while armed · lights on while away · window open while heating · low batteries · a device using over 1.5 kW · offline devices.

## Connect to the real Home Assistant

Open settings (top right) → **My Home Assistant**, then enter the HA address and a long-lived access token.
The full step-by-step guide is in [docs/SETUP.md](docs/SETUP.md).

## Safety

- Keep Home Assistant, Frigate and the cameras **inside your home network**. Do not open router ports. Frigate's password-free ports answer only on the server itself.
- Full family checklist: [docs/SECURITY.md](docs/SECURITY.md).
- For access outside home, use Tailscale (a private VPN), not port forwarding.
- The HA token stays in your browser only. To revoke it, delete it in HA → Profile → Security.
- Never commit passwords or keys. They live in `server/.env`, which git ignores.

## Docs

- **[Quick start](docs/QUICKSTART.md) — computer + phone + one camera, on your normal Wi-Fi. Start here.**
- [Security: family only](docs/SECURITY.md) — who can see the cameras, and a one-evening checklist
- [What to buy](docs/HARDWARE.md) — server, 4 cameras, Zigbee sensors, plugs, lights, siren, UPS
- [Setup guide](docs/SETUP.md) — 12 steps, from installing Home Assistant to access away from home
- [Best practices](docs/BEST_PRACTICES.md) · [Research](docs/RESEARCH.md)

## Develop

```bash
cd app
npm test          # unit tests
npm run build     # production build into app/dist
npm run android   # build + copy into the Android project (then Android Studio, or let GitHub build the APK)
```

