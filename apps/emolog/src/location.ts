import type { EntryLocation } from "./types";

const LOCATION_KEY = "emolog-location-enabled";

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

/** 位置情報を取得する。拒否・失敗・タイムアウト時は undefined を返す。 */
export function captureLocation(): Promise<EntryLocation | undefined> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.resolve(undefined);
  }
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(undefined), 5000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        clearTimeout(timer);
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          capturedAt: Date.now(),
        });
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 4_000 },
    );
  });
}
