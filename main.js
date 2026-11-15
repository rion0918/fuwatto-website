// Video Playback: muted ambient loop initially, one-tap unmuted 24s playback
const video = document.getElementById('promo-video');
const playSoundBtn = document.querySelector('[data-pv-play-sound]');
const replayBtn = document.querySelector('[data-pv-replay]');

if (video && playSoundBtn) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    video.removeAttribute('autoplay');
    video.pause();
  }

  const startSoundPlayback = () => {
    video.muted = false;
    video.loop = false;
    video.currentTime = 0;
    video.controls = true;
    playSoundBtn.hidden = true;
    if (replayBtn) replayBtn.hidden = true;
    video.play().catch(() => {
      video.controls = true;
    });
  };

  playSoundBtn.addEventListener('click', startSoundPlayback);

  video.addEventListener('ended', () => {
    if (!video.loop && replayBtn) {
      replayBtn.hidden = false;
    }
  });

  replayBtn?.addEventListener('click', startSoundPlayback);

  video.addEventListener('play', () => {
    if (!video.muted) {
      playSoundBtn.hidden = true;
      if (replayBtn) replayBtn.hidden = true;
    }
  });
}

// ============================================================================
// Authentic 「ふわっと。」 Bubble Component Port
// Ported directly from pop-reminder:
//   - src/constants/colors.ts (bubbleDueColors)
//   - src/features/reminders/utils/reminderBubbleVisuals.ts
//   - src/features/reminders/components/reminderBubbleLayout.ts
//   - src/features/reminders/components/reminderBubbleIdleMotion.ts
//   - src/features/reminders/components/ReminderBubble.tsx
//   - src/features/reminders/components/ReminderBubbleBurstGeometry.ts
//   - src/features/reminders/components/ReminderBubbleBurstSkia.tsx
// ============================================================================

const DUE_COLORS = {
  today: {
    background: 'rgba(248, 113, 113, 0.32)',
    grad2: 'rgba(248, 113, 113, 0.28)',
    border: 'rgba(248, 113, 113, 0.58)',
  },
  tomorrow: {
    background: 'rgba(251, 146, 60, 0.30)',
    grad2: 'rgba(251, 146, 60, 0.26)',
    border: 'rgba(251, 146, 60, 0.56)',
  },
  soon: {
    background: 'rgba(250, 204, 21, 0.28)',
    grad2: 'rgba(250, 204, 21, 0.24)',
    border: 'rgba(250, 204, 21, 0.52)',
  },
  later: {
    background: 'rgba(125, 211, 252, 0.26)',
    grad2: 'rgba(125, 211, 252, 0.22)',
    border: 'rgba(125, 211, 252, 0.50)',
  },
};

const BURST_MS = 380;
const RUPTURE_MS = 55;
const RESTORE_MS = 220;
const PRESS_SCALE = 0.97;
const MAX_SOFT_OVERLAP_RATIO = 0.12;
const BUBBLE_MOTION_GAP = 10;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

function hashString(value) {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function unitFromHash(seed, salt) {
  let hash = seed ^ Math.imul(salt + 1, 0x9e3779b9);
  hash = Math.imul(hash ^ (hash >>> 16), 0x7feb352d);
  hash = Math.imul(hash ^ (hash >>> 15), 0x846ca68b);
  return ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
}

function getTitleVisualLength(title) {
  return Array.from(title.trim()).reduce((len, ch) => {
    if (ch.trim().length === 0) return len + 0.35;
    return len + (ch.charCodeAt(0) <= 0x007f ? 0.62 : 1);
  }, 0);
}

function getBubbleDimensions(titleVisualLength, boardWidth, boardHeight) {
  const bucket =
    titleVisualLength <= 4
      ? 'short'
      : titleVisualLength <= 12
        ? 'medium'
        : titleVisualLength <= 24
          ? 'long'
          : 'veryLong';
  const baseSize = bucket === 'short' ? 96 : bucket === 'medium' ? 112 : bucket === 'long' ? 128 : 148;
  const titleFontSize = bucket === 'short' ? 20 : bucket === 'medium' ? 18 : 16;
  const titleLineHeight = titleFontSize + 4;
  const titleLineCount = bucket === 'short' ? 1 : bucket === 'medium' ? 2 : bucket === 'long' ? 4 : 5;
  const contentHeight = titleLineHeight * titleLineCount + 36 + 6 + 20;
  const edgeClearance = Math.min(boardWidth, boardHeight) * 0.055;
  const height = Math.round(
    clamp(Math.max(baseSize, contentHeight), 88, Math.max(88, Math.min(boardHeight - edgeClearance * 2, 180))),
  );
  const aspectRatio = bucket === 'short' || bucket === 'medium' ? 1 : bucket === 'long' ? 1.1 : 1.15;
  const widthHint = bucket === 'short' ? 80 : bucket === 'medium' ? 112 : bucket === 'long' ? 128 : 148;
  const width = Math.round(
    clamp(
      Math.max(widthHint, height * aspectRatio),
      Math.min(88, boardWidth),
      Math.max(Math.min(boardWidth - edgeClearance * 2, 180), Math.min(88, boardWidth)),
    ),
  );
  return { width, height, collisionSize: Math.max(width, height) };
}

function getBubbleTypography(width, height, titleVisualLength) {
  const isShort = titleVisualLength <= 4;
  const isMedium = titleVisualLength <= 12;
  const bubblePadding = isShort
    ? Math.round(clamp(Math.min(height, width) * 0.08, 7, 10))
    : Math.round(clamp(Math.min(height, width) * 0.08, 8, 12));
  const titleFontSize = isShort
    ? width <= 104
      ? 16
      : 19
    : isMedium
      ? width <= 116
        ? 14
        : 17
      : 14;
  return {
    titleFontSize: Math.round(titleFontSize),
    titleLineHeight: Math.round(titleFontSize + 4),
    bubblePadding,
  };
}

function getIdleMotionConfig(id, index) {
  const seed = hashString(`${id}-${index}`);
  return {
    delay: Math.round(unitFromHash(seed, 1) * 1200),
    duration: Math.round(4600 + unitFromHash(seed, 2) * 2600),
    amplitudeX: unitFromHash(seed, 3) * 2.4,
    amplitudeY: 2.2 + unitFromHash(seed, 4) * 2.2,
    rotateDeg: 0.35 + unitFromHash(seed, 5) * 0.35,
  };
}

function makeFittingLayout(items, boardSize) {
  const horizontalInset = Math.round(clamp(Math.min(boardSize.width, boardSize.height) * 0.055, 18, 30));
  const verticalInset =
    items.length >= 5
      ? Math.round(clamp(Math.min(boardSize.width, boardSize.height) * 0.025, 6, 14))
      : horizontalInset;
  const availableWidth = boardSize.width - horizontalInset * 2;
  const availableHeight = boardSize.height - verticalInset * 2;

  const placed = [];
  const floatingSlots = [
    { x: 0.5, y: 0.16 },
    { x: 0.18, y: 0.31 },
    { x: 0.82, y: 0.31 },
    { x: 0.34, y: 0.52 },
    { x: 0.17, y: 0.64 },
    { x: 0.82, y: 0.64 },
    { x: 0.48, y: 0.68 },
    { x: 0.68, y: 0.54 },
  ];
  const temporalLaneRatios = [0.5, 0.2, 0.8, 0.34, 0.66, 0.18, 0.82];

  const preferred = items.map(({ id, dimensions }, index) => {
    const seed = hashString(id);
    const { width, height, collisionSize } = dimensions;
    const maxLeft = Math.max(horizontalInset, boardSize.width - width - horizontalInset);
    const maxTop = Math.max(verticalInset, boardSize.height - height - verticalInset);
    const preferredSlot = (hashString(id) % 97) % floatingSlots.length;
    const baseStartY = Math.max(0.18, 0.35 - (items.length - 2) * 0.025);
    const baseEndY = Math.min(0.68, 0.65 + (items.length - 2) * 0.01);
    const fillProgress = clamp((items.length - 4) / 4, 0, 1);
    const startY = baseStartY * (1 - fillProgress);
    const endY = baseEndY + (1 - baseEndY) * fillProgress;
    const temporalYRatio =
      items.length <= 1 ? 0.5 : startY + (index / (items.length - 1)) * (endY - startY);
    const jitterRangeX = clamp(boardSize.width * 0.06, 10, 30);
    const laneOffset = Math.floor(unitFromHash(seed, 80) * temporalLaneRatios.length);

    const candidates = [
      ...temporalLaneRatios.map((xRatio, idx) => ({
        x: temporalLaneRatios[(idx + laneOffset) % temporalLaneRatios.length] ?? xRatio,
        y: clamp(temporalYRatio, 0, 1),
        temporal: true,
        slotIndex: idx,
      })),
      ...floatingSlots.map((slot, idx) => ({ ...slot, temporal: false, slotIndex: idx })),
    ];

    let best = null;
    candidates.forEach((slot, slotIndex) => {
      const baseSlotIndex = slot.slotIndex % floatingSlots.length;
      const distPref = Math.min(
        Math.abs(baseSlotIndex - preferredSlot),
        floatingSlots.length - Math.abs(baseSlotIndex - preferredSlot),
      );
      const jitterX = (unitFromHash(seed, slotIndex + 30) - 0.5) * jitterRangeX;
      const left = clamp(slot.x * boardSize.width - width / 2 + jitterX, horizontalInset, maxLeft);
      const top = clamp(slot.y * boardSize.height - height / 2, verticalInset, maxTop);
      const centerX = left + width / 2;
      const centerY = top + height / 2;

      const overlapPenalty = placed.reduce((penalty, other) => {
        const dist = Math.hypot(centerX - other.centerX, centerY - other.centerY);
        const radiusSum = (collisionSize + other.size) / 2;
        const overlap = Math.max(0, radiusSum - dist);
        if (overlap <= 0) return penalty;
        const allowed = Math.min(collisionSize, other.size) * MAX_SOFT_OVERLAP_RATIO;
        const excess = Math.max(0, overlap - allowed);
        const coverRisk =
          Math.abs(collisionSize - other.size) / 2 + Math.min(collisionSize, other.size) * 0.28;
        return (
          penalty +
          overlap * 2.4 +
          excess * 260 +
          (excess > 0 ? 12000 : 0) +
          (dist < coverRisk ? 20000 : 0)
        );
      }, 0);

      const temporalPenalty = Math.abs(centerY / boardSize.height - temporalYRatio) * 780;
      const score =
        distPref * 8 +
        unitFromHash(seed, slotIndex + 10) * 18 +
        overlapPenalty +
        temporalPenalty +
        (slot.temporal ? 0 : 170);

      if (!best || score < best.score) {
        best = { score, left, top, centerX, centerY };
      }
    });

    const chosen = best || {
      left: horizontalInset,
      top: verticalInset,
      centerX: horizontalInset + width / 2,
      centerY: verticalInset + height / 2,
    };
    placed.push({ size: collisionSize, centerX: chosen.centerX, centerY: chosen.centerY });
    return chosen;
  });

  const fits = preferred.every((layout, index) => {
    if (index > 0 && layout.centerY < preferred[index - 1].centerY) return false;
    return preferred.slice(0, index).every((other, otherIndex) => {
      const size = items[index].dimensions.collisionSize;
      const otherSize = items[otherIndex].dimensions.collisionSize;
      const minDist = (size + otherSize) / 2 - Math.min(size, otherSize) * MAX_SOFT_OVERLAP_RATIO + BUBBLE_MOTION_GAP;
      return Math.hypot(layout.centerX - other.centerX, layout.centerY - other.centerY) >= minDist;
    });
  });
  if (fits) return preferred;

  // Fallback staggered rows (identical to makeFittingBubbleLayout)
  const heights = Array(items.length + 1).fill(Infinity);
  const rowStarts = Array(items.length + 1).fill(0);
  heights[0] = 0;
  for (let end = 1; end <= items.length; end += 1) {
    let rowW = 0;
    let rowH = 0;
    for (let start = end - 1; start >= 0; start -= 1) {
      rowW += items[start].dimensions.width + (start < end - 1 ? BUBBLE_MOTION_GAP : 0);
      if (rowW > availableWidth) break;
      rowH = Math.max(rowH, items[start].dimensions.height);
      const h = heights[start] + rowH + (start > 0 ? BUBBLE_MOTION_GAP : 0);
      if (h < heights[end]) {
        heights[end] = h;
        rowStarts[end] = start;
      }
    }
  }
  const rows = [];
  for (let end = items.length; end > 0; end = rowStarts[end]) {
    rows.unshift(items.slice(rowStarts[end], end));
  }
  const spareHeight = Math.max(0, availableHeight - heights[items.length]);
  const verticalSpread = Math.min(32, spareHeight / Math.max(1, rows.length));
  const freeHeight = Math.max(0, spareHeight - verticalSpread * rows.length);
  const rowGap = BUBBLE_MOTION_GAP + Math.min(24, freeHeight / Math.max(1, rows.length - 1));
  let top = verticalInset + (freeHeight - (rowGap - BUBBLE_MOTION_GAP) * (rows.length - 1)) / 2;

  return rows.flatMap((row) => {
    const rowH = Math.max(...row.map(({ dimensions }) => dimensions.height));
    const rowW =
      row.reduce((sum, { dimensions }) => sum + dimensions.width, 0) +
      BUBBLE_MOTION_GAP * (row.length - 1);
    const seed = hashString(row.map(({ id }) => id).join(':'));
    const reverseRow = unitFromHash(seed, 120) > 0.5;
    const weights = Array.from({ length: row.length + 1 }, (_, i) => 0.4 + unitFromHash(seed, i + 100));
    const total = weights.reduce((s, w) => s + w, 0);
    const freeW = Math.max(0, availableWidth - rowW);
    let left = horizontalInset + (freeW * weights[0]) / total;
    const out = row.map(({ id, dimensions }, idx) => {
      const variation = unitFromHash(hashString(id), 110);
      const offsetY = verticalSpread * ((idx + 0.15 + variation * 0.7) / row.length);
      const bubbleLeft = reverseRow ? boardSize.width - left - dimensions.width : left;
      const res = {
        left: bubbleLeft,
        top: top + (rowH - dimensions.height) / 2 + offsetY,
        centerX: bubbleLeft + dimensions.width / 2,
        centerY: top + rowH / 2 + offsetY,
      };
      left += dimensions.width + BUBBLE_MOTION_GAP + (freeW * weights[idx + 1]) / total;
      return res;
    });
    top += rowH + verticalSpread + rowGap;
    return out;
  });
}

function outlinePoint(center, width, height, angle) {
  const vertical = height > width;
  const dx = vertical ? Math.sin(angle) : Math.cos(angle);
  const dy = vertical ? Math.cos(angle) : Math.sin(angle);
  const radius = Math.max(0.1, Math.min(width, height) / 2 - 1);
  const straight = Math.abs(width - height) / 2;
  const flatDist = radius / Math.max(0.00001, Math.abs(dy));
  const dist =
    Math.abs(flatDist * dx) <= straight
      ? flatDist
      : straight * Math.abs(dx) + Math.sqrt(Math.max(0, radius ** 2 - straight ** 2 * dy ** 2));
  return { x: center.x + Math.cos(angle) * dist, y: center.y + Math.sin(angle) * dist };
}

function createBurstGeometry(id, width, height) {
  const visualSize = Math.min(width, height);
  const overscan = visualSize * 0.29 + 3;
  const bubbleCenter = { x: overscan + width / 2, y: overscan + height / 2 };
  const seed = hashString(id);
  const ruptureAngle = Math.PI * (1.08 + unitFromHash(seed, 1) * 0.84);
  const rupturePoint = {
    x: bubbleCenter.x + Math.cos(ruptureAngle) * visualSize * 0.18,
    y: bubbleCenter.y + Math.sin(ruptureAngle) * visualSize * 0.18,
  };
  const maxHoleRadius =
    Math.hypot(
      width / 2 + Math.abs(rupturePoint.x - bubbleCenter.x),
      height / 2 + Math.abs(rupturePoint.y - bubbleCenter.y),
    ) * 1.08;

  const membraneCount = 6 + Math.min(2, Math.floor(unitFromHash(seed, 3) * 3));
  const membraneFragments = Array.from({ length: membraneCount }, (_, i) => {
    const angle = (Math.PI * 2 * (i + 0.12 + unitFromHash(seed, 10 + i) * 0.12)) / membraneCount;
    const span = (Math.PI * 2 * (0.28 + unitFromHash(seed, 30 + i) * 0.16)) / membraneCount;
    const start = outlinePoint(bubbleCenter, width, height, angle);
    const end = outlinePoint(bubbleCenter, width, height, angle + span);
    const origin = outlinePoint(bubbleCenter, width, height, angle + span / 2);
    const control = { x: origin.x * 2 - (start.x + end.x) / 2, y: origin.y * 2 - (start.y + end.y) / 2 };
    const travel = visualSize * (0.035 + unitFromHash(seed, 90 + i) * 0.055);
    const arrival = 55 + (75 * Math.hypot(origin.x - rupturePoint.x, origin.y - rupturePoint.y)) / maxHoleRadius;
    return {
      points: [start, control, end],
      origin,
      travelX: Math.cos(angle + span / 2) * travel,
      travelY: Math.sin(angle + span / 2) * travel,
      rotationDeg: ((unitFromHash(seed, 130 + i) - 0.5) * 0.24 * 180) / Math.PI,
      delay: Math.max(90, Math.min(130, arrival)) / BURST_MS,
    };
  });

  const dropletCount = 8 + Math.min(4, Math.floor(unitFromHash(seed, 4) * 5));
  const droplets = Array.from({ length: dropletCount }, (_, i) => {
    const angle = (Math.PI * 2 * (i + unitFromHash(seed, 200 + i) * 0.5)) / dropletCount;
    const origin = outlinePoint(bubbleCenter, width, height, angle);
    const travel = visualSize * (0.09 + unitFromHash(seed, 260 + i) * 0.14);
    const arrival = (75 * Math.hypot(origin.x - rupturePoint.x, origin.y - rupturePoint.y)) / maxHoleRadius;
    return {
      origin,
      radius: 0.6 + unitFromHash(seed, 290 + i) * 1.1,
      travelX: Math.cos(angle) * travel,
      travelY: Math.sin(angle) * travel,
      gravity: visualSize * (0.01 + unitFromHash(seed, 320 + i) * 0.02),
      delay: Math.max(110, Math.min(180, 75 + arrival)) / BURST_MS,
    };
  });

  return {
    canvasWidth: width + overscan * 2,
    canvasHeight: height + overscan * 2,
    overscan,
    membraneFragments,
    droplets,
  };
}

const playground = document.querySelector('[data-bubble-playground]');
const board = document.querySelector('[data-bubble-board]');

if (playground && board) {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const resetBtn = playground.querySelector('[data-bubble-reset]');
  const themeBtns = [...playground.querySelectorAll('[data-theme-select]')];
  const bubbleNodes = [...board.querySelectorAll('[data-reminder-bubble]')];

  const items = bubbleNodes.map((el, index) => {
    const id = el.getAttribute('data-bubble-id') || `bubble-${index}`;
    const title = el.getAttribute('data-title') || el.querySelector('b')?.textContent || '';
    const time = el.getAttribute('data-time') || el.querySelector('.bubble-due')?.textContent || '';
    const due = el.getAttribute('data-due') || 'later';
    const colors = DUE_COLORS[due] || DUE_COLORS.later;
    const idle = getIdleMotionConfig(id, index);

    el.style.setProperty('--b-bg', colors.background);
    el.style.setProperty('--b-grad2', colors.grad2);
    el.style.setProperty('--b-border', colors.border);

    // Build authentic 12-layer glass surface from ReminderBubble.tsx
    el.innerHTML = `
      <span class="rn-bubble-surface">
        <span class="rn-grad-base"></span>
        <span class="rn-grad-depth"></span>
        <span class="rn-tint-mist"></span>
        <span class="rn-lower-depth"></span>
        <span class="rn-center-glow"></span>
        <span class="rn-outer-glass-ring"></span>
        <span class="rn-inner-glass-ring"></span>
        <span class="rn-left-light-arc"></span>
        <span class="rn-inner-color-rim"></span>
        <span class="rn-highlight-large"></span>
        <span class="rn-highlight-small"></span>
        <span class="rn-highlight-tiny"></span>
        <span class="rn-top-light-arc"></span>
        <span class="rn-bottom-reflection"></span>
        <span class="rn-text-layer">
          <b></b>
          <span class="bubble-due"></span>
        </span>
      </span>
    `;
    el.querySelector('b').textContent = title;
    el.querySelector('.bubble-due').textContent = time;

    return {
      el,
      surface: el.querySelector('.rn-bubble-surface'),
      id,
      title,
      due,
      colors,
      idle,
      visualLength: getTitleVisualLength(title),
      pressScale: 1,
      entryScale: 1,
      entryOffsetY: 0,
      popped: false,
      bursting: false,
      dimensions: { width: 120, height: 120, collisionSize: 120 },
    };
  });

  const layoutBoard = () => {
    const rect = board.getBoundingClientRect();
    const boardSize = {
      width: Math.max(300, Math.round(rect.width)),
      height: Math.max(340, Math.round(rect.height)),
    };

    items.forEach((item) => {
      item.dimensions = getBubbleDimensions(item.visualLength, boardSize.width, boardSize.height);
    });

    const layouts = makeFittingLayout(items, boardSize);
    items.forEach((item, index) => {
      const { width, height } = item.dimensions;
      const visualSize = Math.min(width, height);
      const radius = visualSize / 2;
      const typo = getBubbleTypography(width, height, item.visualLength);
      const pos = layouts[index];

      item.el.style.width = `${width}px`;
      item.el.style.height = `${height}px`;
      item.el.style.left = `${Math.round(pos.left)}px`;
      item.el.style.top = `${Math.round(pos.top)}px`;
      item.el.style.borderRadius = `${radius}px`;
      item.el.style.setProperty('--b-r', `${radius}px`);

      item.surface.style.borderRadius = `${radius}px`;
      item.surface.style.padding = `${typo.bubblePadding}px`;
      item.surface.querySelector('.rn-outer-glass-ring').style.borderRadius = `${radius}px`;
      item.surface.querySelector('.rn-inner-glass-ring').style.borderRadius = `${Math.max(4, radius - 6)}px`;
      item.surface.querySelector('.rn-left-light-arc').style.borderRadius = `${radius}px`;
      item.surface.querySelector('.rn-inner-color-rim').style.borderRadius = `${Math.max(4, radius - 12)}px`;
      item.surface.querySelector('.rn-tint-mist').style.borderRadius = `${radius * 0.72}px`;
      item.surface.querySelector('.rn-lower-depth').style.borderRadius = `${radius * 0.76}px`;
      item.surface.querySelector('.rn-center-glow').style.borderRadius = `${radius * 0.7}px`;
      item.surface.querySelector('.rn-highlight-large').style.borderRadius = `${visualSize * 0.2}px`;

      const titleEl = item.surface.querySelector('b');
      titleEl.style.fontSize = `${typo.titleFontSize}px`;
      titleEl.style.lineHeight = `${typo.titleLineHeight}px`;
    });
  };

  layoutBoard();
  let resizeTimer;
  const scheduleLayout = () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(layoutBoard, 100);
  };
  window.addEventListener('resize', scheduleLayout);
  if (typeof ResizeObserver !== 'undefined') {
    new ResizeObserver(scheduleLayout).observe(board);
  }

  // Smooth idle float loop matching ReminderBubble.tsx
  if (!prefersReducedMotion) {
    const startTime = performance.now();
    const tick = (now) => {
      items.forEach((item) => {
        if (item.popped || item.bursting) {
          item.el.style.transform = `scale(${item.entryScale * item.pressScale})`;
          return;
        }
        const elapsed = Math.max(0, now - startTime - item.idle.delay);
        // Back-and-forth quad phase (withRepeat(..., -1, true))
        const cycle = (elapsed / item.idle.duration) % 2;
        const t = cycle <= 1 ? cycle : 2 - cycle;
        const tx = Math.sin(t * Math.PI * 2) * item.idle.amplitudeX;
        const ty = Math.cos(t * Math.PI * 2) * item.idle.amplitudeY + item.entryOffsetY;
        const rot = Math.sin(t * Math.PI * 2) * item.idle.rotateDeg;
        item.el.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rot.toFixed(2)}deg) scale(${(item.entryScale * item.pressScale).toFixed(4)})`;
      });
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  }

  const syncResetVisibility = () => {
    if (!resetBtn) return;
    resetBtn.hidden = !items.some((i) => i.popped);
  };

  const burstBubble = (item) => {
    if (item.popped || item.bursting) return;
    item.bursting = true;

    if (prefersReducedMotion) {
      item.popped = true;
      item.bursting = false;
      item.el.classList.add('is-popped');
      syncResetVisibility();
      return;
    }

    const { width, height } = item.dimensions;
    const geom = createBurstGeometry(item.id, width, height);
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'rn-burst-canvas');
    svg.setAttribute('width', String(geom.canvasWidth));
    svg.setAttribute('height', String(geom.canvasHeight));
    svg.setAttribute('viewBox', `0 0 ${geom.canvasWidth} ${geom.canvasHeight}`);
    svg.style.left = `${-geom.overscan}px`;
    svg.style.top = `${-geom.overscan}px`;

    const arcEls = geom.membraneFragments.map((frag) => {
      const g = document.createElementNS(svgNS, 'g');
      const p = document.createElementNS(svgNS, 'path');
      const [s, c, e] = frag.points;
      p.setAttribute('d', `M ${s.x} ${s.y} Q ${c.x} ${c.y} ${e.x} ${e.y}`);
      p.setAttribute('fill', 'none');
      p.setAttribute('stroke', item.colors.border);
      p.setAttribute('stroke-linecap', 'round');
      p.setAttribute('stroke-width', '0.9');
      g.appendChild(p);
      svg.appendChild(g);
      const totalLen = p.getTotalLength ? p.getTotalLength() : 28;
      p.setAttribute('stroke-dasharray', `${totalLen}`);
      return { g, p, frag, totalLen };
    });

    const dropEls = geom.droplets.map((drop, i) => {
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('fill', i % 3 === 0 ? item.colors.border : 'rgba(255,255,255,0.85)');
      circle.setAttribute('cx', String(drop.origin.x));
      circle.setAttribute('cy', String(drop.origin.y));
      circle.setAttribute('r', String(drop.radius));
      circle.setAttribute('opacity', '0');
      svg.appendChild(circle);
      return { circle, drop };
    });

    item.el.appendChild(svg);
    const start = performance.now();

    const animateBurst = (now) => {
      const elapsed = now - start;
      const progress = clamp(elapsed / BURST_MS, 0, 1);

      // Surface tremor (0..55ms) then rapid rupture fade
      if (elapsed < RUPTURE_MS) {
        const tremor = Math.sin((elapsed / RUPTURE_MS) * Math.PI * 2) * 0.008;
        item.surface.style.opacity = '1';
        item.surface.style.transform = `scaleX(${1 + tremor}) scaleY(${1 - tremor * 0.7})`;
      } else {
        const fade = 1 - clamp((elapsed - RUPTURE_MS) / 28, 0, 1);
        item.surface.style.opacity = String(fade);
        item.surface.style.transform = `scale(${1 + (1 - fade) * 0.03})`;
      }

      // Membrane fragments (90..230ms)
      arcEls.forEach(({ g, p, frag, totalLen }) => {
        const local = clamp((progress - frag.delay) / (230 / BURST_MS - frag.delay), 0, 1);
        const appear = clamp((progress - frag.delay) / 0.025, 0, 1);
        const opacity = appear * (1 - local) * 0.62;
        g.setAttribute('opacity', opacity.toFixed(3));
        const tx = frag.travelX * local;
        const ty = frag.travelY * local;
        const rot = frag.rotationDeg * local;
        const sy = 1 - local * 0.4;
        g.setAttribute(
          'transform',
          `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) translate(${frag.origin.x} ${frag.origin.y}) rotate(${rot.toFixed(2)}) scale(1 ${sy.toFixed(3)}) translate(${-frag.origin.x} ${-frag.origin.y})`,
        );
        p.setAttribute('stroke-width', (0.9 - local * 0.65).toFixed(2));
        p.setAttribute('stroke-dashoffset', (totalLen * local * 0.75).toFixed(2));
      });

      // Droplets (110..380ms)
      dropEls.forEach(({ circle, drop }) => {
        const local = clamp((progress - drop.delay) / (1 - drop.delay), 0, 1);
        const travel = 1 - (1 - local) ** 2;
        const cx = drop.origin.x + drop.travelX * travel;
        const cy = drop.origin.y + drop.travelY * travel + drop.gravity * local ** 2;
        const appear = clamp((progress - drop.delay) / 0.025, 0, 1);
        const opacity = appear * (1 - local) ** 1.5 * 0.6;
        circle.setAttribute('cx', cx.toFixed(2));
        circle.setAttribute('cy', cy.toFixed(2));
        circle.setAttribute('r', (drop.radius * (1 - local * 0.35)).toFixed(2));
        circle.setAttribute('opacity', opacity.toFixed(3));
      });

      if (progress < 1) {
        window.requestAnimationFrame(animateBurst);
      } else {
        svg.remove();
        item.popped = true;
        item.bursting = false;
        item.el.classList.add('is-popped');
        syncResetVisibility();
      }
    };

    window.requestAnimationFrame(animateBurst);
  };

  const restoreBubble = (item) => {
    item.popped = false;
    item.bursting = false;
    item.el.classList.remove('is-popped');
    item.surface.style.transform = 'scale(1)';

    if (prefersReducedMotion) {
      item.surface.style.opacity = '1';
      return;
    }

    const { width, height } = item.dimensions;
    const visualSize = Math.min(width, height);
    const padding = visualSize * 0.72;
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('class', 'rn-burst-canvas');
    svg.setAttribute('width', String(width + padding * 2));
    svg.setAttribute('height', String(height + padding * 2));
    svg.style.left = `${-padding}px`;
    svg.style.top = `${-padding}px`;

    const circle = document.createElementNS(svgNS, 'circle');
    circle.setAttribute('cx', String(padding + width / 2));
    circle.setAttribute('cy', String(padding + height / 2));
    circle.setAttribute('fill', 'none');
    circle.setAttribute('stroke', item.colors.border);
    circle.setAttribute('stroke-width', String(Math.max(1.4, visualSize * 0.02)));
    svg.appendChild(circle);
    item.el.appendChild(svg);

    const start = performance.now();
    const animateRestore = (now) => {
      const p = clamp((now - start) / RESTORE_MS, 0, 1);
      const eased = 1 - (1 - p) ** 3;
      item.surface.style.opacity = String(eased);
      item.surface.style.transform = `scale(${0.92 + eased * 0.08})`;
      circle.setAttribute('r', String(visualSize * (0.86 - eased * 0.4)));
      circle.setAttribute('opacity', String((1 - p) ** 3 * 0.78));
      if (p < 1) {
        window.requestAnimationFrame(animateRestore);
      } else {
        svg.remove();
        item.surface.style.opacity = '1';
        item.surface.style.transform = 'scale(1)';
      }
    };
    window.requestAnimationFrame(animateRestore);
  };

  items.forEach((item) => {
    item.el.addEventListener('pointerdown', () => {
      if (!item.popped && !item.bursting) {
        item.pressScale = PRESS_SCALE;
      }
    });
    const releasePress = () => {
      item.pressScale = 1;
    };
    item.el.addEventListener('pointerup', releasePress);
    item.el.addEventListener('pointercancel', releasePress);
    item.el.addEventListener('pointerleave', releasePress);
    item.el.addEventListener('click', () => {
      item.pressScale = 1;
      burstBubble(item);
    });
  });

  resetBtn?.addEventListener('click', () => {
    items.forEach((item) => {
      if (item.popped) restoreBubble(item);
    });
    syncResetVisibility();
  });

  themeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme-select') || 'dream';
      playground.setAttribute('data-playground-theme', theme);
      themeBtns.forEach((other) => {
        const active = other === btn;
        other.classList.toggle('is-active', active);
        other.setAttribute('aria-pressed', String(active));
      });
    });
  });
}


// Mobile screen showcase swipe indicator
const screensTrack = document.querySelector('[data-screens-track]');
const screensDotsWrap = document.querySelector('[data-screens-dots]');
if (screensTrack && screensDotsWrap) {
  const cards = [...screensTrack.querySelectorAll('.screen-item')];
  const dots = [...screensDotsWrap.querySelectorAll('[data-screen-index]')];

  const setActiveDot = (activeIndex) => {
    dots.forEach((dot, idx) => {
      const active = idx === activeIndex;
      dot.classList.toggle('is-active', active);
      dot.setAttribute('aria-pressed', String(active));
    });
  };

  let scrollTicking = false;
  const syncFromScroll = () => {
    scrollTicking = false;
    if (!cards.length) return;
    const trackCenter = screensTrack.scrollLeft + screensTrack.clientWidth / 2;
    let closestIndex = 0;
    let closestDist = Infinity;
    cards.forEach((card, idx) => {
      const cardCenter = card.offsetLeft + card.offsetWidth / 2;
      const dist = Math.abs(cardCenter - trackCenter);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = idx;
      }
    });
    setActiveDot(closestIndex);
  };

  screensTrack.addEventListener(
    'scroll',
    () => {
      if (!scrollTicking) {
        scrollTicking = true;
        window.requestAnimationFrame(syncFromScroll);
      }
    },
    { passive: true },
  );

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const index = Number(dot.getAttribute('data-screen-index') || 0);
      const card = cards[index];
      if (!card) return;
      const targetLeft = card.offsetLeft - (screensTrack.clientWidth - card.offsetWidth) / 2;
      screensTrack.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
      setActiveDot(index);
    });
  });
}

// Current year
document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});
