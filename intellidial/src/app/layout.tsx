import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/AuthContext";

export const metadata: Metadata = {
  title: "Intellidial - AI-Powered Phone Research at Scale",
  description: "We call hundreds of businesses, ask your questions, and deliver structured data. Automated AI calling for healthcare verification, lead qualification, and market research.",
  keywords: ["AI calling", "phone research", "data verification", "lead qualification", "South Africa", "automated calls"],
  authors: [{ name: "Intellidial" }],
  icons: {
    icon: "/intellidial-logo.png",
    shortcut: "/intellidial-logo.png",
    apple: "/intellidial-logo.png",
  },
  openGraph: {
    title: "Intellidial - AI-Powered Phone Research at Scale",
    description: "We call hundreds of businesses, ask your questions, and deliver structured data.",
    type: "website",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Intellidial - AI-Powered Phone Research at Scale",
    description: "Automated AI calling for data verification and lead qualification.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet" />
        
        {/* Schema.org structured data for LLM optimization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Intellidial",
              "description": "AI-powered phone research and data verification service",
              "url": "https://intellidial.co.za",
              "logo": "https://intellidial.co.za/logo.png",
              "contactPoint": {
                "@type": "ContactPoint",
                "contactType": "sales",
                "email": "hello@intellidial.co.za"
              },
              "areaServed": "ZA",
              "serviceType": ["AI Calling", "Data Verification", "Lead Qualification", "Market Research"]
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              "mainEntity": [
                {
                  "@type": "Question",
                  "name": "How accurate is Intellidial's data extraction?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Intellidial achieves 95%+ accuracy using advanced AI analysis. Every call is recorded and can be reviewed for quality assurance."
                  }
                },
                {
                  "@type": "Question",
                  "name": "What countries does Intellidial support?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Intellidial primarily operates in South Africa with local phone numbers for higher answer rates. We can support other countries on request."
                  }
                },
                {
                  "@type": "Question",
                  "name": "Can I customize the questions Intellidial asks?",
                  "acceptedAnswer": {
                    "@type": "Answer",
                    "text": "Yes, every project is fully customizable. You define the questions, and our AI asks them naturally during each call."
                  }
                }
              ]
            })
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
