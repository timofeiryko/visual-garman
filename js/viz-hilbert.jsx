/* =====================================================
   viz-hilbert.jsx — интерактивы блока 2 (Гильбертова теория)
   ProjectionResidual, InnerProductGeometry, BesselClimb,
   ParsevalGap, RieszReconstruct, MeanSquareConverge, CompletenessHole.
   Все на useCanvas (перерисовка по слайдеру), без rAF.
   ===================================================== */

// --- общие мини-помощники блока ---
function hbSquareSn(x, n) {            // частичная сумма меандра sign(x): Σ_{k нечёт} 4/(πk) sin kx
  let s = 0;
  for (let k = 1; k <= n; k += 2) s += (4 / (Math.PI * k)) * Math.sin(k * x);
  return s;
}
function hbBarFrame(ctx, x, y, w, h) { // рамка энергетической полосы
  ctx.save();
  ctx.strokeStyle = cssVar('--hair', 'rgba(140,160,200,0.3)'); ctx.lineWidth = 1.4;
  ctx.strokeRect(x, y, w, h); ctx.restore();
}
function hbText(ctx, s, x, y, opts = {}) {
  const { color = cssVar('--muted'), font = '12px "IBM Plex Mono", monospace', align = 'left', baseline = 'alphabetic' } = opts;
  ctx.save(); ctx.fillStyle = color; ctx.font = font; ctx.textAlign = align; ctx.textBaseline = baseline;
  ctx.fillText(s, x, y); ctx.restore();
}

// ============ 2.0 · Проекция и остаток (минимальное свойство) ============
function ProjectionResidual() {
  const [c, setC] = useState(1.0);
  const x1 = 1.6, x2 = 1.15;          // фиксированный вектор x
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const T = makeTransform({ xMin: -0.4, xMax: 2.3, yMin: -0.4, yMax: 1.9, W, H, padL: 34, padB: 28, padT: 16, padR: 18 });
    drawAxes(ctx, T, { xLabel: 'e₁', yLabel: 'e₂', xTick: 1, yTick: 1, xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0) });
    // подпространство L = ось e1
    ctx.save(); ctx.strokeStyle = cssVar('--c-approx'); ctx.globalAlpha = 0.35; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(T.X(-0.4), T.Y(0)); ctx.lineTo(T.X(2.3), T.Y(0)); ctx.stroke(); ctx.restore();
    hbText(ctx, 'L = ⟨e₁⟩', T.X(2.3) - 4, T.Y(0) - 8, { align: 'right', color: cssVar('--c-approx') });
    // кандидат S = c·e1
    drawVector(ctx, T, 0, 0, c, 0, { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 5 });
    // остаток x - S
    const near = Math.abs(c - x1) < 0.05;
    drawCurve(ctx, T, [[c, 0], [x1, x2]], { color: cssVar('--c-warn'), lineWidth: 2, dash: near ? null : [5, 4] });
    // вектор x
    drawVector(ctx, T, 0, 0, x1, x2, { color: cssVar('--c-signal'), lineWidth: 2.6, glow: 6 });
    drawDot(ctx, T, x1, x2, { color: cssVar('--c-signal'), r: 3.5 });
    // прямой угол, когда c = x̂1 = x1
    if (near) {
      const s = 0.12;
      ctx.save(); ctx.strokeStyle = cssVar('--c-com'); ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(T.X(x1 - s), T.Y(0)); ctx.lineTo(T.X(x1 - s), T.Y(s)); ctx.lineTo(T.X(x1), T.Y(s));
      ctx.stroke(); ctx.restore();
      hbText(ctx, 'x − S ⟂ L · минимум', T.X(x1) + 8, T.Y(x2 / 2), { color: cssVar('--c-com') });
    }
    hbText(ctx, 'x', T.X(x1) + 8, T.Y(x2) - 6, { color: cssVar('--c-signal'), font: 'italic 14px "Spectral", serif' });
    hbText(ctx, 'S = c·e₁', T.X(c) + 6, T.Y(0) + 18, { color: cssVar('--c-approx') });
  }, [c]);
  const err = Math.hypot(x1 - c, x2), minErr = x2;
  return (
    <Viz title="Проекция и остаток" tag="мин. свойство"
      legend={[{ c: cssVar('--c-signal'), t: 'вектор x' }, { c: cssVar('--c-approx'), t: 'приближение S = c·e₁' }, { c: cssVar('--c-warn'), t: 'ошибка x − S' }]}
      controls={<Slider label="коэффициент c" value={c} setValue={setC} min={0} max={2.2} step={0.01} />}
      readout={<React.Fragment><span>‖x − S‖ = <b style={{ color: cssVar('--c-warn') }}>{err.toFixed(3)}</b></span><span style={{ marginLeft: 16 }}>минимум при c = x̂₁ = {x1.toFixed(2)}: ‖x − S‖ = <b style={{ color: cssVar('--c-com') }}>{minErr.toFixed(3)}</b></span></React.Fragment>}
      note={'Ошибка $\\|x-S\\|$ минимальна ровно тогда, когда остаток $x-S$ перпендикулярен подпространству $L$. Тогда $S$ — ортогональная проекция $x$, то есть $c=\\hat x_1=\\langle x,e_1\\rangle/\\|e_1\\|^2$.'}
      steps={[
        'Двигай $c$ — кончик $S=c\\,e_1$ скользит по оси $L$, а оранжевая ошибка $x-S$ меняет длину.',
        'Длина $\\|x-S\\|=\\sqrt{(x_1-c)^2+x_2^2}$ минимальна при $c=x_1$ — тогда ошибка вертикальна, то есть $\\perp L$.',
        'Это и есть минимальное свойство: наилучший коэффициент — коэффициент Фурье $\\hat x_1$, а $S$ — проекция. Остаток $\\perp$ всему, что уже учтено.',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

// ============ 2.1 · Скалярное произведение, угол, Коши–Буняковский ============
function InnerProductGeometry() {
  const [ang, setAng] = useState(52);       // угол вектора y, градусы
  const xx = 1.7, xy = 0.0;                  // x вдоль оси e1
  const yr = 1.35;                           // длина y
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const T = makeTransform({ xMin: -1.8, xMax: 1.9, yMin: -1.7, yMax: 1.7, W, H, padL: 30, padB: 26, padT: 14, padR: 16 });
    drawAxes(ctx, T, { xLabel: 'e₁', yLabel: 'e₂', xTick: 1, yTick: 1, xFmt: (v) => v.toFixed(0), yFmt: (v) => v.toFixed(0), showGrid: true });
    const th = ang * Math.PI / 180;
    const yx = yr * Math.cos(th), yy = yr * Math.sin(th);
    // дуга угла
    ctx.save(); ctx.strokeStyle = cssVar('--muted'); ctx.lineWidth = 1.3; ctx.globalAlpha = 0.8;
    ctx.beginPath(); ctx.arc(T.X(0), T.Y(0), 26, 0, -th, th > 0); ctx.stroke(); ctx.restore();
    // проекция y на x (= ось e1)
    const proj = yx; // т.к. x вдоль e1, |x|=xx → projection length onto unit e1 is yx
    ctx.save(); ctx.strokeStyle = cssVar('--c-com'); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(T.X(yx), T.Y(yy)); ctx.lineTo(T.X(yx), T.Y(0)); ctx.stroke(); ctx.restore();
    drawVector(ctx, T, 0, 0, proj, 0, { color: cssVar('--c-com'), lineWidth: 4, head: 0 });
    drawVector(ctx, T, 0, 0, xx, xy, { color: cssVar('--c-signal'), lineWidth: 2.6, glow: 6 });
    drawVector(ctx, T, 0, 0, yx, yy, { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 6 });
    const ortho = Math.abs(Math.abs(ang) - 90) < 1.5;
    if (ortho) hbText(ctx, '⟨x,y⟩ = 0 · ортогональны', T.X(0) + 8, T.Y(1.55), { color: cssVar('--c-com'), font: '13px "IBM Plex Mono", monospace' });
    hbText(ctx, 'x', T.X(xx) + 8, T.Y(0) - 8, { color: cssVar('--c-signal'), font: 'italic 14px "Spectral", serif' });
    hbText(ctx, 'y', T.X(yx) + 8, T.Y(yy) - 6, { color: cssVar('--c-approx'), font: 'italic 14px "Spectral", serif' });
  }, [ang]);
  const dot = xx * yr * Math.cos(ang * Math.PI / 180);
  const bound = xx * yr;
  return (
    <Viz title="Скалярное произведение" tag="угол · Коши–Буняковский"
      legend={[{ c: cssVar('--c-signal'), t: 'x' }, { c: cssVar('--c-approx'), t: 'y' }, { c: cssVar('--c-com'), t: 'тень y на x' }]}
      controls={<Slider label="угол θ между x и y" value={ang} setValue={setAng} min={0} max={180} step={1} fmt={(v) => v + '°'} />}
      readout={<React.Fragment><span>⟨x,y⟩ = ‖x‖‖y‖cos θ = <b style={{ color: cssVar('--c-com') }}>{dot.toFixed(3)}</b></span><span style={{ marginLeft: 16 }}>|⟨x,y⟩| ≤ ‖x‖‖y‖ = <b>{bound.toFixed(3)}</b></span></React.Fragment>}
      note={'$\\langle x,y\\rangle=\\|x\\|\\,\\|y\\|\\cos\\theta$. При $\\theta=90^\\circ$ — ортогональность $\\langle x,y\\rangle=0$. Граница $|\\langle x,y\\rangle|\\le\\|x\\|\\|y\\|$ — неравенство Коши–Буняковского.'}
      steps={[
        'Зелёная «тень» — проекция $y$ на направление $x$; её длина $\\|y\\|\\cos\\theta$, а $\\langle x,y\\rangle=\\|x\\|\\cdot(\\text{тень})$.',
        'При $\\theta=90^\\circ$ тень нулевая — $\\langle x,y\\rangle=0$, векторы ортогональны. Это определение ОС: оси попарно ортогональны.',
        'Коэффициент Фурье — это длина тени, нормированная: $\\hat x_k=\\langle x,e_k\\rangle/\\|e_k\\|^2$. Так геометрия задаёт «сколько в $x$ оси $e_k$».',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

// ============ 2.2 · Лестница Бесселя (энергия проекций) ============
function BesselClimb() {
  const [n, setN] = useState(5);
  // меандр sign(x): энергия (норм. 1/π ∫f²)=2; вклад k-й гармоники = b_k², b_k=4/(πk) нечёт
  const total = 2;
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    // верх: f и S_n
    const T = makeTransform({ xMin: -Math.PI, xMax: Math.PI, yMin: -1.5, yMax: 1.5, W, H: H * 0.6, padL: 32, padB: 20, padT: 14, padR: 14 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    drawCurve(ctx, T, sampleFn((x) => (x === 0 ? 0 : Math.sign(x)), -Math.PI, Math.PI, 400), { color: cssVar('--c-signal'), lineWidth: 2, glow: 3 });
    drawCurve(ctx, T, sampleFn((x) => hbSquareSn(x, n), -Math.PI, Math.PI, 500), { color: cssVar('--c-approx'), lineWidth: 2.4, glow: 5 });
    // низ: энергетическая полоса
    const bx = 36, bw = W - 70, by = H * 0.78, bh = 22;
    let E = 0; for (let k = 1; k <= n; k += 2) { const b = 4 / (Math.PI * k); E += b * b; }
    hbBarFrame(ctx, bx, by, bw, bh);
    ctx.save();
    ctx.fillStyle = cssVar('--c-com'); ctx.globalAlpha = 0.85; ctx.fillRect(bx, by, bw * (E / total), bh);     // учтённая энергия
    ctx.fillStyle = cssVar('--c-warn'); ctx.globalAlpha = 0.4; ctx.fillRect(bx + bw * (E / total), by, bw * (1 - E / total), bh); // остаток
    ctx.restore();
    hbText(ctx, 'энергия проекций Σ|x̂ₖ|²‖eₖ‖²', bx, by - 8, { color: cssVar('--c-com') });
    hbText(ctx, '‖x‖²', bx + bw, by - 8, { color: cssVar('--muted'), align: 'right' });
    // стебли вкладов
    const sy = by + bh + 16, sH = H - sy - 8, smax = (4 / Math.PI) * (4 / Math.PI);
    ctx.save(); ctx.strokeStyle = cssVar('--hair'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(bx, sy + sH); ctx.lineTo(bx + bw, sy + sH); ctx.stroke(); ctx.restore();
    for (let k = 1; k <= 13; k += 2) {
      const b = 4 / (Math.PI * k), e = b * b, px = bx + bw * (k / 14), ph = sH * (e / smax);
      const on = k <= n;
      ctx.save(); ctx.strokeStyle = on ? cssVar('--c-com') : cssVar('--faint'); ctx.fillStyle = ctx.strokeStyle; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(px, sy + sH); ctx.lineTo(px, sy + sH - ph); ctx.stroke();
      ctx.beginPath(); ctx.arc(px, sy + sH - ph, 3, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      hbText(ctx, 'k=' + k, px, sy + sH + 12, { align: 'center', color: on ? cssVar('--c-com') : cssVar('--faint'), font: '10px "IBM Plex Mono", monospace' });
    }
  }, [n]);
  let E = 0; for (let k = 1; k <= n; k += 2) { const b = 4 / (Math.PI * k); E += b * b; }
  return (
    <Viz title="Лестница Бесселя" tag="энергия проекций"
      legend={[{ c: cssVar('--c-signal'), t: 'f — меандр' }, { c: cssVar('--c-approx'), t: 'Sₙ' }, { c: cssVar('--c-com'), t: 'учтённая энергия' }, { c: cssVar('--c-warn'), t: 'остаток ‖f−Sₙ‖²' }]}
      controls={<Slider label="число гармоник n" value={n} setValue={setN} min={1} max={25} step={2} />}
      readout={<React.Fragment><span>Σ|x̂ₖ|²‖eₖ‖² = <b style={{ color: cssVar('--c-com') }}>{E.toFixed(3)}</b></span><span style={{ marginLeft: 14 }}>≤ ‖f‖² = <b>{total.toFixed(3)}</b></span><span style={{ marginLeft: 14 }}>остаток = <b style={{ color: cssVar('--c-warn') }}>{(total - E).toFixed(3)}</b></span></React.Fragment>}
      note={'Неравенство Бесселя: $\\sum_k|\\hat x_k|^2\\|e_k\\|^2\\le\\|x\\|^2$. Зелёная энергия растёт с $n$, но никогда не перебирает полную $\\|f\\|^2$. Для полной системы в пределе — равенство (Парсеваль).'}
      steps={[
        'Каждая гармоника добавляет вклад $|\\hat x_k|^2\\|e_k\\|^2$ (зелёные стебли) в общую энергию — полоса заполняется слева.',
        'Тождество Бесселя: остаток $\\|f-S_n\\|^2=\\|f\\|^2-\\sum_{k\\le n}|\\hat x_k|^2\\|e_k\\|^2$ — оранжевый хвост полосы.',
        'Сумма вкладов монотонно растёт и ограничена $\\|f\\|^2$ — значит сходится (неравенство Бесселя). Для меандра она доходит до $\\|f\\|^2$: триг. система полна.',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

// ============ 2.3 · Зазор Парсеваля (полная vs неполная система) ============
function ParsevalGap() {
  const [sys, setSys] = useState('sin');     // sin | cos | sin1
  const [n, setN] = useState(7);
  const total = 2;                            // ‖меандр‖² (норм. 1/π∫f²)
  const Sn = (x) => {
    let s = 0;
    if (sys === 'cos') return 0;              // f нечётна ⇒ все косинусные коэф. = 0
    for (let k = 1; k <= n; k += 2) { if (sys === 'sin1' && k === 1) continue; s += (4 / (Math.PI * k)) * Math.sin(k * x); }
    return s;
  };
  const energy = () => {
    if (sys === 'cos') return 0;
    let E = 0; for (let k = 1; k <= n; k += 2) { if (sys === 'sin1' && k === 1) continue; const b = 4 / (Math.PI * k); E += b * b; }
    return E;
  };
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const T = makeTransform({ xMin: -Math.PI, xMax: Math.PI, yMin: -1.5, yMax: 1.5, W, H: H * 0.62, padL: 32, padB: 20, padT: 14, padR: 14 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    drawCurve(ctx, T, sampleFn((x) => (x === 0 ? 0 : Math.sign(x)), -Math.PI, Math.PI, 400), { color: cssVar('--c-signal'), lineWidth: 2, glow: 3 });
    drawCurve(ctx, T, sampleFn((x) => Sn(x), -Math.PI, Math.PI, 500), { color: cssVar('--c-approx'), lineWidth: 2.4, glow: 5 });
    const bx = 36, bw = W - 70, by = H * 0.82, bh = 24, E = energy();
    hbBarFrame(ctx, bx, by, bw, bh);
    ctx.save();
    ctx.fillStyle = cssVar('--c-com'); ctx.globalAlpha = 0.85; ctx.fillRect(bx, by, bw * (E / total), bh);
    ctx.fillStyle = cssVar('--c-warn'); ctx.globalAlpha = 0.45; ctx.fillRect(bx + bw * (E / total), by, bw * (1 - E / total), bh);
    ctx.restore();
    hbText(ctx, 'спектр', bx, by - 8, { color: cssVar('--c-com') });
    const gap = total - E;
    hbText(ctx, gap > 0.02 ? 'ЗАЗОР ' + gap.toFixed(2) : 'Парсеваль: зазор 0', bx + bw, by - 8, { color: gap > 0.02 ? cssVar('--c-warn') : cssVar('--c-com'), align: 'right' });
  }, [sys, n]);
  const E = energy(), gap = total - E;
  return (
    <Viz title="Зазор Парсеваля" tag="полнота ⟺ нет зазора"
      legend={[{ c: cssVar('--c-signal'), t: 'f — меандр (нечётна)' }, { c: cssVar('--c-approx'), t: 'Sₙ в выбранной системе' }, { c: cssVar('--c-warn'), t: 'потерянная энергия' }]}
      controls={<React.Fragment>
        <ButtonGroup label="система" value={sys} setValue={setSys} columns={3}
          options={[{ value: 'sin', label: 'синусы (полн.)' }, { value: 'cos', label: 'косинусы' }, { value: 'sin1', label: 'синусы без k=1' }]} />
        <Slider label="число гармоник n" value={n} setValue={setN} min={1} max={25} step={2} />
      </React.Fragment>}
      readout={<React.Fragment><span>энергия спектра = <b style={{ color: cssVar('--c-com') }}>{E.toFixed(3)}</b> / ‖f‖² = {total.toFixed(2)}</span><span style={{ marginLeft: 14 }}>зазор = <b style={{ color: gap > 0.02 ? cssVar('--c-warn') : cssVar('--c-com') }}>{gap.toFixed(3)}</b></span></React.Fragment>}
      note={'Равенство Парсеваля $\\|f\\|^2=\\sum|\\hat f(k)|^2\\|e_k\\|^2$ выполнено тогда и только тогда, когда система полна. Неполная система оставляет «слепое пятно» — зазор энергии.'}
      steps={[
        'Синусы — полная для нечётной $f$ система: энергия добирается до $\\|f\\|^2$, зазор $\\to0$ (Парсеваль).',
        'Косинусы «не видят» нечётную $f$ — все коэффициенты нулевые, $S_n\\equiv0$, зазор равен всей энергии. Система неполна для этой $f$.',
        'Убрать одну гармонику ($k=1$) — и в спектре навсегда дыра размером $b_1^2=16/\\pi^2$: потеряли самую энергичную составляющую.',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

// ============ 2.4 · Сборка по спектру (Рисс–Фишер) ============
function RieszReconstruct() {
  const [n, setN] = useState(6);
  // спектр α_k = 1/k (синусы), Σα_k²‖e‖²=π·Σ1/k² < ∞ ⇒ собирается в пилу (π−x)/2
  const Sn = (x, m) => { let s = 0; for (let k = 1; k <= m; k++) s += Math.sin(k * x) / k; return s; };
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const T = makeTransform({ xMin: -Math.PI, xMax: Math.PI, yMin: -1.8, yMax: 1.8, W, H: H * 0.66, padL: 32, padB: 20, padT: 14, padR: 14 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    // предел (пила) и две частичные суммы Sₙ, S₂ₙ — видно, что близки (Коши)
    drawCurve(ctx, T, sampleFn((x) => (x === 0 ? 0 : (Math.PI - Math.abs(x)) / 2 * Math.sign(x)), -Math.PI, Math.PI, 400), { color: cssVar('--c-signal'), lineWidth: 1.6, dash: [5, 4], alpha: 0.7 });
    drawCurve(ctx, T, sampleFn((x) => Sn(x, 2 * n), -Math.PI, Math.PI, 500), { color: cssVar('--c-com'), lineWidth: 1.6, alpha: 0.65 });
    drawCurve(ctx, T, sampleFn((x) => Sn(x, n), -Math.PI, Math.PI, 500), { color: cssVar('--c-approx'), lineWidth: 2.4, glow: 5 });
    // полоса хвостовой энергии Σ_{k>n} 1/k² (·π)
    let tail = 0; for (let k = n + 1; k <= 4000; k++) tail += 1 / (k * k);
    const full = Math.PI * Math.PI / 6, bx = 36, bw = W - 70, by = H * 0.84, bh = 20;
    hbBarFrame(ctx, bx, by, bw, bh);
    ctx.save(); ctx.fillStyle = cssVar('--c-warn'); ctx.globalAlpha = 0.6; ctx.fillRect(bx, by, bw * (tail / full), bh); ctx.restore();
    hbText(ctx, 'хвост энергии Σ_{k>n} |αₖ|²‖eₖ‖² → 0', bx, by - 8, { color: cssVar('--c-warn') });
  }, [n]);
  let tail = 0; for (let k = n + 1; k <= 4000; k++) tail += 1 / (k * k);
  return (
    <Viz title="Сборка по спектру" tag="Рисс–Фишер"
      legend={[{ c: cssVar('--c-approx'), t: 'Sₙ' }, { c: cssVar('--c-com'), t: 'S₂ₙ (почти совпадает)' }, { c: cssVar('--c-signal'), t: 'предел x = Σαₖeₖ' }, { c: cssVar('--c-warn'), t: 'хвост энергии' }]}
      controls={<Slider label="число членов n" value={n} setValue={setN} min={1} max={40} step={1} />}
      readout={<React.Fragment><span>спектр αₖ = 1/k, Σ|αₖ|²‖eₖ‖² = π²/6·π &lt; ∞</span><span style={{ marginLeft: 14 }}>хвост ‖S₂ₙ−Sₙ‖² ∝ <b style={{ color: cssVar('--c-warn') }}>{(tail * Math.PI).toFixed(3)}</b></span></React.Fragment>}
      note={'Если энергия спектра конечна ($\\sum|\\alpha_k|^2\\|e_k\\|^2<\\infty$), частичные суммы фундаментальны: $\\|S_{n+p}-S_n\\|^2=$ хвост ряда $\\to0$. В полном $H$ они сходятся к вектору $x$ — это теорема Рисса–Фишера.'}
      steps={[
        'Берём произвольный спектр $\\alpha_k=1/k$ с конечной энергией $\\sum|\\alpha_k|^2\\|e_k\\|^2=\\pi\\cdot\\frac{\\pi^2}{6}$.',
        'Sₙ и S₂ₙ почти сливаются: по Пифагору $\\|S_{2n}-S_n\\|^2$ равно хвосту ряда энергий — он стремится к нулю, значит последовательность фундаментальна.',
        'Полнота пространства $H$ превращает фундаментальность в сходимость: ряд собирается в реальную функцию $x$ (здесь — «пилу»). Спектр с конечной энергией всегда чей-то.',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

// ============ 2.5 · Сходимость в среднем (L²) против Гиббса ============
function MeanSquareConverge() {
  const [n, setN] = useState(9);
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const T = makeTransform({ xMin: -Math.PI, xMax: Math.PI, yMin: -1.6, yMax: 1.6, W, H: H * 0.66, padL: 32, padB: 20, padT: 14, padR: 14 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    // площадь (f−Sₙ)² — закрашиваем «энергию ошибки»
    ctx.save(); ctx.globalAlpha = 0.5;
    const N = 360;
    for (let i = 0; i < N; i++) {
      const x = -Math.PI + 2 * Math.PI * i / N;
      const f = x === 0 ? 0 : Math.sign(x), d = f - hbSquareSn(x, n), e = d * d;
      ctx.fillStyle = cssVar('--c-warn');
      ctx.fillRect(T.X(x), T.Y(e * 0.5), Math.max(1, T.dxToPx(2 * Math.PI / N) + 0.5), T.Y(0) - T.Y(e * 0.5));
    }
    ctx.restore();
    drawCurve(ctx, T, sampleFn((x) => (x === 0 ? 0 : Math.sign(x)), -Math.PI, Math.PI, 400), { color: cssVar('--c-signal'), lineWidth: 2, glow: 3 });
    drawCurve(ctx, T, sampleFn((x) => hbSquareSn(x, n), -Math.PI, Math.PI, 600), { color: cssVar('--c-approx'), lineWidth: 2.2, glow: 5 });
    // полоса L²-ошибки
    let l2 = 0; const M = 2000;
    for (let i = 0; i < M; i++) { const x = -Math.PI + 2 * Math.PI * i / M; const f = x === 0 ? 0 : Math.sign(x); const d = f - hbSquareSn(x, n); l2 += d * d * (2 * Math.PI / M); }
    l2 = Math.sqrt(l2);
    const bx = 36, bw = W - 70, by = H * 0.86, bh = 18, l2max = 2.6;
    hbBarFrame(ctx, bx, by, bw, bh);
    ctx.save(); ctx.fillStyle = cssVar('--c-warn'); ctx.globalAlpha = 0.7; ctx.fillRect(bx, by, bw * Math.min(1, l2 / l2max), bh); ctx.restore();
    hbText(ctx, '‖f − Sₙ‖₂ → 0  (площадь ошибки тает)', bx, by - 8, { color: cssVar('--c-warn') });
  }, [n]);
  let l2 = 0; const M = 3000;
  for (let i = 0; i < M; i++) { const x = -Math.PI + 2 * Math.PI * i / M; const f = x === 0 ? 0 : Math.sign(x); const d = f - hbSquareSn(x, n); l2 += d * d * (2 * Math.PI / M); }
  l2 = Math.sqrt(l2);
  const overshoot = 1.179; // высота Гиббса ≈ 1.0895·скачок/2 ... фикс. ориентир
  return (
    <Viz title="Сходимость в среднем" tag="L² побеждает Гиббс"
      legend={[{ c: cssVar('--c-signal'), t: 'f — меандр' }, { c: cssVar('--c-approx'), t: 'Sₙ (с ушами Гиббса)' }, { c: cssVar('--c-warn'), t: '(f − Sₙ)² — энергия ошибки' }]}
      controls={<Slider label="число гармоник n" value={n} setValue={setN} min={1} max={49} step={2} />}
      readout={<React.Fragment><span>‖f − Sₙ‖₂ = <b style={{ color: cssVar('--c-warn') }}>{l2.toFixed(3)}</b> → 0</span><span style={{ marginLeft: 14 }}>но max|f − Sₙ| ≈ <b style={{ color: cssVar('--c-signal') }}>{overshoot.toFixed(2)}</b> (Гиббс не тает)</span></React.Fragment>}
      note={'Полнота триг. системы $\\Rightarrow\\int|f-S_n|^2\\to0$ для любой $f\\in L^2$ — даже разрывной. Оранжевая площадь $(f-S_n)^2$ тает, хотя «уши» Гиббса возле скачка остаются высотой ~9%.'}
      steps={[
        'У меандра разрыв — поточечно возле него навсегда торчат «уши» Гиббса: $\\max|f-S_n|$ к нулю не идёт.',
        'Но энергия ошибки $\\int(f-S_n)^2$ (оранжевая площадь) сосредоточена во всё более узкой зоне у скачка и стремится к нулю.',
        'Это и есть сходимость в среднем квадратичном: $\\|f-S_n\\|_2\\to0$. В $L^2$ полнота триг. системы работает там, где равномерная сходимость из блока 1 была невозможна.',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

// ============ 2.6 · Дыра в пространстве (полнота C vs интегральные нормы) ============
function CompletenessHole() {
  const [n, setN] = useState(6);
  const [norm, setNorm] = useState('L1');
  const fn = (x, m) => Math.abs(x) <= 1 / m ? m * x : Math.sign(x);
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const T = makeTransform({ xMin: -1.1, xMax: 1.1, yMin: -1.5, yMax: 1.5, W, H: H * 0.66, padL: 34, padB: 22, padT: 14, padR: 14 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1, xTick: 0.5, xFmt: (v) => v.toFixed(1) });
    // предел sgn(x) — пунктиром, «вне C»
    drawCurve(ctx, T, [[-1.1, -1], [-0.001, -1]], { color: cssVar('--c-warn'), lineWidth: 2, dash: [6, 4] });
    drawCurve(ctx, T, [[0.001, 1], [1.1, 1]], { color: cssVar('--c-warn'), lineWidth: 2, dash: [6, 4] });
    drawDot(ctx, T, 0, 0, { color: cssVar('--c-warn'), r: 3 });
    drawCurve(ctx, T, sampleFn((x) => fn(x, n), -1.1, 1.1, 500), { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 5 });
    drawCurve(ctx, T, sampleFn((x) => fn(x, 2 * n), -1.1, 1.1, 500), { color: cssVar('--c-com'), lineWidth: 1.6, alpha: 0.7 });
    hbText(ctx, 'предел sgn(x) — разрывен, не в C', T.X(1.1) - 4, T.Y(1) - 8, { align: 'right', color: cssVar('--c-warn') });
  }, [n]);
  // расстояние ‖f_n − f_{2n}‖ в выбранной норме
  let d = 0, dmax = 0, M = 4000;
  if (norm === 'sup') {
    for (let i = 0; i <= M; i++) { const x = -1.1 + 2.2 * i / M; d = Math.max(d, Math.abs(fn(x, n) - fn(x, 2 * n))); }
    dmax = 1;
  } else {
    const p = norm === 'L2' ? 2 : 1;
    for (let i = 0; i < M; i++) { const x = -1.1 + 2.2 * i / M; d += Math.pow(Math.abs(fn(x, n) - fn(x, 2 * n)), p) * (2.2 / M); }
    if (p === 2) d = Math.sqrt(d);
    dmax = norm === 'L2' ? 0.9 : 0.6;
  }
  const cauchy = norm !== 'sup';
  return (
    <Viz title="Дыра в пространстве" tag="полнота C[a,b]"
      legend={[{ c: cssVar('--c-approx'), t: 'fₙ — пандус' }, { c: cssVar('--c-com'), t: 'f₂ₙ' }, { c: cssVar('--c-warn'), t: 'предел sgn(x) ∉ C' }]}
      controls={<React.Fragment>
        <ButtonGroup label="норма" value={norm} setValue={setNorm} columns={3}
          options={[{ value: 'sup', label: 'sup (C)' }, { value: 'L1', label: 'L¹' }, { value: 'L2', label: 'L²' }]} />
        <Slider label="крутизна n" value={n} setValue={setN} min={2} max={40} step={1} />
      </React.Fragment>}
      readout={<React.Fragment><span>‖fₙ − f₂ₙ‖<sub>{norm === 'sup' ? '∞' : norm === 'L2' ? '2' : '1'}</sub> = <b style={{ color: cauchy ? cssVar('--c-com') : cssVar('--c-warn') }}>{d.toFixed(3)}</b></span><span style={{ marginLeft: 14 }}>{cauchy ? 'фундаментальна, но предел ∉ C → дыра' : 'НЕ фундаментальна в C → противоречия нет'}</span></React.Fragment>}
      note={'$C[a,b]$ полно: равномерный предел непрерывных непрерывен. А в $\\|\\cdot\\|_1,\\|\\cdot\\|_2$ пандусы $f_n$ фундаментальны, но их предел $\\operatorname{sgn}x$ разрывен — он не лежит в $C$. Пространство непрерывных с интегральной нормой имеет дыры.'}
      steps={[
        'Пандусы $f_n$ становятся всё круче и поточечно стремятся к ступеньке $\\operatorname{sgn}x$.',
        'В нормах $L^1,L^2$ соседние $f_n,f_{2n}$ всё ближе — последовательность фундаментальна. Но её «предел» $\\operatorname{sgn}x$ разрывен и в $C$ не лежит: дыра, пространство неполно.',
        'В $\\sup$-норме $\\|f_n-f_{2n}\\|$ к нулю не идёт — в $C$ последовательность вообще не фундаментальна, поэтому полнота $C$ не нарушается. Норма решает, есть ли предел внутри.',
      ]}>
      <canvas ref={ref} />
    </Viz>
  );
}

Object.assign(window, {
  ProjectionResidual, InnerProductGeometry, BesselClimb, ParsevalGap,
  RieszReconstruct, MeanSquareConverge, CompletenessHole,
});
