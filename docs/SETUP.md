# Setup guide

Simple steps, in order. Each step works on its own, so you can stop anywhere.

## 1. Buy one camera

Pick a camera with **RTSP** or **ONVIF**. That means local video, no cloud.

- **Best:** Reolink (for example RLC-810A, PoE). Home Assistant has a native Reolink integration.
- **Budget:** Tapo C120 or similar. Turn on the "Camera account" in the Tapo app to get RTSP.
- **Avoid:** most Mi Home cameras. They are mostly cloud-only.

## 2. Install Home Assistant on the server PC

One PC at home is the server. It must stay on day and night. Needs: 2 GB RAM for HA, 32 GB disk or more, a cable to the router if possible.
Pick **one** option:

**A. The PC does nothing else → Home Assistant OS on the whole PC (best).** Everything works, including the add-on store.
This **erases the PC's disk.**
1. Follow the official [Generic x86-64 guide](https://www.home-assistant.io/installation/generic-x86-64/): boot the PC from a USB stick with Ubuntu (live, "Try Ubuntu"), download `haos_generic-x86-64-<version>.img.xz`, and write it to the PC's internal disk with the Disks app or balenaEtcher.
2. In the BIOS, turn on **UEFI** boot and turn off Secure Boot.
3. Remove the USB stick and restart. After a few minutes, open `http://homeassistant.local:8123` from another device and create your user.

**B. The PC keeps Windows → Home Assistant OS in a virtual machine.** Everything works, but Windows must never sleep or reboot for updates at night.
1. Follow the official [Windows guide](https://www.home-assistant.io/installation/windows/): VirtualBox (free) with the `.vdi` image.
2. VM settings: **EFI on**, 2 GB RAM, 2 CPUs, disk 32 GB+, network **Bridged adapter**.

**C. The PC runs Linux and other things → Docker.** No add-on store, but this repo already brings go2rtc and the app.
1. Install [Docker Engine](https://docs.docker.com/engine/install/) and git, then:

   ```bash
   git clone https://github.com/kojexy/HomeSystem.git
   cd HomeSystem/server
   ./start.sh
   ```

2. Put your camera in `server/go2rtc.private.yaml` (the script creates it; it is not committed), then run `./start.sh` again.
3. Run `./start.sh` once more after HA's first start: it switches on the automations package (step 8) for you.

For all options:
- Give the server a **fixed IP** in your router, for example `192.168.1.20`.
- Turn off sleep on the PC.

(The Mac also works, with HA OS in [UTM](https://www.home-assistant.io/installation/macos/), but this Mac has too little free disk.)

## 3. Add the camera to Home Assistant

- Reolink: Settings → Devices & services → **Add integration → Reolink**.
- Tapo / other: **Add integration → ONVIF** or **Generic camera** with the RTSP URL.

You now have an entity like `camera.front_door`. The HomeSystem app shows its snapshots.

## 4. Live video with go2rtc (optional, recommended)

1. Install the standalone **go2rtc** add-on (HA → Settings → Add-ons → Add-on store → ⋮ → Repositories → add `https://github.com/AlexxIT/hassio-addons`).
2. Put your streams in its config. Use [`server/go2rtc.yaml`](../server/go2rtc.yaml) as a template.
3. **Name each stream like its camera entity:** `camera.front_door` → stream `front_door`. The app finds streams by this name.
4. Check it: open `http://192.168.1.20:1984` and press **stream** next to your camera.
5. In the HomeSystem app settings, enter `http://192.168.1.20:1984`. Every camera then gets a **Go live** button.

With Docker (option C), go2rtc already runs: skip 1–2 and put the streams in `server/go2rtc.private.yaml`.

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

## 7. Rooms

In HA, open Settings → Areas and create your rooms. Give each device an area. The app's **Rooms** tab uses them.

## 8. Ready-made automations

`server/packages/homesystem.yaml` has seven automations: alarm alert with a photo, water leak alert, person at the door while away, heating off when a window is open, lights off when everyone leaves, hallway motion light, weekly low-battery report.

1. Install the **HA Companion app** on the phone and sign in. It creates `notify.mobile_app_<phone name>`.
2. Copy the file to `/config/packages/homesystem.yaml` (Samba share or File editor add-on). With Docker (option C), `start.sh` does steps 2–3 for you.
3. In `/config/configuration.yaml` add:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

4. Replace every line marked `# CHANGE ME` with your own entity ids.
5. Developer tools → YAML → **Check configuration** → **Restart**.

Why they are written this way: [BEST_PRACTICES.md](BEST_PRACTICES.md).

## 9. Connect the app

1. HA → your profile (bottom left) → **Security** → **Long-lived access tokens** → Create. Copy it.
2. Open the HomeSystem app → settings (top right) → **My Home Assistant**.
3. Address: `http://192.168.1.20:8123`. Token: paste. Save.

### Android app (APK)

GitHub builds it: **Actions → Android APK → latest run → Artifacts → HomeSystem-apk**. Unzip it and open `app-debug.apk` on the phone (allow "Install unknown apps" for your browser or Files app once).
Then connect it as above. The phone must be on the home Wi-Fi (or Tailscale, step 10).

Build it yourself instead: install Android Studio, then `cd app && npm run android`, and open `app/android` in Android Studio → Run.

### Host the app inside Home Assistant (best for the phone)

Serving the app from HA itself avoids browser "mixed content" problems.

```bash
cd app && npm run build
```

Copy everything in `app/dist/` to `/config/www/homesystem/` on HA (use the **Samba share** or **File editor** add-on). With Docker (option C) this is already done.
Open `http://192.168.1.20:8123/local/homesystem/index.html` on the phone → Chrome menu → **Add to Home screen**.

## 10. Later

- **Away from home:** install the Tailscale add-on in HA and the Tailscale app on the phone.
- **Recording and person detection:** add Frigate when you have more than one camera.
