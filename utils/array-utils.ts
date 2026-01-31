type KeyFn<T> = keyof T | ((item: T) => string);

function getKey<T>(item: T, key: KeyFn<T>): string {
  return typeof key === 'function' ? key(item) : String((item as Record<string, unknown>)[key as string]);
}

export function uniqBy<T>(arr: T[], key: KeyFn<T>): T[] {
  const seen = new Set<string>();
  return arr.filter((item) => {
    const k = getKey(item, key);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function keyBy<T>(arr: T[], key: KeyFn<T>): Record<string, T> {
  return Object.fromEntries(arr.map((item) => [getKey(item, key), item]));
}
