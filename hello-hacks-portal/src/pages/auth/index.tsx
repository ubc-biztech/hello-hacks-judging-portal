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

  const roleInfo: Record<
    "admin" | "judge" | "team",
    { title: string; hint: string; codeLabel: string; placeholder: string }
  > = {
    admin: {
      title: "Admin",
      hint: "Manage event.",
      codeLabel: "Admin Code",
      placeholder: "ADMIN-1234"
    },
    judge: {
      title: "Judge",
      hint: "Score assigned teams.",
      codeLabel: "Judge Code",
      placeholder: "JUDGE-1234"
    },
    team: {
      title: "Team",
      hint: "Edit submission.",
      codeLabel: "Team Code",
      placeholder: "TEAM-0001"
    }
  };

  const current = roleInfo[role];

  return (
    <Layout>
      <div className="mx-auto grid max-w-5xl gap-4 p-2 sm:p-4 lg:grid-cols-[1.05fr_1fr]">
        <section className="rounded-3xl border border-white/10 bg-black/30 p-5 sm:p-6">
          <span className="inline-flex rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-cyan-200">
            TechStrat
          </span>
          <h1 className="mt-4 text-3xl font-semibold text-slate-100 sm:text-4xl">
            Sign in
          </h1>
          <p className="mt-3 max-w-xl text-sm text-slate-400">
            Pick role and enter code.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {(["admin", "judge", "team"] as const).map((r) => {
              const selected = role === r;
              return (
                <button
                  key={r}
                  onClick={() => setRole(r)}
                  className={[
                    "rounded-2xl border px-3 py-3 text-left transition",
                    selected
                      ? "border-cyan-300/40 bg-cyan-300/10 text-slate-100"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  ].join(" ")}
                >
                  <p className="text-sm font-semibold">{roleInfo[r].title}</p>
                  <p className="mt-1 text-xs text-slate-400">
                    {roleInfo[r].hint}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-[#0b1221]/70 p-5 shadow-xl shadow-black/30 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
            Sign In As {current.title}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-100">Code</h2>
          <p className="mt-2 text-sm text-slate-400">{current.hint}</p>

          <div className="mt-5">
            <label className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              {current.codeLabel}
            </label>
            <input
              className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-3 text-sm text-slate-100 outline-none ring-0 placeholder:text-slate-500 focus:border-cyan-300/40"
              placeholder={current.placeholder}
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            {err && <p className="mt-2 text-sm text-rose-400">{err}</p>}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={signIn}
              className="rounded-xl bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Continue
            </button>
          </div>
        </section>
      </div>
    </Layout>
  );
}
