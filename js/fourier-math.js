/* =====================================================
   fourier-math.js — ряды Фурье, ядра, центр масс намотки
   Соглашение: 2π-периодич. функции на [-π,π], l=π.
   Везде используем ЗАМКНУТЫЕ формы коэффициентов (§8 ТЗ).
   ===================================================== */

const PI = Math.PI, TAU = 2 * Math.PI;

// wrap to [-π, π)
function wrap(x) {
  let y = (x + PI) % TAU;
  if (y < 0) y += TAU;
  return y - PI;
}

/* ---- эталонные сигналы ----
   каждый: { id, label, f(x), const, harmonic(k,x), amp(k), kind, jumpAt, midpoint }
   S_N(x)   = const + Σ_{k=1..N} harmonic(k,x)
   σ_n(x)   = const + Σ_{k=1..n} (1 - k/(n+1)) harmonic(k,x)   (Фейер)
   amp(k)   = |амплитуда| k-й гармоники (для спектра)
*/
const SIGNALS = {
  meander: {
    id: 'meander', label: 'меандр  sign x', short: 'меандр',
    kind: 'jump', gibbs: true, symmetry: 'odd', decay: 1,
    f: (x) => { const u = wrap(x); return u > 0 ? 1 : (u < 0 ? -1 : 0); },
    const: 0,
    harmonic: (k, x) => (k % 2 === 1) ? (4 / PI) * Math.sin(k * x) / k : 0,
    amp: (k) => (k % 2 === 1) ? 4 / (PI * k) : 0,
    range: [-1.35, 1.35],
  },
  saw: {
    id: 'saw', label: 'пила  f(x)=x', short: 'пила',
    kind: 'jump', gibbs: true, symmetry: 'odd', decay: 1,
    f: (x) => wrap(x),
    const: 0,
    harmonic: (k, x) => 2 * Math.pow(-1, k + 1) * Math.sin(k * x) / k,
    amp: (k) => 2 / k,
    range: [-PI * 1.12, PI * 1.12],
  },
  triangle: {
    id: 'triangle', label: 'треугольник  |x|', short: 'треуг.',
    kind: 'corner', gibbs: false, symmetry: 'even', decay: 2,
    f: (x) => Math.abs(wrap(x)),
    const: PI / 2,
    harmonic: (k, x) => (k % 2 === 1) ? -(4 / PI) * Math.cos(k * x) / (k * k) : 0,
    amp: (k) => (k % 2 === 1) ? 4 / (PI * k * k) : 0,
    range: [-0.4, PI * 1.08],
  },
  parabola: {
    id: 'parabola', label: 'парабола  x²', short: 'парабола',
    kind: 'corner-deriv', gibbs: false, symmetry: 'even', decay: 2,
    f: (x) => { const u = wrap(x); return u * u; },
    const: PI * PI / 3,
    harmonic: (k, x) => 4 * Math.pow(-1, k) * Math.cos(k * x) / (k * k),
    amp: (k) => 4 / (k * k),
    range: [-1.2, PI * PI * 1.06],
  },
  cubic: {
    id: 'cubic', label: 'кубический  x(π²−x²)/12', short: 'C¹-гладкий',
    kind: 'smooth', gibbs: false, symmetry: 'odd', decay: 3,
    f: (x) => { const u = wrap(x); return u * (PI * PI - u * u) / 12; },
    const: 0,
    harmonic: (k, x) => Math.pow(-1, k + 1) * Math.sin(k * x) / (k * k * k),
    amp: (k) => 1 / (k * k * k),
    range: [-2.1, 2.1],
  },
};

// S_N(x)
function partialSum(sig, N, x) {
  let s = sig.const;
  for (let k = 1; k <= N; k++) s += sig.harmonic(k, x);
  return s;
}
// Fejér mean σ_n(x)
function fejerSum(sig, n, x) {
  let s = sig.const;
  for (let k = 1; k <= n; k++) s += (1 - k / (n + 1)) * sig.harmonic(k, x);
  return s;
}

/* ---- ядра ---- */
// ядро Дирихле D_n(t) = 1/2 + Σ cos kt = sin((n+1/2)t)/(2 sin t/2),  ∫=π
function dirichlet(n, t) {
  const s = Math.sin(t / 2);
  if (Math.abs(s) < 1e-9) return n + 0.5;
  return Math.sin((n + 0.5) * t) / (2 * s);
}
// ядро Фейера F_n(t) = sin²((n+1)t/2)/(2(n+1) sin²(t/2)) ≥ 0,  ∫=π
function fejerKernel(n, t) {
  const s = Math.sin(t / 2);
  if (Math.abs(s) < 1e-9) return (n + 1) / 2;
  const num = Math.sin((n + 1) * t / 2);
  return (num * num) / (2 * (n + 1) * s * s);
}

/* ---- центр масс намотки (Машина намотки, §3.2) ----
   COM(ω) = 1/2π ∫_{-π}^{π} f(t) e^{-iωt} dt   (численно, трапеции)
   при ω=k∈ℤ равно c_k.  Возвращает {re, im, mag}.
*/
function windingCOM(f, omega, nodes = 720) {
  let re = 0, im = 0;
  for (let i = 0; i <= nodes; i++) {
    const t = -PI + TAU * i / nodes;
    const w = (i === 0 || i === nodes) ? 0.5 : 1; // трапеции
    const v = f(t);
    re += w * v * Math.cos(omega * t);
    im += w * v * (-Math.sin(omega * t));
  }
  const h = TAU / nodes;
  re = re * h / TAU;
  im = im * h / TAU;
  return { re, im, mag: Math.hypot(re, im) };
}

/* ---- конструируемый сигнал для Машины намотки ----
   список компонент {freq, cos, sin} → функция f(t) и список «истинных» частот
*/
function buildSignal(components) {
  return (t) => {
    let s = 0;
    for (const c of components) {
      if (c.cos) s += c.cos * Math.cos(c.freq * t);
      if (c.sin) s += c.sin * Math.sin(c.freq * t);
    }
    return s;
  };
}

// численный интеграл ∫_a^b g(x) dx (трапеции)
function integrate(g, a, b, n = 800) {
  let s = 0;
  for (let i = 0; i <= n; i++) {
    const x = a + (b - a) * i / n;
    const w = (i === 0 || i === n) ? 0.5 : 1;
    s += w * g(x);
  }
  return s * (b - a) / n;
}

// equispaced полилиния значений f на [a,b]
function fnPoints(f, a, b, n = 600) {
  const pts = new Array(n + 1);
  for (let i = 0; i <= n; i++) { const x = a + (b - a) * i / n; pts[i] = [x, f(x)]; }
  return pts;
}

Object.assign(window, {
  PI, TAU, wrap, SIGNALS, partialSum, fejerSum,
  dirichlet, fejerKernel, windingCOM, buildSignal, integrate, fnPoints,
});
