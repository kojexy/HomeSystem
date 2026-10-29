# Setup guide

Simple steps, in order. Each step works on its own, so you can stop anywhere.

## 1. Buy one camera

Pick a camera with **RTSP** or **ONVIF**. That means local video, no cloud.

- **Best:** Reolink (for example RLC-810A, PoE). Home Assistant has a native Reolink integration.
- **Budget:** Tapo C120 or similar. Turn on the "Camera account" in the Tapo app to get RTSP.
- **Avoid:** most Mi Home cameras. They are mostly cloud-only.

## 2. Install Home Assistant on the Mac

The Mac is the server. Home Assistant OS runs in a virtual machine.

1. Install [UTM](https://mac.getutm.app/) (free).
2. Download the **HA OS AArch64** image (`.qcow2`) from the [official macOS page](https://www.home-assistant.io/installation/macos/).
3. In UTM: **Create → Virtualize** (not Emulate) → Linux → import the `.qcow2` disk.
4. Make the disk bigger: **at least 32 GB** (the default 5 GB is too small).
5. Network: **Bridged**, so HA gets its own IP on your Wi-Fi.
6. Start the VM. Open `http://homeassistant.local:8123` and create your user.

Tips:
- Set the Mac to never sleep (System Settings → Energy) — a sleeping Mac means a sleeping home.
- Give the HA VM a fixed IP in your router, for example `192.168.1.20`.

## 3. Add the camera to Home Assistant

- Reolink: Settings → Devices & services → **Add integration → Reolink**.
- Tapo / other: **Add integration → ONVIF** or **Generic camera** with the RTSP URL.

You now have an entity like `camera.front_door`. The HomeSystem app shows its snapshots.

## 4. Live video with go2rtc (optional, recommended)

1. Install the standalone **go2rtc** add-on (HA → Settings → Add-ons → Add-on store → ⋮ → Repositories → add `https://github.com/AlexxIT/hassio-addons`).
2. Put your streams in its config. Use [`server/go2rtc.yaml`](../server/go2rtc.yaml) as a template.
3. Check it: open `http://192.168.1.20:1984` and press **stream** next to your camera.
4. In the HomeSystem app settings, enter `http://192.168.1.20:1984` and the stream name (`front_door`).

Note: Home Assistant also has go2rtc built in, but HA manages that config and overwrites manual changes. The add-on is easier to control.

## 5. Alarm system with Alarmo

1. Install [HACS](https://hacs.xyz/) (the community store).
2. HACS → search **Alarmo** → install → restart HA.
3. Settings → Devices & services → **Add integration → Alarmo**.
4. In Alarmo: add your door and motion sensors, set a code, set arm modes (Away, Home).
5. You get `alarm_control_panel.alarmo`. The app shows it as the Security card.

## 6. Lights

- Zigbee is the most reliable local option. Buy a Zigbee USB stick (for example Home Assistant Connect ZBT-1 or Sonoff ZBDongle) and use the **ZHA** integration.
- Pass the USB stick into the UTM VM (UTM → USB). Note: some users report UTM forgets the USB after a restart — check it after each reboot.
- Existing Mi Home devices: add them with the official **Xiaomi Home** integration (it uses Xiaomi's cloud), then replace them with Zigbee devices step by step.

## 7. Connect the app

1. HA → your profile (bottom left) → **Security** → **Long-lived access tokens** → Create. Copy it.
2. Open the HomeSystem app → ⚙ → **My Home Assistant**.
3. Address: `http://192.168.1.20:8123`. Token: paste. Save.

### Host the app inside Home Assistant (best for the phone)

Serving the app from HA itself avoids browser "mixed content" problems.

```bash
cd app && npm run build
```

Copy everything in `app/dist/` to `/config/www/homesystem/` on HA (use the **Samba share** or **File editor** add-on).
Open `http://192.168.1.20:8123/local/homesystem/index.html` on the phone → Chrome menu → **Add to Home screen**.

## 8. Later

- **Away from home:** install the Tailscale add-on in HA and the Tailscale app on the phone.
- **Push alerts:** install the HA Companion app on the phone, then add an Alarmo notification "when triggered → notify phone".
- **Recording and person detection:** add Frigate when you have more than one camera.
