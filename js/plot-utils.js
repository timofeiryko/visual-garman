/* =====================================================
   plot-utils.js — canvas helpers (тёмная тема, Manim-фил)
   ===================================================== */

function cssVar(name, fallback) {
  try {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  } catch (e) { return fallback; }
}

// world <-> screen transform
function makeTransform({ xMin, xMax, yMin, yMax, W, H, padL = 40, padR = 18, padT = 18, padB = 30 }) {
  const sx = (W - padL - padR) / (xMax - xMin);
  const sy = (H - padT - padB) / (yMax - yMin);
  return {
    W, H, xMin, xMax, yMin, yMax, padL, padR, padT, padB,
    X: (x) => padL + (x - xMin) * sx,
    Y: (y) => H - padB - (y - yMin) * sy,
    dxToPx: (dx) => dx * sx,
    dyToPx: (dy) => dy * sy,
  };
}

function setupCanvas(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const rect = canvas.getBoundingClientRect();
  const W = Math.max(1, Math.floor(rect.width));
  const H = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, W, H };
}

function clearBg(ctx, W, H, color) {
  ctx.save();
  ctx.fillStyle = color || cssVar('--bg-2', '#0b0d11');
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
}

// format multiples of pi for x-axis
function piFormatter(x) {
  const r = x / Math.PI;
  const rr = Math.round(r);
  if (Math.abs(r - rr) < 1e-6) {
    if (rr === 0) return '0';
    if (rr === 1) return 'π';
    if (rr === -1) return '−π';
    return rr + 'π';
  }
  // halves
  const h = Math.round(r * 2);
  if (Math.abs(r * 2 - h) < 1e-6) {
    const s = h < 0 ? '−' : '';
    return s + Math.abs(h) + 'π/2';
  }
  return x.toFixed(1);
}

function drawAxes(ctx, T, opts = {}) {
  const {
    showGrid = true, xLabel = '', yLabel = '',
    xTick = Math.PI / 2, yTick = 1,
    xFmt = piFormatter, yFmt = (y) => Number(y.toFixed(2)).toString(),
    showYTicks = true, showXTicks = true,
  } = opts;
  const grid = cssVar('--grid', '#222838');
  const axis = cssVar('--hair', 'rgba(140,160,200,0.18)');
  const label = cssVar('--faint', '#5b6478');

  ctx.save();
  // grid
  if (showGrid) {
    ctx.strokeStyle = grid; ctx.lineWidth = 1;
    for (let x = Math.ceil(T.xMin / xTick) * xTick; x <= T.xMax + 1e-9; x += xTick) {
      ctx.globalAlpha = Math.abs(x) < 1e-9 ? 0 : 0.6;
      ctx.beginPath(); ctx.moveTo(T.X(x), T.Y(T.yMin)); ctx.lineTo(T.X(x), T.Y(T.yMax)); ctx.stroke();
    }
    for (let y = Math.ceil(T.yMin / yTick) * yTick; y <= T.yMax + 1e-9; y += yTick) {
      ctx.globalAlpha = Math.abs(y) < 1e-9 ? 0 : 0.6;
      ctx.beginPath(); ctx.moveTo(T.X(T.xMin), T.Y(y)); ctx.lineTo(T.X(T.xMax), T.Y(y)); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  // axes through 0
  ctx.strokeStyle = axis; ctx.lineWidth = 1.4;
  if (T.yMin < 0 && T.yMax > 0) { ctx.beginPath(); ctx.moveTo(T.X(T.xMin), T.Y(0)); ctx.lineTo(T.X(T.xMax), T.Y(0)); ctx.stroke(); }
  if (T.xMin < 0 && T.xMax > 0) { ctx.beginPath(); ctx.moveTo(T.X(0), T.Y(T.yMin)); ctx.lineTo(T.X(0), T.Y(T.yMax)); ctx.stroke(); }

  // ticks
  ctx.fillStyle = label; ctx.font = '11px "IBM Plex Mono", monospace';
  if (showXTicks) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    const y0 = (T.yMin < 0 && T.yMax > 0) ? 0 : T.yMin;
    for (let x = Math.ceil(T.xMin / xTick) * xTick; x <= T.xMax + 1e-9; x += xTick) {
      if (Math.abs(x) < 1e-9) continue;
      ctx.fillText(xFmt(x), T.X(x), T.Y(y0) + 5);
    }
  }
  if (showYTicks) {
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const x0 = (T.xMin < 0 && T.xMax > 0) ? 0 : T.xMin;
    for (let y = Math.ceil(T.yMin / yTick) * yTick; y <= T.yMax + 1e-9; y += yTick) {
      if (Math.abs(y) < 1e-9) continue;
      ctx.fillText(yFmt(y), T.X(x0) - 6, T.Y(y));
    }
  }
  if (xLabel) { ctx.fillStyle = label; ctx.font = 'italic 12px "Spectral", serif'; ctx.textAlign = 'right'; ctx.textBaseline = 'bottom'; ctx.fillText(xLabel, T.W - T.padR - 2, T.H - 2); }
  if (yLabel) { ctx.fillStyle = label; ctx.font = 'italic 12px "Spectral", serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillText(yLabel, 4, 2); }
  ctx.restore();
}

// draw polyline of [x,y] world points
function drawCurve(ctx, T, pts, opts = {}) {
  const { color = '#fff', lineWidth = 2.2, glow = 0, dash = null, alpha = 1 } = opts;
  ctx.save();
  ctx.globalAlpha = alpha;
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.strokeStyle = color; ctx.lineWidth = lineWidth; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (dash) ctx.setLineDash(dash);
  ctx.beginPath();
  let started = false;
  for (const p of pts) {
    if (!p || !isFinite(p[0]) || !isFinite(p[1])) { started = false; continue; }
    const X = T.X(p[0]), Y = T.Y(p[1]);
    if (!started) { ctx.moveTo(X, Y); started = true; } else ctx.lineTo(X, Y);
  }
  ctx.stroke();
  ctx.restore();
}

// sample a function f over [a,b] into world points
function sampleFn(f, a, b, n = 600) {
  const pts = new Array(n + 1);
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n;
    pts[i] = [x, f(x)];
  }
  return pts;
}

// filled area between curve y=f(x) and baseline 0, split by sign
function drawSignedArea(ctx, T, f, a, b, opts = {}) {
  const { posColor, negColor, n = 500, alpha = 0.5 } = opts;
  const pc = posColor || cssVar('--c-com', '#7cff6b');
  const nc = negColor || cssVar('--c-warn', '#ff8a5c');
  ctx.save();
  ctx.globalAlpha = alpha;
  for (let i = 0; i < n; i++) {
    const x0 = a + (b - a) * i / n, x1 = a + (b - a) * (i + 1) / n;
    const y0 = f(x0), y1 = f(x1);
    const ym = (y0 + y1) / 2;
    ctx.fillStyle = ym >= 0 ? pc : nc;
    ctx.beginPath();
    ctx.moveTo(T.X(x0), T.Y(0));
    ctx.lineTo(T.X(x0), T.Y(y0));
    ctx.lineTo(T.X(x1), T.Y(y1));
    ctx.lineTo(T.X(x1), T.Y(0));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// stem plot: array of {x, y, color?}
function drawStems(ctx, T, stems, opts = {}) {
  const { color = '#7cff6b', dotR = 3, lineWidth = 2 } = opts;
  ctx.save();
  for (const s of stems) {
    const c = s.color || color;
    ctx.strokeStyle = c; ctx.fillStyle = c; ctx.lineWidth = lineWidth;
    ctx.beginPath(); ctx.moveTo(T.X(s.x), T.Y(0)); ctx.lineTo(T.X(s.x), T.Y(s.y)); ctx.stroke();
    ctx.beginPath(); ctx.arc(T.X(s.x), T.Y(s.y), dotR, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawDot(ctx, T, x, y, opts = {}) {
  const { color = '#7cff6b', r = 5, ring = null, glow = 0 } = opts;
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.beginPath(); ctx.arc(T.X(x), T.Y(y), r, 0, Math.PI * 2);
  ctx.fillStyle = color; ctx.fill();
  if (ring) { ctx.lineWidth = 2; ctx.strokeStyle = ring; ctx.stroke(); }
  ctx.restore();
}

function drawVector(ctx, T, x0, y0, x1, y1, opts = {}) {
  const { color = '#7cff6b', lineWidth = 2, head = 8, glow = 0 } = opts;
  ctx.save();
  if (glow) { ctx.shadowColor = color; ctx.shadowBlur = glow; }
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = lineWidth; ctx.lineCap = 'round';
  const ax = T.X(x0), ay = T.Y(y0), bx = T.X(x1), by = T.Y(y1);
  ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
  const ang = Math.atan2(by - ay, bx - ax);
  if (head && Math.hypot(bx - ax, by - ay) > head) {
    ctx.beginPath();
    ctx.moveTo(bx, by);
    ctx.lineTo(bx - head * Math.cos(ang - 0.42), by - head * Math.sin(ang - 0.42));
    ctx.lineTo(bx - head * Math.cos(ang + 0.42), by - head * Math.sin(ang + 0.42));
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();
}

// color along gradient hue by parameter t in [0,1] — for winding curve
function lerpColor(c1, c2, t) {
  return [
    Math.round(c1[0] + (c2[0] - c1[0]) * t),
    Math.round(c1[1] + (c2[1] - c1[1]) * t),
    Math.round(c1[2] + (c2[2] - c1[2]) * t),
  ];
}

Object.assign(window, {
  cssVar, makeTransform, setupCanvas, clearBg, piFormatter, drawAxes,
  drawCurve, sampleFn, drawSignedArea, drawStems, drawDot, drawVector, lerpColor,
});
