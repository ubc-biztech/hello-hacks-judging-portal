import Link from "next/link";
import { Team } from "@/lib/types";

export default function TeamCard({
  team,
  judged
}: {
  team: Team;
  judged: boolean;
}) {
  return (
    <Link
      href={`/judge/${team.id}`}
      className="block rounded-2xl border border-gray-200 p-4 hover:bg-gray-50 dark:border-white/10 dark:hover:bg-white/5"
    >
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold text-gray-900 dark:text-white">
          {team.name}
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full ${
            judged
              ? "bg-green-500/10 text-green-600"
              : "bg-amber-500/10 text-amber-600"
          }`}
        >
          {judged ? "Judged" : "To judge"}
        </span>
      </div>
      <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
        Members: {team.members?.join(", ") || "—"}
      </div>
    </Link>
  );
}
