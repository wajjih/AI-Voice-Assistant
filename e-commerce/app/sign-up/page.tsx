"use client";

import { doc, setDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import React from "react";
import {
  useCreateUserWithEmailAndPassword,
  useSendEmailVerification,
} from "react-firebase-hooks/auth";
import { auth, db } from "../firebase"; // make sure db is exported

const page = () => {
  const router = useRouter();
  const [createUser] = useCreateUserWithEmailAndPassword(auth);
  const [sendEmailVerification] = useSendEmailVerification(auth);

  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await createUser(email, password);
    if (res) {
      const user = res.user;
      // Save to Firestore
      await setDoc(doc(db, "users", user.uid), {
        email: user.email,
        createdAt: new Date(),
        // you can add more fields here
      });
      await sendEmailVerification();
      router.push("/");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold mb-4">Sign Up</h1>
      <form className="flex flex-col space-y-4">
        <input
          type="text"
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          value={email}
          className="border p-2 rounded"
        />
        <input
          type="password"
          onChange={(e) => setPassword(e.target.value)}
          value={password}
          placeholder="Password"
          className="border p-2 rounded"
        />
        <button
          type="submit"
          className="bg-blue-500 text-white p-2 rounded"
          onClick={onSubmit}
        >
          Sign Up
        </button>
      </form>
    </div>
  );
};

export default page;
