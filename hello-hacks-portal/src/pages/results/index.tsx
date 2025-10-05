"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import { collection, getDoc, getDocs, doc } from "firebase/firestore";
import { db, EVENT_ID } from "@/lib/firebase";
import { useClientSession } from "@/lib/session";

type Review = {
  id: string;
  teamId: string;
  judgeId: string;
  judgeName?: string;
  total: number;
  weightedTotal: number;
  createdAt?: any;
  round?: "prelim" | "finals";
};

type Team = { id: string; name: string; members?: string[] };

type Row = {
  teamId: string;
  total: number;
  weightedTotal: number;
  count: number;
};

export default function Results() {
  const { ready, session } = useClientSession();
  const isAdmin = ready && session?.role === "admin";

  const [settings, setSettings] = useState<any>(null);
  const [teams, setTeams] = useState<Record<string, Team>>({});
  const [prelimRows, setPrelimRows] = useState<Row[]>([]);
  const [finalRows, setFinalRows] = useState<Row[]>([]);
  const [reviewsByTeamPrelim, setRBTPrelim] = useState<
    Record<string, Review[]>
  >({});
  const [reviewsByTeamFinals, setRBTFinals] = useState<
    Record<string, Review[]>
  >({});
  const [tab, setTab] = useState<"prelim" | "finals">("prelim");

  useEffect(() => {
    (async () => {
      const s = await getDoc(doc(db, "events", EVENT_ID));
      const sData = s.exists() ? s.data() : {};
      setSettings(sData);

      const ts = await getDocs(collection(db, "events", EVENT_ID, "teams"));
      const tmap: Record<string, Team> = {};
      ts.forEach((d) => (tmap[d.id] = { id: d.id, ...(d.data() as any) }));
      setTeams(tmap);

      const rs = await getDocs(collection(db, "events", EVENT_ID, "reviews"));
      const aggPre: Record<string, Row> = {};
      const aggFin: Record<string, Row> = {};
      const byTP: Record<string, Review[]> = {};
      const byTF: Record<string, Review[]> = {};
      rs.forEach((d) => {
        const r = { id: d.id, ...(d.data() as any) } as Review;
        const isFinals = r.round === "finals";
        const bucket = isFinals ? aggFin : aggPre;
        const cur = bucket[r.teamId] || {
          teamId: r.teamId,
          total: 0,
          weightedTotal: 0,
          count: 0
        };
        cur.total += Number(r.total || 0);
        cur.weightedTotal += Number(r.weightedTotal || 0);
        cur.count += 1;
        bucket[r.teamId] = cur;

        const bt = isFinals ? byTF : byTP;
        (bt[r.teamId] ||= []).push(r);
      });

      setPrelimRows(
        Object.values(aggPre).sort(
          (a, b) =>
            b.weightedTotal / Math.max(1, b.count) -
            a.weightedTotal / Math.max(1, a.count)
        )
      );
      setFinalRows(
        Object.values(aggFin).sort(
          (a, b) =>
            b.weightedTotal / Math.max(1, b.count) -
            a.weightedTotal / Math.max(1, a.count)
        )
      );
      setRBTPrelim(byTP);
      setRBTFinals(byTF);
    })();
  }, []);

  const prelimHidden =
    settings && settings.showResultsPrelim === false && !isAdmin;
  const finalsHidden =
    settings && settings.showResultsFinals === false && !isAdmin;

  const activeHidden = tab === "prelim" ? prelimHidden : finalsHidden;
  const rows = tab === "prelim" ? prelimRows : finalRows;
  const reviewsByTeam =
    tab === "prelim" ? reviewsByTeamPrelim : reviewsByTeamFinals;

  function exportCsv(which: "prelim" | "finals") {
    const hdr = [
      "Rank",
      "Team",
      "AvgWeighted",
      "AvgRaw",
      "ReviewCount",
      "TeamId",
      "Round"
    ];
    const lines = [hdr.join(",")];
    const src = which === "prelim" ? prelimRows : finalRows;
    src.forEach((r, i) => {
      const avgW = r.weightedTotal / Math.max(1, r.count);
      const avg = r.total / Math.max(1, r.count);
      const t = teams[r.teamId];
      lines.push(
        [
          String(i + 1),
          csv(t?.name || r.teamId),
          avgW.toFixed(4),
          avg.toFixed(4),
          String(r.count),
          r.teamId,
          which
        ].join(",")
      );
    });
    const blob = new Blob([lines.join("\n")], {
      type: "text/csv;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${EVENT_ID}-results-${which}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Layout>
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              Results
            </h1>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Phase: {settings?.phase || "—"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tab === "prelim" && isAdmin && (
              <button
                onClick={() => exportCsv("prelim")}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                Export Prelim CSV
              </button>
            )}
            {tab === "finals" && isAdmin && (
              <button
                onClick={() => exportCsv("finals")}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              >
                Export Finals CSV
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setTab("prelim")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
              tab === "prelim"
                ? "bg-indigo-600 text-white ring-indigo-600"
                : "text-gray-700 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/5"
            ].join(" ")}
          >
            Prelim
          </button>
          <button
            onClick={() => setTab("finals")}
            className={[
              "rounded-full px-3 py-1 text-xs font-medium ring-1 transition",
              tab === "finals"
                ? "bg-indigo-600 text-white ring-indigo-600"
                : "text-gray-700 ring-gray-200 hover:bg-gray-50 dark:text-gray-300 dark:ring-white/10 dark:hover:bg-white/5"
            ].join(" ")}
          >
            Finals
          </button>
        </div>

        {/* Visibility banner */}
        {activeHidden && (
          <div className="mb-6 rounded-2xl border border-gray-200 p-4 text-sm text-gray-600 dark:border-white/10 dark:text-gray-400">
            {tab === "prelim" ? "Prelim" : "Finals"} results are currently
            hidden. Admins can still view them when signed in.
          </div>
        )}

        {/* Leaderboard (gated) */}
        {!activeHidden && (
          <>
            <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 dark:bg-white/5">
                  <tr>
                    <th className="px-4 py-2 text-left">Rank</th>
                    <th className="px-4 py-2 text-left">Team</th>
                    <th className="px-4 py-2 text-left">Avg (Weighted)</th>
                    <th className="px-4 py-2 text-left">Avg (Raw)</th>
                    <th className="px-4 py-2 text-left"># Reviews</th>
                    <th className="px-4 py-2 text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => {
                    const avgW = r.weightedTotal / Math.max(1, r.count);
                    const avg = r.total / Math.max(1, r.count);
                    const t = teams[r.teamId];
                    return (
                      <ResultRow
                        key={r.teamId}
                        rank={i + 1}
                        teamName={t?.name || r.teamId}
                        teamId={r.teamId}
                        avgW={avgW}
                        avg={avg}
                        count={r.count}
                        reviews={reviewsByTeam[r.teamId] || []}
                        allowDetails={
                          isAdmin || !!settings?.allowJudgeSeeOthers
                        }
                      />
                    );
                  })}
                  {rows.length === 0 && (
                    <tr>
                      <td
                        className="px-4 py-4 text-gray-500 dark:text-gray-400"
                        colSpan={6}
                      >
                        No reviews yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* All Teams */}
            <h2 className="mt-10 text-lg font-semibold text-gray-900 dark:text-white">
              All Teams
            </h2>
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.values(teams).map((t) => (
                <div
                  key={t.id}
                  className="rounded-2xl border border-gray-200 p-4 dark:border-white/10"
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {t.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Members: {t.members?.join(", ") || "—"}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}

function ResultRow({
  rank,
  teamName,
  teamId,
  avgW,
  avg,
  count,
  reviews,
  allowDetails
}: {
  rank: number;
  teamName: string;
  teamId: string;
  avgW: number;
  avg: number;
  count: number;
  reviews: Review[];
  allowDetails: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="border-t border-gray-100 align-top dark:border-white/10">
        <td className="px-4 py-2">{rank}</td>
        <td className="px-4 py-2">{teamName}</td>
        <td className="px-4 py-2">{avgW.toFixed(2)}</td>
        <td className="px-4 py-2">{avg.toFixed(2)}</td>
        <td className="px-4 py-2">{count}</td>
        <td className="px-4 py-2">
          {allowDetails && count > 0 && (
            <button
              onClick={() => setOpen((v) => !v)}
              className="rounded-md border border-gray-200 px-2 py-1 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
            >
              {open ? "Hide details" : "Show details"}
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={6} className="px-4 pb-4">
            <Details teamId={teamId} reviews={reviews} />
          </td>
        </tr>
      )}
    </>
  );
}

function Details({ teamId, reviews }: { teamId: string; reviews: Review[] }) {
  const sorted = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        const at = a.createdAt?.toMillis?.() ?? 0;
        const bt = b.createdAt?.toMillis?.() ?? 0;
        return bt - at;
      }),
    [reviews]
  );

  return (
    <div className="mt-3 rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10">
      <div className="mb-2 font-semibold">Reviews for {teamId}</div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="px-2 py-1 text-left">Round</th>
              <th className="px-2 py-1 text-left">Judge</th>
              <th className="px-2 py-1 text-left">Weighted</th>
              <th className="px-2 py-1 text-left">Raw</th>
              <th className="px-2 py-1 text-left">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr
                key={r.id}
                className="border-t border-gray-100 dark:border-white/10"
              >
                <td className="px-2 py-1">{r.round || "prelim"}</td>
                <td className="px-2 py-1">{r.judgeName || r.judgeId}</td>
                <td className="px-2 py-1">
                  {(r.weightedTotal || 0).toFixed(2)}
                </td>
                <td className="px-2 py-1">{(r.total || 0).toFixed(2)}</td>
                <td className="px-2 py-1">
                  {r.createdAt?.toDate
                    ? r.createdAt.toDate().toLocaleString()
                    : "—"}
                </td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td
                  className="px-2 py-2 text-gray-500 dark:text-gray-400"
                  colSpan={5}
                >
                  No reviews yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function csv(s: string) {
  if (s == null) return "";
  const needs = /[,"\n]/.test(s);
  return needs ? `"${s.replace(/"/g, '""')}"` : s;
}
