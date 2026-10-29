# Research notes (29 Oct 2026)

## Has someone built this already?

Yes, several custom React dashboards for Home Assistant exist. None of them combines our exact mix (own design, alarm, live camera), so we build our own on the same base.

- [HA Component Kit (@hakit)](https://github.com/shannonhochkins/ha-component-kit) — React components and hooks on the official WebSocket API. Good source of ideas if the app grows.
- [hass-react](https://github.com/dlwiest/hass-react) — headless hooks, MIT.
- [use-homeassistant](https://npmjs.com/package/use-homeassistant) — React hooks on top of `home-assistant-js-websocket`.
- [Glance](https://community.home-assistant.io/t/glance-a-polished-fully-editable-react-dashboard-for-home-assistant-runs-as-an-add-on/1012606) — a polished React dashboard that runs as an HA add-on.

**Decision:** use the official [`home-assistant-js-websocket`](https://github.com/home-assistant/home-assistant-js-websocket) library directly. It is small, maintained by the HA team, and it keeps us free to design everything ourselves.

## Live camera video

- [go2rtc](https://github.com/AlexxIT/go2rtc) is the standard tool. It turns RTSP into WebRTC/MSE for the browser. Web UI on port 1984.
- [WebRTC Camera](https://github.com/AlexxIT/WebRTC) is the Lovelace card version; we do not use Lovelace, so we embed go2rtc's own player.
- HA's built-in go2rtc config is managed by HA and manual edits get lost ([forum](https://community.home-assistant.io/t/moving-go2rtc-config-from-add-on-to-built-in-with-ha-on-newer-versions-setup/826287)), so we use the go2rtc inside Frigate.
- A forum thread reports [go2rtc/WebRTC issues since HA 2026.9.1](https://community.home-assistant.io/t/go2rtc-webrtc-issues-since-2026-9-1/1024418). Not confirmed; watch it when updating HA.

## Which camera

- Reolink and Tapo both give local RTSP ([forum](https://community.home-assistant.io/t/best-inexpensive-cameras/1018196)). Reolink is the safer pick for Frigate later; Tapo is the budget pick.
- Many "best camera" pages are affiliate sites; check [Frigate's camera docs](https://docs.frigate.video/configuration/go2rtc) before buying.

## Running HA on a Mac

- [Official macOS install page](https://www.home-assistant.io/installation/macos/): HA OS in a virtual machine.
- On Apple Silicon, UTM with the AArch64 image works; choose **Virtualize**, and grow the 5 GB default disk ([community guide](https://community.home-assistant.io/t/guide-home-assistant-on-apple-silicon-mac-using-ha-os-aarch64-image/444785)).
- Some users report UTM loses the USB device (Zigbee stick) after a VM restart.
- VMware Fusion is a free alternative ([guide](https://community.home-assistant.io/t/installing-haos-on-apple-silicon-macs-using-vmware-fusion/832654)).

## Alarm

- [Alarmo](https://github.com/nielsfaber/alarmo) (via HACS) is the common choice. It creates a normal `alarm_control_panel` entity, which our app already supports.

## Open questions

- Which Mac model runs 24/7? A laptop that sleeps is a weak server; a cheap mini PC or Home Assistant Green may be better later.
- Phone push alerts: HA Companion app is the simplest path; our own push needs HTTPS and a service worker push setup.

## Frigate and AI (October 2026)

- Frigate 0.18.2 is current. Detection on Intel graphics uses OpenVINO with the bundled SSDLite model; YOLOv9 is better but must be exported by hand.
- Frigate 0.17+ writes AI **review summaries** and **object descriptions** with Gemini, OpenAI or Ollama; Ollama on CPU is too slow to be useful.
- Home Assistant's **AI Task** (`ai_task.generate_data`, since 2025.8) can look at a camera through `media-source://camera/<entity>`. Some users report attachment issues with some providers, so the alert automation falls back to plain text.
- The Frigate integration gives the app `frigate/events/get` over HA's WebSocket and `/api/frigate/notifications/<id>/…` links for thumbnails, snapshots and clips; the app signs them with `auth/sign_path`.
- Tapo P100 has no power metering; P110 does.
