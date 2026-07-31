import { describe, it, expect } from "vitest";
import { signupSchema } from "@/app/api/auth/signup/route";

describe("signupSchema", () => {
  it("accepts valid input and normalizes the email", () => {
    const r = signupSchema.safeParse({
      name: "  Asha Rao ",
      email: "  Asha@Example.COM ",
      password: "hunter2hunter",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.email).toBe("asha@example.com");
      expect(r.data.name).toBe("Asha Rao");
    }
  });

  it("rejects short passwords, bad emails, and empty names", () => {
    expect(signupSchema.safeParse({ name: "Ok", email: "a@b.com", password: "short" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "Ok", email: "not-an-email", password: "longenough" }).success).toBe(false);
    expect(signupSchema.safeParse({ name: "", email: "a@b.com", password: "longenough" }).success).toBe(false);
  });
});
