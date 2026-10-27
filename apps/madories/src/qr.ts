import { encode } from "uqr";

/**
 * 誤り訂正レベル。L(7%復元)より M(15%復元)の方が汚れ・反射に強く、
 * 実測した共有URL(〜1,200字)でもバージョン28以内に収まる。
 */
export const QR_ECC = "M";

/** 余白(クワイエットゾーン)。規格は4モジュール以上。 */
export const QR_BORDER = 4;

export interface QrCode {
  /** 一辺のモジュール数(余白を含む)。 */
  size: number;
  /** QRバージョン(1〜40)。大きいほど密で読み取りにくい。 */
  version: number;
  /** 黒=true のモジュール行列(余白を含む)。 */
  modules: boolean[][];
  /** 黒モジュールを横に結合したSVGパス(viewBox は size×size)。 */
  path: string;
  /** 黒モジュール数。 */
  darkCount: number;
}

/**
 * 黒モジュールを横方向に結合して1本のSVGパスにする。
 * モジュールごとに <rect> を並べるより要素数が桁で少なくて済む。
 */
export function modulesToSvgPath(modules: boolean[][]): string {
  const parts: string[] = [];
  for (let y = 0; y < modules.length; y++) {
    const row = modules[y];
    let x = 0;
    while (x < row.length) {
      if (!row[x]) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < row.length && row[x + run]) {
        run++;
      }
      parts.push(`M${x} ${y}h${run}v1h-${run}z`);
      x += run;
    }
  }
  return parts.join("");
}

function countDark(modules: boolean[][]): number {
  let dark = 0;
  for (const row of modules) {
    for (const module of row) {
      if (module) {
        dark++;
      }
    }
  }
  return dark;
}

/**
 * テキスト(共有URL)からQRを作る。QRの容量(バージョン40)を超える場合は null。
 * uqr は DOM 非依存なので node のテスト環境でもそのまま動く。
 */
export function createQrCode(text: string): QrCode | null {
  if (text === "") {
    return null;
  }
  let encoded: { data: boolean[][]; size: number; version: number };
  try {
    encoded = encode(text, { border: QR_BORDER, ecc: QR_ECC });
  } catch {
    // 容量超過は "Data too long" の例外で返る
    return null;
  }
  return {
    darkCount: countDark(encoded.data),
    modules: encoded.data,
    path: modulesToSvgPath(encoded.data),
    size: encoded.size,
    version: encoded.version,
  };
}
