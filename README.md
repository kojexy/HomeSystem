# HomeSystem

My own smart home: cameras, alarm, lights and every other device, controlled from my phone and my PC with my own design.

- **Brain:** [Home Assistant](https://www.home-assistant.io/) runs at home on the Mac (in a VM). It works without the internet.
- **App:** a web app in `app/` (React + TypeScript). It talks to Home Assistant over its WebSocket API. Install it on Android or the desktop as an app (PWA).
- **Automations:** ready-made ones in `server/packages/homesystem.yaml` — they run inside HA, even with the app closed.
- **Camera video:** go2rtc gives low-latency live video. Snapshots work through Home Assistant alone.

```
 phone / PC  ──WebSocket──►  Home Assistant (Mac VM)  ──►  lights, plugs, climate, locks, sensors, Alarmo
     │                              │
     └────── live video ──────►  go2rtc  ──RTSP──►  cameras
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
| **Home** | Status chips (alarm, lights, doors, temperature, power) · one-tap modes **Leave home / Good night / I'm home** · **Needs attention** with one-tap fixes · main camera · alarm · what is on now · biggest power users |
| **Rooms** | Every device grouped by its Home Assistant area, with room temperature and "Lights off" per room |
| **Cameras** | All cameras; still frames every 2 s, **Go live** via go2rtc, full screen |
| **Devices** | Search and filter all devices by type |
| **Automations** | Turn automations on/off, run them now, start scenes and scripts |

Device types: lights (brightness), switches/plugs, fans, blinds (open/stop/close), climate (mode, target °), locks (asks before unlocking), TV/media (play/pause, volume, off), robot vacuums, door/window/motion/leak/smoke sensors, temperature/humidity/power/battery readings.

"Needs attention" finds: alarm going off · door unlocked while armed · lights on while away · window open while heating · low batteries · a device using over 1.5 kW · offline devices.

## Connect to the real Home Assistant

Open settings (top right) → **My Home Assistant**, then enter the HA address and a long-lived access token.
The full step-by-step guide is in [docs/SETUP.md](docs/SETUP.md).

## Safety

- Keep Home Assistant, go2rtc (port 1984) and the cameras **inside your home network**. Do not open router ports.
- For access outside home, use Tailscale (a private VPN), not port forwarding.
- The HA token stays in your browser only. To revoke it, delete it in HA → Profile → Security.
- Never commit camera passwords. `server/go2rtc.yaml` holds placeholders only.

## Next

- Push alerts — the ready-made automations already send them through the HA Companion app.
- Remote access via Tailscale.
- Recording and person detection with Frigate, once there is more than one real camera.

## Develop

```bash
cd app
npm test         # unit tests
npm run build    # production build into app/dist
```

More: [docs/BEST_PRACTICES.md](docs/BEST_PRACTICES.md) · [docs/RESEARCH.md](docs/RESEARCH.md)
