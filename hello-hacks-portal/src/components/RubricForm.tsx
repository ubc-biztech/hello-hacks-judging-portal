import { useEffect, useState } from "react";
import { Criterion } from "@/lib/types";

export default function RubricForm({
  criteria,
  scaleMax,
  onSubmit,
  submitting,
  defaultScores,
  defaultFeedback,
  readOnly = false
}: {
  criteria: Criterion[];
  scaleMax: number;
  submitting?: boolean;
  onSubmit: (
    scores: Record<string, number>,
    feedback: string
  ) => void | Promise<void>;
  /** Optional: prefill the rubric with an existing review’s scores */
  defaultScores?: Record<string, number>;
  /** Optional: prefill the feedback text */
  defaultFeedback?: string;
  /** Optional: render in read-only mode (disables inputs & submit) */
  readOnly?: boolean;
}) {
  const [scores, setScores] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState("");

  useEffect(() => {
    const s: Record<string, number> = {};
    for (const c of criteria) {
      s[c.id] = defaultScores?.[c.id] ?? 0;
    }
    setScores(s);
  }, [criteria, defaultScores]);

  useEffect(() => {
    if (typeof defaultFeedback === "string") setFeedback(defaultFeedback);
  }, [defaultFeedback]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(scores, feedback);
      }}
      className="space-y-6"
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {criteria.map((c) => (
          <div
            key={c.id}
            className="rounded-xl border border-gray-200 p-4 dark:border-white/10"
          >
            <div className="mb-2 flex items-center justify-between">
              <div className="font-medium text-gray-900 dark:text-white">
                {c.label}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Weight: {c.weight}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {Array.from({ length: scaleMax + 1 }).map((_, i) => {
                const active = scores[c.id] === i;
                return (
                  <button
                    type="button"
                    key={i}
                    disabled={readOnly}
                    onClick={() =>
                      setScores((s) => ({
                        ...s,
                        [c.id]: i
                      }))
                    }
                    className={`rounded-lg border px-3 py-1 text-sm transition
                      ${
                        active
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-gray-300 dark:hover:bg-white/5"
                      }`}
                  >
                    {i}
                  </button>
                );
              })}
            </div>

            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Selected: <span className="font-medium">{scores[c.id]}</span> /{" "}
              {scaleMax}
            </div>
          </div>
        ))}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-900 dark:text-white">
          Feedback
        </label>
        <textarea
          className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:bg-transparent"
          rows={4}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Share constructive feedback…"
          disabled={readOnly}
        />
      </div>

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => {
            const cleared: Record<string, number> = {};
            for (const c of criteria) cleared[c.id] = 0;
            setScores(cleared);
            setFeedback("");
          }}
          className="rounded-xl border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
          disabled={readOnly || submitting}
        >
          Clear
        </button>

        <button
          type="submit"
          disabled={readOnly || submitting}
          className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit review"}
        </button>
      </div>
    </form>
  );
}
