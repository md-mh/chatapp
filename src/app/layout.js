import "./globals.css";
import { DM_Sans, Space_Grotesk } from "next/font/google";
import Providers from "./providers";

const body = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const display = Space_Grotesk({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Chaton | Conversations with room to breathe",
  description:
    "A focused real-time chat workspace: direct messages, groups, and live updates without the noise.",
};

export const viewport = {
  themeColor: "#dcefe4",
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`h-full antialiased ${body.variable} ${display.variable}`}
    >
      <body className="flex min-h-full flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
