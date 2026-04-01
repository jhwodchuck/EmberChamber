export async function dbFirst<T>(
  db: D1Database,
  query: string,
  ...params: unknown[]
): Promise<T | null> {
  return db.prepare(query).bind(...params).first<T>();
}

export async function dbAll<T>(
  db: D1Database,
  query: string,
  ...params: unknown[]
): Promise<T[]> {
  const result = await db.prepare(query).bind(...params).all<T>();
  return result.results ?? [];
}

export async function dbRun(db: D1Database, query: string, ...params: unknown[]): Promise<void> {
  await db.prepare(query).bind(...params).run();
}
