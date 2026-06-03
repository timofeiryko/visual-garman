/* =====================================================
   viz-misc.jsx — 1.2, 1.4, 1.5, 1.6, 1.7, 1.8
   ===================================================== */

// небольшой набор гладких тест-функций для 1.2
const MISC_FNS = {
  bump:  { label: 'гладкий горб', f: (x) => Math.exp(-(wrap(x) * wrap(x)) / 0.6) },
  tri:   { label: 'треугольник',  f: (x) => Math.abs(wrap(x)) / PI },
  spike: { label: 'с особенностью', f: (x) => { const u = Math.abs(wrap(x)); return u < 1e-3 ? 3 : Math.min(3, 0.45 / Math.sqrt(u)); } },
};

// ================= 1.2 A — самосокращение Римана =================
function RiemannCancellation() {
  const [lam, setLam] = useState(6);
  const [fid, setFid] = useState('bump');
  const f = MISC_FNS[fid].f;
  const prod = (x) => f(x) * Math.cos(lam * x);
  const val = integrate(prod, -PI, PI, 1400);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -3.2, yMax: 3.2, W, H, padL: 34, padB: 24, padT: 12 });
    drawSignedArea(ctx, T, prod, -PI, PI, { alpha: 0.4, n: 700 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    drawCurve(ctx, T, sampleFn(f, -PI, PI, 700), { color: cssVar('--c-signal'), lineWidth: 2, alpha: 0.65 });
    drawCurve(ctx, T, sampleFn(prod, -PI, PI, 900), { color: cssVar('--c-approx'), lineWidth: 1.8, glow: 4 });
  }, [lam, fid]);

  return (
    <Viz
      title="Самосокращение Римана" tag="Теорема 2"
      formula="∫ f(x) cos(λx) dx"
      legend={[{ c: cssVar('--c-signal'), t: 'f' }, { c: cssVar('--c-approx'), t: 'f·cos λx' }, { c: cssVar('--c-com'), t: '+' }, { c: cssVar('--c-warn'), t: '−' }]}
      readout={<React.Fragment>
        <span><span className="k">λ</span> <span className="v">{lam.toFixed(2)}</span></span>
        <span><span className="k">∫ f cos λx</span> <span className={`v ${Math.abs(val) < 0.05 ? 'com' : ''}`}>{val.toFixed(4)}</span></span>
      </React.Fragment>}
      controls={
        <React.Fragment>
          <ButtonGroup label="функция" columns={3} value={fid} setValue={setFid}
            options={Object.entries(MISC_FNS).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Slider label="частота λ" value={lam} setValue={setLam} min={0} max={40} step={0.1} />
        </React.Fragment>
      }
      note={<span>Растёт <b>λ</b> — площади всё дробнее, «+» и «−» гасят друг друга, интеграл $\to 0$. Это видимое доказательство $c_k\to0$.</span>}
      steps={[
        'Берём гладкую функцию $f$ и умножаем её на быстрый «зонд» $\\cos\\lambda x$.',
        '<span class="em-sig">Жёлтая</span> — это $f$, <span class="em-apx">циановая</span> — произведение $f\\cos\\lambda x$. Зелёное/оранжевое — площади выше/ниже оси.',
        'Интеграл $\\int f\\cos\\lambda x$ = разность этих площадей (число в табло).',
        'Крути <b>λ</b> вверх: косинус осциллирует всё быстрее, площадь дробится на узкие $\\pm$ полоски.',
        'Соседние полоски почти равны и противоположны → они сокращаются, интеграл $\\to 0$. Это лемма Римана — и сразу $c_k\\to0$.',
      ]}
    >
      <canvas ref={ref} style={{ height: 280 }} />
    </Viz>
  );
}

// ================= 1.2 B — лесенка =================
function Staircase() {
  const [N, setN] = useState(8);
  const [fid, setFid] = useState('bump');
  const f = MISC_FNS[fid].f;
  const step = (x) => { const i = Math.floor((wrap(x) + PI) / (TAU / N)); const c = -PI + (i + 0.5) * (TAU / N); return f(c); };
  const err = integrate((x) => Math.abs(f(x) - step(x)), -PI, PI, 1600);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -0.4, yMax: 3.3, W, H, padL: 34, padB: 24, padT: 12 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    // step blocks
    ctx.fillStyle = 'rgba(90,209,230,0.12)'; ctx.strokeStyle = cssVar('--c-approx'); ctx.lineWidth = 2;
    for (let i = 0; i < N; i++) {
      const a = -PI + i * (TAU / N), b = a + TAU / N, c = (a + b) / 2, v = f(c);
      ctx.fillRect(T.X(a), T.Y(v), T.dxToPx(TAU / N), T.Y(0) - T.Y(v));
      ctx.beginPath(); ctx.moveTo(T.X(a), T.Y(v)); ctx.lineTo(T.X(b), T.Y(v)); ctx.stroke();
    }
    drawCurve(ctx, T, sampleFn(f, -PI, PI, 700), { color: cssVar('--c-signal'), lineWidth: 2.4, glow: 5 });
  }, [N, fid]);

  return (
    <Viz
      title="Лесенка" tag="Теорема 1"
      formula="∫ |f − g| dx"
      legend={[{ c: cssVar('--c-signal'), t: 'f' }, { c: cssVar('--c-approx'), t: 'ступенчатая g' }]}
      readout={<React.Fragment>
        <span><span className="k">ступеней</span> <span className="v">{N}</span></span>
        <span><span className="k">∫|f−g|</span> <span className="v com">{err.toFixed(4)}</span></span>
      </React.Fragment>}
      controls={
        <React.Fragment>
          <ButtonGroup label="функция" columns={3} value={fid} setValue={setFid}
            options={Object.entries(MISC_FNS).map(([k, v]) => ({ value: k, label: v.label }))} />
          <Slider label="число ступеней N" value={N} setValue={setN} min={2} max={60} step={1} />
        </React.Fragment>
      }
      note={<span>$N\uparrow\Rightarrow\int|f-g|\to0$ — иллюстрация Т1, главного технического приёма блока: любую абс. интегрируемую функцию приближаем финитной ступенчатой.</span>}
      steps={[
        'Делим период на $N$ равных кусков.',
        'На каждом куске заменяем $f$ одним числом — её значением в центре куска. Получается <span class="em-apx">ступенчатая $g$</span>.',
        'Считаем $\\int|f-g|$ — это суммарная площадь рассогласования между жёлтой и циановой.',
        'Двигай $N$ вверх: ступеньки мельче, $g$ всё точнее повторяет $f$, ошибка $\\to 0$.',
        'Это Теорема 1 — рабочая лошадка блока: любую абс. интегрируемую $f$ можно как угодно точно приблизить ступенчатой.',
      ]}
    >
      <canvas ref={ref} style={{ height: 280 }} />
    </Viz>
  );
}

// ================= 1.4 A — сходимость к середине скачка =================
function MidpointConvergence() {
  const [sigId, setSigId] = useState('meander');
  const [n, setN] = useState(20);
  const sig = SIGNALS[sigId];
  const jumpX = 0; // meander jump at 0; saw jump at ±π (use 0 marker still середина=0)
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const [ylo, yhi] = sig.range;
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: ylo * 1.18, yMax: yhi * 1.18, W, H, padL: 34, padB: 24, padT: 12 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: sig.id === 'saw' ? 1 : 0.5 });
    // f with break
    const fpts = [];
    for (let i = 0; i <= 700; i++) { const x = -PI + TAU * i / 700; if (Math.abs(x) < TAU / 700 && sig.id === 'meander') fpts.push(null); fpts.push([x, sig.f(x)]); }
    drawCurve(ctx, T, fpts, { color: cssVar('--c-signal'), lineWidth: 2, alpha: 0.7 });
    // S_n
    drawCurve(ctx, T, sampleFn((x) => partialSum(sig, n, x), -PI, PI, 900), { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 6 });
    // midpoint marker at jump (meander: 0; saw: ±π → середина 0 at x=±π)
    if (sig.id === 'meander') drawDot(ctx, T, 0, 0, { color: cssVar('--c-com'), r: 5, glow: 8 });
    if (sig.id === 'saw') { drawDot(ctx, T, PI, 0, { color: cssVar('--c-com'), r: 5, glow: 8 }); drawDot(ctx, T, -PI, 0, { color: cssVar('--c-com'), r: 5, glow: 8 }); }
    // mark Gibbs overshoot near jump
    ctx.fillStyle = cssVar('--c-warn'); ctx.font = '10.5px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('усик ≈ +9%', T.X(0.2), 8);
  }, [sigId, n]);

  return (
    <Viz
      title="Сходимость к середине скачка" tag="Следствие 1"
      formula="Sₙ(x₀) → (f(x₀+0)+f(x₀−0))/2"
      legend={[{ c: cssVar('--c-signal'), t: 'f' }, { c: cssVar('--c-approx'), t: 'Sₙ' }, { c: cssVar('--c-com'), t: 'середина скачка' }]}
      controls={
        <React.Fragment>
          <ButtonGroup label="разрывная f" columns={2} value={sigId} setValue={setSigId}
            options={[{ value: 'meander', label: 'меандр' }, { value: 'saw', label: 'пила' }]} />
          <Slider label="n" value={n} setValue={setN} min={1} max={80} step={1} />
        </React.Fragment>
      }
      note={<span>В разрыве $S_n$ целит ровно в <b>середину</b>. Рядом — устойчивый выброс ~9%, который <b>не исчезает</b> с ростом $n$, только сужается.</span>}
      steps={[
        'У разрывной функции в точке скачка два разных предела — слева $f(x_0-0)$ и справа $f(x_0+0)$.',
        '<span class="em-apx">$S_n$</span> не может выбрать ни один из них и целит ровно в <span class="em">середину скачка</span> $\\tfrac{f(x_0+0)+f(x_0-0)}{2}$ — зелёная точка.',
        'Это и утверждает Следствие 1 признака Дини: в «хорошей» точке разрыва сумма = полусумма пределов.',
        'Сразу возле скачка $S_n$ перелетает уровень — появляется «усик» примерно $+9\\%$.',
        'Крути $n$: усик <b>не уменьшается по высоте</b>, только прижимается ближе к скачку. Это мостик к эффекту Гиббса.',
      ]}
    >
      <canvas ref={ref} style={{ height: 290 }} />
    </Viz>
  );
}

// ================= 1.4 B — Гиббс крупным планом =================
function GibbsCloseup() {
  const [n, setN] = useState(20);
  // meander, jump at 0, height 2. measure max overshoot near 0+
  const overshoot = useMemo(() => {
    let mx = 0; for (let i = 1; i <= 400; i++) { const x = (PI / (n + 1)) * 1.6 * i / 400; mx = Math.max(mx, partialSum(SIGNALS.meander, n, x)); }
    return mx; // approaches ~1.1789 → 8.95% over half-height 1
  }, [n]);
  const pct = ((overshoot - 1) / 2 * 100); // % of full jump height (2)

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const win = Math.max(0.25, 3 / (n + 1));
    const T = makeTransform({ xMin: -win, xMax: win, yMin: 0.55, yMax: 1.32, W, H, padL: 38, padB: 24, padT: 12 });
    drawAxes(ctx, T, { xLabel: 'x', xTick: win / 2, xFmt: (x) => x.toFixed(2), yTick: 0.1 });
    // ideal level 1
    ctx.strokeStyle = cssVar('--c-signal'); ctx.setLineDash([5, 4]); ctx.lineWidth = 1.6; ctx.globalAlpha = 0.7;
    ctx.beginPath(); ctx.moveTo(T.X(-win), T.Y(1)); ctx.lineTo(T.X(win), T.Y(1)); ctx.stroke(); ctx.setLineDash([]); ctx.globalAlpha = 1;
    drawCurve(ctx, T, sampleFn((x) => partialSum(SIGNALS.meander, n, x), -win, win, 800), { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 6 });
    // overshoot peak
    let px = 0, pm = 0; for (let i = 1; i <= 400; i++) { const x = win * i / 400; const v = partialSum(SIGNALS.meander, n, x); if (v > pm) { pm = v; px = x; } }
    drawDot(ctx, T, px, pm, { color: cssVar('--c-warn'), r: 4.5, glow: 8 });
  }, [n]);

  return (
    <Viz
      title="Эффект Гиббса крупным планом" tag="Билет 3"
      formula="overshoot → 8.95% высоты скачка"
      legend={[{ c: cssVar('--c-signal'), t: 'идеальный уровень' }, { c: cssVar('--c-approx'), t: 'Sₙ' }, { c: cssVar('--c-warn'), t: 'пик овершута' }]}
      readout={<React.Fragment>
        <span><span className="k">n</span> <span className="v">{n}</span></span>
        <span><span className="k">овершут</span> <span className="v warn">{pct.toFixed(2)}%</span></span>
        <span className="k">→ предел 8.95%</span>
      </React.Fragment>}
      controls={<Slider label="n" value={n} setValue={setN} min={3} max={80} step={1} />}
      note={<span>Высота «усика» <b>стабилизируется</b> (~8.95% скачка), а не падает — окно лишь сужается. Поэтому поточечная сходимость есть, а равномерной нет (мост в 1.6).</span>}
      steps={[
        'Приближаемся вплотную к скачку меандра в нуле и смотрим на первый «горб» <span class="em-apx">$S_n$</span>.',
        'Идеальный уровень функции справа от скачка $=1$ (жёлтый пунктир). Пик $S_n$ заметно <b>выше</b>.',
        'Крути $n$: пик <b>не опускается</b> к единице, а замирает на $\\approx 1.179$ — это овершут $8.95\\%$ от полной высоты скачка ($=2$).',
        'При этом окно горба сужается как $\\sim\\pi/n$, поэтому площадь ошибки всё-таки $\\to 0$.',
        'Итог: <b>поточечная</b> сходимость есть (в каждой фикс. точке $S_n\\to f$), а <b>равномерной</b> нет — высота выброса не падает. Это и разберём в 1.6.',
      ]}
    >
      <canvas ref={ref} style={{ height: 290 }} />
    </Viz>
  );
}

// ================= 1.5 A — гладкость ⇒ скорость убывания (Рис. 2) =================
function DecaySpectrum() {
  const [sigId, setSigId] = useState('meander');
  const sig = SIGNALS[sigId];
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const gap = 12, leftW = W * 0.42;
    // left: function
    const [ylo, yhi] = sig.range;
    const TL = makeTransform({ xMin: -PI, xMax: PI, yMin: ylo * 1.1, yMax: yhi * 1.1, W: leftW, H, padL: 32, padB: 24, padT: 12, padR: 6 });
    drawAxes(ctx, TL, { xLabel: 'x', yTick: yhi > 2 ? 1 : 0.5 });
    const fpts = []; for (let i = 0; i <= 700; i++) { const x = -PI + TAU * i / 700; if (Math.abs(x) < TAU / 700 && sig.id === 'meander') fpts.push(null); fpts.push([x, sig.f(x)]); }
    drawCurve(ctx, TL, fpts, { color: cssVar('--c-signal'), lineWidth: 2.2, glow: 5 });
    // right: log-log spectrum
    const x0 = leftW + gap, ww = W - x0 - 12, pb = 26, pt = 14, hh = H - pb - pt;
    const kMax = 40, logKmax = Math.log10(kMax);
    const Xk = (k) => x0 + 36 + (Math.log10(k) / logKmax) * (ww - 40);
    const logMin = -4, logMax = 0.4;
    const Ya = (a) => pt + (1 - (Math.log10(a) - logMin) / (logMax - logMin)) * hh;
    // grid + axis
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1;
    for (let p = 0; p >= -4; p--) { ctx.globalAlpha = 0.6; ctx.beginPath(); ctx.moveTo(x0 + 36, Ya(Math.pow(10, p))); ctx.lineTo(x0 + ww, Ya(Math.pow(10, p))); ctx.stroke(); }
    ctx.globalAlpha = 1;
    ctx.fillStyle = cssVar('--faint'); ctx.font = '9.5px "IBM Plex Mono", monospace'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let p = 0; p >= -4; p--) ctx.fillText('10' + (p === 0 ? '⁰' : '⁻' + (-p)), x0 + 33, Ya(Math.pow(10, p)));
    // reference slopes 1/k,1/k²,1/k³
    const refs = [{ p: 1, c: 'rgba(139,147,167,0.55)' }, { p: 2, c: 'rgba(139,147,167,0.55)' }, { p: 3, c: 'rgba(139,147,167,0.55)' }];
    refs.forEach(r => {
      ctx.strokeStyle = r.c; ctx.lineWidth = 1; ctx.setLineDash([4, 3]); ctx.beginPath();
      for (let k = 1; k <= kMax; k++) { const a = 1 / Math.pow(k, r.p); const X = Xk(k), Y = Ya(a); if (k === 1) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); }
      ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = cssVar('--faint'); ctx.textAlign = 'left'; ctx.font = 'italic 10px "Spectral", serif';
      ctx.fillText('1/k' + (r.p > 1 ? (r.p === 2 ? '²' : '³') : ''), Xk(kMax) - 24, Ya(1 / Math.pow(kMax, r.p)) - 6);
    });
    // stems of |amp(k)|
    for (let k = 1; k <= kMax; k++) {
      const a = sig.amp(k); if (a < 1e-6) continue;
      const X = Xk(k), Y = Ya(a), Y0 = Ya(1e-4);
      ctx.strokeStyle = cssVar('--c-com'); ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(X, Y0); ctx.lineTo(X, Y); ctx.stroke();
      ctx.fillStyle = cssVar('--c-com'); ctx.beginPath(); ctx.arc(X, Y, 2.6, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = cssVar('--muted'); ctx.font = '10.5px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('|cₖ| (log-log по k)', x0 + 36 + (ww - 40) / 2, H - 16);
  }, [sigId]);

  return (
    <Viz
      title="Гладкость ⇒ скорость убывания" tag="Рис. 2"
      formula="|ĉ(k)| = O(1/|k|^{m+1})"
      legend={[{ c: cssVar('--c-signal'), t: 'функция' }, { c: cssVar('--c-com'), t: '|cₖ|' }]}
      controls={
        <ButtonGroup label="функция (даёт ровно один наклон)" columns={3} value={sigId} setValue={setSigId}
          options={[{ value: 'meander', label: 'sign x · 1/k' }, { value: 'triangle', label: '|x| · 1/k²' }, { value: 'cubic', label: 'C¹ · 1/k³' }]} />
      }
      note={<span>Скачок $\Rightarrow 1/k$; излом ($f'$ рвётся) $\Rightarrow 1/k^2$; $C^1$ со склейкой $\Rightarrow 1/k^3$. Чем глаже и «склееннее» на концах — тем круче падает спектр.</span>}
      steps={[
        'Слева — выбранная функция, справа — модули её коэффициентов $|c_k|$.',
        'Спектр откладываем в <b>log-log</b> осях: степенное убывание $1/k^p$ превращается там в <b>прямую</b> с наклоном $-p$.',
        'Серые пунктиры — эталонные наклоны $1/k$, $1/k^2$, $1/k^3$. С чем совпадёт <span class="em">зелёный частокол</span>?',
        'Меандр (есть <b>скачок</b>) ложится на $1/k$; излом $|x|$ (рвётся $f\'$) — на $1/k^2$; $C^1$-функция со склейкой — на $1/k^3$.',
        'Правило: $m$ «хороших» производных со склейкой концов $\\Rightarrow |c_k|=O(1/k^{m+1})$. Гладкость напрямую задаёт скорость убывания.',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

// ================= 1.5 B — дифференцирование = ×ik =================
function DiffMultiply() {
  const [deriv, setDeriv] = useState(false); // false: f (parabola), true: f'
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const kMax = 24;
    const T = makeTransform({ xMin: 0, xMax: kMax + 1, yMin: 0, yMax: 4.2, W, H, padL: 38, padB: 26, padT: 14 });
    drawAxes(ctx, T, { xLabel: 'k', xTick: 4, xFmt: (x) => Math.round(x).toString(), yTick: 1, showYTicks: true });
    const stems = [];
    for (let k = 1; k <= kMax; k++) { const a = 4 / (k * k); stems.push({ x: k, y: deriv ? a * k : a }); }
    drawStems(ctx, T, stems, { color: deriv ? cssVar('--c-kernel') : cssVar('--c-approx'), dotR: 3.5, lineWidth: 2.4 });
    ctx.fillStyle = cssVar('--muted'); ctx.font = '12px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(deriv ? 'спектр f′  (|k|·cₖ)' : 'спектр f  (cₖ)', 44, 8);
  }, [deriv]);

  return (
    <Viz
      title="Дифференцирование = ×ik" tag="Лемма 4"
      formula="f̂′(k) = ik · f̂(k)"
      legend={[{ c: cssVar('--c-approx'), t: 'спектр f' }, { c: cssVar('--c-kernel'), t: "спектр f′" }]}
      controls={<ButtonGroup label="" columns={2} value={deriv ? 'd' : 'f'} setValue={(v) => setDeriv(v === 'd')}
        options={[{ value: 'f', label: 'f = x² (cₖ~1/k²)' }, { value: 'd', label: "f′ (cₖ~1/k)" }]} />}
      note={<span>$k$-я линия спектра домножается на $|k|$ — высокие частоты «поднимаются». Производная всегда замедляет убывание спектра на один порядок.</span>}
      steps={[
        'Берём гладкую функцию $f=x^2$. Её спектр (циан) убывает быстро — как $1/k^2$.',
        'Лемма 4: дифференцирование действует на коэффициенты <b>умножением на $ik$</b>: $\\widehat{f\'}(k)=ik\\,\\widehat f(k)$.',
        'Переключи тумблер на $f\'$: каждая $k$-я линия домножилась на $|k|$.',
        '<span class="em-ker">Высокие частоты «подросли»</span>, и убывание стало медленнее — теперь $1/k$.',
        'Поэтому дифференцирование всегда «портит» спектр на один порядок, а интегрирование — наоборот, улучшает.',
      ]}
    >
      <canvas ref={ref} style={{ height: 270 }} />
    </Viz>
  );
}

// ================= 1.6 — равномерно vs поточечно =================
function UniformVsPointwise() {
  const [n, setN] = useState(12);
  const cont = SIGNALS.triangle, disc = SIGNALS.meander;
  const errOf = (sig, nn) => { let mx = 0; for (let i = 0; i <= 400; i++) { const x = -PI + TAU * i / 400; if (sig.id === 'meander' && Math.abs(x) < 0.02) continue; mx = Math.max(mx, Math.abs(sig.f(x) - partialSum(sig, nn, x))); } return mx; };

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const halfW = W / 2;
    [[cont, 0], [disc, halfW]].forEach(([sig, x0]) => {
      const [ylo, yhi] = sig.range;
      const T = makeTransform({ xMin: -PI, xMax: PI, yMin: ylo * 1.15, yMax: yhi * 1.15, W: halfW, H: H * 0.62, padL: 30, padB: 18, padT: 14, padR: 8 });
      const off = (fn) => (ctx2, ...a) => fn(ctx2, ...a);
      ctx.save(); ctx.translate(x0, 0);
      drawAxes(ctx, T, { xLabel: '', yTick: yhi > 2 ? 1 : 0.5, showXTicks: false });
      const fpts = []; for (let i = 0; i <= 500; i++) { const x = -PI + TAU * i / 500; if (sig.id === 'meander' && Math.abs(x) < TAU / 500) fpts.push(null); fpts.push([x, sig.f(x)]); }
      drawCurve(ctx, T, fpts, { color: cssVar('--c-signal'), lineWidth: 1.8, alpha: 0.7 });
      drawCurve(ctx, T, sampleFn((x) => partialSum(sig, n, x), -PI, PI, 600), { color: cssVar('--c-approx'), lineWidth: 2.2, glow: 4 });
      ctx.fillStyle = cssVar('--muted'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      ctx.fillText(sig.id === 'triangle' ? 'непрерывная |x|' : 'разрывная — меандр', halfW / 2, 6);
      ctx.restore();
    });
    // bottom: error vs n
    const by = H * 0.62;
    const T2 = makeTransform({ xMin: 0, xMax: 50, yMin: 0, yMax: 1.05, W, H: H - by, padL: 40, padB: 24, padT: 16 });
    ctx.save(); ctx.translate(0, by);
    drawAxes(ctx, T2, { xLabel: 'n', xTick: 10, xFmt: (x) => Math.round(x).toString(), yTick: 0.25 });
    const ec = [], ed = []; for (let nn = 1; nn <= 50; nn++) { ec.push([nn, errOf(cont, nn)]); ed.push([nn, errOf(disc, nn)]); }
    drawCurve(ctx, T2, ec, { color: cssVar('--c-approx'), lineWidth: 2 });
    drawCurve(ctx, T2, ed, { color: cssVar('--c-warn'), lineWidth: 2 });
    drawDot(ctx, T2, n, errOf(cont, n), { color: cssVar('--c-approx'), r: 3.5 });
    drawDot(ctx, T2, n, errOf(disc, n), { color: cssVar('--c-warn'), r: 3.5 });
    ctx.fillStyle = cssVar('--muted'); ctx.font = '10.5px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('max|f − Sₙ| :  — непрерывная → 0    — разрывная → const', 46, 6);
    ctx.restore();
  }, [n]);

  return (
    <Viz
      title="Равномерно vs поточечно" tag="Теорема 9"
      formula="max|f − Sₙ| → 0 ?"
      legend={[{ c: cssVar('--c-approx'), t: 'непрерывная' }, { c: cssVar('--c-warn'), t: 'разрывная' }]}
      controls={<Slider label="n" value={n} setValue={setN} min={1} max={50} step={1} />}
      note={<span>Для непрерывной ошибка $\to0$ (равномерно, без усиков); для разрывной — упирается в константу (~9% скачка). Это и отличает Теорему 9 от просто поточечного Дини.</span>}
      steps={[
        'Сверху две функции рядом: <b>непрерывная</b> $|x|$ и <b>разрывный</b> меандр. Для обеих строим $S_n$.',
        'Для каждой меряем <b>максимальную</b> ошибку по всему периоду: $\\max_x|f(x)-S_n(x)|$.',
        'Нижний график — эта максимальная ошибка как функция $n$. Двигай ползунок $n$ и смотри на точки.',
        'Для <span class="em-apx">непрерывной</span> ошибка плавно $\\to 0$ — это <b>равномерная</b> сходимость (Теорема 9).',
        'Для <span style="color:var(--c-warn)">разрывной</span> ошибка упирается в константу (~9% скачка из-за Гиббса): сходимость только <b>поточечная</b>, равномерной нет.',
      ]}
    >
      <canvas ref={ref} style={{ height: 360 }} />
    </Viz>
  );
}

// ================= 1.7 A — Дирихле против Фейера (Рис. 3) =================
function DirichletVsFejer() {
  const [n, setN] = useState(6);
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const halfW = W / 2;
    // Dirichlet (left)
    const peakD = n + 0.5;
    const TD = makeTransform({ xMin: -PI, xMax: PI, yMin: -2.2, yMax: Math.max(3.2, peakD * 1.1), W: halfW, H, padL: 32, padB: 24, padT: 26, padR: 8 });
    drawSignedArea(ctx, TD, (t) => dirichlet(n, t), -PI, PI, { alpha: 0.14, n: 600, posColor: cssVar('--c-kernel'), negColor: cssVar('--c-warn') });
    drawAxes(ctx, TD, { xLabel: '', yTick: peakD > 8 ? 4 : 2 });
    drawCurve(ctx, TD, sampleFn((t) => dirichlet(n, t), -PI, PI, 800), { color: cssVar('--c-kernel'), lineWidth: 2.2, glow: 5 });
    ctx.fillStyle = cssVar('--muted'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Dₙ — знакопеременное', halfW / 2, 6);
    // Fejér (right)
    ctx.save(); ctx.translate(halfW, 0);
    const peakF = (n + 1) / 2;
    const TF = makeTransform({ xMin: -PI, xMax: PI, yMin: -2.2, yMax: Math.max(3.2, peakF * 1.15), W: halfW, H, padL: 32, padB: 24, padT: 26, padR: 8 });
    // fill ≥0
    ctx.fillStyle = 'rgba(255,93,143,0.16)';
    ctx.beginPath(); ctx.moveTo(TF.X(-PI), TF.Y(0));
    for (let i = 0; i <= 600; i++) { const t = -PI + TAU * i / 600; ctx.lineTo(TF.X(t), TF.Y(fejerKernel(n, t))); }
    ctx.lineTo(TF.X(PI), TF.Y(0)); ctx.closePath(); ctx.fill();
    drawAxes(ctx, TF, { xLabel: '', yTick: peakF > 8 ? 4 : 2 });
    drawCurve(ctx, TF, sampleFn((t) => fejerKernel(n, t), -PI, PI, 800), { color: cssVar('--c-kernel'), lineWidth: 2.4, glow: 6 });
    ctx.fillStyle = cssVar('--muted'); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('Fₙ ≥ 0 — дельтаобразное', halfW / 2, 6);
    ctx.restore();
    // divider
    ctx.strokeStyle = cssVar('--hair'); ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(halfW, 8); ctx.lineTo(halfW, H - 8); ctx.stroke();
  }, [n]);

  return (
    <Viz
      title="Дирихле против Фейера" tag="Рис. 3"
      formula="Dₙ(t)   vs   Fₙ(t) ≥ 0"
      legend={[{ c: cssVar('--c-kernel'), t: 'ядро' }, { c: cssVar('--c-warn'), t: 'Dₙ < 0' }]}
      controls={<Slider label="n" value={n} setValue={setN} min={1} max={20} step={1} />}
      note={<span>У $F_n$ пик растёт, «хвосты» уходят, но <b>знак не меняется</b> — дельтаобразность. Это визуальная причина, почему $\sigma_n$ ведут себя лучше $S_n$.</span>}
      steps={[
        'Слева — <span class="em-ker">ядро Дирихле $D_n$</span>. Видно, что оно <b>заходит в минус</b> (оранжевые зоны) — знакопеременное.',
        'Справа — <span class="em-ker">ядро Фейера $F_n$</span>. Оно определено как <b>среднее</b> ядер $D_0,D_1,\\dots,D_n$.',
        'Усреднение гасит осцилляции: у $F_n=\\dfrac{\\sin^2(\\tfrac{n+1}2 t)}{2(n+1)\\sin^2\\tfrac t2}$ числитель — квадрат, поэтому $F_n\\ge 0$ <b>всюду</b>.',
        'Крути $n$: пик $F_n$ растёт, хвосты прижимаются к нулю, а площадь остаётся $=\\pi$ — это «дельтаобразное» ядро.',
        'Именно <b>неотрицательность</b> $F_n$ — причина, почему суммы $\\sigma_n$ не дают выброса Гиббса и сходятся для любой непрерывной $f$.',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

// ================= 1.7 B — Sₙ vs σₙ =================
function SnVsSigma() {
  const [sigId, setSigId] = useState('meander');
  const [n, setN] = useState(14);
  const sig = SIGNALS[sigId];
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const [ylo, yhi] = sig.range;
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: ylo * 1.18, yMax: yhi * 1.18, W, H, padL: 34, padB: 24, padT: 12 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: yhi > 2 ? 1 : 0.5 });
    const fpts = []; for (let i = 0; i <= 700; i++) { const x = -PI + TAU * i / 700; if (sig.id === 'meander' && Math.abs(x) < TAU / 700) fpts.push(null); fpts.push([x, sig.f(x)]); }
    drawCurve(ctx, T, fpts, { color: cssVar('--c-signal'), lineWidth: 1.8, alpha: 0.6 });
    drawCurve(ctx, T, sampleFn((x) => partialSum(sig, n, x), -PI, PI, 800), { color: cssVar('--c-approx'), lineWidth: 2, alpha: 0.9 });
    drawCurve(ctx, T, sampleFn((x) => fejerSum(sig, n, x), -PI, PI, 800), { color: cssVar('--c-com'), lineWidth: 2.6, glow: 6 });
  }, [sigId, n]);

  return (
    <Viz
      title="Sₙ против σₙ" tag="Теорема 8"
      formula="σₙ = (S₀+…+Sₙ)/(n+1)"
      legend={[{ c: cssVar('--c-signal'), t: 'f' }, { c: cssVar('--c-approx'), t: 'Sₙ (дёргается)' }, { c: cssVar('--c-com'), t: 'σₙ (Фейер)' }]}
      controls={
        <React.Fragment>
          <ButtonGroup label="функция" columns={3} value={sigId} setValue={setSigId}
            options={[{ value: 'meander', label: 'меандр' }, { value: 'saw', label: 'пила' }, { value: 'triangle', label: 'треуг.' }]} />
          <Slider label="n" value={n} setValue={setN} min={1} max={50} step={1} />
        </React.Fragment>
      }
      note={<span>$\sigma_n$ не выходит за диапазон функции (нет овершута Гиббса) и сходится равномерно для любой непрерывной $f$; $S_n$ — «дёргается». Сравни на меандре.</span>}
      steps={[
        '<span class="em-apx">$S_n$</span> (циан) — обычная частичная сумма ряда Фурье; у скачка она дёргается и перелетает (Гиббс).',
        '<span class="em">$\\sigma_n$</span> (зелёная) — это <b>среднее</b> первых сумм: $\\sigma_n=\\dfrac{S_0+S_1+\\dots+S_n}{n+1}$.',
        'Усреднение «успокаивает» осцилляции — $\\sigma_n$ <b>не вылезает</b> за диапазон значений $f$.',
        'Переключись на меандр: у $\\sigma_n$ <b>нет</b> усика Гиббса, кривая аккуратная.',
        'Теорема Фейера: для <b>любой</b> непрерывной $f$ суммы $\\sigma_n$ сходятся к ней равномерно — даже там, где $S_n$ расходится.',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

// ================= 1.8 — догнать любую непрерывную =================
// целевая непрерывная функция (со склейкой концов): «волнистый треугольник»
function targetW(x) { const u = wrap(x); return Math.abs(u) / PI + 0.35 * Math.cos(2 * u) - 0.35; }
function bernstein(N, x) { // алгебраическое приближение на [-π,π]
  const u = (x + PI) / TAU; let s = 0, logC = 0;
  // iterative binomial weighting
  let term = Math.pow(1 - u, N);
  for (let k = 0; k <= N; k++) {
    if (k > 0) term *= (u / (1 - u)) * (N - k + 1) / k;
    s += targetW(-PI + TAU * k / N) * term;
  }
  return s;
}

function WeierstrassChase() {
  const [mode, setMode] = useState('trig'); // trig | alg
  const [N, setN] = useState(6);
  // trig: use σ_N of targetW computed numerically
  const trigCoef = useMemo(() => {
    if (mode !== 'trig') return null;
    const a = [], b = [], K = Math.max(2, N);
    for (let k = 0; k <= K; k++) {
      a.push(integrate((t) => targetW(t) * Math.cos(k * t), -PI, PI, 800) / PI);
      b.push(integrate((t) => targetW(t) * Math.sin(k * t), -PI, PI, 800) / PI);
    }
    return { a, b, K };
  }, [mode, N]);
  const trigApprox = (x) => {
    const { a, b, K } = trigCoef; let s = a[0] / 2;
    for (let k = 1; k <= K; k++) { const wgt = 1 - k / (K + 1); s += wgt * (a[k] * Math.cos(k * x) + b[k] * Math.sin(k * x)); }
    return s;
  };
  const g = (x) => mode === 'trig' ? trigApprox(x) : bernstein(N, x);
  const maxErr = useMemo(() => { let mx = 0; for (let i = 0; i <= 400; i++) { const x = -PI + TAU * i / 400; mx = Math.max(mx, Math.abs(targetW(x) - g(x))); } return mx; }, [mode, N, trigCoef]);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -0.8, yMax: 1.25, W, H, padL: 34, padB: 24, padT: 12 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 0.5 });
    drawCurve(ctx, T, sampleFn(targetW, -PI, PI, 700), { color: cssVar('--c-signal'), lineWidth: 2.4, alpha: 0.85 });
    drawCurve(ctx, T, sampleFn(g, -PI, PI, 700), { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 6 });
  }, [mode, N, trigCoef]);

  return (
    <Viz
      title="Догнать любую непрерывную" tag="Т10 / Т11"
      formula="max|f − приближение| → 0"
      legend={[{ c: cssVar('--c-signal'), t: 'непрерывная f' }, { c: cssVar('--c-approx'), t: 'приближение' }]}
      readout={<React.Fragment>
        <span><span className="k">степень N</span> <span className="v">{N}</span></span>
        <span><span className="k">max|f−P|</span> <span className="v com">{maxErr.toFixed(4)}</span></span>
      </React.Fragment>}
      controls={
        <React.Fragment>
          <ButtonGroup label="тип многочлена" columns={2} value={mode} setValue={setMode}
            options={[{ value: 'trig', label: 'тригоном. T=σₙ' }, { value: 'alg', label: 'алгебр. P (Бернштейн)' }]} />
          <Slider label="степень N" value={N} setValue={setN} min={1} max={mode === 'alg' ? 40 : 20} step={1} />
        </React.Fragment>
      }
      note={<span>С ростом степени равномерная ошибка $\to0$. <b>Т10:</b> $T=\sigma_N$ по Фейеру; <b>Т11:</b> многочлен Бернштейна — конструктивное доказательство для отрезка.</span>}
      steps={[
        'Берём произвольную <span class="em-sig">непрерывную $f$</span> со склейкой концов (жёлтая).',
        'Режим «тригоном.»: <span class="em-apx">приближение</span> — это сумма Фейера $\\sigma_N$ функции $f$ (она и есть тригонометрический многочлен).',
        'Режим «алгебр.»: приближение — многочлен Бернштейна степени $N$, собранный из значений $f$ в равноотстоящих узлах.',
        'Крути степень $N$: циановое приближение прижимается к жёлтой, $\\max|f-P|\\to 0$ (число в табло падает).',
        'Это и есть конструктивные доказательства: Теорема 10 (тригонометрическая, через Фейера) и Теорема 11 (алгебраическая, через Бернштейна).',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

Object.assign(window, {
  RiemannCancellation, Staircase, MidpointConvergence, GibbsCloseup,
  DecaySpectrum, DiffMultiply, UniformVsPointwise, DirichletVsFejer, SnVsSigma, WeierstrassChase,
});
