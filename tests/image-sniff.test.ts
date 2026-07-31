import { describe, it, expect } from "vitest";
import { sniffImageMime } from "@/lib/supabase-storage";

// L3: validate uploads by magic bytes, not the client-declared Content-Type.

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50]);
const html = new Uint8Array([...Buffer.from("<html><script>alert(1)</script>")]);
const svg = new Uint8Array([...Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'>")]);

describe("sniffImageMime", () => {
  it("recognises real PNG/JPEG/WebP bytes", () => {
    expect(sniffImageMime(png)).toBe("image/png");
    expect(sniffImageMime(jpeg)).toBe("image/jpeg");
    expect(sniffImageMime(webp)).toBe("image/webp");
  });

  it("returns null for HTML/SVG/script bytes mislabelled as an image", () => {
    expect(sniffImageMime(html)).toBeNull();
    expect(sniffImageMime(svg)).toBeNull();
  });

  it("returns null for truncated/empty input", () => {
    expect(sniffImageMime(new Uint8Array([]))).toBeNull();
    expect(sniffImageMime(new Uint8Array([0x89, 0x50]))).toBeNull(); // partial PNG sig
    // RIFF header without the WEBP marker is not a WebP.
    expect(sniffImageMime(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });
});
