// Expressive, interactive SVG animal friends for 2–3 year olds.
//
// Each animal has its own silhouette and anatomy:
//  - 🐻 くまさん: Round ears on the sides of the head
//  - 🐰 うさぎさん: Long floppy bunny ears on top
//  - 🐼 ぱんださん: Round black ears + iconic black eye patches
//  - 🐸 かえるさん: NO ears! Big bulging eyes perched on top of a wide frog head

import { setVoiceChar } from "./audio";

export type FriendKind = "bear" | "bunny" | "panda" | "frog";

export type FriendSpec = {
  id: string;
  name: string;
  bodyColor: string;
  bodyShade: string;
  earColor: string;
  innerEar: string;
  snoutColor: string;
  bellyColor: string;
  noseColor: string;
  cheekColor: string;
  kind: FriendKind;
  greeting: string;
};

export const FRIENDS: readonly FriendSpec[] = [
  {
    id: "bear",
    name: "くまさん",
    bodyColor: "#e59856",
    bodyShade: "#c67639",
    earColor: "#c67639",
    innerEar: "#f9cca8",
    snoutColor: "#fff0e0",
    bellyColor: "#fce4cc",
    noseColor: "#4a2c18",
    cheekColor: "#ff758f",
    kind: "bear",
    greeting: "くまさん、おなか すいたな〜",
  },
  {
    id: "bunny",
    name: "うさぎさん",
    bodyColor: "#fff7fa",
    bodyShade: "#ffdce8",
    earColor: "#ffe3ee",
    innerEar: "#ff85a1",
    snoutColor: "#ffffff",
    bellyColor: "#ffeef4",
    noseColor: "#ff5c8a",
    cheekColor: "#ff85a1",
    kind: "bunny",
    greeting: "うさぎさん、ぴょんぴょん！",
  },
  {
    id: "panda",
    name: "ぱんださん",
    bodyColor: "#ffffff",
    bodyShade: "#e9ecef",
    earColor: "#2b2d42",
    innerEar: "#4a4e69",
    snoutColor: "#f8f9fa",
    bellyColor: "#f1f3f5",
    noseColor: "#2b2d42",
    cheekColor: "#ff758f",
    kind: "panda",
    greeting: "ぱんださん、あそぼー！",
  },
  {
    id: "frog",
    name: "かえるさん",
    bodyColor: "#69db7c",
    bodyShade: "#37b24d",
    earColor: "#51cf66",
    innerEar: "#b2f2bb",
    snoutColor: "#d3f9d8",
    bellyColor: "#ebfbee",
    noseColor: "#2b8a3e",
    cheekColor: "#ff8787",
    kind: "frog",
    greeting: "けろけろ！ おなか すいたよ",
  },
];

export type MouthState = "smile" | "open" | "chew" | "joy";

export type FriendPuppet = {
  el: HTMLElement;
  friend: FriendSpec;
  setFriend: (f: FriendSpec) => void;
  lookAt: (clientX: number, clientY: number) => void;
  resetLook: () => void;
  setMouth: (state: MouthState, openness?: number) => void;
  hop: () => void;
};

function earsSvg(f: FriendSpec): string {
  if (f.kind === "frog") {
    // Frogs have NO ears! Their bulging eye sockets sit on top of the head.
    return "";
  }
  if (f.kind === "bunny") {
    return `
      <g class="friend-ear-l">
        <ellipse cx="68" cy="34" rx="17" ry="44" transform="rotate(-10 68 34)" fill="${f.earColor}" stroke="#2f2a3a" stroke-width="4.5"/>
        <ellipse cx="68" cy="36" rx="9" ry="30" transform="rotate(-10 68 36)" fill="${f.innerEar}"/>
      </g>
      <g class="friend-ear-r">
        <ellipse cx="132" cy="34" rx="17" ry="44" transform="rotate(10 132 34)" fill="${f.earColor}" stroke="#2f2a3a" stroke-width="4.5"/>
        <ellipse cx="132" cy="36" rx="9" ry="30" transform="rotate(10 132 36)" fill="${f.innerEar}"/>
      </g>
    `;
  }
  return `
    <g class="friend-ear-l">
      <circle cx="48" cy="56" r="24" fill="${f.earColor}" stroke="#2f2a3a" stroke-width="4.5"/>
      <circle cx="48" cy="56" r="12.5" fill="${f.innerEar}"/>
    </g>
    <g class="friend-ear-r">
      <circle cx="152" cy="56" r="24" fill="${f.earColor}" stroke="#2f2a3a" stroke-width="4.5"/>
      <circle cx="152" cy="56" r="12.5" fill="${f.innerEar}"/>
    </g>
  `;
}

export function createFriendPuppet(initial: FriendSpec = FRIENDS[0]!): FriendPuppet {
  let friend = initial;
  const wrap = document.createElement("div");
  wrap.className = "friend-puppet";

  // Eye coordinates depend on whether it's a frog (eyes perched high on top) or mammal
  const eyeCoords = (): { lx: number; rx: number; y: number } =>
    friend.kind === "frog" ? { lx: 64, rx: 136, y: 62 } : { lx: 74, rx: 126, y: 93 };

  function render(): void {
    const isFrog = friend.kind === "frog";
    const { lx, rx, y: ey } = eyeCoords();

    wrap.innerHTML = `
      <svg class="friend-svg" viewBox="0 0 200 210" aria-label="${friend.name}">
        <defs>
          <radialGradient id="fg-${friend.id}" cx="42%" cy="32%" r="65%">
            <stop offset="0%" stop-color="${friend.bodyColor}"/>
            <stop offset="100%" stop-color="${friend.bodyShade}"/>
          </radialGradient>
        </defs>
        <g class="friend-whole">
          <!-- Ground shadow -->
          <ellipse cx="100" cy="196" rx="56" ry="10" fill="rgba(0,0,0,0.13)"/>
          <!-- Torso / Belly -->
          <ellipse cx="100" cy="162" rx="50" ry="34" fill="url(#fg-${friend.id})" stroke="#2f2a3a" stroke-width="4.5"/>
          <ellipse cx="100" cy="165" rx="34" ry="22" fill="${friend.bellyColor}"/>
          ${earsSvg(friend)}
          ${
            isFrog
              ? `
            <!-- Frog's bulging eye mounds on top of head (NOT ears) -->
            <circle cx="${lx}" cy="${ey}" r="26" fill="url(#fg-${friend.id})" stroke="#2f2a3a" stroke-width="4.5"/>
            <circle cx="${rx}" cy="${ey}" r="26" fill="url(#fg-${friend.id})" stroke="#2f2a3a" stroke-width="4.5"/>
          `
              : ""
          }
          <!-- Head -->
          <ellipse cx="100" cy="${isFrog ? 114 : 108}" rx="${isFrog ? 72 : 68}" ry="${isFrog ? 52 : 60}" fill="url(#fg-${friend.id})" stroke="#2f2a3a" stroke-width="4.5"/>
          ${
            isFrog
              ? `
            <!-- Seamless blend between frog eye mounds and head -->
            <ellipse cx="100" cy="112" rx="69" ry="49" fill="url(#fg-${friend.id})"/>
            <ellipse cx="100" cy="134" rx="52" ry="26" fill="${friend.bellyColor}"/>
          `
              : `
            <path d="M 58 68 Q 100 50 142 68" fill="none" stroke="rgba(255,255,255,0.35)" stroke-width="6" stroke-linecap="round"/>
          `
          }
          ${
            friend.kind === "panda"
              ? `
            <ellipse cx="73" cy="94" rx="18" ry="15" transform="rotate(-14 73 94)" fill="#2b2d42"/>
            <ellipse cx="127" cy="94" rx="18" ry="15" transform="rotate(14 127 94)" fill="#2b2d42"/>
          `
              : ""
          }
          <!-- Cheeks -->
          <ellipse class="friend-cheek" cx="${isFrog ? 46 : 52}" cy="118" rx="14" ry="8.5" fill="${friend.cheekColor}" opacity="0.72"/>
          <ellipse class="friend-cheek" cx="${isFrog ? 154 : 148}" cy="118" rx="14" ry="8.5" fill="${friend.cheekColor}" opacity="0.72"/>
          <!-- Snout / Nose -->
          ${
            isFrog
              ? `
            <circle cx="88" cy="100" r="3.5" fill="${friend.noseColor}"/>
            <circle cx="112" cy="100" r="3.5" fill="${friend.noseColor}"/>
          `
              : `
            <ellipse cx="100" cy="124" rx="35" ry="26" fill="${friend.snoutColor}"/>
            <ellipse cx="100" cy="108" rx="9.5" ry="6.8" fill="${friend.noseColor}"/>
            <ellipse cx="97" cy="106" rx="3.2" ry="1.8" fill="rgba(255,255,255,0.45)"/>
          `
          }
          <!-- Eyes -->
          <g class="friend-eyes">
            <g class="eyes-open">
              <circle cx="${lx}" cy="${ey}" r="${isFrog ? 16 : 11.5}" fill="#ffffff" stroke="#2f2a3a" stroke-width="3.5"/>
              <circle class="friend-pupil-l" cx="${lx}" cy="${ey}" r="${isFrog ? 8.5 : 6.5}" fill="#1e1b24"/>
              <circle class="friend-shine-l" cx="${lx - 3}" cy="${ey - 3}" r="3.2" fill="#ffffff"/>
              <circle cx="${rx}" cy="${ey}" r="${isFrog ? 16 : 11.5}" fill="#ffffff" stroke="#2f2a3a" stroke-width="3.5"/>
              <circle class="friend-pupil-r" cx="${rx}" cy="${ey}" r="${isFrog ? 8.5 : 6.5}" fill="#1e1b24"/>
              <circle class="friend-shine-r" cx="${rx - 3}" cy="${ey - 3}" r="3.2" fill="#ffffff"/>
            </g>
            <g class="eyes-happy" style="display:none">
              <path d="M ${lx - 11} ${ey + 2} Q ${lx} ${ey - 11} ${lx + 11} ${ey + 2}" fill="none" stroke="#2f2a3a" stroke-width="4.5" stroke-linecap="round"/>
              <path d="M ${rx - 11} ${ey + 2} Q ${rx} ${ey - 11} ${rx + 11} ${ey + 2}" fill="none" stroke="#2f2a3a" stroke-width="4.5" stroke-linecap="round"/>
            </g>
          </g>
          <!-- Mouth group -->
          <g class="friend-mouth-group">
            <path class="mouth-smile" d="${isFrog ? "M 68 118 Q 100 140 132 118" : "M 86 122 Q 100 137 114 122"}" fill="none" stroke="#2f2a3a" stroke-width="4.5" stroke-linecap="round"/>
            <g class="mouth-open-g" style="display:none">
              <ellipse class="mouth-cavity" cx="100" cy="129" rx="24" ry="18" fill="#a4133c" stroke="#2f2a3a" stroke-width="4"/>
              <ellipse class="mouth-tongue" cx="100" cy="138" rx="15" ry="8.5" fill="#ff758f"/>
            </g>
          </g>
          <!-- Paws -->
          <ellipse class="friend-paw-l" cx="46" cy="160" rx="18" ry="13" transform="rotate(18 46 160)" fill="${friend.earColor}" stroke="#2f2a3a" stroke-width="4.2"/>
          <ellipse class="friend-paw-r" cx="154" cy="160" rx="18" ry="13" transform="rotate(-18 154 160)" fill="${friend.earColor}" stroke="#2f2a3a" stroke-width="4.2"/>
        </g>
      </svg>
    `;
  }

  render();
  setVoiceChar(friend.kind);

  function setFriend(f: FriendSpec): void {
    friend = f;
    setVoiceChar(friend.kind);
    render();
  }

  function lookAt(clientX: number, clientY: number): void {
    const r = wrap.getBoundingClientRect();
    if (!r.width) return;
    const { lx, rx, y: ey } = eyeCoords();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height * (friend.kind === "frog" ? 0.32 : 0.45);
    const dx = clientX - cx;
    const dy = clientY - cy;
    const dist = Math.hypot(dx, dy) || 1;
    const maxShift = friend.kind === "frog" ? 5.5 : 4.5;
    const amt = Math.min(maxShift, (dist / 110) * maxShift);
    const ox = (dx / dist) * amt;
    const oy = (dy / dist) * amt;
    const pl = wrap.querySelector<SVGCircleElement>(".friend-pupil-l");
    const pr = wrap.querySelector<SVGCircleElement>(".friend-pupil-r");
    const sl = wrap.querySelector<SVGCircleElement>(".friend-shine-l");
    const sr = wrap.querySelector<SVGCircleElement>(".friend-shine-r");
    if (pl) {
      pl.setAttribute("cx", (lx + ox).toFixed(1));
      pl.setAttribute("cy", (ey + oy).toFixed(1));
    }
    if (pr) {
      pr.setAttribute("cx", (rx + ox).toFixed(1));
      pr.setAttribute("cy", (ey + oy).toFixed(1));
    }
    if (sl) {
      sl.setAttribute("cx", (lx - 3 + ox * 0.6).toFixed(1));
      sl.setAttribute("cy", (ey - 3 + oy * 0.6).toFixed(1));
    }
    if (sr) {
      sr.setAttribute("cx", (rx - 3 + ox * 0.6).toFixed(1));
      sr.setAttribute("cy", (ey - 3 + oy * 0.6).toFixed(1));
    }
  }

  function resetLook(): void {
    const { lx, rx, y: ey } = eyeCoords();
    const pl = wrap.querySelector<SVGCircleElement>(".friend-pupil-l");
    const pr = wrap.querySelector<SVGCircleElement>(".friend-pupil-r");
    const sl = wrap.querySelector<SVGCircleElement>(".friend-shine-l");
    const sr = wrap.querySelector<SVGCircleElement>(".friend-shine-r");
    if (pl) {
      pl.setAttribute("cx", String(lx));
      pl.setAttribute("cy", String(ey));
    }
    if (pr) {
      pr.setAttribute("cx", String(rx));
      pr.setAttribute("cy", String(ey));
    }
    if (sl) {
      sl.setAttribute("cx", String(lx - 3));
      sl.setAttribute("cy", String(ey - 3));
    }
    if (sr) {
      sr.setAttribute("cx", String(rx - 3));
      sr.setAttribute("cy", String(ey - 3));
    }
  }

  function setMouth(state: MouthState, openness = 1): void {
    const smile = wrap.querySelector<SVGPathElement>(".mouth-smile");
    const openG = wrap.querySelector<SVGGElement>(".mouth-open-g");
    const cavity = wrap.querySelector<SVGEllipseElement>(".mouth-cavity");
    const tongue = wrap.querySelector<SVGEllipseElement>(".mouth-tongue");
    const eyesOpen = wrap.querySelector<SVGGElement>(".eyes-open");
    const eyesHappy = wrap.querySelector<SVGGElement>(".eyes-happy");

    wrap.classList.toggle("is-chewing", state === "chew");
    wrap.classList.toggle("is-joy", state === "joy");
    wrap.classList.toggle("is-open", state === "open");
    if (!smile || !openG || !cavity || !tongue) return;

    if (eyesOpen && eyesHappy) {
      const showHappyEyes = state === "joy" || state === "chew";
      eyesOpen.style.display = showHappyEyes ? "none" : "";
      eyesHappy.style.display = showHappyEyes ? "" : "none";
    }

    const isFrog = friend.kind === "frog";
    if (state === "open") {
      smile.style.display = "none";
      openG.style.display = "";
      const k = Math.max(0.35, Math.min(1.3, openness));
      cavity.setAttribute("rx", ((isFrog ? 26 : 19) * k).toFixed(1));
      cavity.setAttribute("ry", (17 * k).toFixed(1));
      tongue.setAttribute("rx", ((isFrog ? 17 : 13) * k).toFixed(1));
      tongue.setAttribute("cy", (130 + 7 * k).toFixed(1));
    } else if (state === "joy") {
      smile.style.display = "none";
      openG.style.display = "";
      cavity.setAttribute("rx", isFrog ? "28" : "21");
      cavity.setAttribute("ry", "14");
      tongue.setAttribute("rx", isFrog ? "18" : "14");
      tongue.setAttribute("cy", "135");
    } else if (state === "chew") {
      smile.style.display = "";
      openG.style.display = "none";
      smile.setAttribute("d", isFrog ? "M 76 122 Q 100 134 124 122" : "M 86 124 Q 100 134 114 124");
    } else {
      smile.style.display = "";
      openG.style.display = "none";
      smile.setAttribute("d", isFrog ? "M 68 118 Q 100 140 132 118" : "M 86 122 Q 100 137 114 122");
    }
  }

  function hop(): void {
    wrap.classList.remove("hop");
    void wrap.offsetWidth;
    wrap.classList.add("hop");
  }

  return {
    el: wrap,
    get friend() {
      return friend;
    },
    setFriend,
    lookAt,
    resetLook,
    setMouth,
    hop,
  };
}
