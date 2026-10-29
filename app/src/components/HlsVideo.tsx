import { useEffect, useRef } from "react";

/** Plays an HLS stream from Home Assistant. hls.js where the browser needs it, native HLS otherwise. */
export function HlsVideo({ url, title, onFail }: { url: string; title: string; onFail: () => void }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    let destroy = () => {};
    let cancelled = false;
    import("hls.js").then(({ default: Hls }) => {
      if (cancelled) return;
      if (Hls.isSupported()) {
        const hls = new Hls({ lowLatencyMode: true, backBufferLength: 30 });
        hls.on(Hls.Events.ERROR, (_e, data) => data.fatal && onFail());
        hls.loadSource(url);
        hls.attachMedia(video);
        destroy = () => hls.destroy();
      } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = url;
      } else {
        onFail();
      }
    });
    return () => {
      cancelled = true;
      destroy();
    };
  }, [url, onFail]);

  return <video ref={ref} title={title} autoPlay muted playsInline />;
}
