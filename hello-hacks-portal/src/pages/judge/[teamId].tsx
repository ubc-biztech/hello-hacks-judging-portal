/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useRouter } from "next/router";
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
  setDoc,
  where
} from "firebase/firestore";
import { useClientSession } from "@/lib/session";

import RubricForm from "@/components/RubricForm";

type Team = {
  id: string;
  name: string;
  members?: string[];
  techStack?: string[];
  github?: string;
  devpost?: string;
  description?: string;
  imageUrls?: string[];
};

type Criterion = { id: string; label: string; weight: number };

export default function JudgeTeamPage() {
  return (
    <RoleGate allow={["judge"]}>
      <Layout>
        <Page />
      </Layout>
    </RoleGate>
  );
}

function Page() {
  const router = useRouter();
  const { teamId } = router.query as { teamId: string };
  const { ready, session } = useClientSession();

  const [settings, setSettings] = useState<any>(null);
  const [team, setTeam] = useState<Team | null>(null);
  const [rubric, setRubric] = useState<{
    criteria: Criterion[];
    scaleMax: number;
  }>({
    criteria: [],
    scaleMax: 5
  });
  const [existing, setExisting] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const judgeId = ready && session?.role === "judge" ? session.judgeId : null;
  const judgeName =
    ready && session?.role === "judge" ? session.name || "Judge" : "";

  useEffect(() => {
    if (!ready || !teamId) return;
    (async () => {
      const sSnap = await getDoc(doc(db, "events", EVENT_ID));
      setSettings(sSnap.exists() ? sSnap.data() : {});

      const tRef = doc(db, "events", EVENT_ID, "teams", teamId);
      const tSnap = await getDoc(tRef);
      if (tSnap.exists()) {
        setTeam({ id: tSnap.id, ...(tSnap.data() as any) });
      } else {
        alert("Team not found.");
      }

      const rRef = doc(db, "events", EVENT_ID, "rubric", "default");
      const rSnap = await getDoc(rRef);
      if (rSnap.exists()) {
        const d = rSnap.data() as any;
        setRubric({
          criteria: (d.criteria || []) as Criterion[],
          scaleMax: Number(d.scaleMax || 5)
        });
      } else {
        // fallback: simple 4-criterion default if rubric is missing
        setRubric({
          criteria: [
            { id: "innovation", label: "Innovation", weight: 1 },
            { id: "technical", label: "Technical Complexity", weight: 1 },
            { id: "usability", label: "Usability / UX", weight: 1 },
            { id: "impact", label: "Impact / Value", weight: 1 }
          ],
          scaleMax: 5
        });
      }

      // Existing review by this judge for this team
      if (judgeId) {
        const q1 = query(
          collection(db, "events", EVENT_ID, "reviews"),
          where("teamId", "==", teamId),
          where("judgeId", "==", judgeId)
        );
        const rs = await getDocs(q1);
        if (!rs.empty) {
          setExisting({ id: rs.docs[0].id, ...(rs.docs[0].data() as any) });
        } else {
          setExisting(null);
        }
      }
    })();
  }, [ready, teamId, judgeId]);

  const weights = useMemo<Record<string, number>>(() => {
    const m: Record<string, number> = {};
    rubric.criteria.forEach((c) => (m[c.id] = Number(c.weight || 1)));
    return m;
  }, [rubric.criteria]);

  const displayName =
    settings?.anonymizeTeams && team
      ? `Team ${team.id.slice(0, 4).toUpperCase()}`
      : team?.name || "Team";

  const isClosed = settings?.phase === "closed";

  async function handleSubmit(
    scores: Record<string, number>,
    feedback: string
  ) {
    if (!team || !judgeId) return;
    if (isClosed) {
      alert("Judging is closed.");
      return;
    }
    setSubmitting(true);
    try {
      const weightSum = Object.values(weights).reduce(
        (a, b) => a + (b || 0),
        0
      );
      const total = Object.values(scores).reduce(
        (a, v) => a + Number(v || 0),
        0
      );
      const weightedTotal =
        Object.entries(scores).reduce(
          (a, [k, v]) => a + Number(v || 0) * (weights[k] || 1),
          0
        ) / Math.max(1, weightSum);

      const reviewId = `${team.id}__${judgeId}`;
      await setDoc(
        doc(db, "events", EVENT_ID, "reviews", reviewId),
        {
          teamId: team.id,
          judgeId,
          judgeName,
          scores,
          feedback,
          total,
          weightedTotal,
          createdAt: new Date()
        },
        { merge: true }
      );

      alert("Submitted!");
      setExisting({
        id: reviewId,
        teamId: team.id,
        judgeId,
        judgeName,
        scores,
        feedback,
        total,
        weightedTotal,
        createdAt: new Date()
      });
    } catch (e: any) {
      alert(e.message || "Error submitting review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {displayName}
          </h1>
          {settings?.phase && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Phase: {settings.phase}
              {isClosed ? " (read-only)" : ""}
            </p>
          )}
        </div>
        <button
          onClick={() => router.back()}
          className="rounded-md border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
        >
          Back
        </button>
      </div>

      {/* Team details */}
      {team ? (
        <div className="rounded-2xl border border-gray-200 p-4 mb-6 dark:border-white/10">
          <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
            {team.members?.length ? (
              <div>
                <span className="font-medium">Members:</span>{" "}
                {team.members.join(", ")}
              </div>
            ) : null}
            {team.techStack?.length ? (
              <div>
                <span className="font-medium">Tech:</span>{" "}
                {team.techStack.join(", ")}
              </div>
            ) : null}
            {team.github ? (
              <div>
                <span className="font-medium">GitHub:</span>{" "}
                <a
                  className="underline"
                  href={team.github}
                  target="_blank"
                  rel="noreferrer"
                >
                  Repo
                </a>
              </div>
            ) : null}
            {team.devpost ? (
              <div>
                <span className="font-medium">Devpost:</span>{" "}
                <a
                  className="underline"
                  href={team.devpost}
                  target="_blank"
                  rel="noreferrer"
                >
                  Link
                </a>
              </div>
            ) : null}
            {team.description ? (
              <p className="mt-2 text-sm leading-6">{team.description}</p>
            ) : null}
            {!!team.imageUrls?.length && (
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {team.imageUrls.slice(0, 10).map((u, i) => (
                  <img
                    key={i}
                    src={u}
                    alt=""
                    className="aspect-video w-full rounded-lg object-cover border border-gray-200 dark:border-white/10"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 text-sm text-gray-500 dark:text-gray-400">
          Loading team…
        </div>
      )}

      {/* Rubric form */}
      {rubric.criteria.length > 0 ? (
        <RubricForm
          criteria={rubric.criteria}
          scaleMax={rubric.scaleMax}
          submitting={submitting}
          defaultScores={existing?.scores}
          defaultFeedback={existing?.feedback}
          onSubmit={handleSubmit}
        />
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Loading rubric…
        </div>
      )}
    </div>
  );
}
