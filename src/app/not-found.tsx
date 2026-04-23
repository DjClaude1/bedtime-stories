import Link from 'next/link';
import { Moon } from 'lucide-react';

export default function NotFound() {
  return (
    <main className="container-app pt-16 pb-24 text-center">
      <Moon className="w-10 h-10 text-night-300 mx-auto mb-4 animate-floaty" />
      <h1 className="font-serif text-3xl mb-2">This page drifted away.</h1>
      <p className="text-night-200/80 mb-6">Let&apos;s gently head back.</p>
      <Link href="/" className="btn-primary">Home</Link>
    </main>
  );
}
