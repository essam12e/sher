import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "نطاق | من صورة إلى رابط",
    short_name: "نطاق",
    description: "استضافة صور المنتجات كرابط HTTPS مباشر جاهز للمتاجر.",
    start_url: "/",
    display: "standalone",
    dir: "rtl",
    lang: "ar",
    background_color: "#f8fafc",
    theme_color: "#0055FD",
    icons: [{ src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" }],
  };
}
