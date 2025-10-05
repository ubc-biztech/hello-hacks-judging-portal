/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  setDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  orderBy,
  onSnapshot,
  writeBatch
} from "firebase/firestore";
import { db } from "./firebase";
import { ID, SessionDoc } from "./types";

// Make a short-lived session (12h)
export async function createSession(
  role: SessionDoc["role"],
  eventId: ID,
  userId: ID
) {
  const id = crypto.randomUUID();
  const expiresAt = Date.now() + 12 * 60 * 60 * 1000;
  await setDoc(doc(db, "sessions", id), {
    id,
    role,
    eventId,
    userId,
    expiresAt
  });
  return id;
}

// Verify judge code -> return judge + sessionId
export async function loginJudge(eventId: ID, code: string) {
  const qs = query(
    collection(db, "judges"),
    where("eventId", "==", eventId),
    where("code", "==", code)
  );
  const snap = await getDocs(qs);
  if (snap.empty) throw new Error("Invalid code");
  const judge = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
  const sessionId = await createSession(
    judge.isAdmin ? "admin" : "judge",
    eventId,
    judge.id
  );
  return { judge, sessionId };
}

// Verify team code for submissions
export async function loginTeam(eventId: ID, teamCode: string) {
  const qs = query(
    collection(db, "teams"),
    where("eventId", "==", eventId),
    where("teamCode", "==", teamCode)
  );
  const snap = await getDocs(qs);
  if (snap.empty) throw new Error("Invalid team code");
  const team = { id: snap.docs[0].id, ...snap.docs[0].data() } as any;
  const sessionId = await createSession("team", eventId, team.id);
  return { team, sessionId };
}
