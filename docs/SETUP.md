# Setup guide

Simple steps, in order. Each step works on its own, so you can stop anywhere.
What to buy: [HARDWARE.md](HARDWARE.md).

## 1. Install Home Assistant on the server PC

One PC at home is the server. It must stay on day and night. A cable to the router is best.
Pick **one** option:

**A. The PC does nothing else → Home Assistant OS on the whole PC (best).** Everything works, including the add-on store.
This **erases the PC's disk.**
1. Follow the official [Generic x86-64 guide](https://www.home-assistant.io/installation/generic-x86-64/): boot the PC from a USB stick with Ubuntu (live, "Try Ubuntu"), download `haos_generic-x86-64-<version>.img.xz`, and write it to the PC's internal disk with the Disks app or balenaEtcher.
2. In the BIOS, turn on **UEFI** boot and turn off Secure Boot.
3. Remove the USB stick and restart. After a few minutes, open `http://homeassistant.local:8123` from another device and create your user.
4. Video disk: HA → Settings → System → Storage → **Move data disk** to the big disk.

**B. The PC keeps Windows → Home Assistant OS in a virtual machine.** Everything works, but Windows must never sleep or reboot for updates at night.
1. Follow the official [Windows guide](https://www.home-assistant.io/installation/windows/): VirtualBox (free) with the `.vdi` image.
2. VM settings: **EFI on**, 4 GB RAM, 4 CPUs, disk 32 GB+ (more for video), network **Bridged adapter**.

**C. The PC runs Linux → Docker.** No add-on store, but this repo brings everything: Home Assistant, Frigate, MQTT, cloud backup, local AI.
1. Install [Docker Engine](https://docs.docker.com/engine/install/) and git, then:

   ```bash
   git clone https://github.com/kojexy/HomeSystem.git
   cd HomeSystem/server
   ./start.sh
   ```

2. The first run creates `server/.env`. Fill in the camera login, the time zone and `RECORDINGS_DIR` (the big disk). It is never committed.
3. Run `./start.sh` again. Run it once more after HA's first start: it switches on the automations (step 9).

For all options:
- Give the server a **fixed IP** in your router, for example `192.168.1.20`.
- Turn off sleep on the PC.

## 2. Zigbee: sensors, siren, keypad, lights

1. Plug in the Zigbee stick (on a USB extension cable).
2. HA → Settings → Devices & services → it finds the stick → **ZHA** → set up.
3. Add devices: **Add device**, then hold the device's pairing button.
4. Existing Mi Home devices: the official **Xiaomi Home** integration (it uses Xiaomi's cloud). Replace them with Zigbee step by step.

## 3. Smart plugs and Wi-Fi lights

Tapo P110 plugs and Tapo bulbs: Settings → Devices & services → **Add integration → TP-Link Smart Home** (works locally).
Then **Settings → Dashboards → Energy**: add the plugs' energy sensors. The app's "Using power now" card reads them.

## 4. Cameras with Frigate: recording, AI detection, live video

Frigate records 24/7, finds people, cars and animals with AI on the server, and gives live video.

**HA OS (A/B):**
1. Add-on store → **Mosquitto broker** → install → start. Then Settings → People → Users: create a user `frigate` for it.
2. Add-on store → ⋮ → Repositories → add `https://github.com/blakeblackshear/frigate-hass-addons` → install **Frigate**.
3. Copy [`server/frigate/config.yml`](../server/frigate/config.yml) into the add-on's config (`/addon_configs/ccab4aaf_frigate/config.yml`, File editor add-on). Change:
   - camera IPs, and the login: replace `{FRIGATE_RTSP_USER}` / `{FRIGATE_RTSP_PASSWORD}` with the Tapo camera account;
   - `mqtt:` → `host: core-mosquitto`, `user: frigate`, `password: …`.
4. Start it. In the add-on's **Network** settings, keep ports **5000** and **1984** off: they have no password. The app gets live video through Home Assistant, which checks the login.

**Docker (C):** already running. Edit `server/frigate-config/config.yml` (camera IPs), then `docker restart frigate`.

**Both:**
1. Settings → Devices & services → **MQTT** → set up (Docker: broker `127.0.0.1`).
2. Install [HACS](https://hacs.xyz/), then HACS → **Frigate** → install → restart → Add integration → **Frigate**.
   URL: HA OS `http://ccab4aaf-frigate:5000`, Docker `http://127.0.0.1:5000`.
3. You get `camera.yard`, `camera.living_room`, … and switches like `switch.living_room_recordings`.
4. Frigate's own page: `https://192.168.1.20:8971` (Docker: first password in `docker logs frigate`).
5. In the HomeSystem app, every camera gets **Go live** (through Home Assistant). Leave the go2rtc field empty.
   The **AI events** list on the Cameras tab fills up by itself.

Tips: draw **zones** in Frigate (driveway, door) and **motion masks** over trees and the street, to stop false alerts.

## 5. AI analysis

Three layers. The first one is already on.

1. **Detection (local, free):** Frigate's AI sees people, cars, dogs and cats. Nothing leaves the house.
   Plus search by words ("man with a red bag") in Frigate's Explore page.
2. **AI descriptions of events** — "A courier left a parcel at the door":
   - Get a free key at [Google AI Studio](https://aistudio.google.com/apikey).
   - Docker: put it in `.env` as `FRIGATE_GEMINI_API_KEY`. HA OS: paste it in the add-on's config.
   - In the Frigate config, remove the `#` from the **AI descriptions** block. Restart Frigate.
   - The app shows each description under the event.
3. **AI in Home Assistant** — camera alerts with a sentence, and an evening report:
   - Add integration → **Google Gemini** (same key).
   - Settings → System → General → choose it as the default **AI Task** entity.
   - The automations "Camera alert while armed → AI description" and "Evening AI report" use it (step 9).

Privacy: with Gemini, photos of events go to Google. For AI that never leaves home, use the `local-ai` profile (Ollama) on a strong PC with a graphics card, and point Frigate and HA's **Ollama** integration at `http://192.168.1.20:11434`.

Later: **face recognition** (`face_recognition: enabled: true`) — teach it family faces in Frigate, and alerts say who came home.

## 6. Alarm system with Alarmo

1. HACS → search **Alarmo** → install → restart HA.
2. Settings → Devices & services → **Add integration → Alarmo**.
3. In Alarmo: add door, window and motion sensors; set a code; set modes (Away, Home, Night); add the keypad.
4. You get `alarm_control_panel.alarmo`. The app shows it as the Security card.
5. The siren is switched by the automations (step 9).

## 7. Rooms

Settings → Areas: create your rooms and give each device an area. The app's **Rooms** tab uses them.

## 8. UPS

Plug the UPS's USB cable into the server.
- HA OS: add-on store → **Network UPS Tools** → start; then Add integration → **NUT**.
- Docker: install `nut` on the Linux host, then Add integration → **NUT** (`127.0.0.1`).

You get `sensor.ups_status` and `sensor.ups_battery_charge`.

## 9. Ready-made automations

[`server/packages/homesystem.yaml`](../server/packages/homesystem.yaml) has 14:

| Safety | Energy and comfort | AI and maintenance |
|---|---|---|
| Alarm → siren, lights, phone alert with photo | Window open → heating off | Camera alert while armed → AI sentence + photo |
| Alarm off → siren off | Everyone left → lights and TV off | Evening AI report before bed |
| Water leak → phone alert | Hallway light on motion (after dark) | Alert → clip saved for the cloud |
| Power cut → phone alert (UPS) | Lamp plug: on at sunset, off at 23:30 | Weekly low-battery report |
| Indoor cameras record only when armed | | |
| Wrong password → phone alert | | |

1. Install the **HA Companion app** on the phone and sign in. It creates `notify.mobile_app_<phone name>`.
2. HA OS: copy the file to `/config/packages/homesystem.yaml` (File editor add-on), and add to `/config/configuration.yaml`:

   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```

   Docker: `start.sh` does this.
3. Replace every `# CHANGE ME` with your own entity ids (Settings → Entities).
4. Developer tools → YAML → **Check configuration** → **Restart**.

Your own automations: make them in the app (**Automations → New**, or start from an **Idea**). The app saves them into Home Assistant's `automations.yaml`, so they also show in HA → Settings → Automations. The pencil button changes or deletes them. Automations from this package file can be paused and run from the app, but changed only in the file.

Automations for devices you don't have yet simply never run. Why they are written this way: [BEST_PRACTICES.md](BEST_PRACTICES.md).

## 10. Backups

- **Home Assistant settings:** Settings → System → Backups → add **Google Drive** (built in), daily.
- **Camera events to the cloud** (Docker): every 5 minutes, event photos and alert clips go to Google Drive, Dropbox or Yandex Disk. The 24/7 video stays at home.
  1. Log in to the cloud once:

     ```bash
     docker compose run --rm --entrypoint rclone cloud-backup config
     ```

     Choose `n` (new), a name such as `gdrive`, then the type (Google Drive, Dropbox or Yandex Disk) and follow the steps.
  2. In `.env`: `CLOUD_REMOTE=gdrive:HomeSystem` and `COMPOSE_PROFILES=cloud`. Run `./start.sh`.

  It only copies: deleting a file at home never deletes the cloud copy, so a thief can't wipe the evidence.

## 11. Connect the app

1. HA → your profile (bottom left) → **Security** → **Long-lived access tokens** → Create. Copy it.
2. Open the HomeSystem app → settings (top right) → **My Home Assistant**.
3. Address: `http://192.168.1.20:8123`. Token: paste. Leave go2rtc empty. Save.

### Android app (APK)

GitHub builds it on every change: **Actions → Android APK → latest run → Artifacts → HomeSystem-apk**. Unzip it and open the `.apk` on the phone (allow "Install unknown apps" once).
The phone must be on the home Wi-Fi, or on Tailscale (step 12).

Build it yourself instead: install Android Studio, then `cd app && npm run android`, and open `app/android` in Android Studio → Run.

### On the PC, or hosted by Home Assistant

```bash
cd app && npm run build
```

Copy `app/dist/` to `/config/www/homesystem/` on HA (File editor or Samba add-on; Docker does it for you).
Open `http://192.168.1.20:8123/local/homesystem/index.html` → Chrome or Edge → **Install app**.

## 12. Away from home

Install the **Tailscale** add-on in HA (Docker: Tailscale on the Linux host) and the Tailscale app on the phone.
The app and alerts then work anywhere, with no open router ports.
