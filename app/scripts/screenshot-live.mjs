// Opens the built app in Chrome, connects it to the test Home Assistant
// and saves phone-size screenshots of every tab. Used by the live-test workflow.
import { chromium } from "playwright";

const { APP_URL, HA_URL, HA_TOKEN, OUT = "screenshots" } = process.env;
const settings = { mode: "live", hassUrl: HA_URL, token: HA_TOKEN, go2rtcUrl: "" };

// Google Chrome (not plain Chromium) so H.264 camera video can play.
/** True when the video shows a real picture (not black): draws the current frame and measures it. */
const framePixels = (v) => {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 36;
  const g = c.getContext("2d");
  g.drawImage(v, 0, 0, 64, 36);
  const d = g.getImageData(0, 0, 64, 36).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
  return sum / (d.length / 4) / 3; // average brightness 0–255
};

const browser = await chromium.launch({ channel: "chrome" });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));

await page.goto(APP_URL);
await page.evaluate((s) => localStorage.setItem("homesystem.settings", JSON.stringify(s)), settings);
await page.reload();
await page.getByText("Connected", { exact: true }).waitFor({ timeout: 30000 });

for (const tab of ["Home", "Rooms", "Cameras", "Devices", "Automations"]) {
  await page.locator("nav.tabs button", { hasText: tab }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${OUT}/${tab.toLowerCase()}.png`, fullPage: true });
}

// "Go live" on the RTSP test camera: the video must really play.
if (process.env.HA_STREAM_CAMERA) {
  const state = await (await fetch(`${HA_URL}/api/states/${process.env.HA_STREAM_CAMERA}`, { headers: { Authorization: `Bearer ${HA_TOKEN}` } })).json();
  const camName = state.attributes.friendly_name;
  await page.locator("nav.tabs button", { hasText: "Cameras" }).click();
  const card = page.locator(".card.camera").filter({ has: page.locator(".cam-name", { hasText: camName }) }).first();
  await card.getByRole("button", { name: "Go live" }).click();
  const video = card.locator("video");
  await video.waitFor({ timeout: 20000 });
  await page.waitForFunction((v) => v.currentTime > 1 && v.readyState >= 2, await video.elementHandle(), { timeout: 45000 });
  await card.scrollIntoViewIfNeeded();
  const brightness = await video.evaluate(framePixels);
  if (brightness < 20) errors.push(`phone: live video frame is black (${brightness.toFixed(0)})`);
  await page.screenshot({ path: `${OUT}/live-video.png` });
  console.log(`Live video plays in the app (picture brightness ${brightness.toFixed(0)}).`);
}

const width = await page.evaluate(() => document.documentElement.scrollWidth);

// The PC app: same app on a laptop-size window (left menu instead of the bottom bar).
const pc = await browser.newPage({ viewport: { width: 1440, height: 900 } });
pc.on("pageerror", (e) => errors.push(`PC: ${e.message}`));
await pc.goto(APP_URL);
await pc.evaluate((s) => localStorage.setItem("homesystem.settings", JSON.stringify(s)), settings);
await pc.reload();
await pc.getByText("Connected", { exact: true }).waitFor({ timeout: 30000 });
const rail = await pc.locator("nav.tabs").boundingBox();
if (!rail || rail.width > 120 || rail.height < 400) errors.push("PC: the side menu is not on the left");
for (const tab of ["Home", "Rooms", "Devices"]) {
  await pc.locator("nav.tabs button", { hasText: tab }).click();
  await pc.waitForTimeout(1500);
  await pc.screenshot({ path: `${OUT}/pc-${tab.toLowerCase()}.png` });
}
if (process.env.HA_STREAM_CAMERA) {
  await pc.locator("nav.tabs button", { hasText: "Cameras" }).click();
  const state = await (await fetch(`${HA_URL}/api/states/${process.env.HA_STREAM_CAMERA}`, { headers: { Authorization: `Bearer ${HA_TOKEN}` } })).json();
  const card = pc.locator(".card.camera").filter({ has: pc.locator(".cam-name", { hasText: state.attributes.friendly_name }) }).first();
  await card.getByRole("button", { name: "Go live" }).click();
  await pc.waitForFunction((v) => v.currentTime > 1 && v.readyState >= 2, await card.locator("video").elementHandle({ timeout: 20000 }), { timeout: 45000 });
  const pcBrightness = await card.locator("video").evaluate(framePixels);
  if (pcBrightness < 20) errors.push(`PC: live video frame is black (${pcBrightness.toFixed(0)})`);
  await pc.screenshot({ path: `${OUT}/pc-cameras-live.png` });
  console.log(`PC: live video plays (picture brightness ${pcBrightness.toFixed(0)}).`);
}
const pcWidth = await pc.evaluate(() => document.documentElement.scrollWidth);
if (pcWidth > 1440) errors.push(`PC: page is wider than the window: ${pcWidth}px`);
await browser.close();

if (width > 390) errors.push(`page is wider than the phone: ${width}px`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Screenshots saved, no page errors.");
