import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAYLgu-GxZCWFdrZOm2wtNZqUTURSqhsjU",
  authDomain: "hello-hacks-judging-2025.firebaseapp.com",
  projectId: "hello-hacks-judging-2025",
  storageBucket: "hello-hacks-judging-2025.firebasestorage.app",
  messagingSenderId: "343524546147",
  appId: "1:343524546147:web:db1557d8b38bee5e99ca56"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);

export const EVENT_ID = "hello-hacks-2025";
