// 🍎 もぐもぐ (Pretend-Play Feeding) — vocabulary, colours, and 1-to-1 counting.
//
// Upgraded spec:
//  - Fixed 2-line order banner above the hungry animal friend: never shifts layout
//    even when messages wrap.
//  - Unified `bindGrab` on picnic tray foods: drag toward the mouth OR simply tap
//    a food to fly it right into the wide-open mouth ("あーん！ -> ぱくっ！").
//  - Errorless pretend play: every food is deliciously eaten and named (using
//    parent voice recordings when present); matching the craving advances the round.

import { boing, cheer, chomp, marimba, plink, speak } from "./audio";
import { createFriendPuppet, FRIENDS } from "./character";
import { loadAllWords } from "./custom";
import { jNum, loadLevel, saveLevel } from "./difficulty";
import { burst } from "./fx";
import type { Nav } from "./home";
import { answerCorrect, roundFinished } from "./reward";
import { HOME_PILL, bindGrab, bindHome, formatMsg, shuffle, tap } from "./ui";
import { wordVisual } from "./visual";
import { playWord, type Word } from "./voice";

const LKEY = "otete-feed-level";

const FOOD_COLORS: Record<string, { name: string; hex: string }> = {
  ringo: { name: "あかい", hex: "#ff5a5a" },
  ichigo: { name: "あかい", hex: "#ff5a5a" },
  tomato: { name: "あかい", hex: "#ff5a5a" },
  sakuranbo: { name: "あかい", hex: "#ff5a5a" },
  suika: { name: "あかい", hex: "#ff5a5a" },
  banana: { name: "きいろい", hex: "#ffd23f" },
  remon: { name: "きいろい", hex: "#ffd23f" },
  toumorokoshi: { name: "きいろい", hex: "#ffd23f" },
  chiizu: { name: "きいろい", hex: "#ffd23f" },
  tamagoyaki: { name: "きいろい", hex: "#ffd23f" },
  purin: { name: "きいろい", hex: "#ffd23f" },
  burokkori: { name: "みどりの", hex: "#37b24d" },
  kyabetsu: { name: "みどりの", hex: "#37b24d" },
  kyuuri: { name: "みどりの", hex: "#37b24d" },
  meron: { name: "みどりの", hex: "#37b24d" },
  kiui: { name: "みどりの", hex: "#37b24d" },
  piiman: { name: "みどりの", hex: "#37b24d" },
  mikan: { name: "だいだいの", hex: "#ff922b" },
  ninjin: { name: "だいだいの", hex: "#ff922b" },
  budou: { name: "むらさきの", hex: "#9b5de5" },
  nasu: { name: "むらさきの", hex: "#9b5de5" },
};

type Craving =
  | { kind: "word"; target: Word }
  | { kind: "color"; colorName: string; hex: string; target: Word }
  | { kind: "count"; need: number; eaten: number; target: Word };

export function renderFeed(root: HTMLElement, nav: Nav): () => void {
  let level = loadLevel(LKEY, 0);
  let roundCount = 0;
  let friendIdx = Math.trunc(Math.random() * FRIENDS.length);
  let foods: Word[] = [];
  let tray: Word[] = [];
  let craving: Craving | null = null;
  let busy = false;
  const timers: number[] = [];
  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms));
  };

  root.innerHTML = `
    <div class="stage-screen feed-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        <button class="friend-switch" id="f-switch" type="button" title="おともだちを かえる">
          <span id="f-title">くまさん</span> 🔄
        </button>
        <span class="topbar-spacer"></span>
      </div>

      <div class="play-split">
        <div class="feed-stage">
          <button class="guide-bubble feed-order" id="f-bubble" type="button">
            <span class="guide-visual" id="f-vis"></span>
            <span class="guide-text" id="f-msg"></span>
            <span class="guide-audio">🔊</span>
          </button>
          <div class="feed-char-wrap" id="f-char"></div>
        </div>

        <div class="toy-dock wood-dock" id="f-table"></div>
      </div>
    </div>
  `;

  const bubble = root.querySelector<HTMLButtonElement>("#f-bubble")!;
  const visEl = root.querySelector<HTMLElement>("#f-vis")!;
  const msgEl = root.querySelector<HTMLElement>("#f-msg")!;
  const charHost = root.querySelector<HTMLElement>("#f-char")!;
  const table = root.querySelector<HTMLElement>("#f-table")!;
  const titleEl = root.querySelector<HTMLElement>("#f-title")!;
  const switchBtn = root.querySelector<HTMLElement>("#f-switch")!;

  const puppet = createFriendPuppet(FRIENDS[friendIdx]!);
  charHost.append(puppet.el);
  titleEl.textContent = puppet.friend.name;

  bindHome(root, () => nav.home());

  function setPrompt(text: string, visualHtml?: string): void {
    msgEl.innerHTML = formatMsg(text);
    if (visualHtml !== undefined) {
      visEl.innerHTML = visualHtml;
      visEl.hidden = !visualHtml;
    }
  }

  function mouthCenter(): { x: number; y: number } {
    const r = puppet.el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.6 };
  }

  tap(switchBtn, () => {
    friendIdx = (friendIdx + 1) % FRIENDS.length;
    puppet.setFriend(FRIENDS[friendIdx]!);
    puppet.hop();
    titleEl.textContent = puppet.friend.name;
    boing(1.1);
    speak(puppet.friend.greeting);
  });

  const replayOrder = (): void => {
    if (busy) return;
    plink(14, 0.32);
    puppet.hop();
    bubble.classList.remove("pop");
    void bubble.offsetWidth;
    bubble.classList.add("pop");
    announceCraving();
  };

  tap(bubble, replayOrder);
  tap(puppet.el, replayOrder);

  function announceCraving(): void {
    if (!craving) return;
    if (craving.kind === "word") {
      if (craving.target.custom) void playWord(craving.target);
      else speak(`${craving.target.label} ちょうだい！`);
    } else if (craving.kind === "color") {
      speak(`${craving.colorName} たべもの ちょうだい！`);
    } else {
      const rem = craving.need - craving.eaten;
      speak(`あと ${jNum(rem)}こ ちょうだい！`);
    }
  }

  function syncCravingBanner(): void {
    if (!craving) return;
    if (craving.kind === "word") {
      setPrompt(
        craving.target.label ? `${craving.target.label} ちょうだい！` : "あーん！ ちょうだい！",
        wordVisual(craving.target, "vis-thumb", false),
      );
    } else if (craving.kind === "color") {
      setPrompt(
        `${craving.colorName} たべもの ちょうだい！`,
        `<span class="color-dot" style="background:${craving.hex}"></span>`,
      );
    } else {
      const eaten = craving.eaten;
      const rem = craving.need - eaten;
      const dots = Array.from(
        { length: craving.need },
        (_, i) => `<span class="plate-dot">${i < eaten ? "😋" : "🍽️"}</span>`,
      ).join("");
      setPrompt(`あと ${rem}こ ちょうだい！`, `<span class="plate-dots">${dots}</span>`);
    }
  }

  function nextRound(): void {
    if (foods.length === 0) return;
    busy = false;
    puppet.setMouth("smile");
    puppet.resetLook();

    const count = Math.min(4, Math.max(2, 2 + Math.floor(level / 3)));
    const pool = shuffle([...foods]);
    const target = pool[0]!;
    tray = shuffle(pool.slice(0, count));

    const colorInfo = FOOD_COLORS[target.slug];
    if (level >= 3 && level % 3 === 1 && colorInfo) {
      const others = pool.filter((w) => FOOD_COLORS[w.slug]?.name !== colorInfo.name);
      tray = shuffle([target, ...others.slice(0, count - 1)]);
      craving = { kind: "color", colorName: colorInfo.name, hex: colorInfo.hex, target };
    } else if (level >= 2 && level % 3 === 2) {
      const need = level >= 6 ? 3 : 2;
      tray = shuffle(pool.slice(0, Math.max(count, need)));
      craving = { kind: "count", need, eaten: 0, target };
    } else {
      craving = { kind: "word", target };
    }

    syncCravingBanner();
    renderTray();
    announceCraving();
  }

  function matchesCraving(w: Word): boolean {
    if (!craving) return true;
    if (craving.kind === "word") return w.slug === craving.target.slug;
    if (craving.kind === "color") {
      return w.slug === craving.target.slug || FOOD_COLORS[w.slug]?.name === craving.colorName;
    }
    return true;
  }

  function feedItem(w: Word, cardEl: HTMLElement): void {
    const { x: mx, y: my } = mouthCenter();
    cardEl.classList.add("eaten");
    chomp();
    burst(mx, my, 22, ["#ff758f", "#ffd23f", "#ff922b", "#69db7c"]);

    puppet.setMouth("chew");
    puppet.hop();
    setPrompt("ぱくっ！ もぐもぐ…");
    void playWord(w);

    later(() => {
      puppet.setMouth("joy");
      puppet.hop();
      roundCount++;

      if (craving?.kind === "count") {
        craving.eaten++;
        const countWord = jNum(craving.eaten);
        marimba(craving.eaten * 2, 0.5);
        speak(countWord);

        if (craving.eaten >= craving.need) {
          syncCravingBanner();
          setPrompt("おなかいっぱい！ ありがとう！");
          later(() => {
            answerCorrect(mx, my, ["#ff5a5a", "#ffd23f", "#37b24d", "#4d8bff"]);
            cheer();
            roundFinished(true);
            speak("おなかいっぱい！ おいしい〜！");
            level++;
            saveLevel(LKEY, level);
            later(nextRound, 1700);
          }, 550);
        } else {
          busy = false;
          syncCravingBanner();
          if (!table.querySelector(".food-card:not(.eaten)")) renderTray();
        }
        return;
      }

      if (matchesCraving(w)) {
        answerCorrect(mx, my, ["#ff5a5a", "#ffd23f", "#37b24d", "#ff758f"]);
        cheer();
        setPrompt(`${w.label || "これ"} おいしい〜！`);
        level++;
        saveLevel(LKEY, level);
        if (roundCount % 4 === 0) {
          roundFinished(true);
          friendIdx = (friendIdx + 1) % FRIENDS.length;
          later(() => {
            puppet.setFriend(FRIENDS[friendIdx]!);
            titleEl.textContent = puppet.friend.name;
            nextRound();
          }, 1500);
        } else {
          later(nextRound, 1400);
        }
      } else {
        marimba(3, 0.4);
        setPrompt(`${w.label || "これ"}も おいしいね！`);
        later(() => {
          busy = false;
          puppet.setMouth("smile");
          syncCravingBanner();
          announceCraving();
          if (!table.querySelector(".food-card:not(.eaten)")) renderTray();
        }, 1050);
      }
    }, 480);
  }

  function renderTray(): void {
    table.innerHTML = tray
      .map(
        (w, i) => `
        <button class="food-card" data-idx="${i}" type="button" aria-label="${w.label}">
          <span class="food-visual">${wordVisual(w, "food-img", false)}</span>
          ${w.label ? `<span class="food-lbl">${w.label}</span>` : ""}
        </button>
      `,
      )
      .join("");

    table.querySelectorAll<HTMLElement>(".food-card").forEach((card) => {
      const idx = Number(card.dataset.idx ?? 0);
      const word = tray[idx]!;
      bindGrab(card, {
        canStart: () => !busy && !card.classList.contains("eaten"),
        onStart: (x, y) => {
          marimba(1, 0.35);
          puppet.lookAt(x, y);
          puppet.setMouth("open", 0.6);
          setPrompt("あーーん！");
        },
        onMove: (x, y) => {
          puppet.lookAt(x, y);
          const m = mouthCenter();
          const dist = Math.hypot(x - m.x, y - m.y);
          puppet.setMouth("open", Math.max(0.45, Math.min(1.25, 1.35 - dist / 240)));
        },
        findTarget: (x, y, _dx, dy, isTap) => {
          const m = mouthCenter();
          const dist = Math.hypot(x - m.x, y - m.y);
          if (isTap || dist < 160 || dy < -50) {
            busy = true;
            return m;
          }
          return null;
        },
        onSnap: () => feedItem(word, card),
        onCancel: () => {
          puppet.setMouth("smile");
          puppet.resetLook();
          syncCravingBanner();
        },
      });
    });
  }

  void (async () => {
    const all = await loadAllWords();
    foods = all.filter((w) => w.category === "たべもの");
    if (foods.length < 2) foods = all;
    nextRound();
  })();

  return () => {
    timers.forEach((t) => clearTimeout(t));
  };
}
