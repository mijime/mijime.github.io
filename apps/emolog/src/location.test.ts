import { afterEach, describe, expect, it, vi } from "vitest";
import { captureLocation } from "./location";

type Success = (position: GeolocationPosition) => void;
type Failure = (error: GeolocationPositionError) => void;

function installGeolocation(
  handler: (success: Success, failure: Failure, options: PositionOptions) => void,
) {
  const getCurrentPosition = vi.fn(handler);
  Object.defineProperty(navigator, "geolocation", {
    configurable: true,
    value: { getCurrentPosition },
  });
  return getCurrentPosition;
}

function position(overrides: Partial<GeolocationCoordinates> = {}, timestamp = 1_700_000_000_000) {
  return {
    coords: {
      latitude: 35.6,
      longitude: 139.7,
      accuracy: 10,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
      ...overrides,
    },
    timestamp,
  } as unknown as GeolocationPosition;
}

describe("captureLocation", () => {
  afterEach(() => {
    // 自前で定義した geolocation を消して、jsdom の元の状態に戻す。
    delete (navigator as { geolocation?: unknown }).geolocation;
  });

  it("uses a fresh high-accuracy position and records the position timestamp", async () => {
    const getCurrentPosition = installGeolocation((success, _failure, options) => {
      expect(options.enableHighAccuracy).toBe(true);
      expect(options.maximumAge).toBe(0);
      success(position({}, 1_234_567_890));
    });

    const result = await captureLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      ok: true,
      location: { lat: 35.6, lng: 139.7, accuracy: 10, capturedAt: 1_234_567_890 },
    });
  });

  it("retries with low accuracy when the precise attempt times out", async () => {
    let calls = 0;
    const getCurrentPosition = installGeolocation((success, failure, options) => {
      calls += 1;
      if (calls === 1) {
        expect(options.enableHighAccuracy).toBe(true);
        failure({ code: 3 } as GeolocationPositionError);
        return;
      }
      expect(options.enableHighAccuracy).toBe(false);
      expect(options.maximumAge).toBe(0);
      success(position());
    });

    const result = await captureLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(2);
    expect(result.ok).toBe(true);
  });

  it("does not retry when permission is denied", async () => {
    const getCurrentPosition = installGeolocation((_success, failure) => {
      failure({ code: 1 } as GeolocationPositionError);
    });

    const result = await captureLocation();

    expect(getCurrentPosition).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: false, reason: "denied" });
  });

  it("reports unsupported when geolocation is unavailable", async () => {
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: undefined,
    });

    expect(await captureLocation()).toEqual({ ok: false, reason: "unsupported" });
  });
});
