import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Smart City Tunisia',
  description: 'Urban management system for Smart City Tunisia',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("smartcity-theme");if(t==="dark")document.documentElement.setAttribute("data-theme","dark");var l=localStorage.getItem("smartcity-lang");if(l){document.documentElement.lang=l;if(l==="ar"){document.documentElement.dir="rtl"}}}catch(e){}})();var _ow=console.warn;console.warn=function(){if(arguments[0]&&typeof arguments[0]=="string"&&arguments[0].includes("width(-1) and height(-1) of chart"))return;_ow.apply(console,arguments)};`,
          }}
        />
      </head>
      <body className={inter.variable}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
