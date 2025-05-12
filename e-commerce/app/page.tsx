"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="bg-black">
      <h1 className="text-3xl font-bold underline">E-commerce site</h1>

      <Link className="mr-4 underline" href="/sign-in">
        Sign In
      </Link>

      <Link className="mr-4 underline" href="/sign-up">
        Create account
      </Link>
    </div>
  );
}
