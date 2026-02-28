import { redirect } from 'next/navigation';

// The real dashboard is at app/[locale]/page.tsx
// Middleware handles locale detection, but this is a safety net.
export default function RootPage() {
  redirect('/en');
}
