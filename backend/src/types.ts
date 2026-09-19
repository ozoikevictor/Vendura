import type { Request } from "express";

export type Role = "customer" | "vendor" | "admin";
export type Entity = Record<string, unknown> & { id: string };

export interface AuthUser {
  id: string;
  role: Role;
  storeId?: string;
}

export interface AuthRequest extends Request {
  user?: AuthUser;
  rawBody?: Buffer;
}

export interface Database {
  connect(): Promise<void>;
  close(): Promise<void>;
  reset(): Promise<void>;
  list<T extends Entity>(collection: string): Promise<T[]>;
  get<T extends Entity>(collection: string, id: string): Promise<T | null>;
  findOne<T extends Entity>(collection: string, query: Partial<T>): Promise<T | null>;
  create<T extends Entity>(collection: string, value: T): Promise<T>;
  update<T extends Entity>(collection: string, id: string, patch: Partial<T>): Promise<T | null>;
  remove(collection: string, id: string): Promise<boolean>;
}
