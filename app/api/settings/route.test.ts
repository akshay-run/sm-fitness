const mockRequireUser = jest.fn(async () => ({ user: { id: "admin-1" }, error: null }));
const mockGetGymDisplay = jest.fn(async () => ({
  gym_name: "SM FITNESS",
  address: "Gym Street",
  phone: "9999999999",
  upi_id: "sm@upi",
  backup_email: "backup@example.com",
  whatsapp_group_link: "https://chat.whatsapp.com/example",
  logo_signed_url: "https://img/logo.png",
  upi_qr_signed_url: "https://img/upi.png",
}));
const mockMaybeSingle = jest.fn(async () => ({ data: { logo_path: "logo-path", upi_qr_path: "upi-path" } }));
const mockUpsert = jest.fn(async () => ({ error: null }));

jest.mock("@/lib/auth", () => ({
  requireUser: (...args: unknown[]) => mockRequireUser(...args),
}));

jest.mock("@/lib/gymDisplay", () => ({
  getGymDisplay: (...args: unknown[]) => mockGetGymDisplay(...args),
}));

jest.mock("@/lib/supabaseAdmin", () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      if (table !== "gym_settings") throw new Error(`Unexpected table ${table}`);
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: (...args: unknown[]) => mockMaybeSingle(...args),
          }),
        }),
        upsert: (...args: unknown[]) => mockUpsert(...args),
      };
    },
  }),
}));

describe("GET/PATCH /api/settings", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequireUser.mockResolvedValue({ user: { id: "admin-1" }, error: null });
  });

  it("returns 401 for unauthorized GET", async () => {
    mockRequireUser.mockResolvedValue({ user: null, error: "Unauthorized" });
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns merged display and raw path fields for GET", async () => {
    const { GET } = await import("./route");
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({
      gym_name: "SM FITNESS",
      logo_path: "logo-path",
      upi_qr_path: "upi-path",
    });
  });

  it("returns 400 when PATCH payload is invalid", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ backup_email: "not-an-email" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthorized PATCH", async () => {
    mockRequireUser.mockResolvedValue({ user: null, error: "Unauthorized" });
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify({ gym_name: "SM FITNESS" }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(401);
  });

  it("rejects malformed URL payload for security hardening", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        whatsapp_group_link: "javascript:alert(1)",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(400);
  });

  it("upserts valid PATCH payload and returns refreshed display", async () => {
    const { PATCH } = await import("./route");
    const req = new Request("http://localhost/api/settings", {
      method: "PATCH",
      body: JSON.stringify({
        gym_name: "SM FITNESS PRO",
        backup_email: "backup@example.com",
        whatsapp_group_link: "https://chat.whatsapp.com/example",
      }),
      headers: { "content-type": "application/json" },
    });
    const res = await PATCH(req);
    expect(res.status).toBe(200);
    expect(mockUpsert).toHaveBeenCalledTimes(1);
    const json = await res.json();
    expect(json.gym_name).toBe("SM FITNESS");
    expect(json).not.toHaveProperty("password");
    expect(json).not.toHaveProperty("token");
  });
});
