/* eslint-disable @typescript-eslint/no-explicit-any */
export default function Badge({
  children,
  tone = "gray"
}: {
  children: React.ReactNode;
  tone?: "gray" | "blue" | "green";
}) {
  const map: any = {
    gray: "bg-ink-800 text-ink-200",
    blue: "bg-ink-700 text-ink-100",
    green: "bg-green-700 text-green-100"
  };
  return (
    <span className={`px-2 py-0.5 rounded-md text-xs ${map[tone]}`}>
      {children}
    </span>
  );
}
