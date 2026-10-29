import type { CapacitorConfig } from "@capacitor/cli";

// Android app shell around the same web app.
// Home Assistant at home talks plain http://192.168.x.x, so the app runs on an
// http origin and allows cleartext — otherwise Android blocks it as mixed content.
const config: CapacitorConfig = {
  appId: "com.kojexy.homesystem",
  appName: "HomeSystem",
  webDir: "dist",
  server: {
    androidScheme: "http",
    cleartext: true,
  },
  android: {
    backgroundColor: "#0b1016",
  },
  plugins: {
    SystemBars: {
      insetsHandling: "native",
      style: "DARK",
    },
  },
};

export default config;
