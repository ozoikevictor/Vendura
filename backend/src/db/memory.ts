import type { Database, Entity } from "../types.js";

export class MemoryDatabase implements Database {
  private collections = new Map<string, Map<string, Entity>>();
  async connect() {}
  async close() {}
  async reset() { this.collections.clear(); }
  private collection(name: string) {
    if (!this.collections.has(name)) this.collections.set(name, new Map());
    return this.collections.get(name)!;
  }
  async list<T extends Entity>(name: string): Promise<T[]> {
    return structuredClone([...this.collection(name).values()]) as T[];
  }
  async get<T extends Entity>(name: string, id: string): Promise<T | null> {
    const value = this.collection(name).get(id);
    return value ? structuredClone(value) as T : null;
  }
  async findOne<T extends Entity>(name: string, query: Partial<T>): Promise<T | null> {
    const value = [...this.collection(name).values()].find((item) =>
      Object.entries(query).every(([key, expected]) => item[key] === expected));
    return value ? structuredClone(value) as T : null;
  }
  async create<T extends Entity>(name: string, value: T): Promise<T> {
    this.collection(name).set(value.id, structuredClone(value));
    return structuredClone(value);
  }
  async update<T extends Entity>(name: string, id: string, patch: Partial<T>): Promise<T | null> {
    const current = this.collection(name).get(id);
    if (!current) return null;
    const updated = { ...current, ...structuredClone(patch), id } as T;
    this.collection(name).set(id, updated);
    return structuredClone(updated);
  }
  async remove(name: string, id: string) { return this.collection(name).delete(id); }
}
