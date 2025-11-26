/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";
import { db, EVENT_ID } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { setSession, getSession } from "@/lib/session";

export default function Auth() {
  const router = useRouter();
  const [role, setRole] = useState<"admin" | "judge" | "team">("judge");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    const s = getSession();
    if (s?.role === "admin") router.replace("/admin");
    if (s?.role === "judge") router.replace("/judge");
    if (s?.role === "team") router.replace("/submit");
  }, [router]);

  async function signIn() {
    setErr("");
    try {
      const codeTrim = code.trim();
      if (!codeTrim) throw new Error("Enter a code.");
      if (role === "admin") {
        const qj = query(
          collection(db, "events", EVENT_ID, "judges"),
          where("code", "==", codeTrim),
          where("isAdmin", "==", true)
        );
        const snap = await getDocs(qj);
        if (snap.empty) throw new Error("Admin code not found.");
        const d = snap.docs[0];
        setSession({
          role: "admin",
          adminCode: codeTrim,
          name: (d.data() as any).name || "Admin"
        });
        router.push("/admin");
        return;
      }
      if (role === "judge") {
        const qj = query(
          collection(db, "events", EVENT_ID, "judges"),
          where("code", "==", codeTrim)
        );
        const snap = await getDocs(qj);
        if (snap.empty) throw new Error("Judge code not found.");
        const d = snap.docs[0];
        const data = d.data() as any;
        setSession({
          role: "judge",
          judgeId: d.id,
          judgeCode: codeTrim,
          name: data.name || "Judge"
        });
        router.push("/judge");
        return;
      }
      // team
      const qt = query(
        collection(db, "events", EVENT_ID, "teams"),
        where("teamCode", "==", codeTrim)
      );
      const ts = await getDocs(qt);
      if (ts.empty) throw new Error("Team code not found.");
      const t = ts.docs[0];
      setSession({
        role: "team",
        teamId: t.id,
        teamCode: codeTrim,
        name: (t.data() as any).name || "Team"
      });
      router.push("/submit");
    } catch (e: any) {
      setErr(e.message || "Sign-in failed");
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-md p-6">
        <h1 className="text-2xl font-bold">Welcome</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Sign in to continue.
        </p>

        <div className="mt-6 grid grid-cols-3 gap-2">
          {(["admin", "judge", "team"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRole(r)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                role === r
                  ? "border-indigo-600 text-indigo-600"
                  : "border-gray-200 text-gray-700 dark:border-white/10 dark:text-gray-300"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="text-sm font-medium">
            {role === "admin"
              ? "Admin Code"
              : role === "judge"
              ? "Judge Code"
              : "Team Code"}
          </label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-transparent"
            placeholder={
              role === "team"
                ? "TEAM-0001"
                : role === "judge"
                ? "JUDGE-1234"
                : "ADMIN-1234"
            }
            value={code}
            onChange={(e) => setCode(e.target.value)}
          />
          {err && <p className="mt-2 text-sm text-rose-600">{err}</p>}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            onClick={signIn}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Continue
          </button>
          <button
            onClick={() => router.push("/results")}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm dark:border-white/10"
          >
            View Results
          </button>
        </div>
      </div>
    </Layout>
  );
}
