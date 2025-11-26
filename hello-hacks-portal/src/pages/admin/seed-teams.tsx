/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import { db, EVENT_ID } from "@/lib/firebase";
import {
  collection,
  doc,
  getDocs,
  serverTimestamp,
  writeBatch
} from "firebase/firestore";

/** >>>>>>> YOUR TEAM DATA (updated) <<<<<<< */
const RAW_TEAMS: { name: string; members: string[] }[] = [
  // Block 1
  { name: "WON", members: ["Abdullah", "Tiana", "Terrence", "Gaeun"] },
  { name: "Apple", members: ["Jery", "Eris", "Tanny", "Firia"] },
  { name: "FigmaFiends", members: ["Bonnie", "Cherry", "Quang", "Carys"] },
  { name: "3 musketeers", members: ["Amy L", "Ishita", "Anoushka"] },
  { name: "Team 5", members: ["Yungi", "Journey"] },
  { name: "Sigma Figma", members: ["Mai", "Jenny", "Nina", "Eric"] },

  // Block 2
  { name: "Designasaurs", members: ["Chelsea", "Nathan"] },
  { name: "Matcha", members: ["Aubrey", "Ayden", "Iris", "David"] },
  { name: "Hayden Chan", members: ["Aimee", "Chloe", "Kassi", "Melina"] },
  { name: "Solemates", members: ["Emily", "Diego", "Justin", "Indy"] },
  {
    name: "Sleep Deprived",
    members: ["Dora", "Isabel", "Sunny", "Srilakshmi"]
  },
  { name: "AWAKE", members: ["Avery", "Daisy", "Heral", "Elaine"] },

  // Block 3
  { name: "Trust the RNR", members: ["Ananyaa", "Lucky", "Aryaman"] },
  { name: "Bunny", members: ["Rachel", "Jayden", "Daiel", "Lyon"] },
  { name: "Teletubies", members: ["Bolu", "Dea", "Grace", "Audrey"] },
  { name: "PizzaPixel", members: ["Catarina", "Anthony", "Oliva", "Vicky"] },
  { name: "Chuzz", members: ["Jay", "Sherry", "Adelio", "Lily"] },
  { name: "Daydream", members: ["Mathew", "Byung", "Harry", "Brady"] },

  // Block 4
  { name: "Iris", members: ["Iris Cheung"] },
  { name: "Kiwi", members: ["Yolanda", "Gianna", "Anne", "Jenise"] },
  { name: "Tardy", members: ["Justin", "Oper", "Nicky"] }
];

function slugify(input: string) {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "")
      .replace(/--+/g, "-")
      .slice(0, 40) || "team"
  );
}

// A-Z + 0-9 (no ambiguity filter to keep it simple)
function code4() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let s = "";
  for (let i = 0; i < 4; i++) {
    s += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return s;
}

type PlanRow = {
  teamId: string;
  name: string;
  members: string[];
  teamCode: string;
  existsId: boolean;
  existsCode: boolean;
};

export default function SeedTeamsPage() {
  return (
    <RoleGate allow={["admin"]}>
      <Layout>
        <Page />
      </Layout>
    </RoleGate>
  );
}

function Page() {
  const [loading, setLoading] = useState(false);
  const [existingIds, setExistingIds] = useState<Set<string>>(new Set());
  const [existingCodes, setExistingCodes] = useState<Set<string>>(new Set());
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const snap = await getDocs(collection(db, "events", EVENT_ID, "teams"));
        const ids = new Set<string>();
        const codes = new Set<string>();
        snap.forEach((d) => {
          ids.add(d.id);
          const c = (d.data() as any)?.teamCode;
          if (typeof c === "string" && c.length > 0) codes.add(c);
        });
        setExistingIds(ids);
        setExistingCodes(codes);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Build a plan that ensures unique ids and codes against existing + within this run
  const plan: PlanRow[] = useMemo(() => {
    const usedIds = new Set(existingIds);
    const usedCodes = new Set(existingCodes);
    const out: PlanRow[] = [];

    for (const t of RAW_TEAMS) {
      const members = (t.members || [])
        .map((m) => (m || "").trim())
        .filter(Boolean);

      const base = slugify(t.name);
      let candidate = base;
      let n = 2;
      while (usedIds.has(candidate)) {
        candidate = `${base}-${n++}`;
      }
      usedIds.add(candidate);

      let code = code4();
      while (usedCodes.has(code)) {
        code = code4();
      }
      usedCodes.add(code);

      out.push({
        teamId: candidate,
        name: t.name,
        members,
        teamCode: code,
        existsId: existingIds.has(candidate),
        existsCode: existingCodes.has(code)
      });
    }

    return out;
  }, [existingIds, existingCodes]);

  async function createTeams() {
    setResult(null);
    setLoading(true);
    try {
      const batch = writeBatch(db);
      for (const row of plan) {
        const ref = doc(db, "events", EVENT_ID, "teams", row.teamId);
        batch.set(
          ref,
          {
            name: row.name,
            members: row.members,
            techStack: [],
            github: "",
            devpost: "",
            description: "",
            imageUrls: [],
            teamCode: row.teamCode,
            createdAt: serverTimestamp()
          },
          { merge: true }
        );
      }
      if (dryRun) {
        setResult(
          `Dry run complete. ${plan.length} teams would be created/updated (no writes).`
        );
      } else {
        await batch.commit();
        setResult(`Created/updated ${plan.length} team docs successfully.`);
      }
    } catch (e: any) {
      setResult(`Error: ${e.message || String(e)}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Seed Teams
        </h1>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            Dry run (no writes)
          </label>
          <button
            onClick={createTeams}
            disabled={loading}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {loading ? "Working…" : dryRun ? "Simulate Create" : "Create Teams"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left">Team ID</th>
              <th className="px-3 py-2 text-left">Name</th>
              <th className="px-3 py-2 text-left">Members</th>
              <th className="px-3 py-2 text-left">Code (4)</th>
            </tr>
          </thead>
          <tbody>
            {plan.map((r) => (
              <tr
                key={r.teamId}
                className="border-t border-gray-100 dark:border-white/10"
              >
                <td className="px-3 py-2 font-mono">{r.teamId}</td>
                <td className="px-3 py-2">{r.name}</td>
                <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                  {r.members.join(", ")}
                </td>
                <td className="px-3 py-2 font-mono">{r.teamCode}</td>
              </tr>
            ))}
            {plan.length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-3 py-4 text-gray-500 dark:text-gray-400"
                >
                  No teams to seed.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {result && (
        <div className="mt-4 rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10">
          {result}
        </div>
      )}

      <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
        This tool ensures unique <span className="font-medium">teamId</span> and
        4-char <span className="font-medium">teamCode</span> across existing and
        newly added teams.
      </p>
    </div>
  );
}
