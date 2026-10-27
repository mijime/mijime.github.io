// 📖 ずかん (Interactive Talking Picture Book & Friend-Guided Discovery)
//
// Upgraded spec:
//  - Unified Topbar (`🏠`, `📖 みる / 🔍 さがそう` segmented pill, `📷 しゃしん追加`).
//  - Unified 2-line Guide Banner: in `みる` mode, tapping any card makes the animal
//    friend react with onomatopoeia ("わんわん！ いぬ！") and shows a quick `🎤・📷`
//    button to record parent voice or add family photos.
//  - In `さがそう` mode, the same Guide Banner asks where a word is ("わんわん！ いぬ は どこかな？")
//    with errorless gentle feedback.

import { boing, cheer, chomp, chooChoo, marimba, plink, speak } from "./audio";
import { addWordPhoto, deleteWordPhoto, loadAllWords, wordKey } from "./custom";
import { loadLevel, saveLevel } from "./difficulty";
import { burst } from "./fx";
import type { Nav } from "./home";
import { pickPhoto } from "./photo";
import { openPhotoAdd } from "./photoadd";
import { openVoiceRecorder } from "./recorder";
import { answerCorrect, roundFinished } from "./reward";
import {
  HOME_PILL,
  armButton,
  bindHome,
  bindSeg,
  createGuideBanner,
  scrollTap,
  segHtml,
  shuffle,
  tap,
  tapOrHold,
} from "./ui";
import { wordVisual } from "./visual";
import { getVoice, playWord, voiceKey, type Word } from "./voice";

type Prog = Record<string, { box: number; due: number }>;

const PROG_KEY = "otete-progress";
const LKEY = "otete-learn-level";
const PHOTO_KEY = "otete-learn-photos";
const INTERVAL = [0, 30_000, 120_000, 600_000, 3_600_000, 21_600_000, 86_400_000, 604_800_000];

const CAT_ICONS: Record<string, string> = {
  どうぶつ: "🐶",
  たべもの: "🍎",
  のりもの: "🚗",
  みぢか: "🏠",
  しぜん: "🌳",
  からだ: "✋",
  あそび: "⚽",
  ひと: "👶",
  ぎょうじ: "🎏",
};

const ONOMATOPOEIA: Record<string, string> = {
  inu: "わんわん！",
  neko: "にゃーにゃー！",
  usagi: "ぴょんぴょん！",
  kuma: "がおー！",
  panda: "ころころ♪",
  kaeru: "けろけろ！",
  raion: "がおーー！",
  tora: "がおー！",
  zou: "ぱおーん！",
  buta: "ぶーぶー！",
  ushi: "もーもー！",
  uma: "ひひーん！",
  hitsuji: "めーめー！",
  niwatori: "こけこっこー！",
  ahiru: "がーがー！",
  pengin: "よちよち♪",
  saru: "うっきー！",
  hachi: "ぶんぶん！",
  kuruma: "ぶっぶー！",
  basu: "ぷっぷー！",
  patokaa: "ぴーぽー！",
  kyuukyuusha: "ぴーぽー！",
  shoubousha: "うーかんかん！",
  kikansha: "ぽっぽー！",
  densha: "がたんごとん！",
  shinkansen: "びゅーん！",
  hikouki: "キーン！",
  rokketto: "どっかーん！",
};

let WORDS: Word[] = [];

function loadProg(): Prog {
  try {
    return JSON.parse(localStorage.getItem(PROG_KEY) ?? "{}") as Prog;
  } catch {
    return {};
  }
}
function saveProg(p: Prog): void {
  try {
    localStorage.setItem(PROG_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}
function mark(prog: Prog, word: Word, correct: boolean): void {
  const cur = prog[word.slug] ?? { box: 0, due: 0 };
  const box = correct ? Math.min(cur.box + 1, INTERVAL.length - 1) : 0;
  prog[word.slug] = { box, due: Date.now() + (correct ? INTERVAL[box]! : 15_000) };
  saveProg(prog);
}
function pickTarget(prog: Prog, words: Word[]): Word {
  const now = Date.now();
  const due = words.filter((w) => (prog[w.slug]?.due ?? 0) <= now);
  const pool = due.length > 0 ? due : words;
  const minBox = Math.min(...pool.map((w) => prog[w.slug]?.box ?? 0));
  const candidates = pool.filter((w) => (prog[w.slug]?.box ?? 0) === minBox);
  return candidates[Math.trunc(Math.random() * candidates.length)]!;
}

const readPhotosOnly = (): boolean => {
  try {
    return localStorage.getItem(PHOTO_KEY) === "1";
  } catch {
    return false;
  }
};
const savePhotosOnly = (v: boolean): void => {
  try {
    localStorage.setItem(PHOTO_KEY, v ? "1" : "0");
  } catch {
    /* ignore */
  }
};

async function playWordLively(w: Word): Promise<void> {
  if (w.slug === "kikansha" || w.slug === "densha") chooChoo();
  else if (w.category === "たべもの") chomp();
  else marimba((w.label.codePointAt(0) || 3) % 8, 0.38);

  const recorded = await getVoice(voiceKey(w));
  if (recorded) {
    await playWord(w);
    return;
  }
  const ono = ONOMATOPOEIA[w.slug];
  if (ono && w.label) speak(`${ono} ${w.label}！`);
  else speak(w.label);
}

export function renderLearn(root: HTMLElement, nav: Nav): () => void {
  let tab: "view" | "quiz" = "view";
  let cat = "";
  let photosOnly = readPhotosOnly();
  let viewIndex = 0;
  let sheet: HTMLElement | null = null;
  let locked = false;
  let current: Word | null = null;
  let spotlightWord: Word | null = null;
  let orderedWords: Word[] = [];
  const prog = loadProg();
  let level = loadLevel(LKEY, 0);
  let streak = 0;
  let quizTimer = 0;

  const segs = [
    { key: "view", emo: "📖", label: "ずかん" },
    { key: "quiz", emo: "🔍", label: "さがそう" },
  ] as const;

  root.innerHTML = `
    <div class="stage-screen zukan-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        ${segHtml(segs, tab)}
        <button class="toy-cam-pill" id="l-snap" type="button" title="しゃしんを とる">📷</button>
      </div>

      <div id="l-guide"></div>
      <div class="cat-row" id="l-cats"></div>
      <div class="zukan-body" id="l-body"><div class="g-empty">よみこみ中…</div></div>
    </div>`;

  const body = root.querySelector<HTMLElement>("#l-body")!;
  const catRow = root.querySelector<HTMLElement>("#l-cats")!;

  const guide = createGuideBanner({
    friendIdx: 0,
    actionHtml:
      '<button class="pill guide-edit-btn" id="l-edit" type="button" title="こえ・しゃしん">🎤📷</button>',
    onReplay: () => {
      const w = tab === "view" ? spotlightWord : current;
      if (w) void playWordLively(w);
    },
  });
  root.querySelector("#l-guide")!.replaceWith(guide.el);
  const editBtn = guide.el.querySelector<HTMLElement>("#l-edit")!;

  tap(editBtn, () => {
    const w = tab === "view" ? spotlightWord : current;
    if (!w || orderedWords.length === 0) return;
    plink(12, 0.3);
    const idx = Math.max(
      0,
      orderedWords.findIndex((x) => x.slug === w.slug),
    );
    openSheet(orderedWords, idx);
  });

  bindHome(root, () => nav.home());
  bindSeg(root, (k) => {
    tab = (k as "view" | "quiz") || "view";
    render();
  });

  const cats = (): string[] => {
    const counts = new Map<string, number>();
    for (const w of WORDS) {
      if (photosOnly && !w.url) continue;
      counts.set(w.category, (counts.get(w.category) ?? 0) + 1);
    }
    return [...counts.keys()].filter((c) => (counts.get(c) ?? 0) >= 2);
  };
  const filtered = (): Word[] => {
    const list = cat ? WORDS.filter((w) => w.category === cat) : WORDS;
    return photosOnly ? list.filter((w) => w.url) : list;
  };

  function renderCats(): void {
    const list = cats();
    if (cat && !list.includes(cat)) cat = "";
    catRow.innerHTML = [
      `<button class="chip${cat === "" ? " active" : ""}" data-cat="" type="button">🌟 ぜんぶ</button>`,
      ...list.map(
        (c) =>
          `<button class="chip${c === cat ? " active" : ""}" data-cat="${c}" type="button">${CAT_ICONS[c] ?? "✨"} ${c}</button>`,
      ),
      `<button class="chip chip-photo${photosOnly ? " active" : ""}" id="l-photo" type="button">📷 しゃしん</button>`,
    ].join("");

    catRow.querySelectorAll<HTMLElement>(".chip[data-cat]").forEach((el) => {
      scrollTap(el, () => {
        if (el.dataset.cat === cat) return;
        cat = el.dataset.cat ?? "";
        viewIndex = 0;
        marimba(2, 0.38);
        if (cat) speak(cat);
        renderCats();
        render();
      });
    });
    scrollTap(catRow.querySelector("#l-photo")!, () => {
      photosOnly = !photosOnly;
      savePhotosOnly(photosOnly);
      viewIndex = 0;
      plink(12, 0.3);
      renderCats();
      render();
    });
  }

  function render(): void {
    window.clearTimeout(quizTimer);
    closeSheet();
    editBtn.hidden = tab !== "view";
    if (tab === "view") renderView();
    else renderQuiz();
  }

  function updateSpotlight(w: Word, animate = true): void {
    spotlightWord = w;
    const ono = ONOMATOPOEIA[w.slug] ?? "";
    const msg = w.label ? `${ono ? `${ono} ` : ""}${w.label}！` : "おうちの ことば！";
    guide.setMessage(msg, wordVisual(w, "vis-thumb", true));
    if (animate) {
      guide.puppet.hop();
      guide.puppet.setMouth("joy");
      guide.popBubble();
      window.setTimeout(() => guide.puppet.setMouth("smile"), 520);
    }
  }

  /* ----- 📖 ずかん (Picture Grid) ----- */
  function renderView(): void {
    const list = filtered();
    if (list.length === 0) {
      orderedWords = [];
      guide.setMessage("右上の 📷 から しゃしんを とってみよう！", "📷");
      body.innerHTML = `<div class="g-empty">${photosOnly ? "しゃしんの ことばが まだ ないよ" : "ことばが ないよ"}</div>`;
      return;
    }

    const byCat = new Map<string, Word[]>();
    for (const w of list) {
      const g = byCat.get(w.category);
      if (g) g.push(w);
      else byCat.set(w.category, [w]);
    }
    const sections = [...byCat.entries()].map(([category, words]) => ({ category, words }));
    orderedWords = sections.flatMap((s) => s.words);
    if (!spotlightWord || !orderedWords.some((x) => x.slug === spotlightWord?.slug)) {
      spotlightWord = orderedWords[0] ?? null;
    }
    if (spotlightWord) updateSpotlight(spotlightWord, false);

    body.innerHTML = `<div class="word-scroll">${sections
      .map(
        (g) => `
        <section class="word-section">
          <h2 class="word-section-title">${CAT_ICONS[g.category] ?? "✨"} ${g.category}<span class="wst-count">${g.words.length}</span></h2>
          <div class="word-grid">${g.words
            .map(
              (w) => `<button class="wcard" data-slug="${w.slug}" type="button">
            ${wordVisual(w, "wcard-img", true)}
            ${w.label ? `<span class="wcard-name">${w.label}</span>` : ""}
          </button>`,
            )
            .join("")}</div>
        </section>`,
      )
      .join("")}</div>`;

    body.querySelectorAll<HTMLElement>(".wcard").forEach((el) => {
      const w = orderedWords.find((x) => x.slug === el.dataset.slug)!;
      tapOrHold(
        el,
        () => {
          const r = el.getBoundingClientRect();
          burst(r.left + r.width / 2, r.top + r.height / 2, 16, [
            "#ffd23f",
            "#ff6b6b",
            "#4d8bff",
            "#69db7c",
          ]);
          el.classList.add("pop");
          window.setTimeout(() => el.classList.remove("pop"), 350);
          updateSpotlight(w, true);
          void playWordLively(w);
        },
        () => {
          plink(12, 0.3);
          openSheet(
            orderedWords,
            orderedWords.findIndex((x) => x.slug === el.dataset.slug),
          );
        },
      );
    });
  }

  function closeSheet(): void {
    if (sheet) {
      sheet.remove();
      sheet = null;
    }
  }

  function openSheet(list: Word[], i: number, autoplay = true): void {
    closeSheet();
    viewIndex = ((i % list.length) + list.length) % list.length;
    const w = list[viewIndex]!;
    const key = wordKey(w);
    const el = document.createElement("div");
    el.className = "word-sheet";
    el.innerHTML = `
      <div class="ws-panel">
        <button class="ws-close" type="button" aria-label="とじる">✕</button>
        <button class="ws-visual" type="button" aria-label="${w.label || "ことば"}"></button>
        <div class="ws-photos" id="ws-photos"></div>
        ${w.label ? `<div class="ws-word">${w.label}</div>` : ""}
        <div class="ws-actions">
          <button class="ws-nav" data-nav="prev" type="button" aria-label="まえ">◀</button>
          <button class="mic ws-mic" id="ws-mic" type="button">🎤 こえ</button>
          <button class="ws-nav" data-nav="next" type="button" aria-label="つぎ">▶</button>
        </div>
      </div>`;
    root.append(el);
    sheet = el;
    const visual = el.querySelector<HTMLElement>(".ws-visual")!;
    const photosEl = el.querySelector<HTMLElement>("#ws-photos")!;
    let photoIdx = 0;

    const paintVisual = (): void => {
      const photos = w.photos ?? [];
      if (photos.length > 0) {
        const p = photos[Math.min(photoIdx, photos.length - 1)]!;
        visual.innerHTML = `<img class="ws-img" src="${p.url}" alt="${w.label}">`;
      } else {
        visual.innerHTML = `<span class="ws-img emoji-visual" role="img" aria-label="${w.label}">${w.emoji ?? "❓"}</span>`;
      }
    };

    const updateCard = (): void => {
      const card = body.querySelector<HTMLElement>(`.wcard[data-slug="${w.slug}"]`);
      if (!card) return;
      if (photosOnly && !w.photos?.length) card.remove();
      else {
        card.innerHTML = `${wordVisual(w, "wcard-img", true)}${w.label ? `<span class="wcard-name">${w.label}</span>` : ""}`;
      }
    };

    const paintPhotos = (): void => {
      const photos = w.photos ?? [];
      if (photoIdx >= photos.length) photoIdx = Math.max(0, photos.length - 1);
      const canDelete = photos.length > (w.custom ? 1 : 0);
      photosEl.innerHTML = `${photos
        .map(
          (p, n) =>
            `<button class="ws-thumb${n === photoIdx ? " active" : ""}" data-i="${n}" type="button"><img src="${p.thumbUrl}" alt=""></button>`,
        )
        .join(
          "",
        )}<button class="ws-add" id="ws-add" type="button" aria-label="しゃしんを ついか">＋</button>${
        canDelete
          ? `<button class="ws-del" id="ws-del" type="button" aria-label="しゃしんを けす">🗑</button>`
          : ""
      }`;
      photosEl.querySelectorAll<HTMLElement>(".ws-thumb").forEach((t) => {
        tap(t, () => {
          photoIdx = Number(t.dataset.i) || 0;
          paintVisual();
          paintPhotos();
        });
      });
      tap(photosEl.querySelector("#ws-add")!, () => {
        void (async () => {
          const cropped = await pickPhoto();
          if (!cropped || cropped === "clear") return;
          w.photos = await addWordPhoto(key, cropped);
          w.url = w.photos[0]?.url;
          w.thumbUrl = w.photos[0]?.thumbUrl;
          photoIdx = w.photos.length - 1;
          updateCard();
          openSheet(list, viewIndex, false);
        })();
      });
      const del = photosEl.querySelector<HTMLElement>("#ws-del");
      if (del) {
        armButton(del, () => {
          void (async () => {
            const p = (w.photos ?? [])[photoIdx];
            if (!p) return;
            w.photos = await deleteWordPhoto(key, p.id);
            w.url = w.photos[0]?.url;
            w.thumbUrl = w.photos[0]?.thumbUrl;
            photoIdx = 0;
            updateCard();
            openSheet(list, viewIndex, false);
          })();
        });
      }
    };

    paintVisual();
    paintPhotos();
    tap(visual, () => {
      const r = visual.getBoundingClientRect();
      burst(r.left + r.width / 2, r.top + r.height / 2, 16, ["#ffd23f", "#ff6b6b", "#4d8bff"]);
      void playWordLively(w);
      visual.classList.add("pop");
      window.setTimeout(() => visual.classList.remove("pop"), 350);
    });
    tap(el.querySelector(".ws-close")!, () => closeSheet());
    el.addEventListener("pointerdown", (e) => {
      if (e.target === el) closeSheet();
    });
    el.querySelectorAll<HTMLElement>(".ws-nav").forEach((b) => {
      tap(b, () => {
        const dir = b.dataset.nav === "next" ? 1 : -1;
        openSheet(list, viewIndex + dir);
      });
    });
    tap(el.querySelector("#ws-mic")!, () =>
      openVoiceRecorder(voiceKey(w), w.label || "🎤", () => {}),
    );
    if (autoplay) void playWordLively(w);
  }

  /* ----- 🔍 さがそう (Errorless Discovery Quiz) ----- */
  function renderQuiz(): void {
    window.clearTimeout(quizTimer);
    const list = filtered();
    if (list.length < 2) {
      guide.setMessage("ことばが 2つ いじょう あると あそべるよ！", "🔍");
      body.innerHTML = `<div class="g-empty">${photosOnly ? "しゃしんの ことばが たりないよ" : "ことばが たりないよ"}</div>`;
      return;
    }
    const target = pickTarget(prog, list);
    current = target;
    orderedWords = list;
    const want = Math.min(list.length, Math.min(6, 2 + Math.floor(level / 2)));
    const others = shuffle(list.filter((w) => w.slug !== target.slug)).slice(
      0,
      Math.max(1, want - 1),
    );
    const options = shuffle([target, ...others]);
    locked = false;

    const ono = ONOMATOPOEIA[target.slug] ?? "";
    const promptText = target.label
      ? `${ono ? `${ono} ` : ""}「${target.label}」は どこかな？`
      : "この こえは どれかな？";
    guide.setMessage(promptText, "🔍");
    guide.puppet.setMouth("smile");

    body.innerHTML = `
      <div class="quiz-stage">
        <div class="opts" data-n="${options.length}">
          ${options
            .map((o) => {
              const p = o.photos?.length
                ? o.photos[Math.trunc(Math.random() * o.photos.length)]
                : undefined;
              return `<button class="opt" data-slug="${o.slug}" type="button">
                ${wordVisual(o, "opt-visual", false, p)}
                ${o.label ? `<span class="opt-label">${o.label}</span>` : ""}
              </button>`;
            })
            .join("")}
        </div>
      </div>`;

    void playWordLively(target);

    body.querySelectorAll<HTMLElement>(".opt").forEach((el) => {
      tap(el, () => {
        if (locked || !current) return;
        const picked = options.find((o) => o.slug === el.dataset.slug);
        const ok = el.dataset.slug === current.slug;
        const r = el.getBoundingClientRect();
        guide.puppet.lookAt(r.left + r.width / 2, r.top + r.height / 2);

        if (ok) {
          locked = true;
          mark(prog, current, true);
          el.classList.add("correct");
          guide.puppet.setMouth("joy");
          guide.puppet.hop();
          guide.setMessage(
            `みつけたね！ ${current.label || "せいかい"} だよ！`,
            wordVisual(current, "vis-thumb", true),
          );
          streak++;
          if (streak >= 3) {
            streak = 0;
            level++;
            saveLevel(LKEY, level);
            roundFinished(true);
          }
          answerCorrect(r.left + r.width / 2, r.top + r.height / 2, [
            "#37b24d",
            "#ffd23f",
            "#4d8bff",
            "#ff6b6b",
          ]);
          cheer();
          speak(`みつけた！ ${current.label || ""} だね！`);
          quizTimer = window.setTimeout(renderQuiz, 1600);
        } else {
          mark(prog, current, false);
          boing(0.95);
          el.classList.remove("pulse");
          void el.offsetWidth;
          el.classList.add("pulse");
          const correctEl = body.querySelector<HTMLElement>(`.opt[data-slug="${current.slug}"]`);
          correctEl?.classList.add("hint-glow");
          if (picked?.label && current.label) {
            guide.setMessage(`それは ${picked.label} だね！ 「${current.label}」は こっち！`);
            speak(`それは ${picked.label} だね！ ${current.label} は こっちだよ！`);
          } else {
            guide.setMessage("ひかっている カードを タッチしてみて！");
            void playWord(current);
          }
        }
      });
    });
  }

  async function reload(): Promise<void> {
    WORDS = await loadAllWords();
    renderCats();
    render();
  }

  tap(root.querySelector("#l-snap")!, () => {
    plink(12, 0.3);
    openPhotoAdd(() => {
      void reload();
    });
  });

  void reload();

  return () => {
    window.clearTimeout(quizTimer);
    closeSheet();
    current = null;
  };
}
