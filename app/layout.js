import "./globals.css";

export const metadata = {
  title: "People Pop",
  description:
    "People Pop - An interactive crowd of people bobbing, swinging, and vibing together. Change the motion, speed, and vibe.",
  keywords: [
    "people",
    "openpeeps",
    "dancing people",
    "interactive animation",
    "svg animation",
    "crowd animation",
  ],
  openGraph: {
    title: "People Pop",
    description: "An interactive crowd of dancing people. Change the vibe.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full overflow-hidden bg-people-bg font-sans text-people-ink antialiased">
        {children}
      </body>
    </html>
  );
}
