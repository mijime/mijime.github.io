// おうちの せってい — the parent-facing admin screen.

import { openAddWord, openEditWord } from "./addword";
import { plink, tone } from "./audio";
import { deleteCustomWord, listCustomWords, loadAllWords } from "./custom";
import { db, ready, type CustomWord } from "./db";
import { clearLevel, loadLevel, saveLevel } from "./difficulty";
import { deleteDrawing, listDrawings } from "./drawings";
import { dropOverlay, makeOverlay } from "./overlay";
import { openVoiceRecorder } from "./recorder";
import { armButton, tap } from "./ui";
import { deleteVoice, listVoiceKeys } from "./voice";

const ACTIVITIES: { key: string; label: string }[] = [
  { key: "otete-feed-level", label: "🍎 もぐもぐ" },
  { key: "otete-puzzle-level", label: "🧩 すぽっ！" },
  { key: "otete-trace-diff", label: "🚂 ぽっぽー" },
  { key: "otete-code-level", label: "🤖 プログラム" },
  { key: "otete-learn-level", label: "📖 ずかん" },
  { key: "otete-count-level", label: "🔢 かず" },
];

const EXTRA_KEYS = ["otete-progress", "otete-learn-photos", "otete-trace-progress"];

const ALL_KEYS = [...ACTIVITIES.map((a) => a.key), ...EXTRA_KEYS, "otete-theme", "otete-muted"];

export function resetDifficulty(): void {
  for (const key of [...ACTIVITIES.map((a) => a.key), ...EXTRA_KEYS]) clearLevel(key);
}

const size = (bytes: number): string => {
  if (bytes >= 1024 ** 3) return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
  if (bytes >= 1024 ** 2) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

type Tab = "record" | "words" | "works" | "data";

const TABS: { key: Tab; label: string }[] = [
  { key: "record", label: "きろく" },
  { key: "words", label: "ことば" },
  { key: "works", label: "さくひん" },
  { key: "data", label: "データ" },
];

export function openAdmin(): void {
  const ov = makeOverlay();
  ov.innerHTML = `<div class="admin">
    <div class="toy-topbar">
      <button class="pill" id="ad-close" type="button">✕</button>
      <div class="toy-badge">⚙️ おうちの せってい</div>
      <span></span>
    </div>
    <div class="admin-tabs">${TABS.map((t) => `<button class="tab" data-tab="${t.key}" type="button">${t.label}</button>`).join("")}</div>
    <div class="admin-body" id="ad-body"></div>
    <div class="admin-note" id="ad-note"></div>
  </div>`;

  const body = ov.querySelector<HTMLElement>("#ad-body")!;
  const note = ov.querySelector<HTMLElement>("#ad-note")!;
  const say = (text: string): void => {
    note.textContent = text;
    window.setTimeout(() => {
      if (note.textContent === text) note.textContent = "";
    }, 2600);
  };
  const close = (): void => dropOverlay(ov);

  let tab: Tab = "record";
  const draw = (): void => {
    ov.querySelectorAll<HTMLElement>(".tab").forEach((b) =>
      b.classList.toggle("active", b.dataset.tab === tab),
    );
    body.scrollTop = 0;
    body.innerHTML = "";
    if (tab === "record") drawRecord(body, say);
    else if (tab === "words") drawWords(body, say);
    else if (tab === "works") drawWorks(body, say);
    else drawData(body, say);
  };

  ov.querySelectorAll<HTMLElement>(".tab").forEach((b) => {
    tap(b, () => {
      tab = (b.dataset.tab as Tab) ?? "record";
      plink(12, 0.3);
      draw();
    });
  });
  tap(ov.querySelector("#ad-close")!, () => {
    plink(12, 0.3);
    close();
  });
  ov.addEventListener("pointerdown", (e) => {
    if (e.target === ov) close();
  });

  draw();
}

function drawRecord(body: HTMLElement, say: (t: string) => void): void {
  body.innerHTML = `
    <p class="admin-sub">いまの むずかしさ（− ／ ＋ で なおせます）</p>
    <ul class="admin-list" id="ad-lv"></ul>
    <p class="admin-sub">まとめて もどす</p>
    <div class="admin-row">
      <button class="pill" id="ad-easy" type="button">ぜんぶ やさしく</button>
      <button class="pill danger" id="ad-reset" type="button">さいしょから</button>
    </div>
    <p class="admin-hint">むずかしさに おわりは ありません。できるほど ふえていきます。</p>`;

  const list = body.querySelector<HTMLElement>("#ad-lv")!;
  const drawLevels = (): void => {
    list.innerHTML = ACTIVITIES.map((a) => {
      const level = loadLevel(a.key, 0);
      return `<li>
        <span>${a.label}</span>
        <span class="lv-ctl">
          <button class="lv-btn" data-key="${a.key}" data-d="-1" type="button" aria-label="やさしく">−</button>
          <b>${level}</b>
          <button class="lv-btn" data-key="${a.key}" data-d="1" type="button" aria-label="むずかしく">＋</button>
          <button class="lv-reset" data-key="${a.key}" type="button" title="この きろくを けす">↺</button>
        </span>
      </li>`;
    }).join("");

    list.querySelectorAll<HTMLElement>(".lv-btn").forEach((btn) => {
      tap(btn, () => {
        const key = btn.dataset.key ?? "";
        const delta = Number(btn.dataset.d ?? 0);
        saveLevel(key, Math.max(0, loadLevel(key, 0) + delta));
        tone(delta > 0 ? 660 : 440, 0.07, "triangle", 0.25);
        drawLevels();
      });
    });
    list.querySelectorAll<HTMLElement>(".lv-reset").forEach((btn) => {
      armButton(btn, () => {
        clearLevel(btn.dataset.key ?? "");
        tone(300, 0.14, "sine", 0.3, 200);
        drawLevels();
      });
    });
  };

  tap(body.querySelector("#ad-easy")!, () => {
    for (const a of ACTIVITIES) saveLevel(a.key, Math.max(0, loadLevel(a.key, 0) - 1));
    tone(440, 0.09, "triangle", 0.3);
    setTimeout(() => tone(392, 0.12, "triangle", 0.25), 90);
    say("ひとつ やさしく したよ");
    drawLevels();
  });

  let armedReset = false;
  const resetBtn = body.querySelector<HTMLElement>("#ad-reset")!;
  tap(resetBtn, () => {
    if (!armedReset) {
      armedReset = true;
      resetBtn.textContent = "ほんとうに もどす？";
      return;
    }
    armedReset = false;
    resetBtn.textContent = "さいしょから";
    resetDifficulty();
    drawLevels();
    say("さいしょに もどしたよ");
    tone(660, 0.1, "triangle", 0.32);
    setTimeout(() => tone(880, 0.14, "triangle", 0.28), 90);
  });

  drawLevels();
}

function drawWords(body: HTMLElement, say: (t: string) => void): void {
  body.innerHTML = `
    <p class="admin-sub">おうちで ついかした ことば</p>
    <button class="pill" id="ad-add" type="button">＋ ことばを ついか</button>
    <ul class="admin-list" id="ad-cw"></ul>
    <p class="admin-sub">しゃしん（えもじの かわり）</p>
    <ul class="admin-list" id="ad-ph"></ul>
    <p class="admin-sub">ろくおん（おうちの こえ）</p>
    <ul class="admin-list" id="ad-vo"></ul>
    <button class="pill danger" id="ad-voclear" type="button">ろくおんを ぜんぶ けす</button>`;

  const cwList = body.querySelector<HTMLElement>("#ad-cw")!;
  const phList = body.querySelector<HTMLElement>("#ad-ph")!;
  const voList = body.querySelector<HTMLElement>("#ad-vo")!;
  const voClear = body.querySelector<HTMLElement>("#ad-voclear")!;

  const voices = (): Promise<string[]> => listVoiceKeys().catch(() => []);

  const drawCustom = async (): Promise<void> => {
    const custom = await listCustomWords();
    const words: CustomWord[] = custom.toSorted(
      (a, b) => a.category.localeCompare(b.category, "ja") || a.label.localeCompare(b.label, "ja"),
    );
    if (words.length === 0) {
      cwList.innerHTML = '<li class="admin-empty">まだ ないよ</li>';
      return;
    }
    cwList.innerHTML = words
      .map(
        (w) => `<li>
      <span>${w.label || "🎤"} <small>${w.category}</small></span>
      <span class="cw-acts">
        <button class="cw-edit" data-slug="${w.slug}" type="button" title="なおす">✏️</button>
        <button class="cw-del" data-slug="${w.slug}" data-cat="${w.category}" type="button" title="けす">🗑</button>
      </span></li>`,
      )
      .join("");
    const bySlug = new Map(words.map((w) => [w.slug, w]));
    cwList.querySelectorAll<HTMLElement>(".cw-edit").forEach((btn) => {
      tap(btn, () => {
        const w = bySlug.get(btn.dataset.slug ?? "");
        if (w) {
          openEditWord(w, () => {
            void drawCustom();
            void drawVoices();
          });
        }
      });
    });
    cwList.querySelectorAll<HTMLElement>(".cw-del").forEach((btn) => {
      armButton(btn, () => {
        void (async () => {
          await deleteCustomWord(btn.dataset.slug ?? "");
          await deleteVoice(`${btn.dataset.cat ?? ""}/${btn.dataset.slug ?? ""}`);
          tone(300, 0.18, "sine", 0.35, 180);
          say("けしたよ");
          void drawCustom();
          void drawVoices();
          void drawPhotos();
        })();
      });
    });
  };

  const drawPhotos = async (): Promise<void> => {
    await ready;
    const all = await db.galleries.toArray().catch(() => []);
    const rows = all.filter((r) => r.photos.length);
    if (rows.length === 0) {
      phList.innerHTML = '<li class="admin-empty">まだ ないよ</li>';
      return;
    }
    const words = await loadAllWords();
    const label = new Map(words.map((w) => [`${w.category}/${w.slug}`, w.label]));
    const custom = new Map(words.filter((w) => w.custom).map((w) => [w.slug, w.label]));
    const bytes = (r: (typeof rows)[number]): number =>
      r.photos.reduce((n, p) => n + p.full.size + p.thumb.size, 0);
    phList.innerHTML = rows
      .toSorted((a, b) => a.key.localeCompare(b.key, "ja"))
      .map(
        (r) => `<li>
        <span>${label.get(r.key) ?? custom.get(r.key) ?? r.key} <small>${r.photos.length}まい</small></span>
        <span class="admin-size">${size(bytes(r))}</span></li>`,
      )
      .join("");
  };

  const drawVoices = async (): Promise<void> => {
    const [keys, words] = await Promise.all([voices(), loadAllWords()]);
    const label = new Map(words.map((w) => [`${w.category}/${w.slug}`, w.label || "🎤"]));
    voClear.hidden = keys.length === 0;
    if (keys.length === 0) {
      voList.innerHTML = '<li class="admin-empty">まだ ないよ</li>';
      return;
    }
    voList.innerHTML = keys
      .toSorted((a, b) => (label.get(a) ?? a).localeCompare(label.get(b) ?? b, "ja"))
      .map(
        (k) => `<li>
        <span>${label.get(k) ?? k} <small>${k.split("/")[0] ?? ""}</small></span>
        <span class="cw-acts">
          <button class="cw-edit" data-rec="${k}" type="button" title="ろくおんしなおす">🎤</button>
          <button class="cw-del" data-key="${k}" type="button" title="けす">🗑</button>
        </span></li>`,
      )
      .join("");
    voList.querySelectorAll<HTMLElement>(".cw-edit").forEach((btn) => {
      tap(btn, () => {
        const key = btn.dataset.rec ?? "";
        openVoiceRecorder(key, label.get(key) ?? key, () => {
          void drawVoices();
        });
      });
    });
    voList.querySelectorAll<HTMLElement>(".cw-del").forEach((btn) => {
      armButton(btn, () => {
        void (async () => {
          await deleteVoice(btn.dataset.key ?? "");
          tone(300, 0.18, "sine", 0.35, 180);
          void drawVoices();
        })();
      });
    });
  };

  tap(body.querySelector("#ad-add")!, () => {
    plink(12, 0.3);
    openAddWord(() => {
      void drawCustom();
      void drawPhotos();
    });
  });

  let armedVo = false;
  tap(voClear, () => {
    if (!armedVo) {
      armedVo = true;
      voClear.textContent = "ほんとうに ぜんぶ けす？";
      return;
    }
    armedVo = false;
    voClear.textContent = "ろくおんを ぜんぶ けす";
    void (async () => {
      const keys = await voices();
      await Promise.all(keys.map((k) => deleteVoice(k)));
      tone(300, 0.18, "sine", 0.35, 180);
      say("ろくおんを けしたよ");
      void drawVoices();
    })();
  });

  void drawCustom();
  void drawPhotos();
  void drawVoices();
}

function drawWorks(body: HTMLElement, say: (t: string) => void): void {
  body.innerHTML = `
    <p class="admin-sub">ほぞんした さくひん</p>
    <ul class="admin-list" id="ad-wk"></ul>
    <button class="pill danger" id="ad-wkclear" type="button">さくひんを ぜんぶ けす</button>
    <p class="admin-hint">1まいずつ けすのは さくひん画面の 🗑 から。</p>`;

  const list = body.querySelector<HTMLElement>("#ad-wk")!;
  const clearBtn = body.querySelector<HTMLElement>("#ad-wkclear")!;

  const drawList = async (): Promise<void> => {
    const rows = await listDrawings();
    const bytes = rows.reduce((n, r) => n + r.png.size + r.thumb.size, 0);
    clearBtn.hidden = rows.length === 0;
    if (rows.length === 0) {
      list.innerHTML = '<li class="admin-empty">まだ ないよ</li>';
      return;
    }
    const newest = rows[0] ? new Date(rows[0].createdAt).toLocaleString("ja-JP") : "";
    list.innerHTML = `<li><span>${rows.length}まい</span><span class="admin-size">${size(bytes)}</span></li>
      <li><span>いちばん あたらしい</span><span class="admin-size">${newest}</span></li>`;
  };

  let armed = false;
  tap(clearBtn, () => {
    if (!armed) {
      armed = true;
      clearBtn.textContent = "ほんとうに ぜんぶ けす？";
      return;
    }
    armed = false;
    clearBtn.textContent = "さくひんを ぜんぶ けす";
    void (async () => {
      const rows = await listDrawings();
      await Promise.all(rows.map((r) => deleteDrawing(r.id)));
      tone(300, 0.18, "sine", 0.35, 180);
      say("さくひんを けしたよ");
      void drawList();
    })();
  });

  void drawList();
}

function drawData(body: HTMLElement, say: (t: string) => void): void {
  body.innerHTML = `
    <p class="admin-sub">この たんまつに ほぞん しているもの</p>
    <ul class="admin-list" id="ad-dt"><li class="admin-empty">しらべて いるよ…</li></ul>
    <button class="pill danger" id="ad-wipe" type="button">データを すべて けす</button>
    <p class="admin-hint">しゃしん・ろくおん・さくひん・むずかしさは、この たんまつの ブラウザに だけ あります。</p>`;

  const list = body.querySelector<HTMLElement>("#ad-dt")!;

  void (async () => {
    await ready;
    const [drawings, galleries, voices, words] = await Promise.all([
      db.drawings.toArray().catch(() => []),
      db.galleries.toArray().catch(() => []),
      db.voices.toArray().catch(() => []),
      db.words.toArray().catch(() => []),
    ]);
    const photos = galleries.reduce((n, r) => n + r.photos.length, 0);
    let estimate = "";
    try {
      const e = await navigator.storage?.estimate?.();
      if (e?.usage) estimate = `${size(e.usage)}${e.quota ? ` / ${size(e.quota)}` : ""}`;
    } catch {
      /* unsupported */
    }
    list.innerHTML = [
      `<li><span>さくひん</span><span class="admin-size">${drawings.length}まい</span></li>`,
      `<li><span>しゃしん</span><span class="admin-size">${photos}まい</span></li>`,
      `<li><span>ろくおん</span><span class="admin-size">${voices.length}こ</span></li>`,
      `<li><span>ついかした ことば</span><span class="admin-size">${words.length}こ</span></li>`,
      estimate
        ? `<li><span>つかって いる りょう</span><span class="admin-size">${estimate}</span></li>`
        : "",
    ].join("");
  })();

  let armed = false;
  const wipe = body.querySelector<HTMLElement>("#ad-wipe")!;
  tap(wipe, () => {
    if (!armed) {
      armed = true;
      wipe.textContent = "ほんとうに すべて けす？";
      return;
    }
    armed = false;
    wipe.textContent = "データを すべて けす";
    void (async () => {
      for (const k of ALL_KEYS) clearLevel(k);
      await db.delete().catch(() => {});
      say("けしたよ。よみこみ なおすよ…");
      tone(300, 0.3, "sine", 0.35, 140);
      window.setTimeout(() => window.location.reload(), 900);
    })();
  });
}
