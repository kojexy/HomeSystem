# What to buy

The full system from the plan: one server, 4 cameras, sensors, plugs, lights and an alarm.
Buy in this order. Every step works on its own.

## 1. Server — buy first

| | Pick | Why |
|---|---|---|
| **Mini-PC** | Intel **N100 / N150**, **16 GB RAM**, 512 GB SSD | Runs Home Assistant and Frigate 24/7 on about 10 W. Its Intel graphics run the camera AI (OpenVINO) and decode video. |
| **Video disk** | **2 TB** SSD or HDD (inside the mini-PC or USB 3) | 24/7 video: about 20 GB per camera per day. 4 cameras × 7 days ≈ 600 GB, plus a month of alerts. |
| **UPS** | 600–850 VA with a **USB data port** (APC Back-UPS, CyberPower) | Keeps the server, router and cameras on in a power cut, and tells Home Assistant about it. |

Your current PC also works if it stays on day and night. For AI on old PCs without Intel graphics, use 1–2 cameras only.

## 2. Cameras

| Where | Pick | Count | Notes |
|---|---|---|---|
| Outside | **Tapo C320WS** (2K, night vision, IP66) | 1 | Wi-Fi. Mount it where the Wi-Fi is strong. A PoE camera (Reolink) is more reliable if you can run a cable. |
| Inside | **Tapo C210** (pan/tilt, night vision) | 3 | Indoor cameras record only while the alarm is on (privacy automation). |

In the Tapo app, for each camera: **Advanced settings → Camera account** — create a login. Frigate uses it. Give each camera a fixed IP in the router.

## 3. Security sensors — Zigbee

Zigbee devices talk to the server directly, without Wi-Fi or a cloud, and run on batteries for years.

| | Pick |
|---|---|
| **Zigbee stick** (needed once) | Home Assistant **Connect ZBT-2** (or ZBT-1, Sonoff ZBDongle-E). Use a USB extension cable away from the PC. |
| Door / window | Aqara door and window sensor |
| Motion | Aqara Motion Sensor P1 |
| Water leak | Aqara water leak sensor (kitchen, bathroom) |
| Smoke | A certified stand-alone smoke alarm **plus** a Zigbee one (Heiman, Frient) for phone alerts |

## 4. Smart plugs — 5 to 10

**Tapo P110**, not P100. The P100 cannot measure power; the P110 can, so the app shows energy use.
They work locally through Home Assistant's TP-Link integration.

## 5. Lights

- **Bulbs:** Zigbee bulbs (IKEA TRÅDFRI, Aqara) — dimming and colour, no Wi-Fi load.
- **Switches:** Aqara Zigbee wall switches (check if your wall box has a neutral wire).
- Mi Home lamps you already have can stay: add them with the Xiaomi Home integration.

## 6. Alarm

| | Pick |
|---|---|
| Siren | A Zigbee siren (Heiman, Frient). Inside the hallway; an outdoor one is optional. |
| Keypad | Frient (Develco) Zigbee keypad — works with Alarmo. Or just use the phone app. |

Alarmo (step 6 of the setup guide) joins the siren, the keypad, the sensors and the cameras.

## Later

- A second router or mesh Wi-Fi, if the outdoor camera's signal is weak.
- Backup internet (a 4G router) so alerts still arrive if the home internet stops.
- A Google Coral or a stronger mini-PC, only if you add many more cameras.

## Avoid

- Most Mi Home cameras — cloud only, no RTSP.
- Devices that need a cloud account to work at all.
