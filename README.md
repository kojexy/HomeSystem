# HomeSystem

My own smart home: cameras, alarm and lights, controlled from my phone and my PC with my own design.

- **Brain:** [Home Assistant](https://www.home-assistant.io/) runs at home on the Mac (in a VM). It works without the internet.
- **App:** a web app in `app/` (React + TypeScript). It talks to Home Assistant over its WebSocket API. Install it on Android or the desktop as an app (PWA).
- **Camera video:** go2rtc gives low-latency live video. Snapshots work through Home Assistant alone.

```
 phone / PC  ──WebSocket──►  Home Assistant (Mac VM)  ──►  lights, sensors, Alarmo alarm
     │                              │
     └────── live video ──────►  go2rtc  ──RTSP──►  camera
```

## Try it now (no hardware needed)

```bash
cd app
npm install
npm run dev
```

Open http://localhost:5173. It starts in **Demo home** mode with fake lights, an alarm, sensors and a camera.
On the phone, open `http://<mac-ip>:5173` on the same Wi-Fi.

## Connect to the real Home Assistant

Tap ⚙ → **My Home Assistant**, then enter the HA address and a long-lived access token.
The full step-by-step guide is in [docs/SETUP.md](docs/SETUP.md).

## What works today

| Part | Status |
|---|---|
| Lights and switches: on/off, brightness, "All off" | ✅ |
| Alarm panel (arm away, arm home, disarm, code) | ✅ needs Alarmo in HA |
| Door / window / motion sensors | ✅ |
| Camera snapshots every 2 s | ✅ |
| Live camera video | ✅ needs go2rtc |
| Installable app on Android / PC | ✅ |
| Push alerts when the alarm triggers | ⏳ next — via the HA Companion app |
| Remote access from outside home | ⏳ next — via Tailscale |

## Safety

- Keep Home Assistant, go2rtc (port 1984) and the camera **inside your home network**. Do not open router ports.
- For access outside home, use Tailscale (a private VPN), not port forwarding.
- The HA token stays in your browser only. To revoke it, delete it in HA → Profile → Security.
- Never commit camera passwords. `server/go2rtc.yaml` holds placeholders only.

## Develop

```bash
cd app
npm test         # unit tests
npm run build    # production build into app/dist
```

Research notes and sources: [docs/RESEARCH.md](docs/RESEARCH.md).
