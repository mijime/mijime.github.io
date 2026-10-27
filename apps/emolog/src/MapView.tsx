import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getAllEntries } from "./store";
import { entriesWithLocation, type LocatedEntry } from "./map";
import { formatTime } from "./types";

const DEFAULT_CENTER: L.LatLngTuple = [36.2, 138.2];
const DEFAULT_ZOOM = 5;
const MAX_FIT_ZOOM = 15;

function buildPopup(entry: LocatedEntry): HTMLElement {
  const root = document.createElement("div");
  root.className = "emolog-map-popup";

  const head = document.createElement("div");
  head.className = "emolog-map-popup-head";
  const emoji = document.createElement("span");
  emoji.className = "emolog-map-popup-emoji";
  emoji.textContent = entry.emoji;
  const time = document.createElement("span");
  time.textContent = `${entry.date} ${formatTime(entry.timestamp)}`;
  head.append(emoji, time);
  root.append(head);

  if (entry.note) {
    const note = document.createElement("p");
    note.className = "emolog-map-popup-note";
    note.textContent = entry.note;
    root.append(note);
  }

  if (entry.tags && entry.tags.length > 0) {
    const tags = document.createElement("div");
    tags.className = "emolog-map-popup-tags";
    for (const tag of entry.tags) {
      const chip = document.createElement("span");
      chip.className = "emolog-tag";
      chip.textContent = `#${tag}`;
      tags.append(chip);
    }
    root.append(tags);
  }

  const link = document.createElement("a");
  link.href = `https://www.google.com/maps?q=${entry.location.lat},${entry.location.lng}`;
  link.target = "_blank";
  link.rel = "noreferrer";
  link.textContent = "Googleマップで開く";
  root.append(link);

  return root;
}

export default function MapView({ listId }: { listId?: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [entries, setEntries] = useState<LocatedEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getAllEntries(listId ?? undefined)
      .then((all) => {
        if (!cancelled) setEntries(entriesWithLocation(all));
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setEntries([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [listId]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const map = L.map(container, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      scrollWheelZoom: false,
    });
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    for (const entry of entries) {
      const pin = document.createElement("span");
      pin.className = "emolog-map-pin-inner";
      pin.textContent = entry.emoji;
      L.marker([entry.location.lat, entry.location.lng], {
        icon: L.divIcon({
          className: "emolog-map-pin",
          html: pin,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
          popupAnchor: [0, -16],
        }),
      })
        .bindPopup(buildPopup(entry))
        .addTo(map);
    }

    if (entries.length > 0) {
      const bounds = L.latLngBounds(
        entries.map((entry) => [entry.location.lat, entry.location.lng] as L.LatLngTuple),
      );
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: MAX_FIT_ZOOM });
    }

    const timer = setTimeout(() => map.invalidateSize(), 0);
    return () => {
      clearTimeout(timer);
      map.remove();
    };
  }, [entries]);

  return (
    <div className="emolog-map-wrap">
      <div ref={containerRef} className="emolog-map" />
      {loading ? (
        <p className="emolog-map-hint">読み込み中…</p>
      ) : error ? (
        <p className="emolog-map-error">⚠️ {error}</p>
      ) : entries.length === 0 ? (
        <p className="emolog-map-hint">
          位置情報付きの記録がありません。設定で位置情報をONにして記録すると、ここに表示されます。
        </p>
      ) : (
        <p className="emolog-map-hint">{entries.length}件の記録 · ピンをタップで詳細</p>
      )}
      <p className="emolog-map-privacy">
        地図の表示に OpenStreetMap を利用しています。閲覧範囲のタイル情報が OSM
        に送信されます（記録データは送信されません）。
      </p>
    </div>
  );
}
