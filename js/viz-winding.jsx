/* =====================================================
   viz-winding.jsx — 1.1 ФЛАГМАН: машина намотки + ортогональность
   ===================================================== */

const WIND_PRESETS = {
  cos2:   { label: 'cos 2x',           comps: [{ freq: 2, cos: 1 }] },
  mix:    { label: 'cos 2x + ½cos 3x', comps: [{ freq: 2, cos: 1 }, { freq: 3, cos: 0.5 }] },
  sinmix: { label: 'cos x + sin 4x',   comps: [{ freq: 1, cos: 1 }, { freq: 4, sin: 0.7 }] },
  meander:{ label: 'меандр',           meander: true },
};

function WindingMachine() {
  const reduce = prefersReducedMotion();
  const [presetId, setPresetId] = useState('mix');
  const [omega, setOmega] = useState(1);
  const [snap, setSnap] = useState(false);
  const [playing, setPlaying] = useState(false);

  const preset = WIND_PRESETS[presetId];
  const f = useMemo(() => preset.meander ? SIGNALS.meander.f : buildSignal(preset.comps), [presetId]);
  const w = snap ? Math.round(omega) : omega;

  // plane extent
  const A = useMemo(() => {
    let m = 0; for (let i = 0; i <= 200; i++) m = Math.max(m, Math.abs(f(-PI + TAU * i / 200)));
    return Math.max(1.2, m * 1.18);
  }, [presetId]);

  // spectrum samples
  const spectrum = useMemo(() => {
    const arr = [];
    for (let i = 0; i <= 320; i++) { const ww = 8 * i / 320; const c = windingCOM(f, ww, 600); arr.push({ w: ww, re: c.re, mag: c.mag }); }
    return arr;
  }, [presetId]);
  const stems = useMemo(() => {
    const s = []; for (let k = 0; k <= 8; k++) { const c = windingCOM(f, k, 600); s.push({ x: k, y: c.re, mag: c.mag }); } return s;
  }, [presetId]);

  // sweep omega when playing
  useAnimLoop((dt) => {
    setOmega((o) => { let n = o + dt * 0.9; if (n > 8) n = 0; return n; });
  }, playing && !reduce);

  const com = windingCOM(f, w, 700);

  // ---- top canvas: f(t) | winding plane ----
  const topRef = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const gap = 14;
    const leftW = Math.min(W * 0.46, H * 1.3);
    // left: f(t)
    const TL = makeTransform({ xMin: -PI, xMax: PI, yMin: -A, yMax: A, W: leftW, H, padL: 34, padB: 24, padT: 12, padR: 8 });
    drawAxes(ctx, TL, { xLabel: 't', yTick: A > 2 ? 1 : 0.5 });
    drawCurve(ctx, TL, sampleFn(f, -PI, PI, 600), { color: cssVar('--c-signal'), lineWidth: 2.4, glow: 6 });
    ctx.fillStyle = cssVar('--muted'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('f(t)', 6, 6);

    // right: complex plane
    const planeX0 = leftW + gap;
    const planeW = W - planeX0;
    const cx = planeX0 + planeW / 2, cy = H / 2;
    const scale = (Math.min(planeW, H) / 2 - 22) / A;
    // grid: unit circles + axes
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1;
    for (let r = 0.5; r <= A; r += 0.5) { ctx.globalAlpha = 0.5; ctx.beginPath(); ctx.arc(cx, cy, r * scale, 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.strokeStyle = cssVar('--hair'); ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(planeX0 + 6, cy); ctx.lineTo(W - 6, cy); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx, 10); ctx.lineTo(cx, H - 10); ctx.stroke();

    // wound curve g(t) = f(t) e^{-iωt}, gradient by t
    const c1 = [138, 180, 255], c2 = [255, 93, 143];
    const Npts = 600; let prev = null;
    ctx.lineWidth = 2;
    for (let i = 0; i <= Npts; i++) {
      const t = -PI + TAU * i / Npts;
      const val = f(t);
      const gx = val * Math.cos(w * t), gy = val * Math.sin(-w * t);
      const X = cx + gx * scale, Y = cy - gy * scale;
      if (prev) {
        const tt = i / Npts; const col = lerpColor(c1, c2, tt);
        ctx.strokeStyle = `rgba(${col[0]},${col[1]},${col[2]},0.85)`;
        ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(X, Y); ctx.stroke();
      }
      prev = [X, Y];
    }
    // COM vector + dot (green) — magnified ring for visibility
    const comX = cx + com.re * scale, comY = cy - com.im * scale;
    ctx.strokeStyle = cssVar('--c-com'); ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    ctx.shadowColor = cssVar('--c-com'); ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(comX, comY); ctx.stroke();
    ctx.fillStyle = cssVar('--c-com'); ctx.beginPath(); ctx.arc(comX, comY, 5, 0, TAU); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = cssVar('--muted'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText(`намотка частотой ω = ${w.toFixed(2)}`, planeX0 + 8, 8);
  }, [presetId, omega, snap, A]);

  // ---- bottom canvas: spectrum |COM(ω)| — пики стоят ровно на частотах сигнала ----
  const specRef = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    let maxY = 0.05; for (const s of spectrum) maxY = Math.max(maxY, s.mag);
    maxY *= 1.18;
    const T = makeTransform({ xMin: -0.2, xMax: 8.2, yMin: 0, yMax: maxY, W, H, padL: 38, padB: 26, padT: 18 });
    drawAxes(ctx, T, { xLabel: 'ω', xTick: 1, xFmt: (x) => Math.round(x).toString(), yTick: maxY > 0.4 ? 0.25 : 0.1 });
    // непрерывная |COM(ω)|: высота = «сколько в сигнале частоты ω»
    drawCurve(ctx, T, spectrum.map(s => [s.w, s.mag]), { color: cssVar('--c-approx'), lineWidth: 2.4, glow: 6 });
    // целые отсчёты = |c_k| (дискретный спектр): ненулевые РОВНО на частотах сигнала
    drawStems(ctx, T, stems.map(s => ({ x: s.x, y: s.mag })), { color: cssVar('--c-com'), dotR: 3.6, lineWidth: 2 });
    // подпись частоты над каждым присутствующим пиком
    ctx.fillStyle = cssVar('--c-com'); ctx.font = '10.5px "IBM Plex Mono", monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
    for (const s of stems) { if (s.mag > maxY * 0.05) ctx.fillText('k=' + s.x, T.X(s.x), T.Y(s.mag) - 6); }
    // где сейчас стоит ползунок ω (сплошная линия с подписью)
    ctx.strokeStyle = cssVar('--c-signal'); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(T.X(w), T.padT); ctx.lineTo(T.X(w), H - T.padB); ctx.stroke();
    ctx.fillStyle = cssVar('--c-signal'); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('ω', T.X(w) + 4, T.padT - 4);
    ctx.fillStyle = cssVar('--muted'); ctx.font = '10px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('— |COM(ω)|: пики = частоты сигнала    ● на целых ω = |cₖ|', 44, 4);
  }, [presetId, omega, snap]);

  return (
    <Viz
      title="Машина намотки" tag="флагман"
      formula="COM(ω) = 1/2π ∫ f(t)e^{−iωt} dt"
      legend={[{ c: cssVar('--c-signal'), t: 'f(t)' }, { c: cssVar('--c-kernel'), t: 'намотанная кривая' }, { c: cssVar('--c-com'), t: 'центр масс = cₖ' }, { c: cssVar('--c-approx'), t: '|COM(ω)| — спектр' }]}
      readout={
        <React.Fragment>
          <span><span className="k">ω</span> <span className="v">{w.toFixed(2)}</span></span>
          <span><span className="k">Re COM</span> <span className="v com">{com.re.toFixed(3)}</span></span>
          <span><span className="k">|COM|</span> <span className="v com">{com.mag.toFixed(3)}</span></span>
          {Math.abs(w - Math.round(w)) < 1e-6 && <span className="v com">↑ это c_{Math.round(w)}</span>}
        </React.Fragment>
      }
      controls={
        <React.Fragment>
          <ButtonGroup label="сигнал" columns={4} value={presetId} setValue={setPresetId}
            options={Object.entries(WIND_PRESETS).map(([k, v]) => ({ value: k, label: v.label }))} />
          <div className="row">
            <Slider label="частота намотки ω" value={omega} setValue={setOmega} min={0} max={8} step={snap ? 1 : 0.01} />
            <Toggle label="привязать ω к целым" value={snap} setValue={setSnap} />
            {!reduce && <PlayButton playing={playing} setPlaying={setPlaying} labels={['Стоп', 'Развернуть спектр']} />}
          </div>
        </React.Fragment>
      }
      note={<span>Пока <b>ω</b> не совпало с частотой сигнала — центр масс почти в нуле (намотка усредняется в точку). Как только <b>ω = частоте</b>, он «выезжает». Нижний график — длина центра масс по частоте ω: его <b>пики стоят ровно на частотах, из которых сложен сигнал</b> (проверь на меандре — пики на нечётных 1, 3, 5, …). На целых ω = k значения равны коэффициентам $|c_k|$ — зелёные линии.</span>}
      steps={[
        'Слева — <span class="em-sig">сам сигнал $f(t)$</span> на периоде $[-\\pi,\\pi]$. Его и хотим «разобрать» на частоты.',
        '«Наматываем» сигнал на комплексную плоскость: момент $t$ кладём под углом $-\\omega t$ на расстоянии $f(t)$ от центра — это и есть точка $f(t)\\,e^{-i\\omega t}$. Цвет вдоль <span class="em-ker">намотанной кривой</span> показывает течение времени $t$.',
        '<b>Частота намотки $\\omega$</b> — сколько оборотов сигнал делает за период. Крути ползунок и смотри, как кривая перематывается.',
        '<span class="em">Зелёная стрелка</span> — <b>центр масс</b> намотки, то есть среднее всех её точек. <b>Это дословно формула коэффициента:</b> $\\mathrm{COM}(\\omega)=\\tfrac1{2\\pi}\\int_{-\\pi}^{\\pi} f(t)\\,e^{-i\\omega t}\\,dt$.',
        'Если $\\omega$ «не та» — витки ложатся симметрично вокруг нуля, плюсы и минусы взаимно гасятся, и <span class="em">центр масс $\\approx 0$</span>.',
        'Как только $\\omega$ совпала с частотой, спрятанной в сигнале, одинаковые фазы складываются — намотка «застывает» с перекосом, и <span class="em">центр масс выезжает из нуля</span>.',
        'Нижний график — длина центра масс $|\\mathrm{COM}(\\omega)|$ при каждой $\\omega$. <b>Его пики стоят ровно на частотах, из которых состоит сигнал.</b> На <b>целых</b> $\\omega=k$ значение равно $|c_k|$ — это дискретный спектр (зелёные линии). Между целыми кривая слегка «звенит» (sinc) из-за конечного периода — мост к непрерывному преобразованию (блок 4). Жми «Развернуть спектр».',
      ]}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <canvas ref={topRef} style={{ height: 300 }} />
        <div style={{ borderTop: '1px solid var(--hair)' }}>
          <canvas ref={specRef} style={{ height: 170, width: '100%', display: 'block' }} />
        </div>
      </div>
    </Viz>
  );
}

// ---------- Ортогональность ----------
function Orthogonality() {
  const [m, setM] = useState(2);
  const [n, setN] = useState(3);
  const [pair, setPair] = useState('cc'); // cc, ss, sc

  const prod = (x) => {
    if (pair === 'cc') return Math.cos(m * x) * Math.cos(n * x);
    if (pair === 'ss') return Math.sin(m * x) * Math.sin(n * x);
    return Math.sin(m * x) * Math.cos(n * x);
  };
  const integral = integrate(prod, -PI, PI, 1200);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -1.15, yMax: 1.15, W, H, padL: 34, padB: 24, padT: 12 });
    drawSignedArea(ctx, T, prod, -PI, PI, { alpha: 0.42, n: 600 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 0.5 });
    drawCurve(ctx, T, sampleFn(prod, -PI, PI, 700), { color: cssVar('--c-signal'), lineWidth: 2.2, glow: 5 });
  }, [m, n, pair]);

  const isZero = Math.abs(integral) < 1e-3;
  return (
    <Viz
      title="Ортогональность" tag="анализ"
      formula="∫ φₘ φₙ dx"
      legend={[{ c: cssVar('--c-com'), t: 'площадь +' }, { c: cssVar('--c-warn'), t: 'площадь −' }]}
      readout={
        <React.Fragment>
          <span><span className="k">∫₋π^π</span> <span className={`v ${isZero ? 'com' : 'warn'}`}>{integral.toFixed(3)}</span></span>
          <span className="k">{isZero ? '= 0 → ортогональны' : `= π → одна гармоника (m=n)`}</span>
        </React.Fragment>
      }
      controls={
        <React.Fragment>
          <ButtonGroup label="пара" columns={3} value={pair} setValue={setPair}
            options={[{ value: 'cc', label: 'cos·cos' }, { value: 'ss', label: 'sin·sin' }, { value: 'sc', label: 'sin·cos' }]} />
          <div className="row">
            <Slider label="m" value={m} setValue={setM} min={1} max={6} step={1} />
            <Slider label="n" value={n} setValue={setN} min={1} max={6} step={1} />
          </div>
        </React.Fragment>
      }
      note={<span>При $m\ne n$ суммарная площадь $=0$ (ортогональность); при $m=n$ — положительна ($=\pi$). Поэтому формула для $c_k$ извлекает <b>ровно одну</b> гармонику.</span>}
      steps={[
        'Берём две гармоники $\\varphi_m,\\varphi_n$ из тригонометрической системы (оба косинусы, оба синусы, или синус с косинусом) и <b>перемножаем</b> их поточечно.',
        '<span class="em-sig">Жёлтая кривая</span> — произведение $\\varphi_m\\cdot\\varphi_n$. <span class="em">Зелёным</span> закрашена площадь выше оси, <span style="color:var(--c-warn)">оранжевым</span> — ниже; интеграл $\\int_{-\\pi}^{\\pi}$ — это (зелёная) минус (оранжевая).',
        '<b>Главный фокус — формулы «произведение в сумму».</b> $\\cos mx\\cos nx=\\tfrac12\\big[\\cos(m{-}n)x+\\cos(m{+}n)x\\big]$, а $\\sin mx\\sin nx=\\tfrac12\\big[\\cos(m{-}n)x-\\cos(m{+}n)x\\big]$. Любое такое произведение распадается на две <b>чистые волны</b> $\\cos(m{\\pm}n)x$.',
        'А у чистой волны $\\cos kx$ при <b>целом $k\\ne0$</b> за период ровно поровну «плюса» и «минуса»: $\\int_{-\\pi}^{\\pi}\\cos kx\\,dx=0$. Значит при $m\\ne n$ обе волны $\\cos(m{\\pm}n)x$ дают ноль → интеграл $=0$. Это и есть <b>ортогональность</b>.',
        'При $m=n$ слагаемое $\\cos(m{-}n)x=\\cos0=1$ — <b>постоянное</b>, оно не самосокращается: $\\cos^2 mx=\\tfrac12(1+\\cos 2mx)$ и $\\int_{-\\pi}^{\\pi}\\tfrac12\\,dx=\\pi$. Площадь $=\\pi\\ne0$ — гармоника «совпала сама с собой».',
        '<b>Пара $\\sin mx\\cos nx$ — особый случай:</b> это <b>нечётная</b> функция, поэтому $\\int_{-\\pi}^{\\pi}=0$ <b>всегда</b>, даже при $m=n$. Вот почему синусы и косинусы взаимно ортогональны — и формула для $c_k$ извлекает вклад <b>ровно одной</b> гармоники, обнуляя все остальные.',
      ]}
    >
      <canvas ref={ref} style={{ height: 260 }} />
    </Viz>
  );
}

Object.assign(window, { WindingMachine, Orthogonality });
