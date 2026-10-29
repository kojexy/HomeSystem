# Who can see the cameras — family only

The idea: the video never leaves your home except to your family's own phones, and every door to it needs a login.

```
 Family phones ──(home Wi-Fi or Tailscale)──► Home Assistant: login + 2-step code ──► cameras
 Anyone else on the internet ──────────────X  no open router ports, nothing to find
 Guests on your Wi-Fi ──────────────────────X  guest network, cut off from the cameras
```

## What is already built in

- **No open doors to the internet.** Nothing in HomeSystem needs router ports. Away from home, family uses Tailscale (a private network only your invited devices can join).
- **Every camera picture and video needs a login.** The app gets video through Home Assistant with your token. Frigate's password-free ports answer only on the server computer itself.
- **5 wrong passwords → that address is blocked**, and your phone gets a "failed login" alert.
- **Indoor cameras don't record while you're home** (they switch on with the alarm).
- **Passwords and keys stay out of GitHub.** They live in `server/.env`, which git ignores. The code is public; your home is not.

## Your checklist (one evening)

**Accounts**
- [ ] One Home Assistant account **per family member** (Settings → People). Only you are an administrator.
- [ ] Long, different passwords. Turn on **2-step codes** for every account: profile → Multi-factor authentication → Authenticator app.
- [ ] One app token per phone, named ("Anna's phone"). Lost phone → delete its token (profile → Security) and it is locked out.
- [ ] Frigate page (`https://<server>:8971`): change the first admin password; give family the **viewer** role only.

**Router**
- [ ] Change the router's admin password (not the one on the sticker). Use WPA2/WPA3 Wi-Fi.
- [ ] **Guest Wi-Fi** for visitors, with "access to local network" off. Guests then can't even see the cameras or the server.
- [ ] **No port forwarding**, and UPnP off.
- [ ] Optional, strongest: in the router, **block internet for the cameras** (parental controls / access control by device). They keep working at home; nobody can reach them through the maker's cloud. Turn it back on for a few minutes only to update their firmware.

**Cameras**
- [ ] Each camera has its own camera-account password, not shared with anything else.
- [ ] Turn on 2-step login for your **TP-Link / Tapo account** and your **Mi account** — those accounts can see the cameras through the cloud.
- [ ] Update the camera firmware a few times a year.
- [ ] Point indoor cameras at doors and hallways, not at beds or the bathroom.

**Away from home**
- [ ] Install Tailscale on the server and on each family phone ([setup step 12](SETUP.md#12-away-from-home)). Invite family; nobody else can join.
- [ ] Don't use Home Assistant Cloud remote links or open ports "just to try".

## How to check it yourself

- From mobile data (Wi-Fi off, Tailscale off), `http://<your home IP>:8123` must **not** open.
- From the guest Wi-Fi, `http://192.168.1.20:8123` must **not** open.
- HA → Settings → System → Logs: search "Login attempt failed". No surprises = good.
- HA → profile → Security: the token list shows only your family's devices.

## Honest limits

- A camera that uses the maker's cloud (Tapo, Mi) can in theory be reached through that cloud. Blocking the camera's internet in the router closes this.
- AI descriptions with Google Gemini send event photos to Google. Use local AI (Ollama) if that is not OK.
- The weakest point is usually a reused password or an unlocked phone. Use a screen lock on every family phone.
