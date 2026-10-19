import "./globals.css";

export const metadata = {
  title: "HerQuest Malaysia",
  description: "A side-quest platform connecting women with local opportunities.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}