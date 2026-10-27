import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CKEYS } from "../data/countries.ts";
import { RELICS, RKEYS } from "../data/relics.ts";
import { FACTION_KEYS } from "../data/factions.ts";
import { ROUND_TILES } from "../engine/round-tiles.ts";
import { cdef } from "../engine/helpers.ts";
import { startGame } from "../store.ts";
import type { CountryKey, RelicKey, FactionKey } from "../types.ts";
import { LangToggle } from "./LangToggle";

/** Deterministic PRNG: mulberry32 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Shuffle array in-place using rng */
function shuffled<T>(arr: readonly T[], rnd: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function Setup(): React.JSX.Element {
  const { t } = useTranslation();
  const [cpuCount, setCpuCount] = useState(1);
  const [seed, setSeed] = useState(() => Date.now() % 100000);
  const [selectedCountries, setSelectedCountries] = useState<Set<CountryKey>>(new Set());
  const [selectedRelics, setSelectedRelics] = useState<RelicKey[]>([]);
  const [selectedTiles, setSelectedTiles] = useState<string[]>([]);
  const [selectedFactions, setSelectedFactions] = useState<FactionKey[]>([]);
  const [humanFaction, setHumanFaction] = useState<FactionKey | null>(null);

  const handleCpuClick = (n: number): void => {
    setCpuCount(n);
  };

  const handleCountryClick = (k: CountryKey): void => {
    const newSelected = new Set(selectedCountries);
    if (newSelected.has(k)) {
      newSelected.delete(k);
    } else if (newSelected.size < 7) {
      newSelected.add(k);
    }
    setSelectedCountries(newSelected);
  };

  const handleShuffle = (newSeed?: number): void => {
    const seedToUse = newSeed ?? seed;
    const rnd = mulberry32(seedToUse);

    // Draw 7 countries (in CKEYS order)
    const countries = shuffled(CKEYS, rnd).slice(0, 7);
    setSelectedCountries(new Set(countries));

    // Draw 6 relics, sort by VP ascending
    const relics = shuffled(RKEYS, rnd).slice(0, 6);
    const sortedRelics = relics.toSorted(
      (a, b) => RELICS[a as keyof typeof RELICS].vp - RELICS[b as keyof typeof RELICS].vp,
    );
    setSelectedRelics(sortedRelics);

    // Draw 6 tiles
    const tileKeys = Object.keys(ROUND_TILES);
    const tiles = shuffled(tileKeys, rnd).slice(0, 6);
    setSelectedTiles(tiles);

    // Draw all 6 factions
    const factions = shuffled(FACTION_KEYS, rnd);
    setSelectedFactions(factions);
  };

  const handleFactionClick = (faction: FactionKey): void => {
    setHumanFaction(humanFaction === faction ? null : faction);
  };

  const handleNewSeed = (): void => {
    const newSeed = Date.now() % 100000;
    setSeed(newSeed);
    handleShuffle(newSeed);
  };

  const handleStart = (): void => {
    if (
      selectedCountries.size !== 7 ||
      selectedRelics.length !== 6 ||
      selectedTiles.length !== 6 ||
      !humanFaction
    ) {
      return;
    }

    const countriesArray = CKEYS.filter((k) => selectedCountries.has(k));
    const factions = [
      humanFaction,
      ...selectedFactions.filter((f) => f !== humanFaction).slice(0, cpuCount),
    ];

    startGame(
      cpuCount,
      countriesArray,
      seed,
      selectedRelics as RelicKey[],
      selectedTiles,
      factions,
    );
  };

  const canStart =
    selectedCountries.size === 7 &&
    selectedRelics.length === 6 &&
    selectedTiles.length === 6 &&
    humanFaction !== null;

  return (
    <div id="setup">
      <LangToggle />
      <div className="inner">
        <h1>{t("ui.appTitle")}</h1>
        <p className="sub">{t("ui.subtitle")}</p>
        <h2>{t("ui.setupOpponents")}</h2>
        <div className="cpurow" id="cpurow">
          <button
            data-n="1"
            className={cpuCount === 1 ? "sel" : ""}
            onClick={() => handleCpuClick(1)}
          >
            {t("ui.opp1")}
          </button>
          <button
            data-n="2"
            className={cpuCount === 2 ? "sel" : ""}
            onClick={() => handleCpuClick(2)}
          >
            {t("ui.opp2")}
          </button>
          <button
            data-n="3"
            className={cpuCount === 3 ? "sel" : ""}
            onClick={() => handleCpuClick(3)}
          >
            {t("ui.opp3")}
          </button>
        </div>

        <h2>{t("ui.setupSeed")}</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "16px" }}>
          <input
            type="number"
            value={seed}
            onChange={(e) => setSeed(parseInt(e.target.value, 10) || 0)}
            style={{ width: "100px" }}
          />
          <button onClick={handleNewSeed}>{t("ui.shuffle")}</button>
        </div>

        <h2>{t("ui.setupCountries7")}</h2>
        <div id="cgrid">
          {CKEYS.map((k) => {
            const d = cdef(k);
            const isSelected = selectedCountries.has(k);
            return (
              <div
                key={k}
                className={`scard ${isSelected ? "sel" : ""}`}
                data-k={k}
                onClick={() => handleCountryClick(k)}
              >
                <div className="sn">
                  {t(`countries.${k}.name`)}
                  <small>
                    {t(`countries.${k}.tag`)}・{t("ui.slotRange", { min: d.cap(2), max: d.cap(4) })}
                  </small>
                </div>
                <div className="sd">{t(`countries.${k}.pick`)}</div>
              </div>
            );
          })}
        </div>
        <div id="startrow">
          <span id="selcount">{t("ui.countrySelCount", { n: selectedCountries.size })}/7</span>
        </div>

        <h2>{t("ui.setupFaction")}</h2>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
          {FACTION_KEYS.map((fk) => (
            <button
              key={fk}
              className={humanFaction === fk ? "sel" : ""}
              onClick={() => handleFactionClick(fk)}
              style={{ padding: "8px 12px" }}
            >
              {t(`factions.${fk}.name`)}
            </button>
          ))}
        </div>

        <h2>{t("ui.setupRelics6")}</h2>
        <div style={{ marginBottom: "16px" }}>
          {selectedRelics.map((k, idx) => (
            <div key={idx} style={{ marginBottom: "8px", fontSize: "14px" }}>
              Round {idx + 1}: {t(`relics.${k}.name`)} (+{RELICS[k as keyof typeof RELICS].vp} VP)
            </div>
          ))}
        </div>

        <h2>{t("ui.setupTiles")}</h2>
        <div style={{ marginBottom: "16px" }}>
          {selectedTiles.map((k, idx) => (
            <div key={idx} style={{ marginBottom: "8px", fontSize: "14px" }}>
              Round {idx + 1}: {t(`tiles.${k.replace("tile.", "")}.name`)}
            </div>
          ))}
        </div>

        <div id="startrow">
          <button id="startbtn" disabled={!canStart} onClick={handleStart}>
            {t("ui.startGame")}
          </button>
        </div>
        <p
          style={{
            color: "var(--txt-dim)",
            fontSize: "11.5px",
            marginTop: "18px",
            lineHeight: "1.8",
          }}
        >
          {t("ui.setupNote")}
        </p>
      </div>
    </div>
  );
}
