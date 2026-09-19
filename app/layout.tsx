import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Margin — Your video reading library",
  description: "Turn YouTube captions into articles and a personal ebook library.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Margin",
    statusBarStyle: "default",
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    shortcut: "/favicon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#1b6d56",
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{__html:`(()=>{try{const t=JSON.parse(localStorage.getItem('margin-theme-v1')||'null');if(!t)return;const r=document.documentElement,k=['background','surface','sidebar','text','muted','accent'];for(const x of k)if(typeof t[x]==='string'&&/^#[0-9a-f]{6}$/i.test(t[x]))r.style.setProperty('--margin-'+x,t[x]);const bc=typeof t.border==='string'&&/^#[0-9a-f]{6}$/i.test(t.border)?t.border:(typeof t.text==='string'?t.text:null);if(bc)r.style.setProperty('--margin-border-color',bc);const bs=Number(t.borderStrength),rr=Number(t.radius);if(Number.isFinite(bs))r.style.setProperty('--margin-border-strength',Math.min(40,Math.max(0,bs))+'%');if(Number.isFinite(rr))r.style.setProperty('--margin-radius',Math.min(22,Math.max(2,rr))+'px');const h=t.accent?.replace('#','');if(h&&h.length===6){const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));r.style.setProperty('--margin-accent-contrast',.2126*c[0]+.7152*c[1]+.0722*c[2]>.46?'#172019':'#ffffff');}const b=t.background?.replace('#','');if(b&&b.length===6){const c=[0,2,4].map(i=>parseInt(b.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));r.style.colorScheme=.2126*c[0]+.7152*c[1]+.0722*c[2]>.46?'light':'dark';}}catch{}})();`}}/>
      </head>
      <body className="antialiased"><PwaRegister/>{children}</body>
    </html>
  );
}
