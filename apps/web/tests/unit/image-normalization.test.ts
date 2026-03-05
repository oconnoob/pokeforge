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

  it("removes black border background into transparency", async () => {
    const source = await sharp({
      create: {
        width: 64,
        height: 64,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 1 }
      }
    })
      .composite([
        {
          input: await sharp({
            create: {
              width: 20,
              height: 20,
              channels: 4,
              background: { r: 80, g: 180, b: 255, alpha: 1 }
            }
          })
            .png()
            .toBuffer(),
          left: 22,
          top: 22
        }
      ])
      .png()
      .toBuffer();

    const result = await normalizeSpriteTo64(source);
    const decoded = await sharp(result).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const edgeAlpha = decoded.data[3];
    const centerOffset = (32 * decoded.info.width + 32) * 4 + 3;
    const centerAlpha = decoded.data[centerOffset];

    expect(edgeAlpha).toBe(0);
    expect(centerAlpha).toBeGreaterThan(0);
  });
});
