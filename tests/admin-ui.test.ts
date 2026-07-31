import { describe, it, expect } from "vitest";
import { statusBadgeClass } from "@/app/admin/admin-ui";

describe("statusBadgeClass", () => {
  it("maps known statuses to their semantic color and falls back for unknown", () => {
    expect(statusBadgeClass("active")).toContain("emerald");
    expect(statusBadgeClass("rejected")).toContain("rose");
    expect(statusBadgeClass("totally-unknown")).toContain("zinc"); // default
  });
});
