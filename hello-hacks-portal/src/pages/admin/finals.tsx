"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import { db, EVENT_ID } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc
} from "firebase/firestore";

type Team = { id: string; name: string; members?: string[] };
type Judge = {
  id: string;
  name: string;
  isAdmin?: boolean;
  assignedTeamIds?: string[];
};
type Review = {
  id: string;
  teamId: string;
  weightedTotal: number;
  total: number;
  round?: "prelim" | "finals";
};

export default function FinalsAdminPage() {
  return (
    <RoleGate allow={["admin"]}>
      <Layout>
        <Page />
      </Layout>
    </RoleGate>
  );
}

function Page() {
  const [settings, setSettings] = useState<any>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [judges, setJudges] = useState<Judge[]>([]);
  const [prelimAgg, setPrelimAgg] = useState<
    Record<string, { avgW: number; avg: number; count: number }>
  >({});
  const [finalsTopN, setFinalsTopN] = useState(5);
  const [selectedFinalsTeams, setSelectedFinalsTeams] = useState<Set<string>>(
    new Set()
  );
  const [selectedFinalsJudges, setSelectedFinalsJudges] = useState<Set<string>>(
    new Set()
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      const s = await getDoc(doc(db, "events", EVENT_ID));
      const sData = s.exists() ? s.data() : {};
      setSettings(sData);
      setFinalsTopN(Number(sData.finalsTopN ?? 5));

      // teams
      const ts = await getDocs(collection(db, "events", EVENT_ID, "teams"));
      const tmap: Record<string, Team> = {};
      ts.forEach((d) => (tmap[d.id] = { id: d.id, ...(d.data() as any) }));
      setTeams(tmap);

      // judges
      const js = await getDocs(collection(db, "events", EVENT_ID, "judges"));
      const jlist: Judge[] = [];
      js.forEach((d) => jlist.push({ id: d.id, ...(d.data() as any) }));
      setJudges(jlist);

      // prelim reviews aggregate
      const rs = await getDocs(collection(db, "events", EVENT_ID, "reviews"));
      const agg: Record<string, { sumW: number; sum: number; count: number }> =
        {};
      rs.forEach((d) => {
        const r = d.data() as Review;
        const isPrelim = !r.round || r.round === "prelim";
        if (!isPrelim) return;
        const cur = agg[r.teamId] || { sumW: 0, sum: 0, count: 0 };
        cur.sumW += Number(r.weightedTotal || 0);
        cur.sum += Number(r.total || 0);
        cur.count += 1;
        agg[r.teamId] = cur;
      });
      const aggOut: Record<
        string,
        { avgW: number; avg: number; count: number }
      > = {};
      Object.entries(agg).forEach(([teamId, v]) => {
        aggOut[teamId] = {
          avgW: v.sumW / Math.max(1, v.count),
          avg: v.sum / Math.max(1, v.count),
          count: v.count
        };
      });
      setPrelimAgg(aggOut);

      const preTeams = new Set<string>((sData.finalsTeamIds || []) as string[]);
      const preJudges = new Set<string>(
        (sData.finalsJudgeIds || []) as string[]
      );
      setSelectedFinalsTeams(preTeams);
      setSelectedFinalsJudges(preJudges);
    })();
  }, []);

  const ranked = useMemo(() => {
    const arr = Object.keys(teams).map((id) => ({
      teamId: id,
      name: teams[id]?.name || id,
      ...prelimAgg[id]
    }));
    arr.sort((a, b) => (b?.avgW ?? 0) - (a?.avgW ?? 0));
    return arr;
  }, [teams, prelimAgg]);

  function takeTopN() {
    const s = new Set<string>();
    for (let i = 0; i < Math.min(finalsTopN, ranked.length); i++) {
      s.add(ranked[i].teamId);
    }
    setSelectedFinalsTeams(s);
  }

  function toggleTeam(id: string) {
    setSelectedFinalsTeams((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleJudge(id: string) {
    setSelectedFinalsJudges((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  async function saveConfig() {
    if (selectedFinalsJudges.size === 0) {
      alert("Please select at least one finals judge.");
      return;
    }
    if (selectedFinalsTeams.size === 0) {
      alert("Please select at least 1 finals team.");
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(db, "events", EVENT_ID), {
        finalsTopN,
        finalsTeamIds: Array.from(selectedFinalsTeams),
        finalsJudgeIds: Array.from(selectedFinalsJudges)
      });
      alert("Finals configuration saved.");
    } catch (e: any) {
      alert(e.message || "Error saving finals config");
    } finally {
      setBusy(false);
    }
  }

  async function startFinalsPhase() {
    if (selectedFinalsJudges.size === 0) {
      alert("Select at least one finals judge before starting finals.");
      return;
    }
    if (selectedFinalsTeams.size === 0) {
      alert("Select finals teams before starting finals.");
      return;
    }
    setBusy(true);
    try {
      await updateDoc(doc(db, "events", EVENT_ID), {
        phase: "finals",
        finalsTopN,
        finalsTeamIds: Array.from(selectedFinalsTeams),
        finalsJudgeIds: Array.from(selectedFinalsJudges)
      });
      alert("Finals started. Finals judges can now review finals teams.");
    } catch (e: any) {
      alert(e.message || "Error starting finals");
    } finally {
      setBusy(false);
    }
  }

  async function revertToPrelim() {
    setBusy(true);
    try {
      await updateDoc(doc(db, "events", EVENT_ID), { phase: "prelim" });
      alert("Phase set to prelim.");
    } catch (e: any) {
      alert(e.message || "Error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Final Round
          </h1>
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Current phase: {settings?.phase || "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={saveConfig}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            Save config
          </button>
          <button
            onClick={startFinalsPhase}
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            Start finals
          </button>
          <button
            onClick={revertToPrelim}
            disabled={busy}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
          >
            Back to prelim
          </button>
        </div>
      </div>

      {/* Finals judges */}
      <section className="mb-8 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Select Finals Judges</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            Selected: {selectedFinalsJudges.size}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
          {judges.map((j) => (
            <label
              key={j.id}
              className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10"
            >
              <input
                type="checkbox"
                checked={selectedFinalsJudges.has(j.id)}
                onChange={() => toggleJudge(j.id)}
              />
              <span className="font-medium">{j.name || j.id}</span>
              {j.isAdmin ? (
                <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-[10px] text-gray-600 dark:bg-white/5 dark:text-gray-300">
                  Admin
                </span>
              ) : null}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Only these judges can access the finals judging view. You can choose
          any number of finals judges.
        </p>
      </section>

      {/* Finals teams */}
      <section className="rounded-2xl border border-gray-200 p-4 dark:border-white/10">
        <div className="mb-3 flex items-center justify-between">
          <div className="font-semibold">Finals Teams</div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-600 dark:text-gray-400">
              Top N:
            </label>
            <input
              type="number"
              min={1}
              value={finalsTopN}
              onChange={(e) => setFinalsTopN(Number(e.target.value || 1))}
              className="w-16 rounded-md border border-gray-200 p-1 text-xs dark:border-white/10 dark:bg-transparent"
            />
            <button
              onClick={takeTopN}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg:white/5"
            >
              Use computed Top N
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 dark:bg-white/5">
              <tr>
                <th className="px-3 py-2 text-left">Final</th>
                <th className="px-3 py-2 text-left">Team</th>
                <th className="px-3 py-2 text-left">Prelim Avg (Weighted)</th>
                <th className="px-3 py-2 text-left">Prelim Avg (Raw)</th>
                <th className="px-3 py-2 text-left"># Reviews</th>
              </tr>
            </thead>
            <tbody>
              {ranked.map((r) => {
                const checked = selectedFinalsTeams.has(r.teamId);
                return (
                  <tr
                    key={r.teamId}
                    className="border-t border-gray-100 dark:border-white/10"
                  >
                    <td className="px-3 py-2">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTeam(r.teamId)}
                      />
                    </td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2">{(r?.avgW ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{(r?.avg ?? 0).toFixed(2)}</td>
                    <td className="px-3 py-2">{r?.count ?? 0}</td>
                  </tr>
                );
              })}
              {ranked.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-3 py-4 text-gray-500 dark:text-gray-400"
                  >
                    No prelim reviews found yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
          Tip: Use “Use computed Top N” for a starting point, then toggle
          checkboxes to override.
        </p>
      </section>
    </div>
  );
}
