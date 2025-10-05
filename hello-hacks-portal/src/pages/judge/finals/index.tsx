"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import { useClientSession } from "@/lib/session";
import { db, EVENT_ID } from "@/lib/firebase";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where
} from "firebase/firestore";
import Link from "next/link";

type Team = { id: string; name: string; members?: string[] };

export default function JudgeFinalsIndex() {
  return (
    <RoleGate allow={["judge"]}>
      <Layout>
        <Page />
      </Layout>
    </RoleGate>
  );
}

function Page() {
  const { ready, session } = useClientSession();
  const judgeId = ready && session?.role === "judge" ? session.judgeId : null;

  const [settings, setSettings] = useState<any>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [judgedIds, setJudgedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!ready || !judgeId) return;
    (async () => {
      const s = await getDoc(doc(db, "events", EVENT_ID));
      const sData = s.exists() ? s.data() : {};
      setSettings(sData);

      const finalsJudgeIds: string[] = sData.finalsJudgeIds || [];
      if (!finalsJudgeIds.includes(judgeId)) {
        alert("You are not assigned as a finals judge.");
        return;
      }

      const finalsTeamIds: string[] = sData.finalsTeamIds || [];
      const ts = await getDocs(collection(db, "events", EVENT_ID, "teams"));
      const all: Team[] = [];
      ts.forEach((d) => all.push({ id: d.id, ...(d.data() as any) }));
      const finalsTeams = all.filter((t) => finalsTeamIds.includes(t.id));
      setTeams(finalsTeams);

      const rq = query(
        collection(db, "events", EVENT_ID, "reviews"),
        where("judgeId", "==", judgeId),
        where("round", "==", "finals")
      );
      const rs = await getDocs(rq);
      const done = new Set<string>();
      rs.forEach((d) => done.add((d.data() as any).teamId));
      setJudgedIds(done);
    })();
  }, [ready, judgeId]);

  const progress = useMemo(() => {
    const total = teams.length;
    const done = teams.filter((t) => judgedIds.has(t.id)).length;
    return { done, total };
  }, [teams, judgedIds]);

  if (!judgeId) {
    return (
      <div className="p-6 text-sm text-gray-500 dark:text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          Finals Judging
        </h1>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Phase: {settings?.phase || "—"} • Progress: {progress.done}/
          {progress.total}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {teams.map((t) => {
          const done = judgedIds.has(t.id);
          return (
            <Link
              href={`/judge/finals/${t.id}`}
              key={t.id}
              className={[
                "rounded-2xl border p-4 transition",
                done
                  ? "border-green-300/40 bg-green-50 dark:border-green-400/20 dark:bg-green-400/5"
                  : "border-gray-200 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {t.name}
                  </div>
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Members: {t.members?.join(", ") || "—"}
                  </div>
                </div>
                {done ? (
                  <span className="rounded-md bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-400">
                    Judged
                  </span>
                ) : null}
              </div>
            </Link>
          );
        })}
        {teams.length === 0 && (
          <div className="rounded-2xl border border-gray-200 p-4 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
            No finals teams assigned yet.
          </div>
        )}
      </div>
    </div>
  );
}
