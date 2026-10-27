// 🔢 かず (Tactile Number Toy) — 3 unified modes:
//  1. 🍎 1・2・3 (One-to-One Counting): touch each item to harvest into the basket.
//  2. 🍽️ どうぞ (Give-N / Cardinality): drag or tap exact N treats onto the plate.
//  3. ⚖️ シーソー (Quantity Comparison): tap the side with MORE (おおい) or LESS (すくない).
//
// All 3 modes share the exact same Topbar + 2-line locked Guide Banner,
// eliminating custom speech boxes that used to wrap awkwardly.

import { boing, bubblePop, cheer, chomp, marimba, plink, snapIn, speak } from "./audio";
import { jNum, jNumSpeech, loadLevel, saveLevel } from "./difficulty";
import { burst } from "./fx";
import type { Nav } from "./home";
import { answerCorrect, roundFinished } from "./reward";
import { HOME_PILL, bindGrab, bindHome, bindSeg, createGuideBanner, segHtml, tap } from "./ui";

const CKEY = "otete-count-level";

type TabMode = "harvest" | "plate" | "seesaw";

type HarvestTheme = {
  id: string;
  bgClass: string;
  emoji: string;
  itemName: string;
};

const HARVEST_THEMES: readonly HarvestTheme[] = [
  { id: "apple", bgClass: "hv-tree", emoji: "🍎", itemName: "りんご" },
  { id: "chick", bgClass: "hv-meadow", emoji: "🐥", itemName: "ひよこ" },
  { id: "balloon", bgClass: "hv-sky", emoji: "🎈", itemName: "ふうせん" },
  { id: "frog", bgClass: "hv-pond", emoji: "🐸", itemName: "かえる" },
  { id: "star", bgClass: "hv-night", emoji: "⭐", itemName: "おほしさま" },
];

const BAKERY_TREATS = [
  { emoji: "🍩", name: "ドーナツ" },
  { emoji: "🍓", name: "いちご" },
  { emoji: "🧁", name: "ケーキ" },
  { emoji: "🍪", name: "クッキー" },
  { emoji: "🍮", name: "プリン" },
];

const SEESAW_TREATS = ["🍓", "🍎", "🍩", "🍌", "🍊", "🧁"];

export function renderCount(root: HTMLElement, nav: Nav): () => void {
  let tab: TabMode = "harvest";
  let level = loadLevel(CKEY, 0);
  let roundCount = 0;
  let themeIdx = 0;
  let timers: number[] = [];
  let locked = false;
  let replayFn: () => void = () => {};

  const later = (fn: () => void, ms: number): void => {
    timers.push(window.setTimeout(fn, ms));
  };
  const clearTimers = (): void => {
    timers.forEach((t) => clearTimeout(t));
    timers = [];
  };

  const segs = [
    { key: "harvest", emo: "🍎", label: "1・2・3" },
    { key: "plate", emo: "🍽️", label: "どうぞ" },
    { key: "seesaw", emo: "⚖️", label: "シーソー" },
  ] as const;

  root.innerHTML = `
    <div class="stage-screen count-screen">
      <div class="toy-topbar">
        ${HOME_PILL}
        ${segHtml(segs, tab)}
        <span class="topbar-spacer"></span>
      </div>

      <div id="c-guide"></div>

      <div class="count-main" id="c-main"></div>
    </div>
  `;

  const main = root.querySelector<HTMLElement>("#c-main")!;

  const guide = createGuideBanner({
    friendIdx: 0,
    onReplay: () => replayFn(),
  });
  root.querySelector("#c-guide")!.replaceWith(guide.el);

  bindHome(root, () => nav.home());
  bindSeg(root, (k) => {
    tab = (k as TabMode) || "harvest";
    render();
  });

  function advanceLevel(): void {
    roundCount++;
    level++;
    saveLevel(CKEY, level);
  }

  function render(): void {
    clearTimers();
    locked = false;
    guide.puppet.setMouth("smile");
    guide.puppet.resetLook();
    if (tab === "harvest") renderHarvest();
    else if (tab === "plate") renderPlate();
    else renderSeesaw();
  }

  /* =======================================================================
     1. 🍎 1・2・3 (One-to-One Counting)
     ======================================================================= */
  function renderHarvest(): void {
    clearTimers();
    locked = false;

    const theme = HARVEST_THEMES[themeIdx % HARVEST_THEMES.length]!;
    themeIdx++;
    const maxItems = Math.min(7, 3 + Math.floor(level / 3));
    const n = 2 + Math.trunc(Math.random() * (maxItems - 1));
    let count = 0;

    replayFn = () => speak(`${theme.itemName}、いくつ あるかな？ タッチしてね！`);
    guide.setMessage(
      `${theme.itemName} タッチして かぞえよう！`,
      `<span class="count-pill">0 / ${n}</span>`,
    );

    main.innerHTML = `
      <div class="play-split">
        <div class="hv-field-card ${theme.bgClass}" id="hv-field"></div>

        <div class="toy-dock wood-dock hv-dock" id="hv-basket">
          <div class="hv-slots" id="hv-slots">
            ${Array.from(
              { length: n },
              (_, i) => `
              <div class="hv-slot" data-slot="${i}">
                <span class="hv-slot-num">${i + 1}</span>
              </div>
            `,
            ).join("")}
          </div>
          <button class="toy-action-btn" id="hv-auto" type="button">▶ いっしょに かぞえる</button>
        </div>
      </div>
    `;

    const field = main.querySelector<HTMLElement>("#hv-field")!;
    const slots = main.querySelectorAll<HTMLElement>(".hv-slot");

    const cols = Math.min(4, Math.max(2, Math.ceil(Math.sqrt(n))));
    const rows = Math.ceil(n / cols);
    const itemsHtml: string[] = [];
    for (let i = 0; i < n; i++) {
      const r = Math.floor(i / cols);
      const c = i % cols;
      const inRow = Math.min(cols, n - r * cols);
      const px = ((c + 0.5) / inRow) * 74 + 13 + (Math.random() - 0.5) * 6;
      const py = ((r + 0.5) / rows) * 68 + 16 + (Math.random() - 0.5) * 6;
      itemsHtml.push(`
        <button class="hv-item" data-i="${i}" style="left:${px.toFixed(1)}%;top:${py.toFixed(1)}%" type="button">
          <span class="hv-item-emo">${theme.emoji}</span>
        </button>
      `);
    }
    field.innerHTML = itemsHtml.join("");

    const collectItem = (el: HTMLElement): void => {
      if (locked || el.classList.contains("collected")) return;
      el.classList.add("collected");
      const slot = slots[count];
      count++;

      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      if (theme.id === "balloon") bubblePop(1 + count * 0.08);
      else snapIn(count);
      marimba(count, 0.5);
      burst(cx, cy, 18, ["#ffd23f", "#ff6b6b", "#69db7c", "#74c0fc"]);

      guide.puppet.hop();
      guide.puppet.setMouth("open", 0.85);
      later(() => {
        if (!locked) guide.puppet.setMouth("smile");
      }, 360);

      if (slot) {
        slot.classList.add("filled");
        slot.innerHTML = `<span class="hv-slot-emo">${theme.emoji}</span><span class="hv-slot-badge">${count}</span>`;
      }

      speak(jNum(count));
      guide.setMessage(
        `${jNum(count)}！ （あと ${n - count}こ）`,
        `<span class="count-pill">${count} / ${n}</span>`,
      );

      if (count >= n) {
        locked = true;
        advanceLevel();
        later(() => {
          guide.puppet.setMouth("joy");
          guide.puppet.hop();
          cheer();
          const bRect = main.querySelector("#hv-basket")!.getBoundingClientRect();
          answerCorrect(bRect.left + bRect.width / 2, bRect.top, [
            "#ffd23f",
            "#ff6b6b",
            "#37b24d",
            "#4d8bff",
          ]);
          roundFinished(true);
          guide.setMessage(
            `ぜんぶで ${n}こ！ すごーい！`,
            `<span class="count-pill">${n} / ${n}</span>`,
          );
          speak(`${jNumSpeech(n)}！ ぜんぶで ${n}こ！`);
          later(renderHarvest, 2300);
        }, 480);
      }
    };

    field.querySelectorAll<HTMLElement>(".hv-item").forEach((el) => {
      tap(el, () => collectItem(el));
    });

    tap(main.querySelector("#hv-auto")!, () => {
      if (locked) return;
      const uncollected = [...field.querySelectorAll<HTMLElement>(".hv-item:not(.collected)")];
      uncollected.forEach((el, idx) => {
        later(() => collectItem(el), idx * 600);
      });
    });
  }

  /* =======================================================================
     2. 🍽️ どうぞ (Give-N / Cardinality with `bindGrab` drag & tap)
     ======================================================================= */
  function renderPlate(): void {
    clearTimers();
    locked = false;

    const treat = BAKERY_TREATS[themeIdx % BAKERY_TREATS.length]!;
    themeIdx++;
    const maxTarget = Math.min(5, 2 + Math.floor(level / 3));
    const target = 1 + Math.trunc(Math.random() * maxTarget);
    const shelfTotal = Math.max(6, target + 3);
    let onPlate = 0;

    const sayOrder = (): void => {
      speak(`${treat.name}、${jNum(target)}こ ちょうだい！`);
    };
    replayFn = sayOrder;
    guide.setMessage(
      `${treat.name} ${target}こ おさらに のせてね！`,
      `<span class="count-pill">${treat.emoji}×${target}</span>`,
    );

    main.innerHTML = `
      <div class="play-split">
        <div class="plate-stage">
          <div class="serving-plate" id="pl-dish">
            <div class="plate-spots" id="pl-spots">
              ${Array.from(
                { length: target },
                (_, i) => `
                <div class="plate-spot" data-idx="${i}">
                  <span class="spot-num">${i + 1}</span>
                </div>
              `,
              ).join("")}
            </div>
          </div>
        </div>

        <div class="toy-dock wood-dock" id="pl-shelf">
          ${Array.from(
            { length: shelfTotal },
            (_, i) => `
            <button class="bakery-item" data-i="${i}" type="button">
              <span class="bakery-emo">${treat.emoji}</span>
            </button>
          `,
          ).join("")}
        </div>
      </div>
    `;

    const dishEl = main.querySelector<HTMLElement>("#pl-dish")!;
    const spots = main.querySelectorAll<HTMLElement>(".plate-spot");
    const shelfItems = main.querySelectorAll<HTMLElement>(".bakery-item");

    sayOrder();

    shelfItems.forEach((btn) => {
      bindGrab(btn, {
        canStart: () => !locked && !btn.classList.contains("taken") && onPlate < target,
        onStart: (x, y) => {
          marimba(1, 0.35);
          guide.puppet.lookAt(x, y);
        },
        onMove: (x, y) => {
          guide.puppet.lookAt(x, y);
        },
        findTarget: (x, y, _dx, dy, isTap) => {
          const nextSpot = spots[onPlate];
          if (!nextSpot) return null;
          const sr = nextSpot.getBoundingClientRect();
          const scx = sr.left + sr.width / 2;
          const scy = sr.top + sr.height / 2;
          const dr = dishEl.getBoundingClientRect();
          const inDish =
            x >= dr.left - 50 && x <= dr.right + 50 && y >= dr.top - 50 && y <= dr.bottom + 50;
          if (isTap || inDish || dy < -45) {
            return { x: scx, y: scy };
          }
          return null;
        },
        onSnap: (pt) => {
          if (locked || btn.classList.contains("taken") || onPlate >= target) return;
          btn.classList.add("taken");
          const spot = spots[onPlate];
          onPlate++;

          snapIn(onPlate);
          marimba(onPlate + 1, 0.5);
          speak(jNum(onPlate));

          guide.puppet.hop();
          guide.puppet.setMouth("open", 0.6 + (onPlate / target) * 0.5);
          guide.setMessage(
            `${jNum(onPlate)}こ！ ${onPlate < target ? `あと ${target - onPlate}こ のせてね` : "ぴったり！"}`,
            `<span class="count-pill">${onPlate} / ${target}</span>`,
          );

          if (spot) {
            spot.classList.add("filled");
            spot.innerHTML = `<span class="spot-emo">${treat.emoji}</span><span class="hv-slot-badge">${onPlate}</span>`;
            burst(pt.x, pt.y, 16, ["#ffd23f", "#ff758f", "#69db7c"]);
          }

          if (onPlate >= target) {
            locked = true;
            later(() => {
              chomp();
              guide.puppet.setMouth("chew");
              dishEl.classList.add("served");
              later(() => {
                guide.puppet.setMouth("joy");
                guide.puppet.hop();
                advanceLevel();
                cheer();
                const r = dishEl.getBoundingClientRect();
                answerCorrect(r.left + r.width / 2, r.top + r.height / 2, [
                  "#ff6b6b",
                  "#ffd23f",
                  "#37b24d",
                ]);
                roundFinished(true);
                guide.setMessage(
                  `ぴったり ${target}こ！ ありがとう！`,
                  `<span class="count-pill">😋×${target}</span>`,
                );
                speak(`ぴったり ${jNum(target)}こ！ おいしい〜！ ありがとう！`);
                later(renderPlate, 2200);
              }, 560);
            }, 440);
          }
        },
        onCancel: () => {
          guide.puppet.resetLook();
        },
      });
    });
  }

  /* =======================================================================
     3. ⚖️ シーソー (Animal Seesaw Compare — おおい / すくない)
     ======================================================================= */
  function renderSeesaw(): void {
    clearTimers();
    locked = false;

    const span = 2 + Math.floor(level / 3);
    const big = Math.min(7, 3 + Math.trunc(Math.random() * span));
    let small = 1 + Math.trunc(Math.random() * (big - 1));
    if (level < 4 && big / Math.max(1, small) < 2) small = Math.max(1, Math.floor(big / 2));

    const askMore = Math.random() < 0.78;
    const leftBig = Math.random() < 0.5;
    const leftCount = leftBig ? big : small;
    const rightCount = leftBig ? small : big;

    const treatA = SEESAW_TREATS[Math.trunc(Math.random() * SEESAW_TREATS.length)]!;
    let treatB = SEESAW_TREATS[Math.trunc(Math.random() * SEESAW_TREATS.length)]!;
    if (treatB === treatA) treatB = "🍊";

    const tiltDeg = leftCount > rightCount ? -7 : 7;
    const word = askMore ? "おおい" : "すくない";

    const askVoice = (): void => speak(`どっちが ${word} かな？`);
    replayFn = askVoice;
    guide.setMessage(`どっちが ${word} かな？ タッチしてね！`, askMore ? "🐘" : "🐣");

    main.innerHTML = `
      <div class="seesaw-stage">
        <div class="seesaw-beam" id="ss-beam" style="--tilt:${tiltDeg}deg">
          <button class="ss-side" id="ss-left" type="button">
            <div class="ss-char">🐻</div>
            <div class="ss-plate">
              ${Array.from({ length: leftCount }, () => `<span class="ss-treat">${treatA}</span>`).join("")}
            </div>
            <div class="ss-count-badge" id="ss-num-l" hidden>${leftCount}</div>
          </button>

          <button class="ss-side" id="ss-right" type="button">
            <div class="ss-char">🐰</div>
            <div class="ss-plate">
              ${Array.from({ length: rightCount }, () => `<span class="ss-treat">${treatB}</span>`).join("")}
            </div>
            <div class="ss-count-badge" id="ss-num-r" hidden>${rightCount}</div>
          </button>
        </div>
        <div class="seesaw-fulcrum">🔺</div>
      </div>
    `;

    const leftBtn = main.querySelector<HTMLElement>("#ss-left")!;
    const rightBtn = main.querySelector<HTMLElement>("#ss-right")!;
    const numL = main.querySelector<HTMLElement>("#ss-num-l")!;
    const numR = main.querySelector<HTMLElement>("#ss-num-r")!;

    askVoice();

    function pickSide(isLeft: boolean): void {
      if (locked) return;
      const chosen = isLeft ? leftCount : rightCount;
      const other = isLeft ? rightCount : leftCount;
      const ok = askMore ? chosen > other : chosen < other;
      const btn = isLeft ? leftBtn : rightBtn;

      if (ok) {
        locked = true;
        btn.classList.add("correct");
        numL.hidden = false;
        numR.hidden = false;
        advanceLevel();
        const r = btn.getBoundingClientRect();
        answerCorrect(r.left + r.width / 2, r.top + r.height / 2, [
          "#37b24d",
          "#ffd23f",
          "#ff6b6b",
        ]);
        guide.puppet.hop();
        guide.puppet.setMouth("joy");
        guide.setMessage(`せいかい！ ${chosen}こ で こっちが ${word}ね！`, "🎉");
        cheer();
        roundFinished(roundCount % 3 === 0);
        speak(`せいかい！ こっちが ${word}ね！`);
        later(renderSeesaw, 2100);
      } else {
        boing(0.9);
        plink(8, 0.3);
        btn.classList.remove("pulse");
        void btn.offsetWidth;
        btn.classList.add("pulse");
        const targetBtn = isLeft ? rightBtn : leftBtn;
        targetBtn.classList.add("hint-glow");
        guide.setMessage(`そっちは ${chosen}こ だよ。 ひかっている ほうだよ！`);
        speak(`こっちは ${jNum(chosen)}こ だよ。${word} ほうを タッチしてね！`);
      }
    }

    tap(leftBtn, () => pickSide(true));
    tap(rightBtn, () => pickSide(false));
  }

  render();

  return () => {
    clearTimers();
  };
}
