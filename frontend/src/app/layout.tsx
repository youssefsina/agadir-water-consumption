export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The actual HTML shell (lang, dir, fonts, providers) lives in
  // app/[locale]/layout.tsx — this root layout is intentionally minimal.
  return children;
}
