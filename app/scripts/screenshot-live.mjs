// Opens the built app in Chrome, connects it to the test Home Assistant
// and saves phone-size screenshots of every tab. Used by the live-test workflow.
import { chromium } from "playwright";

const { APP_URL, HA_URL, HA_TOKEN, OUT = "screenshots" } = process.env;
const settings = { mode: "live", hassUrl: HA_URL, token: HA_TOKEN, go2rtcUrl: "" };

const browser = await chromium.launch();
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

const width = await page.evaluate(() => document.documentElement.scrollWidth);
await browser.close();

if (width > 390) errors.push(`page is wider than the phone: ${width}px`);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log("Screenshots saved, no page errors.");
