"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import TeamCard from "@/components/TeamCard";
import { listTeamsByIds } from "@/lib/firestore";
import {
  collection,
  getDoc,
  getDocs,
  query,
  where,
  doc
} from "firebase/firestore";
import { db, EVENT_ID } from "@/lib/firebase";
import { getSession } from "@/lib/session";

function Page() {
  const [judge, setJudge] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [doneTeamIds, setDone] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const s = await getDoc(doc(db, "events", EVENT_ID));
      setSettings(s.exists() ? s.data() : {});
    })();
  }, []);

  useEffect(() => {
    const s = getSession();
    if (s?.role === "judge")
      setJudge({ id: s.judgeId, name: s.name, code: s.judgeCode });
  }, []);

  useEffect(() => {
    async function load() {
      if (!judge) return;
      const jDoc = await getDoc(
        doc(db, "events", EVENT_ID, "judges", judge.id)
      );
      const assigned = (jDoc.data() as any)?.assignedTeamIds || [];
      const t = await listTeamsByIds(assigned);
      setTeams(t);
      const qReviews = query(
        collection(db, "events", EVENT_ID, "reviews"),
        where("judgeId", "==", judge.id)
      );
      const rs = await getDocs(qReviews);
      setDone(new Set(rs.docs.map((d) => d.data().teamId)));
    }
    load();
  }, [judge]);

  const progress = useMemo(() => {
    const d = doneTeamIds.size;
    const total = teams.length || 0;
    return `${d}/${total} completed`;
  }, [doneTeamIds, teams]);

  return (
    <Layout>
      <div className="p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold">Welcome, {judge?.name || "—"}</h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {progress}
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((t) => (
            <TeamCard
              key={t.id}
              team={{
                ...t,
                name: settings?.anonymizeTeams
                  ? `Team ${t.id.slice(0, 4).toUpperCase()}`
                  : t.name
              }}
              judged={doneTeamIds.has(t.id)}
            />
          ))}
          {teams.length === 0 && (
            <div className="text-sm text-gray-500 dark:text-gray-400">
              No assignments yet.
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

export default function JudgeHome() {
  return (
    <RoleGate allow={["judge"]}>
      <Page />
    </RoleGate>
  );
}
