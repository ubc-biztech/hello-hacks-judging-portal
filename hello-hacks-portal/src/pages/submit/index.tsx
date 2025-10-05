"use client";

import { useEffect, useState } from "react";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import { db, EVENT_ID, storage } from "@/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useClientSession } from "@/lib/session";

function Page() {
  const { ready, session } = useClientSession();
  const [team, setTeam] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  const [github, setGithub] = useState("");
  const [devpost, setDevpost] = useState("");
  const [desc, setDesc] = useState("");
  const [tech, setTech] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);

  useEffect(() => {
    if (!ready) return;
    (async () => {
      const sSnap = await getDoc(doc(db, "events", EVENT_ID));
      setSettings(sSnap.exists() ? sSnap.data() : {});
      if (session?.role !== "team") return;
      const tRef = doc(db, "events", EVENT_ID, "teams", session.teamId);
      const tSnap = await getDoc(tRef);
      if (!tSnap.exists()) {
        alert("Team not found. Contact an organizer.");
        return;
      }
      const data = { id: tSnap.id, ...(tSnap.data() as any) };
      setTeam(data);
      setGithub(data.github || "");
      setDevpost(data.devpost || "");
      setDesc(data.description || "");
      setTech((data.techStack || []).join(", "));
    })();
  }, [ready, session]);

  async function handleUploadImages(
    teamId: string,
    teamCode: string
  ): Promise<string[]> {
    if (!files || !files.length) return [];
    const max = settings?.maxImages ?? 10;
    const limit = Math.min(files.length, max);
    const urls: string[] = [];
    for (let i = 0; i < limit; i++) {
      const f = files[i];
      const path = `events/${EVENT_ID}/teams/${teamId}/${Date.now()}_${i}_${
        f.name
      }`;
      const r = ref(storage, path);
      await uploadBytes(r, f, { customMetadata: { teamId, teamCode } });
      urls.push(await getDownloadURL(r));
    }
    return urls;
  }

  async function save() {
    if (!team) return;
    if (settings?.lockSubmissions) {
      alert("Submissions are locked.");
      return;
    }
    setBusy(true);
    try {
      const extra = await handleUploadImages(team.id, team.teamCode || "");
      const max = settings?.maxImages ?? 10;
      const imageUrls = [...(team.imageUrls || []), ...extra].slice(0, max);
      await updateDoc(doc(db, "events", EVENT_ID, "teams", team.id), {
        github,
        devpost,
        description: desc,
        techStack: tech
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        imageUrls,
        teamCode: team.teamCode || ""
      });
      setTeam((t: any) => ({
        ...t,
        github,
        devpost,
        description: desc,
        techStack: tech
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        imageUrls
      }));
      alert("Submission saved!");
    } catch (e: any) {
      alert(e.message || "Error saving.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-bold">Team Submission</h1>

        {settings?.lockSubmissions && (
          <p className="mt-2 rounded-md bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-400">
            Submissions are currently locked.
          </p>
        )}

        {!ready && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading…
          </div>
        )}

        {ready && !team && (
          <div className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Loading your team…
          </div>
        )}

        {team && (
          <div className="mt-6 space-y-4">
            <div className="text-sm text-gray-500 dark:text-gray-400">
              Team:{" "}
              <span className="font-medium text-gray-900 dark:text-white">
                {team.name}
              </span>
            </div>

            <input
              value={github}
              onChange={(e) => setGithub(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="GitHub URL"
            />
            <input
              value={devpost}
              onChange={(e) => setDevpost(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="Devpost URL"
            />
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="Description"
            />
            <input
              value={tech}
              onChange={(e) => setTech(e.target.value)}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm dark:border-white/10 dark:bg-transparent"
              placeholder="Tech stack (comma-separated)"
            />

            <div className="text-xs text-gray-500 dark:text-gray-400">
              Max images: {settings?.maxImages ?? 10}
            </div>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setFiles(e.target.files)}
              className="block w-full text-sm"
            />

            <button
              disabled={busy || settings?.lockSubmissions}
              onClick={save}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              Save
            </button>

            {!!team.imageUrls?.length && (
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {team.imageUrls.map((u: string, i: number) => (
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
        )}
      </div>
    </Layout>
  );
}

export default function Submit() {
  return (
    <RoleGate allow={["team"]}>
      <Page />
    </RoleGate>
  );
}
