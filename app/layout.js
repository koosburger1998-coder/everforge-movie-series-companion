import "./globals.css";

export const metadata = {
  title: "Everforge — Movie & Series Companion",
  description: "Search movies and series, save thoughts, and discuss deeper meaning.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
