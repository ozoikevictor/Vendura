import type { Database, Entity } from "../types.js";

const TABLES = [
  "users", "addresses", "categories", "stores", "products", "orders",
  "conversations", "messages", "offers", "notifications", "plans",
  "subscriptions", "bank_accounts", "delivery_settings", "transactions", "payouts"
] as const;

const collectionTable: Record<string, string> = {
  users: "users", addresses: "addresses", categories: "categories",
  stores: "stores", products: "products", orders: "orders",
  conversations: "conversations", messages: "messages", offers: "offers",
  notifications: "notifications", plans: "plans", subscriptions: "subscriptions",
  bankAccounts: "bank_accounts", deliverySettings: "delivery_settings",
  transactions: "transactions", payouts: "payouts"
};

type EntityRow = { id: string; data: Entity };

export class SupabaseDatabase implements Database {
  private headers: Record<string, string>;

  constructor(private url: string, serviceRoleKey: string) {
    this.url = url.replace(/\/$/, "");
    this.headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json"
    };
  }

  private table(collection: string) {
    const table = collectionTable[collection];
    if (!table) throw new Error(`Unsupported database collection: ${collection}`);
    return table;
  }

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${this.url}/rest/v1/${path}`, {
      ...init,
      headers: { ...this.headers, ...init.headers }
    });
    if (!response.ok) {
      const detail = await response.text();
      throw new Error(`Supabase database error (${response.status}): ${detail}`);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  async connect() { await this.request<EntityRow[]>("plans?select=id&limit=1"); }
  async close() {}

  async reset() {
    for (const table of [...TABLES].reverse()) {
      await this.request(`${table}?id=not.is.null`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    }
  }

  async list<T extends Entity>(collection: string): Promise<T[]> {
    const rows = await this.request<EntityRow[]>(`${this.table(collection)}?select=id,data`);
    return rows.map((row) => ({ ...row.data, id: row.id }) as T);
  }

  async get<T extends Entity>(collection: string, id: string): Promise<T | null> {
    const rows = await this.request<EntityRow[]>(`${this.table(collection)}?select=id,data&id=eq.${encodeURIComponent(id)}&limit=1`);
    return rows[0] ? ({ ...rows[0].data, id: rows[0].id } as T) : null;
  }

  async findOne<T extends Entity>(collection: string, query: Partial<T>): Promise<T | null> {
    const items = await this.list<T>(collection);
    return items.find((item) => Object.entries(query).every(([key, value]) => item[key] === value)) ?? null;
  }

  async create<T extends Entity>(collection: string, value: T): Promise<T> {
    const { id, ...data } = value;
    const rows = await this.request<EntityRow[]>(this.table(collection), {
      method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ id, data })
    });
    const saved = rows[0];
    if (!saved) throw new Error("Supabase did not return the created record");
    return { ...saved.data, id: saved.id } as T;
  }

  async update<T extends Entity>(collection: string, id: string, patch: Partial<T>): Promise<T | null> {
    const current = await this.get<T>(collection, id);
    if (!current) return null;
    const { id: _ignored, ...data } = { ...current, ...patch, id };
    const rows = await this.request<EntityRow[]>(`${this.table(collection)}?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ data })
    });
    const saved = rows[0];
    return saved ? ({ ...saved.data, id: saved.id } as T) : null;
  }

  async remove(collection: string, id: string): Promise<boolean> {
    const rows = await this.request<Array<{ id: string }>>(`${this.table(collection)}?id=eq.${encodeURIComponent(id)}&select=id`, {
      method: "DELETE", headers: { Prefer: "return=representation" }
    });
    return rows.length > 0;
  }
}
