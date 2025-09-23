"use client";

import Link from 'next/link';
import { Button } from '../components/ui/button';

export default function Home() {
  return (
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold">Van Manager</h1>
      <p className="text-gray-700">Please log in or register to continue.</p>
      <div className="flex items-center justify-center gap-3">
        <Button size="sm" asChild>
          <Link href="/login">Login</Link>
        </Button>
        <Button size="sm" variant="secondary" asChild>
          <Link href="/register">Register</Link>
        </Button>
      </div>
    </div>
  );
}
