import "./globals.css";

export const metadata = {
  title: "Peeeeps Pop",
  description:
    "Peeeeps Pop - An interactive crowd of peeps bobbing, swinging, and vibing together. Change the motion, speed, and vibe.",
  keywords: [
    "peeps",
    "open peeps",
    "dancing peeps",
    "interactive animation",
    "svg animation",
    "crowd animation",
  ],
  openGraph: {
    title: "Peeeeps Pop",
    description: "An interactive crowd of dancing peeps. Change the vibe.",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-full overflow-hidden bg-peeps-bg font-sans text-peeps-ink antialiased">
        {children}
      </body>
    </html>
  );
}
