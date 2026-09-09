import { deflateSync } from "node:zlib";
import { mkdtempSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { drawEdward, EDWARD_ART_SIZE } from "@/lib/pixel/characters";
import {
  drawHouseRoom,
  HOUSE_ART_SIZE,
  HOUSE_STAND_Y,
  type HouseThingId,
} from "@/lib/pixel/house";
import type { Raster } from "@/lib/pixel/raster";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xed_b8_83_20 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buffer: Buffer) {
  let c = 0xff_ff_ff_ff;
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xff_ff_ff_ff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function png(width: number, height: number, rgb: Uint8Array) {
  const raw = Buffer.alloc((width * 3 + 1) * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * (width * 3 + 1)] = 0;
    Buffer.from(rgb.subarray(y * width * 3, (y + 1) * width * 3)).copy(
      raw,
      y * (width * 3 + 1) + 1,
    );
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function canvas(width: number, height: number, scale: number, outputDir: string) {
  const rgb = new Uint8Array(width * scale * height * scale * 3).fill(0x1b);
  const draw: Raster = (x, y, w, h, color) => {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    for (let py = Math.round(y) * scale; py < (Math.round(y) + Math.round(h)) * scale; py += 1) {
      for (let px = Math.round(x) * scale; px < (Math.round(x) + Math.round(w)) * scale; px += 1) {
        if (px < 0 || py < 0 || px >= width * scale || py >= height * scale) continue;
        const index = (py * width * scale + px) * 3;
        rgb[index] = r;
        rgb[index + 1] = g;
        rgb[index + 2] = b;
      }
    }
  };
  return {
    draw,
    save: (name: string) =>
      writeFileSync(join(outputDir, name), png(width * scale, height * scale, rgb)),
  };
}

const IDS: readonly HouseThingId[] = [
  "collection",
  "clarinet",
  "jersey",
  "sports",
  "pc",
  "closet",
  "window",
];

it("renders the room to disk for a look", () => {
  const scale = 5;
  const outputDir = mkdtempSync(join(tmpdir(), "edwards-world-house-"));

  try {
    for (const [name, reveal, edwardX] of [
      ["house-shut.png", 0, 24],
      ["house-open.png", 1, 232],
    ] as const) {
      const sheet = canvas(
        HOUSE_ART_SIZE.width,
        HOUSE_ART_SIZE.height,
        scale,
        outputDir,
      );
      drawHouseRoom(
        sheet.draw,
        2,
        Object.fromEntries(IDS.map((id) => [id, reveal])),
      );
      const offset: Raster = (x, y, w, h, color) =>
        sheet.draw(
          x + edwardX,
          y + HOUSE_STAND_Y - EDWARD_ART_SIZE.height,
          w,
          h,
          color,
        );
      drawEdward(offset, 0);
      sheet.save(name);
      expect(statSync(join(outputDir, name)).size).toBeGreaterThan(0);
    }
  } finally {
    rmSync(outputDir, { force: true, recursive: true });
  }
});
