"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const TRACKS = ["/01.mp3", "/02.mp3", "/03.mp3", "/04.mp3", "/05.mp3"];
const SPLASH_CLASSES = [
  "splash-sepia",
  "splash-blue",
  "splash-pink",
  "splash-gold",
  "splash-mint",
];
const SPEED = {
  slow: { baseDur: 2.4, durRange: 0.8, delayMult: 4 },
  normal: { baseDur: 1.2, durRange: 0.48, delayMult: 2.4 },
  fast: { baseDur: 0.6, durRange: 0.3, delayMult: 1.2 },
};
const PEEP_COUNT = 105;
const GRID = 26;

function shuffleIds() {
  const ids = Array.from({ length: PEEP_COUNT }, (_, i) => i + 1);
  for (let i = ids.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

const SHUFFLED_IDS = shuffleIds();
const FACTOR_CACHE = new Map();

const SKIN_TONES = [
  "#FFEAD9",
  "#FFD7BE",
  "#F5C7A9",
  "#E8B298",
  "#D9A07E",
  "#C6865A",
  "#B07D55",
  "#A36B45",
  "#8D5524",
  "#73421A",
  "#5C3310",
  "#F3D1B8",
  "#E0AC89",
  "#C48A64",
];

const CLOTHES_COLORS = [
  "#2563EB",
  "#DC2626",
  "#16A34A",
  "#D97706",
  "#7C3AED",
  "#DB2777",
  "#0D9488",
  "#EA580C",
  "#4F46E5",
  "#65A30D",
  "#0284C7",
  "#E11D48",
  "#475569",
  "#0F766E",
  "#9333EA",
  "#BE185D",
  "#A16207",
  "#1D4ED8",
  "#B91C1C",
  "#047857",
  "#F8FAFC",
  "#1E293B",
  "#FDE68A",
  "#FFEDD5",
];

const HAIR_COLORS = [
  "#1C1917",
  "#292524",
  "#44403C",
  "#57534E",
  "#3F2A1D",
  "#5C4030",
  "#6B4423",
  "#8B5A2B",
  "#A16207",
  "#CA8A04",
  "#E7E5E4",
  "#D6D3D1",
  "#7F1D1D",
  "#1E3A8A",
  "#4C1D95",
  "#9F1239",
  "#0F766E",
];

const ACCESSORY_COLORS = [
  "#111827",
  "#1F2937",
  "#374151",
  "#B45309",
  "#DC2626",
  "#2563EB",
  "#7C3AED",
  "#F8FAFC",
];

function hashSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i += 1) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick(list, seed) {
  return list[Math.abs(seed) % list.length];
}

function colorizePeep(html, seed) {
  const skin = pick(SKIN_TONES, seed);
  const clothes = pick(CLOTHES_COLORS, Math.imul(seed, 7));
  const clothesAccent = pick(CLOTHES_COLORS, Math.imul(seed, 11) + 5);
  const hair = pick(HAIR_COLORS, Math.imul(seed, 13));
  const accessory = pick(ACCESSORY_COLORS, Math.imul(seed, 17));

  let section = "other";
  let bodyColorIndex = 0;

  return html.replace(
    /<g id="(body|head|face|facial-hair|accessories)\/|fill="#([A-Fa-f0-9]{3,8})"/g,
    (match, groupName, hex) => {
      if (groupName) {
        section = groupName;
        return match;
      }

      const h = hex.toUpperCase();
      const isBlack = h === "000000" || h === "000";
      const isWhite = h === "FFFFFF" || h === "FFF";

      if (section === "body") {
        if (isBlack) return match;
        bodyColorIndex += 1;
        return `fill="${bodyColorIndex === 1 ? clothes : clothesAccent}"`;
      }

      if (section === "head") {
        // White head fill = skin; black ink + tint fills = hair.
        if (isWhite) return `fill="${skin}"`;
        return `fill="${hair}"`;
      }

      if (section === "face") {
        // Keep face features (eyes/mouth) black.
        return match;
      }

      if (section === "facial-hair") {
        if (isWhite) return `fill="${skin}"`;
        return `fill="${hair}"`;
      }

      if (section === "accessories") {
        if (isBlack) return match;
        return `fill="${accessory}"`;
      }

      if (isWhite) return `fill="${skin}"`;
      return match;
    }
  );
}

function prepareSvg(raw) {
  return raw
    .replace(/<\?xml[^?]*\?>\s*/, "")
    .replace(/<!--[\s\S]*?-->\s*/g, "")
    .replace(/\s{2,}/g, " ")
    .replace(/(<g id="head\/)/, '<g class="bobbing">$1')
    .replace(/(<\/g>\s*<\/g>\s*<\/g>\s*<\/g>\s*<\/svg>)/, "</g>$1");
}

function IconVertical() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="12" y1="3" x2="12" y2="21" />
      <polyline points="7,8 12,3 17,8" />
      <polyline points="7,16 12,21 17,16" />
    </svg>
  );
}

function IconHorizontal() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="3" y1="12" x2="21" y2="12" />
      <polyline points="8,7 3,12 8,17" />
      <polyline points="16,7 21,12 16,17" />
    </svg>
  );
}

function IconCircular() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 12a9 9 0 1 1-3-6.7" />
      <polyline points="21,3 21,9 15,9" />
    </svg>
  );
}

function IconSwing() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 9a7 7 0 0 1 14 0" />
      <path d="M5 15a7 7 0 0 0 14 0" />
      <polyline points="2,9 5,12 8,9" />
      <polyline points="16,15 19,12 22,15" />
    </svg>
  );
}

function IconQuake() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

export default function PeepsPop() {
  const [svgs, setSvgs] = useState({});
  const [motion, setMotion] = useState("vertical");
  const [speed, setSpeed] = useState("normal");
  const [musicOn, setMusicOn] = useState(true);
  const [trackIndex, setTrackIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [earthquake, setEarthquake] = useState(false);

  const audioRef = useRef(null);
  const viewportRef = useRef(null);
  const crowdRef = useRef(null);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;

    function onPointerDown(event) {
      if (event.button !== 0) return;
      if (event.target.closest?.(".topbar")) return;

      const drag = dragRef.current;
      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      drag.scrollLeft = viewport.scrollLeft;
      drag.scrollTop = viewport.scrollTop;
      viewport.classList.add("is-dragging");
      viewport.setPointerCapture(event.pointerId);
      event.preventDefault();
    }

    function onPointerMove(event) {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      viewport.scrollLeft = drag.scrollLeft - dx;
      viewport.scrollTop = drag.scrollTop - dy;
    }

    function endDrag(event) {
      const drag = dragRef.current;
      if (!drag.active || drag.pointerId !== event.pointerId) return;
      drag.active = false;
      drag.pointerId = null;
      viewport.classList.remove("is-dragging");
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endDrag);
      viewport.removeEventListener("pointercancel", endDrag);
    };
  }, [svgs]);

  useEffect(() => {
    let cancelled = false;

    async function loadPeeps() {
      const next = {};
      await Promise.all(
        Array.from({ length: PEEP_COUNT }, (_, i) =>
          fetch(`/peeps/peep-${i + 1}.svg`)
            .then((res) => res.text())
            .then((text) => {
              next[i + 1] = prepareSvg(text);
            })
        )
      );
      if (!cancelled) setSvgs(next);
    }

    loadPeeps();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (Object.keys(svgs).length === 0) return;
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
    }
    const frame = requestAnimationFrame(() => setLoaded(true));
    return () => cancelAnimationFrame(frame);
  }, [svgs]);

  useEffect(() => {
    if (!loaded) return;
    const crowd = crowdRef.current;
    if (!crowd) return;

    function pickSlots(count) {
      const children = crowd.children;
      const total = children.length;
      if (total === 0) return [];
      const picked = [];
      for (let i = 0; i < count; i += 1) {
        const el = children[Math.floor(Math.random() * total)];
        if (el) picked.push(el);
      }
      return picked;
    }

    const splashTimer = setInterval(() => {
      const targets = pickSlots(3 + Math.floor(3 * Math.random()));
      const splash =
        SPLASH_CLASSES[Math.floor(Math.random() * SPLASH_CLASSES.length)];
      for (const el of targets) {
        el.classList.add(splash);
        setTimeout(
          () => el.classList.remove(splash),
          1500 + 1000 * Math.random()
        );
      }
    }, 750);

    const blinkTimer = setInterval(() => {
      for (const el of pickSlots(2 + Math.floor(3 * Math.random()))) {
        el.classList.add("peep-blink");
        setTimeout(
          () => el.classList.remove("peep-blink"),
          300 + 200 * Math.random()
        );
      }
    }, 900);

    return () => {
      clearInterval(splashTimer);
      clearInterval(blinkTimer);
    };
  }, [loaded]);

  useEffect(() => {
    if (!musicOn) {
      audioRef.current?.pause();
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio(TRACKS[trackIndex % TRACKS.length]);
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {});
    };

    tryPlay();

    // Browsers often block autoplay until a gesture — unlock on first interaction.
    const unlock = () => {
      tryPlay();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    window.addEventListener("touchstart", unlock);

    return () => {
      audio.pause();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [musicOn, trackIndex]);

  const speedCfg = SPEED[speed];

  const slots = useMemo(() => {
    if (Object.keys(svgs).length === 0) return [];
    const items = [];
    for (let row = 0; row < GRID; row += 1) {
      for (let col = 0; col < GRID; col += 1) {
        const key = `${row}-${col}`;
        const index = GRID * row + col;
        if (!FACTOR_CACHE.has(key)) {
          FACTOR_CACHE.set(key, {
            delayFactor: Math.random(),
            durationFactor: Math.random(),
            offsetX: (Math.random() - 0.5) * 8,
            offsetY: (Math.random() - 0.5) * 8,
          });
        }
        items.push({
          key,
          row,
          col,
          html: colorizePeep(
            svgs[SHUFFLED_IDS[index % SHUFFLED_IDS.length]],
            hashSeed(key)
          ),
          factors: FACTOR_CACHE.get(key),
        });
      }
    }
    return items;
  }, [svgs]);

  function triggerEarthquake() {
    if (earthquake) return;
    setEarthquake(true);
    setTimeout(() => setEarthquake(false), 1500);
  }

  if (Object.keys(svgs).length === 0) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-peeps-bg">
        <div className="text-2xl font-medium text-peeps-ink">
          Loading peeps...
        </div>
      </div>
    );
  }

  return (
    <div className="viewport" ref={viewportRef}>
      <div
        ref={crowdRef}
        className={[
          "crowd",
          `motion-${motion}`,
          loaded ? "crowd--loaded" : "",
          earthquake ? "earthquake" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: 4175, height: 3766, position: "relative" }}
      >
        {slots.map(({ key, row, col, html, factors }) => (
          <div
            key={key}
            className={`peep-slot${!loaded ? " peep-slot--enter" : ""}`}
            data-row-parity={row % 2 === 0 ? "even" : "odd"}
            style={{
              position: "absolute",
              left: 155 * col + 75 * (row % 2 === 1) + factors.offsetX,
              top: 135 * row + factors.offsetY,
              width: 260,
              height: 351,
              zIndex: row,
              "--dur": `${(speedCfg.baseDur + factors.durationFactor * speedCfg.durRange).toFixed(3)}s`,
              "--del": `${(factors.delayFactor * speedCfg.delayMult).toFixed(3)}s`,
              ...(!loaded ? { "--reveal-delay": `${0.12 * row}s` } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
      </div>

      <div className="topbar">
        <div className="topbar-row">
          <div className="topbar-group">
            <div className="topbar-inner">
              <button type="button" title="Vertical" className={`topbar-btn icon-btn${motion === "vertical" ? " active" : ""}`} onClick={() => setMotion("vertical")}><IconVertical /></button>
              <button type="button" title="Horizontal" className={`topbar-btn icon-btn${motion === "horizontal" ? " active" : ""}`} onClick={() => setMotion("horizontal")}><IconHorizontal /></button>
              <button type="button" title="Circular" className={`topbar-btn icon-btn${motion === "circular" ? " active" : ""}`} onClick={() => setMotion("circular")}><IconCircular /></button>
              <button type="button" title="Swing" className={`topbar-btn icon-btn${motion === "swing" ? " active" : ""}`} onClick={() => setMotion("swing")}><IconSwing /></button>
            </div>
          </div>
          <div className="topbar-group">
            <div className="topbar-inner">
              <button type="button" className={`topbar-btn${speed === "slow" ? " active" : ""}`} onClick={() => setSpeed((c) => (c === "slow" ? "normal" : "slow"))}>Slow</button>
              <button type="button" className={`topbar-btn${speed === "fast" ? " active" : ""}`} onClick={() => setSpeed((c) => (c === "fast" ? "normal" : "fast"))}>Fast</button>
            </div>
          </div>
        </div>
        <div className="topbar-row">
          <div className="topbar-group">
            <div className="topbar-inner">
              <button type="button" className={`topbar-btn${!musicOn ? " active" : ""}`} onClick={() => setMusicOn(false)}>Off</button>
              <button type="button" className={`topbar-btn${musicOn ? " active" : ""}`} onClick={() => { setTrackIndex((i) => i + 1); setMusicOn(true); }}>♪ On</button>
            </div>
          </div>
          <div className="topbar-group">
            <div className="topbar-inner">
              <button type="button" title="Earthquake" className={`topbar-btn icon-btn${earthquake ? " active" : ""}`} onClick={triggerEarthquake}><IconQuake /></button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
