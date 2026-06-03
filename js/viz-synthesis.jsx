/* =====================================================
   viz-synthesis.jsx — 1.0: сборка волны, эпициклы, hero
   ===================================================== */

// ---------- Интерактив A: «Сборка волны» (частичные суммы) ----------
function WaveAssembly() {
  const [sigId, setSigId] = useState('meander');
  const [N, setN] = useState(7);
  const [playing, setPlaying] = useState(false);
  const growRef = useRef(N);
  const reduce = prefersReducedMotion();

  const sig = SIGNALS[sigId];
  // animate N upward
  useAnimLoop((dt) => {
    growRef.current += dt * 9;
    if (growRef.current > 60) growRef.current = 1;
    setN(Math.max(1, Math.round(growRef.current)));
  }, playing && !reduce);

  const canvasRef = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const [ylo, yhi] = sig.range;
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: ylo, yMax: yhi, W, H, padL: 38, padB: 26, padT: 14 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: sig.id === 'parabola' ? 3 : 1 });
    // f (yellow) — draw with breaks at jumps
    const fpts = [];
    const n = 700;
    for (let i = 0; i <= n; i++) {
      const x = -PI + TAU * i / n;
      if ((sig.id === 'meander' || sig.id === 'saw') && Math.abs(Math.abs(x) - PI) < 1e-6) fpts.push(null);
      fpts.push([x, sig.f(x)]);
      if (sig.id === 'meander' && Math.abs(x) < TAU / n) fpts.push(null);
    }
    drawCurve(ctx, T, fpts, { color: cssVar('--c-signal'), lineWidth: 2.4, alpha: 0.85 });
    // S_N (cyan)
    const spts = sampleFn((x) => partialSum(sig, N, x), -PI, PI, 700);
    drawCurve(ctx, T, spts, { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 8 });
  }, [sigId, N]);

  return (
    <Viz
      title="Сборка волны" tag="синтез"
      formula={`S_${'N'} , N=${N}`}
      legend={[{ c: cssVar('--c-signal'), t: 'функция f' }, { c: cssVar('--c-approx'), t: `частичная сумма S_N` }]}
      controls={
        <React.Fragment>
          <ButtonGroup label="функция" columns={3} value={sigId} setValue={(v) => { setSigId(v); }}
            options={[{ value: 'meander', label: 'меандр' }, { value: 'saw', label: 'пила' }, { value: 'triangle', label: 'треугольник' }]} />
          <div className="row">
            <Slider label="число гармоник N" value={N} setValue={(v) => { setN(v); growRef.current = v; }} min={1} max={60} step={1} />
            {!reduce && <PlayButton playing={playing} setPlaying={setPlaying} labels={['Пауза', 'Наращивать N']} />}
          </div>
        </React.Fragment>
      }
      note={<span>С ростом <b>N</b> приближение всё точнее повторяет функцию. У меандра и пилы возле скачка остаются «усики» — это <b>эффект Гиббса</b>, раскроется в 1.4.</span>}
      steps={[
        'Берём «чистые тоны» — синусы и косинусы с частотами $1,2,3,\\dots$ Это <b>кирпичики</b>, из которых собирается любой периодический сигнал.',
        'У каждой гармоники своя <b>амплитуда</b> — коэффициент Фурье $c_k$. Для меандра живы только нечётные частоты с амплитудой $4/\\pi k$ (откуда — увидишь в 1.1).',
        'Складываем первые $N$ гармоник и получаем <span class="em-apx">частичную сумму $S_N$</span> (циан). Ползунок $N$ добавляет или убирает слагаемые.',
        'Чем больше $N$, тем плотнее <span class="em-apx">$S_N$</span> прижимается к <span class="em-sig">цели $f$</span> (жёлтая). Жми «Наращивать N», чтобы увидеть это в движении.',
        'У скачка навсегда остаётся выброс ~9% — <b>эффект Гиббса</b>. С ростом $N$ он только сужается, но не исчезает.',
      ]}
    >
      <canvas ref={canvasRef} style={{ height: 320 }} />
    </Viz>
  );
}

// ---------- Эпициклы: движок ----------
// сумма векторов A_m·e^{i(2m+1)t}, мнимая часть = меандр
function EpicycleStage() {
  const [wheels, setWheels] = useState(4);
  const [speed, setSpeed] = useState(0.6);
  const [playing, setPlaying] = useState(true);
  const reduce = prefersReducedMotion();
  const trace = useRef([]); // {x:timeFrac, y}
  const phase = useRef(0);

  // build terms for meander: amp 4/(π(2m+1)), freq (2m+1)
  const terms = useMemo(() => {
    const a = [];
    for (let m = 0; m < wheels; m++) { const k = 2 * m + 1; a.push({ freq: k, amp: 4 / (PI * k) }); }
    return a;
  }, [wheels]);

  const ref = useAnimatedCanvas((ctx, W, H, clock) => {
    clearBg(ctx, W, H);
    if (playing && !reduce) phase.current += 0; // clock drives below
    const t = (playing && !reduce) ? clock * speed * 1.4 : phase.current;

    // layout: left = epicycle disc, right = time trace
    const discCX = H * 0.55, discCY = H * 0.5, scale = H * 0.30;
    // axis line
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(discCX, 6); ctx.lineTo(discCX, H - 6); ctx.stroke();

    // draw vector chain (tip-to-tail), vertical proj = Σ amp·sin(freq·t)
    let px = discCX, py = discCY, sumY = 0;
    ctx.lineCap = 'round';
    for (const term of terms) {
      const ang = term.freq * t;
      const r = term.amp * scale;
      const nx = px + r * Math.cos(ang);
      const ny = py - r * Math.sin(ang); // canvas y flipped; sin gives vertical
      // circle
      ctx.strokeStyle = 'rgba(138,180,255,0.18)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke();
      // vector
      ctx.strokeStyle = cssVar('--c-approx'); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      px = nx; py = ny; sumY += term.amp * Math.sin(ang);
    }
    // pen dot
    ctx.fillStyle = cssVar('--c-com'); ctx.shadowColor = cssVar('--c-com'); ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill(); ctx.shadowBlur = 0;

    // record trace: pen height + the exact phase t that produced it. Drawing the
    // target from the same recorded t (instead of an extrapolated t − i/60) keeps
    // the yellow meander locked to the cyan curve regardless of frame rate or
    // speed-slider changes — that was the source of the cyan/target desync.
    const penY = py;
    const traceX0 = discCX + scale + 18;
    trace.current.push({ y: penY, t });
    const maxLen = Math.max(1, Math.floor(W - traceX0));
    if (trace.current.length > maxLen) trace.current.shift();
    const arr = trace.current;
    const newest = arr.length - 1;

    // connector from pen to the newest trace point
    ctx.strokeStyle = 'rgba(124,255,107,0.3)'; ctx.setLineDash([3, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(traceX0, penY); ctx.stroke(); ctx.setLineDash([]);

    // faint yellow target meander — same samples, newest at left (±scale = the ±1 limit)
    ctx.strokeStyle = cssVar('--c-signal'); ctx.globalAlpha = 0.28; ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const s = arr[newest - i];
      const yy = discCY - (Math.sin(s.t) >= 0 ? 1 : -1) * scale;
      if (i === 0) ctx.moveTo(traceX0 + i, yy); else ctx.lineTo(traceX0 + i, yy);
    }
    ctx.stroke(); ctx.globalAlpha = 1;

    // cyan reconstruction trace (newest at left, ages to the right)
    ctx.strokeStyle = cssVar('--c-approx'); ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < arr.length; i++) {
      const x = traceX0 + i;
      if (i === 0) ctx.moveTo(x, arr[newest - i].y);
      else ctx.lineTo(x, arr[newest - i].y);
    }
    ctx.stroke();
    if (!(playing && !reduce)) phase.current = t;
  }, playing && !reduce, [wheels, speed, playing]);

  useEffect(() => { trace.current = []; }, [wheels]);

  return (
    <Viz
      title="Эпициклы" tag="синтез"
      formula="Σ cₖ e^{ikx}"
      legend={[{ c: cssVar('--c-approx'), t: 'вращающиеся векторы' }, { c: cssVar('--c-com'), t: 'перо (сумма)' }, { c: cssVar('--c-signal'), t: 'цель — меандр' }]}
      controls={
        <div className="row">
          <Slider label="число колёс (гармоник)" value={wheels} setValue={setWheels} min={1} max={12} step={1} />
          <Slider label="скорость" value={speed} setValue={setSpeed} min={0.1} max={1.6} step={0.05} />
          {!reduce && <PlayButton playing={playing} setPlaying={setPlaying} />}
        </div>
      }
      note={<span>Каждое колесо — одно слагаемое ряда: длина = амплитуда $c_k$, скорость вращения = частота $k$. Все векторы складываются «голова к хвосту», а вертикальная проекция кончика и есть значение сигнала. Добавляешь колесо — добавляешь гармонику; первое (самое большое) задаёт основной тон, остальные подчищают углы меандра.</span>}
      steps={[
        'Каждое слагаемое ряда рисуется как <span class="em-apx">вектор-стрелка</span>, вращающаяся с постоянной скоростью. <b>Скорость = частота</b> гармоники $k$.',
        '<b>Длина</b> стрелки равна амплитуде этой гармоники $|c_k|$. У меандра первое колесо самое длинное, дальше всё короче.',
        'Стрелки пристыкованы «голова к хвосту» в цепочку: конец одной — начало следующей. Это и есть сумма $\\sum c_k e^{ikx}$.',
        '<b>Высота</b> кончика последней стрелки в каждый момент = текущее значение сигнала.',
        '<span class="em">Перо</span> на кончике тянет след вправо во времени — и из вращения колёс складывается <span class="em-sig">меандр</span>. Больше колёс → чётче углы.',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

// ---------- Hero: эпициклы обводят контур ----------
function makePhiPath() {
  const pts = [];
  // вертикальная черта: вниз и вверх (прорисовка «ножки» Ф)
  for (let i = 0; i <= 40; i++) pts.push([0, 1.25 - 2.5 * i / 40]);
  for (let i = 0; i <= 40; i++) pts.push([0, -1.25 + 2.5 * i / 40]);
  // переход к овалу
  for (let i = 0; i <= 8; i++) pts.push([0 + 0.66 * i / 8, 0.62 * i / 8]);
  // овал (эллипс)
  for (let i = 0; i <= 120; i++) {
    const a = TAU * i / 120;
    pts.push([0.66 * Math.cos(a), 0.86 * Math.sin(a)]);
  }
  for (let i = 0; i <= 8; i++) pts.push([0.66 - 0.66 * i / 8, 0.62 - 0.62 * i / 8]);
  return pts;
}

function epicycleCoeffs(points, N) {
  // resample uniformly to M points
  const M = 512;
  // arc-length resample
  const cum = [0];
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    cum.push(cum[i - 1] + d);
  }
  const total = cum[cum.length - 1] || 1;
  const z = [];
  for (let j = 0; j < M; j++) {
    const target = total * j / M;
    let i = 1; while (i < cum.length && cum[i] < target) i++;
    const i0 = Math.max(1, i);
    const seg = cum[i0] - cum[i0 - 1] || 1;
    const f = (target - cum[i0 - 1]) / seg;
    const p0 = points[i0 - 1], p1 = points[i0];
    z.push([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f]);
  }
  // DFT for n in [-N,N]
  const coeffs = [];
  for (let n = -N; n <= N; n++) {
    let re = 0, im = 0;
    for (let j = 0; j < M; j++) {
      const ang = -TAU * n * j / M;
      const c = Math.cos(ang), s = Math.sin(ang);
      re += z[j][0] * c - z[j][1] * s;
      im += z[j][0] * s + z[j][1] * c;
    }
    coeffs.push({ freq: n, re: re / M, im: im / M });
  }
  // order by |freq| (0, +1, -1, +2, -2, ...)
  coeffs.sort((a, b) => (Math.abs(a.freq) - Math.abs(b.freq)) || (a.freq - b.freq));
  return coeffs;
}

function HeroEpicycles() {
  const reduce = prefersReducedMotion();
  const [playing, setPlaying] = useState(!reduce);
  const trace = useRef([]);
  const coeffs = useMemo(() => epicycleCoeffs(makePhiPath(), 48), []);
  const clockRef = useRef(0);

  const ref = useAnimatedCanvas((ctx, W, H, clock) => {
    clearBg(ctx, W, H, cssVar('--bg'));
    const cx = W / 2, cy = H / 2, scale = Math.min(W, H) * 0.30;
    const t = (playing && !reduce) ? (clockRef.current = clock * 0.34 % 1) : 1;
    const tt = TAU * t;

    // faint guide circle
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(cx, cy, scale * 1.05, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;

    // sum vectors
    let px = cx, py = cy;
    for (const c of coeffs) {
      const ang = c.freq * tt;
      const ca = Math.cos(ang), sa = Math.sin(ang);
      // rotate (re,im) by ang
      const vx = c.re * ca - c.im * sa;
      const vy = c.re * sa + c.im * ca;
      const nx = px + vx * scale;
      const ny = py - vy * scale;
      const r = Math.hypot(vx, vy) * scale;
      if (r > 0.6) {
        ctx.strokeStyle = 'rgba(138,180,255,0.14)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, r, 0, TAU); ctx.stroke();
        ctx.strokeStyle = 'rgba(90,209,230,0.55)'; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(nx, ny); ctx.stroke();
      }
      px = nx; py = ny;
    }
    // record trace
    if (playing && !reduce) {
      trace.current.push([px, py, t]);
      trace.current = trace.current.filter(p => (t - p[2] + 1) % 1 < 0.999);
      if (trace.current.length > 700) trace.current.shift();
    } else if (trace.current.length === 0) {
      // static: precompute full curve
      for (let k = 0; k <= 512; k++) {
        const tk = TAU * k / 512; let qx = cx, qy = cy;
        for (const c of coeffs) {
          const ang = c.freq * tk, ca = Math.cos(ang), sa = Math.sin(ang);
          qx += (c.re * ca - c.im * sa) * scale; qy -= (c.re * sa + c.im * ca) * scale;
        }
        trace.current.push([qx, qy, 0]);
      }
    }
    // draw trace (yellow)
    ctx.strokeStyle = cssVar('--c-signal'); ctx.lineWidth = 3; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.shadowColor = cssVar('--c-signal'); ctx.shadowBlur = 10;
    ctx.beginPath();
    const arr = trace.current;
    for (let i = 0; i < arr.length; i++) { if (i === 0) ctx.moveTo(arr[i][0], arr[i][1]); else ctx.lineTo(arr[i][0], arr[i][1]); }
    ctx.stroke(); ctx.shadowBlur = 0;
    // pen
    if (playing && !reduce) { ctx.fillStyle = cssVar('--c-com'); ctx.beginPath(); ctx.arc(px, py, 4, 0, TAU); ctx.fill(); }
  }, playing && !reduce, [playing]);

  useEffect(() => { trace.current = []; }, [playing]);

  return (
    <div className="hero-canvas-host">
      <canvas ref={ref} />
    </div>
  );
}

Object.assign(window, { WaveAssembly, EpicycleStage, HeroEpicycles });
