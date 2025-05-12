import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDcXwyu1jpn7etEhuPxmXPRwh0czGMv0OE",
  authDomain: "e-commerce-voice-ai-agent.firebaseapp.com",
  projectId: "e-commerce-voice-ai-agent",
  storageBucket: "e-commerce-voice-ai-agent.appspot.com",
  messagingSenderId: "900454965388",
  appId: "1:900454965388:web:c1746d6cd3b387a3fcdba9",
  measurementId: "G-GHRDC09G2R",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
