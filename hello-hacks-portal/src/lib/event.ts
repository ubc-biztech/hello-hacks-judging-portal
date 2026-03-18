export const DEFAULT_EVENT_ID = "produhacks-2026";
export const DEFAULT_EVENT_NAME = "ProduHacks 2026";

export function getEventInitials(name: string) {
  const words = name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .split(/[^A-Za-z0-9]+/)
    .filter((word) => word && !/^\d+$/.test(word));

  const initials = words
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);

  return initials || "EV";
}
