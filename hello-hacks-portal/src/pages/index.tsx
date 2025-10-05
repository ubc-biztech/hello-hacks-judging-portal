import { useEffect, useState } from "react";
import { findJudgeByCode } from "@/lib/firestore";
import { useRouter } from "next/router";
import Layout from "@/components/Layout";

export default function Home() {
  const [role, setRole] = useState<"judge" | "team" | "admin">("judge");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  const router = useRouter();

  useEffect(() => {
    setErr("");
  }, [role, code]);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Hello Hacks Judging Portal
        </h1>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Enter your role and event code to continue.
        </p>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {["judge", "team", "admin"].map((r) => (
            <button
              key={r}
              onClick={() => setRole(r as any)}
              className={`rounded-xl border px-4 py-3 text-sm font-medium
              ${
                role === r
                  ? "border-indigo-600 text-indigo-600"
                  : "border-gray-200 text-gray-700 dark:border-white/10 dark:text-gray-300"
              }`}
            >
              {r.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="mt-6">
          <label className="block text-sm font-medium text-gray-900 dark:text-white">
            {role === "team"
              ? "Team Code"
              : role === "admin"
              ? "Admin Code"
              : "Judge Code"}
          </label>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10 dark:bg-transparent"
            placeholder="e.g., DANIEL-1234"
          />
        </div>

        {err && <p className="mt-3 text-sm text-rose-600">{err}</p>}

        <div className="mt-6 flex gap-3">
          <button
            onClick={async () => {
              if (!code) return setErr("Enter a code.");
              if (role === "judge") {
                const j = await findJudgeByCode(code);
                if (!j) return setErr("Judge code not found.");
                localStorage.setItem("judge", JSON.stringify(j));
                localStorage.setItem("judgeCode", code);
                router.push("/judge");
              } else if (role === "admin") {
                localStorage.setItem("adminCode", code);
                router.push("/admin");
              } else {
                localStorage.setItem("teamCode", code);
                router.push("/submit");
              }
            }}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Continue
          </button>
          <button
            onClick={() => router.push("/results")}
            className="rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-white/10"
          >
            View Results
          </button>
        </div>
      </div>
    </Layout>
  );
}
