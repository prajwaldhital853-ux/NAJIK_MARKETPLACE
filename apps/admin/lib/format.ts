export function npr(value: number) {
  return `NPR ${value.toLocaleString("en-NP")}`;
}

export function compact(value: number) {
  return value.toLocaleString("en-US");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join("");
}

export const AVATAR = [
  "#1b7d2c",
  "#3d6b5a",
  "#5a6b52",
  "#7a5c3a",
  "#4a6356",
  "#6b7054",
  "#167a38",
  "#5f6368",
];

export function colorFor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash + ch.charCodeAt(0)) % AVATAR.length;
  return AVATAR[hash]!;
}
