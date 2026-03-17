"use client";

import { useEffect, useMemo, useState } from "react";
import Layout from "@/components/Layout";
import RoleGate from "@/components/RoleGate";
import { db, EVENT_ID } from "@/lib/firebase";
import { normalizeRubric } from "@/lib/judging";
import { Criterion, Rubric } from "@/lib/types";
import { doc, getDoc, setDoc } from "firebase/firestore";

export default function RubricPage() {
  return (
    <RoleGate allow={["admin"]}>
      <Layout>
        <Page />
      </Layout>
    </RoleGate>
  );
}

function Page() {
  const [rubric, setRubric] = useState<Rubric>(normalizeRubric());
  const [loading, setLoading] = useState(true);
  const ref = useMemo(
    () => doc(db, "events", EVENT_ID, "rubric", "default"),
    []
  );

  useEffect(() => {
    (async () => {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setRubric(normalizeRubric(snap.data() as Partial<Rubric>));
      } else {
        setRubric(normalizeRubric());
      }
      setLoading(false);
    })();
  }, [ref]);

  function addCrit() {
    setRubric((r) => ({
      ...r,
      criteria: [
        ...r.criteria,
        {
          id: crypto.randomUUID().slice(0, 8),
          label: "New criterion",
          description: "",
          weight: 1,
          maxScore: r.scaleMax
        }
      ]
    }));
  }
  function updateCrit(i: number, patch: Partial<Criterion>) {
    setRubric((r) => {
      const arr = r.criteria.slice();
      arr[i] = { ...arr[i], ...patch };
      return { ...r, criteria: arr };
    });
  }
  function removeCrit(i: number) {
    setRubric((r) => ({
      ...r,
      criteria: r.criteria.filter((_, idx) => idx !== i)
    }));
  }
  async function save() {
    const normalized = normalizeRubric(rubric);
    await setDoc(ref, normalized, { merge: true });
    setRubric(normalized);
    alert("Rubric saved");
  }

  if (loading) return null;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Rubric</h1>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm font-medium">Name</label>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200 p-2 text-sm dark:border-white/10 dark:bg-transparent"
            value={rubric.name}
            onChange={(e) => setRubric((r) => ({ ...r, name: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-sm font-medium">Default max score</label>
          <input
            type="number"
            min={1}
            className="mt-1 w-24 rounded-lg border border-gray-200 p-2 text-sm dark:border-white/10 dark:bg-transparent"
            value={rubric.scaleMax}
            onChange={(e) =>
              setRubric((r) => ({
                ...r,
                scaleMax: Math.max(1, Math.round(Number(e.target.value || 1)))
              }))
            }
          />
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <div className="text-lg font-semibold">Criteria</div>
          <button
            onClick={addCrit}
            className="rounded-lg border border-gray-200 px-3 py-1 text-sm dark:border-white/10"
          >
            Add
          </button>
        </div>

        <div className="space-y-3">
          {rubric.criteria.map((c, i) => (
            <div
              key={c.id}
              className="rounded-xl border border-gray-200 p-3 dark:border-white/10"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
                <div className="sm:col-span-5">
                  <label className="text-xs font-medium">Label</label>
                  <input
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                    value={c.label}
                    onChange={(e) => updateCrit(i, { label: e.target.value })}
                  />
                  <label className="mt-3 block text-xs font-medium">Description</label>
                  <textarea
                    rows={4}
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                    value={c.description || ""}
                    onChange={(e) =>
                      updateCrit(i, { description: e.target.value })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium">Weight</label>
                  <input
                    type="number"
                    min={0.1}
                    step="0.1"
                    className="mt-1 w-24 rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                    value={c.weight}
                    onChange={(e) =>
                      updateCrit(i, { weight: Number(e.target.value || 1) })
                    }
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-xs font-medium">Max score</label>
                  <input
                    type="number"
                    min={1}
                    step={1}
                    className="mt-1 w-24 rounded-md border border-gray-200 px-2 py-1 text-sm dark:border-white/10 dark:bg-transparent"
                    value={c.maxScore ?? rubric.scaleMax}
                    onChange={(e) =>
                      updateCrit(i, {
                        maxScore: Math.max(1, Math.round(Number(e.target.value || 1)))
                      })
                    }
                  />
                </div>
                <div className="sm:col-span-3">
                  <label className="text-xs font-medium">ID (read-only)</label>
                  <input
                    disabled
                    className="mt-1 w-full rounded-md border border-gray-200 px-2 py-1 text-xs font-mono opacity-70 dark:border-white/10 dark:bg-transparent"
                    value={c.id}
                  />
                </div>
                <div className="flex items-end sm:justify-end">
                  <button
                    onClick={() => removeCrit(i)}
                    className="rounded-md bg-rose-600 px-3 py-1 text-xs font-semibold text-white"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
          {rubric.criteria.length === 0 && (
            <div className="rounded-xl border border-dashed border-gray-200 p-6 text-sm text-gray-500 dark:border-white/10 dark:text-gray-400">
              No criteria yet. Click “Add”.
            </div>
          )}
        </div>
      </div>

      <div className="mt-6">
        <button
          onClick={save}
          className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white"
        >
          Save rubric
        </button>
      </div>
    </div>
  );
}
