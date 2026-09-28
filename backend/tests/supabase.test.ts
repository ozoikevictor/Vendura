import { afterEach, describe, expect, it, vi } from "vitest";
import { SupabaseDatabase } from "../src/db/supabase.js";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SupabaseDatabase authentication", () => {
  it("does not send new secret API keys as Bearer tokens", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = new SupabaseDatabase("https://example.supabase.co", "sb_secret_example");
    await db.connect();

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.apikey).toBe("sb_secret_example");
    expect(headers.Authorization).toBeUndefined();
  });

  it("keeps Bearer authentication for legacy JWT service keys", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify([]), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const db = new SupabaseDatabase("https://example.supabase.co", "legacy-jwt");
    await db.connect();

    const headers = fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer legacy-jwt");
  });
});
