export function sortByNameOrDate<
  T extends { name: string; created_at: string },
>(
  items: T[],
  sortKey: "name-asc" | "name-desc" | "date-desc" | "date-asc",
): T[] {
  const list = [...items];

  switch (sortKey) {
    case "name-asc":
      return list.sort((a, b) => a.name.localeCompare(b.name));
    case "name-desc":
      return list.sort((a, b) => b.name.localeCompare(a.name));
    case "date-desc":
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
    case "date-asc":
      return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
  }
}
