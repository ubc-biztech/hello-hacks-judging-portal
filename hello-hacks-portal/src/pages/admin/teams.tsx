"use client";

import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import { useEffect, useState } from "react";
import { db, EVENT_ID } from "@/lib/firebase";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { getSession } from "@/lib/session";
import Link from "next/link";

type Team = {
  id: string;
  name: string;
  members: string[];
  techStack: string[];
  teamCode?: string;
  github?: string;
  devpost?: string;
  description?: string;
};

export default function AdminTeams() {
  return (
    <RoleGate allow={["admin"]}>
      <Layout>
        <Page />
      </Layout>
    </RoleGate>
  );
}

function Page() {
  const [list, setList] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: "", members: "", teamCode: "" });
  const admin = getSession() as any;

  async function load() {
    setLoading(true);
    const qt = query(
      collection(db, "events", EVENT_ID, "teams"),
      orderBy("name")
    );
    const snap = await getDocs(qt);
    setList(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  async function createTeam() {
    if (!form.name) return alert("Team name required");
    await addDoc(collection(db, "events", EVENT_ID, "teams"), {
      name: form.name,
      members: form.members
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      techStack: [],
      github: "",
      devpost: "",
      description: "",
      teamCode: form.teamCode || "",
      imageUrls: [],
      createdAt: serverTimestamp(),
      _adminJudgeId: "admin",
      _adminJudgeCode: admin?.adminCode || "ADMIN"
    } as any);
    setForm({ name: "", members: "", teamCode: "" });
    await load();
  }

  async function saveTeam(t: Team) {
    await updateDoc(doc(db, "events", EVENT_ID, "teams", t.id), {
      name: t.name,
      members: t.members,
      techStack: t.techStack,
      teamCode: t.teamCode || "",
      github: t.github || "",
      devpost: t.devpost || "",
      description: t.description || "",
      _adminJudgeId: "admin",
      _adminJudgeCode: admin?.adminCode || "ADMIN"
    } as any);
    await load();
  }

  async function removeTeam(t: Team) {
    if (!confirm(`Delete team "${t.name}"?`)) return;
    await deleteDoc(doc(db, "events", EVENT_ID, "teams", t.id));
    await load();
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-bold">Teams</h1>

      <div className="mt-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
        <div className="text-lg font-semibold">Create Team</div>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-4">
          <input
            className="rounded-lg border border-gray-200 p-2 text-sm dark:border-white/10 dark:bg-transparent"
            placeholder="Team Name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-200 p-2 text-sm dark:border-white/10 dark:bg-transparent"
            placeholder="Members (comma-separated)"
            value={form.members}
            onChange={(e) => setForm({ ...form, members: e.target.value })}
          />
          <input
            className="rounded-lg border border-gray-200 p-2 text-sm dark:border-white/10 dark:bg-transparent"
            placeholder="Team Code (optional)"
            value={form.teamCode}
            onChange={(e) => setForm({ ...form, teamCode: e.target.value })}
          />
          <button
            onClick={createTeam}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Create
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 dark:bg-white/5">
            <tr>
              <th className="px-4 py-2 text-left">Team</th>
              <th className="px-4 py-2 text-left">Members</th>
              <th className="px-4 py-2 text-left">Team Code</th>
              <th className="px-4 py-2 text-left">Tech</th>
              <th className="px-4 py-2 text-left">Links</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-4 py-4" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading &&
              list.map((t) => (
                <EditableTeamRow
                  key={t.id}
                  t={t}
                  onSave={saveTeam}
                  onDelete={removeTeam}
                />
              ))}
            {!loading && list.length === 0 && (
              <tr>
                <td
                  className="px-4 py-4 text-gray-500 dark:text-gray-400"
                  colSpan={6}
                >
                  No teams yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EditableTeamRow({
  t,
  onSave,
  onDelete
}: {
  t: Team;
  onSave: (t: Team) => Promise<void>;
  onDelete: (t: Team) => Promise<void>;
}) {
  const [edit, setEdit] = useState<Team>({ ...t });
  const [member, setMember] = useState("");
  const [techItem, setTechItem] = useState("");

  function addMember() {
    const m = member.trim();
    if (!m) return;
    setEdit((e) => ({ ...e, members: [...(e.members || []), m] }));
    setMember("");
  }
  function removeMember(i: number) {
    setEdit((e) => ({
      ...e,
      members: e.members.filter((_, idx) => idx !== i)
    }));
  }
  function addTech() {
    const m = techItem.trim();
    if (!m) return;
    setEdit((e) => ({ ...e, techStack: [...(e.techStack || []), m] }));
    setTechItem("");
  }
  function removeTech(i: number) {
    setEdit((e) => ({
      ...e,
      techStack: e.techStack.filter((_, idx) => idx !== i)
    }));
  }

  return (
    <tr className="align-top border-t border-gray-100 dark:border-white/10">
      <td className="px-4 py-3">
        <input
          className="w-full rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
          value={edit.name}
          onChange={(e) => setEdit({ ...edit, name: e.target.value })}
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {(edit.members || []).map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-white/10"
            >
              {m}
              <button
                className="text-gray-500 hover:text-rose-600"
                onClick={() => removeMember(i)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
            placeholder="Add member"
            value={member}
            onChange={(e) => setMember(e.target.value)}
          />
          <button
            onClick={addMember}
            className="rounded-md border border-gray-200 px-2 text-xs dark:border-white/10"
          >
            Add
          </button>
        </div>
      </td>

      <td className="px-4 py-3">
        <input
          className="w-36 rounded-md border border-gray-200 px-2 py-1 text-sm font-mono dark:border-white/10 dark:bg-transparent"
          value={edit.teamCode || ""}
          onChange={(e) => setEdit({ ...edit, teamCode: e.target.value })}
        />
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-2">
          {(edit.techStack || []).map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-white/10"
            >
              {m}
              <button
                className="text-gray-500 hover:text-rose-600"
                onClick={() => removeTech(i)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            className="min-w-0 flex-1 rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
            placeholder="Add tech"
            value={techItem}
            onChange={(e) => setTechItem(e.target.value)}
          />
          <button
            onClick={addTech}
            className="rounded-md border border-gray-200 px-2 text-xs dark:border-white/10"
          >
            Add
          </button>
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="grid gap-2">
          <input
            className="w-56 rounded-md border border-gray-200 px-2 py-1 text-xs font-mono dark:border-white/10 dark:bg-transparent"
            placeholder="GitHub URL"
            value={(edit as any).github || ""}
            onChange={(e) => setEdit({ ...edit, github: e.target.value })}
          />
          <input
            className="w-56 rounded-md border border-gray-200 px-2 py-1 text-xs font-mono dark:border-white/10 dark:bg-transparent"
            placeholder="Devpost URL"
            value={(edit as any).devpost || ""}
            onChange={(e) => setEdit({ ...edit, devpost: e.target.value })}
          />
          <textarea
            className="w-56 rounded-md border border-gray-200 px-2 py-1 text-xs dark:border-white/10 dark:bg-transparent"
            placeholder="Description"
            rows={3}
            value={(edit as any).description || ""}
            onChange={(e) => setEdit({ ...edit, description: e.target.value })}
          />
        </div>
      </td>

      <td className="px-4 py-3">
        <div className="flex flex-col gap-2">
          <Link
            href={`/admin/teams/${t.id}`}
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs text-center dark:border-white/10"
          >
            View
          </Link>
          <button
            className="rounded-lg border border-gray-200 px-3 py-1 text-xs dark:border-white/10"
            onClick={() => onSave(edit)}
          >
            Save
          </button>
          <button
            className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
            onClick={() => onDelete(edit)}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}
