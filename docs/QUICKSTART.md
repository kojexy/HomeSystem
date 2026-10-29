# Quick start: computer + phone + one camera

The first goal: replace Mi Home. One computer at home, the HomeSystem app on the phone, one camera.
**Your normal Wi-Fi router is enough.** No new router, no SIM card, no Zigbee stick, no Frigate.

```
 Phone (HomeSystem app) ──Wi-Fi──► Router ◄──Wi-Fi/cable── Computer (Home Assistant)
                                     ▲
                                     └──Wi-Fi── Tapo camera
```

## 1. The computer: Home Assistant (about 30 minutes)

Follow step 1 of the [setup guide](SETUP.md#1-install-home-assistant-on-the-server-pc):
- Windows computer → **option B** (VirtualBox).
- Spare computer → **option A**.

Then open `http://homeassistant.local:8123` on the phone or computer and create your user.
In the router, give the computer a **fixed IP**, for example `192.168.1.20`.

## 2. The phone: the HomeSystem app (5 minutes)

1. Install the APK (GitHub → Actions → Android APK → latest run → Artifacts).
2. In Home Assistant: your profile → **Security** → **Long-lived access tokens** → Create → copy.
3. In the app: settings (top right) → **My Home Assistant** → address `http://192.168.1.20:8123`, paste the token → Save.
4. The header says **Connected**.

## 3. The camera (10 minutes)

1. Set up the Tapo camera in the **Tapo app** on your Wi-Fi, as usual.
2. Tapo app → camera → Settings → **Advanced settings → Camera account** → make a username and password.
3. Home Assistant → Settings → Devices & services → **Add integration → TP-Link Smart Home** → enter the camera's IP, your TP-Link account, and the camera account.
   (Any other camera with RTSP: **Add integration → Generic Camera** → `rtsp://user:password@camera-ip:554/stream1`.)
4. Open the app → **Cameras**: the picture updates every 2 seconds. Press **Go live** for live video.

## 4. Your Mi Home devices (10 minutes)

Home Assistant → **Add integration → Xiaomi Home** → log in with your Mi account → choose your home.
Lamps, plugs, sensors and the vacuum appear in the app's **Devices** and **Rooms** tabs.
They still use Xiaomi's cloud; replace them with local devices one by one later.

## 5. Phone alerts and automations

Install the **Home Assistant Companion** app on the same phone and sign in. It sends the alerts.
Make your own automations right in the app: **Automations → New** — "When … (only if …) then …", like Mi Home.
For example: *When* the hallway sensor sees motion, *only* between 18:00 and 07:00, *then* turn on the light, wait 2 min, turn it off.
They run inside Home Assistant, so they work with the app closed. Saving needs the token of an **administrator** account.

More ready-made ones: [setup guide, step 9](SETUP.md#9-ready-made-automations).

## Later, when you want more

- 24/7 recording and AI that recognises people → [Frigate, step 4](SETUP.md#4-cameras-with-frigate-recording-ai-detection-live-video)
- Battery sensors and a siren without Wi-Fi → [Zigbee, step 2](SETUP.md#2-zigbee-sensors-siren-keypad-lights)
- Control from outside home → [Tailscale, step 12](SETUP.md#12-away-from-home)

## What is tested

GitHub runs a real Home Assistant on every change and checks the app against it:
connecting, a wrong token, rooms, lights, the alarm with a code, a thermostat, camera pictures,
and live video from an RTSP camera (like a Tapo). Real Tapo hardware is not tested yet.
