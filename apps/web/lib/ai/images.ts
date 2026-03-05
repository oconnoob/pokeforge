import { getEnv } from "@/lib/config/env";
import sharp from "sharp";

export interface GeneratedImagePair {
  frontPng: Buffer;
  backPng: Buffer;
}

const colorDistance = (a: [number, number, number], b: [number, number, number]) =>
  Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

const removeBorderMatchedBackground = (rgba: Buffer, width: number, height: number): Buffer => {
  const bytesPerPixel = 4;
  const visited = new Uint8Array(width * height);
  const queue: number[] = [];
  const keyColor: [number, number, number] = [rgba[0], rgba[1], rgba[2]];
  const tolerance = 45;

  const enqueue = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) {
      return;
    }
    const idx = y * width + x;
    if (visited[idx] === 1) {
      return;
    }
    visited[idx] = 1;
    queue.push(idx);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length > 0) {
    const idx = queue.shift() as number;
    const x = idx % width;
    const y = Math.floor(idx / width);
    const offset = idx * bytesPerPixel;
    const pixel: [number, number, number] = [rgba[offset], rgba[offset + 1], rgba[offset + 2]];
    const alpha = rgba[offset + 3];

    if (alpha === 0 || colorDistance(pixel, keyColor) <= tolerance) {
      rgba[offset + 3] = 0;
      enqueue(x + 1, y);
      enqueue(x - 1, y);
      enqueue(x, y + 1);
      enqueue(x, y - 1);
    }
  }

  return rgba;
};

export const normalizeSpriteTo64 = async (input: Buffer): Promise<Buffer> => {
  const resized = await sharp(input)
    .resize(64, 64, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: sharp.kernel.nearest
    })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const cleaned = removeBorderMatchedBackground(
    Buffer.from(resized.data),
    resized.info.width,
    resized.info.height
  );

  return sharp(cleaned, {
    raw: {
      width: resized.info.width,
      height: resized.info.height,
      channels: 4
    }
  })
    .png({ compressionLevel: 9, adaptiveFiltering: true, palette: true })
    .toBuffer();
};

const generateRawImage = async (apiKey: string, prompt: string): Promise<Buffer> => {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt,
      size: "1024x1024"
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI image generation failed: ${text}`);
  }

  const json = await response.json();
  const base64 = json.data?.[0]?.b64_json as string | undefined;

  if (!base64) {
    throw new Error("Image generation returned no image data.");
  }

  return Buffer.from(base64, "base64");
};

const generateBackFromFrontReference = async (
  apiKey: string,
  frontImage: Buffer,
  prompt: string
): Promise<Buffer> => {
  const formData = new FormData();
  formData.append("model", "gpt-image-1");
  formData.append("prompt", prompt);
  formData.append("size", "1024x1024");
  formData.append("image", new Blob([new Uint8Array(frontImage)], { type: "image/png" }), "front-reference.png");

  const response = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`OpenAI back-view edit failed: ${text}`);
  }

  const json = await response.json();
  const base64 = json.data?.[0]?.b64_json as string | undefined;

  if (!base64) {
    throw new Error("Back-view edit returned no image data.");
  }

  return Buffer.from(base64, "base64");
};

const frontViewPrompt = (name: string, description: string) => `
Create a single pixel-art creature sprite for a turn-based monster battle game.

Subject: ${name}
Description: ${description}

Requirements:
- FRONT VIEW only (facing the viewer).
- Full body visible and centered.
- Transparent background.
- Retro handheld-era sprite style.
- Strong silhouette and readable outline.
- Do not include text, UI, logos, borders, or multiple creatures.
`;

const backViewPrompt = (name: string, description: string) => `
Create a single pixel-art creature sprite for a turn-based monster battle game using the provided reference image.

Subject: ${name}
Description: ${description}

Requirements:
- Keep this the exact same creature identity as the reference (same colors, silhouette family, body parts, proportions).
- BACK VIEW only (the creature is turned away from the viewer).
- Show back of head/body/limbs; face should not be visible from the front.
- Full body visible and centered.
- Transparent background.
- Retro handheld-era sprite style.
- Strong silhouette and readable outline.
- Do not include text, UI, logos, borders, or multiple creatures.
`;

export const generatePokemonImagePair = async (name: string, description: string): Promise<GeneratedImagePair> => {
  const env = getEnv();
  if (!env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is required for image generation.");
  }

  const frontRaw = await generateRawImage(env.OPENAI_API_KEY, frontViewPrompt(name, description));

  let backRaw: Buffer;
  try {
    backRaw = await generateBackFromFrontReference(env.OPENAI_API_KEY, frontRaw, backViewPrompt(name, description));
  } catch {
    // Fall back to text-only back-view generation if edit endpoint is unavailable.
    backRaw = await generateRawImage(env.OPENAI_API_KEY, backViewPrompt(name, description));
  }

  const [frontPng, backPng] = await Promise.all([normalizeSpriteTo64(frontRaw), normalizeSpriteTo64(backRaw)]);

  return {
    frontPng,
    backPng
  };
};
