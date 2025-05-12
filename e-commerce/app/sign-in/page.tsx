"use client";

import { useRouter } from "next/navigation";
import React from "react";
import { useSignInWithEmailAndPassword } from "react-firebase-hooks/auth";
import { auth } from "../firebase";

const Page = () => {
  const router = useRouter();
  const [signInWithEmailAndPassword, user, loading, error] =
    useSignInWithEmailAndPassword(auth);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // ⬅ prevent page reload
    const res = await signInWithEmailAndPassword(email, password);
    if (res) {
      router.push("/products"); // ⬅ redirect after successful login
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Sign In</h1>
      <form className="flex flex-col space-y-4" onSubmit={onSubmit}>
        <input
          type="text"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          className="border p-2 rounded"
        />
        <input
          type="password"
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded"
          disabled={loading}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
        {error && <p className="text-red-500">{error.message}</p>}
      </form>
    </div>
  );
};

export default Page;
