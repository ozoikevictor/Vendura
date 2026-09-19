/**
 * Mock request helpers.
 *
 * Every service wraps its data access in these so that swapping in a real
 * backend (fetch to /api/*) only means replacing the function bodies —
 * the call signatures and return shapes stay identical.
 */

const delay = (ms = 250 + Math.random() * 250) =>
  new Promise<void>((r) => setTimeout(r, ms));

export async function mockRequest<T>(value: T, ms?: number): Promise<T> {
  await delay(ms);
  // Deep clone so callers can't mutate the seed data.
  return structuredClone(value);
}

export async function mockEmpty(ms?: number): Promise<void> {
  await delay(ms);
}

export class NotFoundError extends Error {
  constructor(resource: string, id: string) {
    super(`${resource} not found: ${id}`);
    this.name = "NotFoundError";
  }
}
