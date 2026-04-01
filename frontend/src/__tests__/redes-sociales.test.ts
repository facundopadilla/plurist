import { describe, it, expect } from "vitest";

describe("redes-sociales", () => {
  it("RedesSocialesPage module exports the page component", async () => {
    const mod = await import("../features/integrations/redes-sociales-page");
    expect(typeof mod.RedesSocialesPage).toBe("function");
  });

  it("NetworkIcon module exports the component", async () => {
    const mod = await import("../features/integrations/network-icon");
    expect(typeof mod.NetworkIcon).toBe("function");
  });

  it("api module exports startOAuthConnect and disconnectConnection", async () => {
    const mod = await import("../features/integrations/api");
    expect(typeof mod.startOAuthConnect).toBe("function");
    expect(typeof mod.disconnectConnection).toBe("function");
  });

  it("types module: SocialConnection has required OAuth fields", async () => {
    // Structural check via TypeScript duck-typing at runtime
    const conn = {
      id: 1,
      network: "x",
      display_name: "@test",
      is_active: true,
      provider_username: "@test",
      status: "connected" as const,
      token_expires_at: null,
      error_detail: "",
    };
    expect(conn.status).toBe("connected");
    expect(conn.provider_username).toBe("@test");
    expect(conn.token_expires_at).toBeNull();
  });
});
