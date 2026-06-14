import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "JithX | Sujith Senthilraj — AI Digital Twin & OS Portfolio",
  description: "Explore JithX, the AI-powered digital twin and personal platform of Sujith Senthilraj, Junior AI Engineer. Interact with my AI twin, evaluate my resume dynamically against Job Descriptions, and explore my project universe.",
  keywords: ["Sujith Senthilraj", "AI Engineer", "Digital Twin Portfolio", "LLM Developer", "RAG Systems", "FastMCP", "Neo4j Portfolio"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var savedTheme = localStorage.getItem('theme');
                  if (savedTheme === 'light') {
                    document.documentElement.classList.add('light');
                  } else {
                    document.documentElement.classList.remove('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col selection:bg-[#bf5af2] selection:text-white">
        {children}
      </body>
    </html>
  );
}
