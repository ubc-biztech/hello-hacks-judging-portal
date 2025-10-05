/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  onSnapshot,
  query,
  where,
  getDocs
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useEffect, useState } from "react";
import Card from "@/components/Card";
import Link from "next/link";
import Badge from "@/components/Badge";

type Item = {
  id: string;
  name: string;
  status: "Unseen" | "In progress" | "Done";
};

export default function Queue() {
  const sessionId =
    typeof window !== "undefined" ? localStorage.getItem("sessionId")! : "";
  const judgeId =
    typeof window !== "undefined" ? localStorage.getItem("judgeId")! : "";
  const eventId =
    typeof window !== "undefined" ? localStorage.getItem("eventId")! : "";

  const [items, setItems] = useState<Item[]>([]);

  useEffect(() => {
    if (!judgeId || !eventId) return;
    // Listen to assignments
    const qA = query(
      collection(db, "assignments"),
      where("eventId", "==", eventId),
      where("judgeId", "==", judgeId)
    );
    const unsub = onSnapshot(qA, async (snap) => {
      const teamIds = snap.docs.map((d) => d.data().teamId as string);
      // load teams
      const teams = await Promise.all(
        teamIds.map(async (tid) => {
          const s = await getDocs(
            query(
              collection(db, "scores"),
              where("eventId", "==", eventId),
              where("teamId", "==", tid),
              where("judgeId", "==", judgeId)
            )
          );
          const hasAny = !s.empty;
          const allSubmitted =
            s.docs.length > 0 &&
            s.docs.every((d) => (d.data() as any).submittedAt);
          const status: Item["status"] = allSubmitted
            ? "Done"
            : hasAny
            ? "In progress"
            : "Unseen";
          return { id: tid, status };
        })
      );
      // fetch team names
      const qT = query(
        collection(db, "teams"),
        where("eventId", "==", eventId)
      );
      const tSnap = await getDocs(qT);
      const nameMap = new Map(
        tSnap.docs.map((d) => [d.id, (d.data() as any).name])
      );
      setItems(
        teams.map((t) => ({
          id: t.id,
          status: t.status,
          name: nameMap.get(t.id) || t.id
        }))
      );
    });
    return () => unsub();
  }, [judgeId, eventId]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Your Assigned Teams</h1>
      <div className="grid md:grid-cols-2 gap-4">
        {items.map((i) => (
          <Card key={i.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{i.name}</div>
              <div className="text-xs text-ink-200">{i.id}</div>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                tone={
                  i.status === "Done"
                    ? "green"
                    : i.status === "In progress"
                    ? "blue"
                    : "gray"
                }
              >
                {i.status}
              </Badge>
              <Link className="underline" href={`/judge/team/${i.id}`}>
                Open
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
