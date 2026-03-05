import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { normalizeSpriteTo64 } from "@/lib/ai/images";

describe("normalizeSpriteTo64", () => {
  it("returns a 64x64 png buffer", async () => {
    const source = await sharp({
      create: {
        width: 120,
        height: 80,
        channels: 4,
        background: { r: 255, g: 50, b: 50, alpha: 1 }
      }
    })
      .png()
      .toBuffer();

    const result = await normalizeSpriteTo64(source);
    const metadata = await sharp(result).metadata();

    expect(metadata.format).toBe("png");
    expect(metadata.width).toBe(64);
    expect(metadata.height).toBe(64);
  });
});
