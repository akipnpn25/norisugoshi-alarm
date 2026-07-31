import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "のりすごしアラーム",
    short_name: "のりすごし",
    description:
      "目的地の到着予定時刻から起床時刻を逆算する、乗り過ごし防止アラームです。",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1437",
    theme_color: "#0b1437",
    orientation: "portrait",
    lang: "ja",
  };
}
