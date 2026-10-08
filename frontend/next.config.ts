import type { NextConfig } from "next";

const dev = process.env.NODE_ENV === "development";
// No nonce on purpose: a nonce forces every page to render per request. Pages stay static and CDN-cacheable,
// 'unsafe-inline' covers Next's inline bootstrap scripts, React escaping covers XSS, and the rest of the
// policy still blocks framing, plugins, foreign connections and <base>/<form> hijacks.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  images: { unoptimized: true }, // next/image is unused; keeps the /_next/image optimizer (SSRF advisories, sharp) out of play
  async redirects() {
    return [{ source: "/", destination: "/fa", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
