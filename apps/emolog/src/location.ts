import type { EntryLocation } from "./types";

const LOCATION_KEY = "emolog-location-enabled";

export type LocationFailureReason = "unsupported" | "denied" | "unavailable" | "timeout";

export type LocationResult =
  | { ok: true; location: EntryLocation }
  | { ok: false; reason: LocationFailureReason };

export function isLocationEnabled(): boolean {
  try {
    return localStorage.getItem(LOCATION_KEY) === "1";
  } catch {
    return false;
  }
}

export function setLocationEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(LOCATION_KEY, enabled ? "1" : "0");
  } catch {
    // localStorage が使えなくても記録自体は継続する
  }
}

function failureReason(code: number | undefined): LocationFailureReason {
  if (code === 1) return "denied";
  if (code === 3) return "timeout";
  return "unavailable";
}

interface PositionOptions {
  enableHighAccuracy: boolean;
  maximumAge: number;
  timeout: number;
}

/** getCurrentPosition を Promise 化する。タイムアウト時も必ず解決する。 */
function getPosition(options: PositionOptions): Promise<LocationResult> {
  return new Promise((resolve) => {
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const finish = (result: LocationResult) => {
      if (settled) return;
      settled = true;
      if (timer) clearTimeout(timer);
      resolve(result);
    };

    timer = setTimeout(() => finish({ ok: false, reason: "timeout" }), options.timeout + 500);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        finish({
          ok: true,
          location: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            capturedAt: position.timestamp || Date.now(),
          },
        });
      },
      (error) => finish({ ok: false, reason: failureReason(error.code) }),
      options,
    );
  });
}

/**
 * 位置情報を取得する。
 *
 * - maximumAge を 0 にして、過去の測位結果（アプリを開いた場所など）を
 *   使い回さないようにする。
 * - まず高精度で取得し、タイムアウト・測位不能のときだけ低精度で再試行する。
 * - 拒否・非対応の場合は再試行しない。
 */
export async function captureLocation(): Promise<LocationResult> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return { ok: false, reason: "unsupported" };
  }

  const precise = await getPosition({
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 5_000,
  });
  if (precise.ok || precise.reason === "denied") return precise;

  return getPosition({
    enableHighAccuracy: false,
    maximumAge: 0,
    timeout: 3_000,
  });
}
