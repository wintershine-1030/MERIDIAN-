export function compareStrings(a: string, b: string): number {
  if (a < b) {
    return -1;
  }
  if (a > b) {
    return 1;
  }
  return 0;
}

export function stableSortBy<T>(items: readonly T[], keyFn: (item: T) => string): T[] {
  return [...items].sort((a, b) => compareStrings(keyFn(a), keyFn(b)));
}

export function sortedKeys<T extends object>(obj: T): (keyof T & string)[] {
  return Object.keys(obj).sort(compareStrings) as (keyof T & string)[];
}

export function sortedEntries<T>(map: ReadonlyMap<string, T>): [string, T][] {
  return [...map.entries()].sort((a, b) => compareStrings(a[0], b[0]));
}

export function sortedValues<T>(set: ReadonlySet<T>, keyFn: (item: T) => string): T[] {
  return stableSortBy([...set], keyFn);
}
