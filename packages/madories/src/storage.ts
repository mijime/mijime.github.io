import type { Building, SaveData } from "./types";

export function saveToFile(building: Building, activeFloorId: string): void {
  const data: SaveData = { activeFloorId, building, version: 2 };
  const blob = new Blob([JSON.stringify(data, undefined, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "madories.json";
  a.click();
  URL.revokeObjectURL(url);
}

export function loadFromFile(): Promise<SaveData | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) {
        resolve(null);
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string) as SaveData;
          if (data.version !== 2) {
            resolve(null);
            return;
          }
          resolve(data);
        } catch {
          resolve(null);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });
}

const KEY = "madories_plan";

export function saveToStorage(building: Building, activeFloorId: string): void {
  const data: SaveData = { activeFloorId, building, version: 2 };
  localStorage.setItem(KEY, JSON.stringify(data));
}

export function loadFromStorage(): SaveData | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) {
      return null;
    }
    const data = JSON.parse(raw) as SaveData;
    if (data.version !== 2) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}
