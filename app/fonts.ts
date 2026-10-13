import { Anton, IBM_Plex_Mono, Instrument_Sans, Noto_Sans_SC } from "next/font/google";

// Self-hosted at build time. Each font only exposes a CSS variable; app/globals.css builds the stacks from them.

export const anton = Anton({ weight: "400", subsets: ["latin"], variable: "--font-anton" });

export const instrumentSans = Instrument_Sans({ subsets: ["latin"], variable: "--font-instrument-sans" });

export const plexMono = IBM_Plex_Mono({
  weight: ["400", "500"],
  subsets: ["latin"],
  variable: "--font-plex-mono",
});

// Google splits the Chinese font into many unicode-range slices and the browser fetches only the ones a page
// uses, so nothing is preloaded.
export const notoSansSC = Noto_Sans_SC({ preload: false, variable: "--font-noto-sans-sc" });

export const fontVariables = [anton, instrumentSans, plexMono, notoSansSC].map((font) => font.variable).join(" ");
