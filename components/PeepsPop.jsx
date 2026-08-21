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
const CROWD_W = 4175;
const CROWD_H = 3766;
const PEEP_W = 260;
const PEEP_H = 351;
const COL_STEP = 155;
const ROW_STEP = 135;
const VIEW_PAD = 520;
const COLORIZE_CACHE = new Map();

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
        if (isWhite) return `fill="${skin}"`;
        return `fill="${hair}"`;
      }

      if (section === "face") {
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

function getColoredHtml(peepId, template, seed) {
  const key = `${peepId}:${seed}`;
  let html = COLORIZE_CACHE.get(key);
  if (!html) {
    html = colorizePeep(template, seed);
    COLORIZE_CACHE.set(key, html);
  }
  return html;
}

function resolveTemplate(svgs, peepId) {
  if (svgs[peepId]) return { id: peepId, template: svgs[peepId] };
  const keys = Object.keys(svgs);
  if (keys.length === 0) return null;
  const id = Number(keys[peepId % keys.length]);
  return { id, template: svgs[id] };
}

function slotPosition(row, col, factors) {
  return {
    left: COL_STEP * col + (row % 2 === 1 ? 75 : 0) + factors.offsetX,
    top: ROW_STEP * row + factors.offsetY,
  };
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

function IconSlow() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

function IconFast() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" />
    </svg>
  );
}

function IconMusicOff() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  );
}

function IconMusicOn() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export default function PeepsPop() {
  const [svgs, setSvgs] = useState(null);
  const [loadProgress, setLoadProgress] = useState(0);
  const [motion, setMotion] = useState("vertical");
  const [speed, setSpeed] = useState("normal");
  const [musicOn, setMusicOn] = useState(true);
  const [trackIndex, setTrackIndex] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [earthquake, setEarthquake] = useState(false);
  const [view, setView] = useState({
    left: 0,
    top: 0,
    width: typeof window !== "undefined" ? window.innerWidth : 1200,
    height: typeof window !== "undefined" ? window.innerHeight : 800,
  });

  const audioRef = useRef(null);
  const viewportRef = useRef(null);
  const crowdRef = useRef(null);
  const viewRafRef = useRef(0);
  const dragRef = useRef({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    scrollLeft: 0,
    scrollTop: 0,
  });

  function syncView() {
    const viewport = viewportRef.current;
    if (!viewport) return;
    setView({
      left: viewport.scrollLeft,
      top: viewport.scrollTop,
      width: viewport.clientWidth,
      height: viewport.clientHeight,
    });
  }

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport || !svgs) return;

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

    function onScrollOrResize() {
      if (viewRafRef.current) return;
      viewRafRef.current = requestAnimationFrame(() => {
        viewRafRef.current = 0;
        syncView();
      });
    }

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", endDrag);
    viewport.addEventListener("pointercancel", endDrag);
    viewport.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", endDrag);
      viewport.removeEventListener("pointercancel", endDrag);
      viewport.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      if (viewRafRef.current) cancelAnimationFrame(viewRafRef.current);
    };
  }, [svgs]);

  useEffect(() => {
    let cancelled = false;

    async function loadFromBundle() {
      const res = await fetch("/peeps-bundle.json");
      if (!res.ok) throw new Error("bundle missing");
      if (!cancelled) setLoadProgress(40);
      const data = await res.json();
      if (!cancelled) setLoadProgress(90);
      return data;
    }

    async function loadIndividually() {
      const next = {};
      let done = 0;
      const concurrency = 12;
      let cursor = 1;

      async function worker() {
        while (cursor <= PEEP_COUNT) {
          const id = cursor;
          cursor += 1;
          const res = await fetch(`/peeps/peep-${id}.svg`);
          const text = await res.text();
          next[id] = prepareSvg(text);
          done += 1;
          if (!cancelled) {
            setLoadProgress(Math.round((done / PEEP_COUNT) * 100));
            if (done === 16 || done === 40 || done === PEEP_COUNT) {
              setSvgs({ ...next });
            }
          }
        }
      }

      await Promise.all(
        Array.from({ length: concurrency }, () => worker())
      );
      return next;
    }

    async function loadPeeps() {
      try {
        const data = await loadFromBundle();
        if (cancelled) return;
        const normalized = {};
        for (let i = 1; i <= PEEP_COUNT; i += 1) {
          normalized[i] = data[i] || data[String(i)];
        }
        setLoadProgress(100);
        setSvgs(normalized);
      } catch {
        if (cancelled) return;
        const data = await loadIndividually();
        if (!cancelled) {
          setLoadProgress(100);
          setSvgs(data);
        }
      }
    }

    loadPeeps();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!svgs) return;
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollLeft = (viewport.scrollWidth - viewport.clientWidth) / 2;
      viewport.scrollTop = (viewport.scrollHeight - viewport.clientHeight) / 2;
      syncView();
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
    if (!loaded || !musicOn) {
      audioRef.current?.pause();
      return;
    }

    audioRef.current?.pause();
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = TRACKS[trackIndex % TRACKS.length];
    audio.loop = true;
    audio.volume = 0.45;
    audioRef.current = audio;

    const tryPlay = () => {
      audio.play().catch(() => {});
    };

    tryPlay();

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
      audio.removeAttribute("src");
      audio.load();
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      window.removeEventListener("touchstart", unlock);
    };
  }, [musicOn, trackIndex, loaded]);

  const speedCfg = SPEED[speed];

  const slotMeta = useMemo(() => {
    if (!svgs) return [];
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
        const factors = FACTOR_CACHE.get(key);
        const peepId = SHUFFLED_IDS[index % SHUFFLED_IDS.length];
        const pos = slotPosition(row, col, factors);
        items.push({
          key,
          row,
          peepId,
          seed: hashSeed(key),
          factors,
          left: pos.left,
          top: pos.top,
        });
      }
    }
    return items;
  }, [svgs]);

  const visibleSlots = useMemo(() => {
    if (!svgs || slotMeta.length === 0) return [];
    const minX = view.left - VIEW_PAD;
    const maxX = view.left + view.width + VIEW_PAD;
    const minY = view.top - VIEW_PAD;
    const maxY = view.top + view.height + VIEW_PAD;

    const visible = [];
    for (const slot of slotMeta) {
      if (
        slot.left + PEEP_W < minX ||
        slot.left > maxX ||
        slot.top + PEEP_H < minY ||
        slot.top > maxY
      ) {
        continue;
      }
      const resolved = resolveTemplate(svgs, slot.peepId);
      if (!resolved) continue;
      visible.push({
        ...slot,
        html: getColoredHtml(resolved.id, resolved.template, slot.seed),
      });
    }
    return visible;
  }, [svgs, slotMeta, view]);

  function triggerEarthquake() {
    if (earthquake) return;
    setEarthquake(true);
    setTimeout(() => setEarthquake(false), 1500);
  }

  if (!svgs) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center gap-3 bg-peeps-bg">
        <div className="loading-peeps">Loading peeps…</div>
        <div className="loading-bar" aria-hidden>
          <div className="loading-bar-fill" style={{ width: `${loadProgress}%` }} />
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
        style={{ width: CROWD_W, height: CROWD_H, position: "relative" }}
      >
        {visibleSlots.map(({ key, row, left, top, html, factors }) => (
          <div
            key={key}
            className={`peep-slot${!loaded ? " peep-slot--enter" : ""}`}
            data-row-parity={row % 2 === 0 ? "even" : "odd"}
            style={{
              position: "absolute",
              left,
              top,
              width: PEEP_W,
              height: PEEP_H,
              zIndex: row,
              "--dur": `${(speedCfg.baseDur + factors.durationFactor * speedCfg.durRange).toFixed(3)}s`,
              "--del": `${(factors.delayFactor * speedCfg.delayMult).toFixed(3)}s`,
              ...(!loaded ? { "--reveal-delay": `${Math.min(0.12 * row, 1.2)}s` } : {}),
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ))}
      </div>

      <div className="topbar" role="toolbar" aria-label="Crowd controls">
        <div className="control-dock">
          <div className="control-section">
            <span className="control-label">Motion</span>
            <div className="control-seg" role="group" aria-label="Motion">
              <button type="button" title="Vertical" aria-pressed={motion === "vertical"} className={`ctrl-btn icon-btn${motion === "vertical" ? " active" : ""}`} onClick={() => setMotion("vertical")}><IconVertical /></button>
              <button type="button" title="Horizontal" aria-pressed={motion === "horizontal"} className={`ctrl-btn icon-btn${motion === "horizontal" ? " active" : ""}`} onClick={() => setMotion("horizontal")}><IconHorizontal /></button>
              <button type="button" title="Circular" aria-pressed={motion === "circular"} className={`ctrl-btn icon-btn${motion === "circular" ? " active" : ""}`} onClick={() => setMotion("circular")}><IconCircular /></button>
              <button type="button" title="Swing" aria-pressed={motion === "swing"} className={`ctrl-btn icon-btn${motion === "swing" ? " active" : ""}`} onClick={() => setMotion("swing")}><IconSwing /></button>
            </div>
          </div>

          <div className="control-divider" aria-hidden />

          <div className="control-section">
            <span className="control-label">Tempo</span>
            <div className="control-seg" role="group" aria-label="Tempo">
              <button type="button" aria-pressed={speed === "slow"} className={`ctrl-btn text-btn${speed === "slow" ? " active" : ""}`} onClick={() => setSpeed((c) => (c === "slow" ? "normal" : "slow"))}>
                <IconSlow />
                <span>Slow</span>
              </button>
              <button type="button" aria-pressed={speed === "fast"} className={`ctrl-btn text-btn${speed === "fast" ? " active" : ""}`} onClick={() => setSpeed((c) => (c === "fast" ? "normal" : "fast"))}>
                <IconFast />
                <span>Fast</span>
              </button>
            </div>
          </div>

          <div className="control-divider" aria-hidden />

          <div className="control-section">
            <span className="control-label">Music</span>
            <div className="control-seg" role="group" aria-label="Music">
              <button type="button" aria-pressed={!musicOn} className={`ctrl-btn text-btn${!musicOn ? " active" : ""}`} onClick={() => setMusicOn(false)}>
                <IconMusicOff />
                <span>Off</span>
              </button>
              <button type="button" aria-pressed={musicOn} title="Play next track" className={`ctrl-btn text-btn${musicOn ? " active" : ""}`} onClick={() => { setTrackIndex((i) => i + 1); setMusicOn(true); }}>
                <IconMusicOn />
                <span>On</span>
              </button>
            </div>
          </div>

          <div className="control-divider" aria-hidden />

          <button
            type="button"
            title="Earthquake"
            aria-pressed={earthquake}
            className={`ctrl-btn quake-btn${earthquake ? " active" : ""}`}
            onClick={triggerEarthquake}
          >
            <IconQuake />
            <span>Quake</span>
          </button>
        </div>
      </div>
    </div>
  );
}
