import { describe, expect, it } from "vitest";
import jsQR from "jsqr";
import { QR_BORDER, type QrCode, createQrCode, modulesToSvgPath } from "./qr";
import { encodeFloors } from "./floor/share";
import { createFloorPlan } from "./store";
import { setWallsPure } from "./floor/walls";

const SHARE_PREFIX = "https://mijime.github.io/apps/madories/?d=";

const BASE64URL_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

/** 決定的な擬似乱数で、圧縮済みペイロードらしい文字列を作る。 */
function pseudoRandomPayload(length: number): string {
  let seed = 12_345;
  let out = "";
  for (let i = 0; i < length; i++) {
    seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
    out += BASE64URL_ALPHABET[seed % BASE64URL_ALPHABET.length];
  }
  return out;
}

/** モジュール行列を RGBA の生画像に展開する(実デコーダで読み戻すため)。 */
function rasterize(code: QrCode, scale: number): Uint8ClampedArray {
  const pixels = code.size * scale;
  const image = new Uint8ClampedArray(pixels * pixels * 4);
  for (let y = 0; y < pixels; y++) {
    for (let x = 0; x < pixels; x++) {
      const dark = code.modules[Math.floor(y / scale)][Math.floor(x / scale)];
      const value = dark ? 0 : 255;
      const at = (y * pixels + x) * 4;
      image[at] = value;
      image[at + 1] = value;
      image[at + 2] = value;
      image[at + 3] = 255;
    }
  }
  return image;
}

/** 実際のQRデコーダで読み戻す(生成が正しいことの裏取り)。 */
function decode(code: QrCode): string | null {
  const scale = 4;
  const pixels = code.size * scale;
  return jsQR(rasterize(code, scale), pixels, pixels)?.data ?? null;
}

function createOrThrow(text: string): QrCode {
  const code = createQrCode(text);
  if (!code) {
    throw new Error(`QRを作れなかった: ${text.length}字`);
  }
  return code;
}

function isFinderPattern(modules: boolean[][], ox: number, oy: number): boolean {
  for (let y = 0; y < 7; y++) {
    for (let x = 0; x < 7; x++) {
      const ring = x === 0 || x === 6 || y === 0 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      if (modules[oy + y][ox + x] !== (ring || core)) {
        return false;
      }
    }
  }
  return true;
}

describe("modulesToSvgPath", () => {
  it("横に連続する黒モジュールを1本のサブパスにまとめる", () => {
    const path = modulesToSvgPath([
      [true, true, false, true],
      [false, false, false, false],
      [true, false, true, true],
    ]);
    expect(path).toBe("M0 0h2v1h-2zM3 0h1v1h-1zM0 2h1v1h-1zM2 2h2v1h-2z");
  });
});

describe("createQrCode", () => {
  it("短いURLを実際のデコーダで読み戻せる", () => {
    const url = `${SHARE_PREFIX}abc`;
    const code = createOrThrow(url);
    expect(decode(code)).toBe(url);
  });

  it("実際の間取りの共有URLを読み戻せる", async () => {
    let floor = createFloorPlan("1F");
    const edges = [];
    for (let x = 4; x < 20; x++) {
      edges.push({ kind: "h" as const, x, y: 4 }, { kind: "h" as const, x, y: 16 });
    }
    for (let y = 4; y < 16; y++) {
      edges.push({ kind: "v" as const, x: 4, y }, { kind: "v" as const, x: 20, y });
    }
    floor = setWallsPure(floor, edges, "solid");
    const url = `${SHARE_PREFIX}${await encodeFloors([floor])}`;
    const code = createOrThrow(url);
    expect(decode(code)).toBe(url);
    // 間取り1枚なら余裕を持って収まる(バージョン40の上限まで余裕がある)
    expect(code.version).toBeLessThan(20);
  });

  it("密なペイロード(1,000字)でも読み戻せる", () => {
    const url = `${SHARE_PREFIX}${pseudoRandomPayload(1000)}`;
    const code = createOrThrow(url);
    expect(decode(code)).toBe(url);
  });

  it("余白とファインダパターンが規格どおり", () => {
    const code = createOrThrow(`${SHARE_PREFIX}layout`);
    const dataSize = 17 + code.version * 4;
    expect(code.size).toBe(dataSize + QR_BORDER * 2);
    expect(code.modules).toHaveLength(code.size);
    // クワイエットゾーン(余白)は全白
    for (let i = 0; i < code.size; i++) {
      for (let b = 0; b < QR_BORDER; b++) {
        expect(code.modules[b][i]).toBe(false);
        expect(code.modules[i][b]).toBe(false);
        expect(code.modules[code.size - 1 - b][i]).toBe(false);
        expect(code.modules[i][code.size - 1 - b]).toBe(false);
      }
    }
    // 3隅のファインダパターン + その外側1モジュールのセパレータは白
    const corners: [number, number][] = [
      [QR_BORDER, QR_BORDER],
      [QR_BORDER + dataSize - 7, QR_BORDER],
      [QR_BORDER, QR_BORDER + dataSize - 7],
    ];
    for (const [ox, oy] of corners) {
      expect(isFinderPattern(code.modules, ox, oy)).toBe(true);
    }
    for (let i = 0; i <= 7; i++) {
      expect(code.modules[QR_BORDER + 7][QR_BORDER + i]).toBe(false);
      expect(code.modules[QR_BORDER + i][QR_BORDER + 7]).toBe(false);
    }
    expect(code.darkCount).toBeGreaterThan(0);
    expect(code.path.length).toBeGreaterThan(0);
  });

  it("容量を超えるURLと空文字は null", () => {
    expect(createQrCode("")).toBeNull();
    expect(createQrCode(`${SHARE_PREFIX}${pseudoRandomPayload(4000)}`)).toBeNull();
  });
});
