/* =====================================================
   viz-dirichlet.jsx — 1.3: ядро Дирихле, свёртка-прожектор, локализация
   ===================================================== */

// ---------- Ядро Дирихле (Рис. 1) ----------
function DirichletKernel() {
  const [n, setN] = useState(5);
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const peak = n + 0.5;
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -2.2, yMax: Math.max(3, peak * 1.1), W, H, padL: 36, padB: 24, padT: 12 });
    // fill area (signed) faint to show alternation
    drawSignedArea(ctx, T, (t) => dirichlet(n, t), -PI, PI, { alpha: 0.16, n: 700,
      posColor: cssVar('--c-kernel'), negColor: cssVar('--c-warn') });
    drawAxes(ctx, T, { xLabel: 't', yTick: peak > 8 ? 4 : 2 });
    drawCurve(ctx, T, sampleFn((t) => dirichlet(n, t), -PI, PI, 900), { color: cssVar('--c-kernel'), lineWidth: 2.4, glow: 7 });
    // peak marker
    drawDot(ctx, T, 0, peak, { color: cssVar('--c-kernel'), r: 3.5, glow: 6 });
    ctx.fillStyle = cssVar('--muted'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText(`пик ≈ n+½ = ${peak.toFixed(1)}`, T.X(0), T.Y(peak) - 8);
  }, [n]);

  return (
    <Viz
      title="Ядро Дирихле" tag="Рис. 1"
      formula="Dₙ(t) = sin((n+½)t) / (2 sin t/2)"
      legend={[{ c: cssVar('--c-kernel'), t: 'Dₙ(t)' }]}
      controls={<Slider label="n" value={n} setValue={setN} min={1} max={30} step={1} />}
      note={<span>Центральный пик растёт как $n+\tfrac12$, появляются осциллирующие боковые лепестки, но <b>площадь фиксирована</b> ($\int=\pi$). Знакопеременность $\Rightarrow$ $S_n$ не обязана сходиться для непрерывной $f$ — дальше нужен Фейер (1.7).</span>}
      steps={[
        'Ядро $D_n$ — это «сжатая в формулу» сумма косинусов $\\tfrac12+\\cos t+\\cos 2t+\\dots+\\cos nt$.',
        'В нуле все косинусы равны $1$ и складываются → острый <span class="em-ker">пик высотой $n+\\tfrac12$</span>. Крути $n$.',
        'В стороне косинусы расходятся по фазе и гасят друг друга → осцилляции, которые <b>заходят в минус</b> (оранжевые зоны).',
        'Какой бы ни была $n$, <b>площадь под ядром фиксирована</b>: $\\int_{-\\pi}^{\\pi}D_n=\\pi$.',
        'Именно <b>знакопеременность</b> — корень будущих бед: свёртка с таким ядром может «не сойтись». Лечение — ядро Фейера в 1.7.',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

// ---------- Свёртка-прожектор ----------
function ConvolutionSpotlight() {
  const reduce = prefersReducedMotion();
  const [sigId, setSigId] = useState('triangle');
  const [n, setN] = useState(8);
  const [xpos, setXpos] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const sig = SIGNALS[sigId];

  useAnimLoop((dt) => { setXpos((x) => { let nx = x + dt * 1.4; if (nx > PI) nx = -PI; return nx; }); }, playing && !reduce);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const [ylo, yhi] = sig.range;
    const span = Math.max(Math.abs(ylo), Math.abs(yhi), 1.5);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -span * 1.1, yMax: span * 1.15, W, H, padL: 34, padB: 24, padT: 12 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: span > 2 ? 1 : 0.5 });
    // f
    drawCurve(ctx, T, sampleFn((x) => sig.f(x), -PI, PI, 700), { color: cssVar('--c-signal'), lineWidth: 2.2, alpha: 0.8 });
    // sliding kernel D_n(x - t), scaled to fit
    const kScale = span * 0.5 / (n + 0.5);
    const kpts = [];
    for (let i = 0; i <= 600; i++) { const t = -PI + TAU * i / 600; kpts.push([t, dirichlet(n, xpos - t) * kScale]); }
    drawCurve(ctx, T, kpts, { color: cssVar('--c-kernel'), lineWidth: 1.8, alpha: 0.85 });
    // spotlight band near xpos
    ctx.fillStyle = 'rgba(255,93,143,0.08)';
    const bw = T.dxToPx(Math.PI / (n + 0.5)) * 2;
    ctx.fillRect(T.X(xpos) - bw / 2, T.padT, bw, H - T.padT - T.padB);
    // S_n revealed up to xpos
    const spts = [];
    for (let i = 0; i <= 600; i++) { const x = -PI + (xpos + PI) * i / 600; spts.push([x, partialSum(sig, n, x)]); }
    drawCurve(ctx, T, spts, { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 6 });
    // current point dot on S_n
    drawDot(ctx, T, xpos, partialSum(sig, n, xpos), { color: cssVar('--c-approx'), r: 4.5, glow: 7 });
    ctx.strokeStyle = cssVar('--grid'); ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(T.X(xpos), T.padT); ctx.lineTo(T.X(xpos), H - T.padB); ctx.stroke(); ctx.setLineDash([]);
  }, [sigId, n, xpos]);

  return (
    <Viz
      title="Свёртка-прожектор" tag="Теорема 3"
      formula="Sₙ(x) = 1/π ∫ f(x−t) Dₙ(t) dt"
      legend={[{ c: cssVar('--c-signal'), t: 'f' }, { c: cssVar('--c-kernel'), t: 'ядро Dₙ(x−·)' }, { c: cssVar('--c-approx'), t: 'Sₙ строится' }]}
      controls={
        <React.Fragment>
          <ButtonGroup label="функция" columns={3} value={sigId} setValue={setSigId}
            options={[{ value: 'triangle', label: 'треуг.' }, { value: 'meander', label: 'меандр' }, { value: 'parabola', label: 'парабола' }]} />
          <div className="row">
            <Slider label="позиция x" value={xpos} setValue={setXpos} min={-PI} max={PI} step={0.01} fmt={piFormatter} />
            <Slider label="n" value={n} setValue={setN} min={1} max={24} step={1} />
            {!reduce && <PlayButton playing={playing} setPlaying={setPlaying} labels={['Пауза', 'Двигать x']} />}
          </div>
        </React.Fragment>
      }
      note={<span>Ядро «высвечивает» локальное поведение $f$: значение $S_n(x)$ формируется в основном из <b>окрестности точки $x$</b>. Веди прожектор — видно, как сумма собирается точка за точкой.</span>}
      steps={[
        'Теорема 3 переписывает частичную сумму как <b>свёртку</b>: $S_n(x)=\\tfrac1\\pi\\int f(x-t)D_n(t)\\,dt$.',
        '<span class="em-ker">Ядро $D_n$</span> играет роль «прожектора»: на графике оно сдвинуто и стоит ровно над текущей точкой $x$.',
        'Значение $S_n(x)$ = <b>взвешенное среднее</b> сигнала $f$ под этим прожектором (вес = высота ядра).',
        'Двигай ползунок $x$ (или жми «Двигать x») — <span class="em-apx">циановая кривая $S_n$</span> строится точка за точкой.',
        'Прожектор узкий и сосредоточен у $x$ → сумма зависит в основном от <b>окрестности</b> точки. Это прямой путь к принципу локализации.',
      ]}
    >
      <canvas ref={ref} style={{ height: 300 }} />
    </Viz>
  );
}

// ---------- Локализация ----------
function Localization() {
  const [addBump, setAddBump] = useState(false);
  const [n, setN] = useState(14);
  const x0 = -0.9;

  const base = (x) => { const u = wrap(x + 0.9); return Math.exp(-(u * u) / 0.18) * 1.1; };
  const bump = (x) => { const u = wrap(x - 2.1); return Math.exp(-(u * u) / 0.05) * 1.2; };
  const f = (x) => base(x) + (addBump ? bump(x) : 0);

  // numeric S_n via convolution with Dirichlet
  const sn = useMemo(() => {
    const xs = 280, tn = 500;
    const out = [];
    for (let i = 0; i <= xs; i++) {
      const x = -PI + TAU * i / xs;
      let s = 0;
      for (let j = 0; j <= tn; j++) { const t = -PI + TAU * j / tn; const wgt = (j === 0 || j === tn) ? 0.5 : 1; s += wgt * f(x - t) * dirichlet(n, t); }
      out.push([x, s * TAU / tn / PI]);
    }
    return out;
  }, [addBump, n]);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -0.5, yMax: 2.4, W, H, padL: 34, padB: 24, padT: 12 });
    // localization window around x0
    ctx.fillStyle = 'rgba(124,255,107,0.08)';
    const bw = T.dxToPx(1.1);
    ctx.fillRect(T.X(x0) - bw / 2, T.padT, bw, H - T.padT - T.padB);
    drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
    drawCurve(ctx, T, sampleFn(f, -PI, PI, 700), { color: cssVar('--c-signal'), lineWidth: 2.2, alpha: 0.8 });
    drawCurve(ctx, T, sn, { color: cssVar('--c-approx'), lineWidth: 2.6, glow: 6 });
    // x0 marker
    ctx.strokeStyle = cssVar('--c-com'); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(T.X(x0), T.padT); ctx.lineTo(T.X(x0), H - T.padB); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = cssVar('--c-com'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'center';
    ctx.fillText('x₀', T.X(x0), T.Y(2.4) + 2);
  }, [addBump, n]);

  return (
    <Viz
      title="Локализация" tag="Теорема 5"
      formula=""
      legend={[{ c: cssVar('--c-signal'), t: 'f' }, { c: cssVar('--c-approx'), t: 'Sₙ' }, { c: cssVar('--c-com'), t: 'окрестность x₀' }]}
      controls={
        <div className="row">
          <Toggle label="добавить горб вдали от x₀" value={addBump} setValue={setAddBump} />
          <Slider label="n" value={n} setValue={setN} min={4} max={30} step={1} />
        </div>
      }
      note={<span>Горб меняет $S_n$ <b>далеко</b> (справа), но в зелёной окрестности $x_0$ поведение суммы не меняется. Это принцип локализации «вживую»: ряд в точке зависит только от того, что рядом.</span>}
      steps={[
        'Считаем $S_n$ честно — численной свёрткой $f$ с ядром Дирихле (как в Теореме 3).',
        'Включи тумблер «<b>добавить горб вдали</b>» — это подмешивает резкий всплеск справа, <b>далеко</b> от точки $x_0$.',
        'Следи за <span class="em">зелёной окрестностью $x_0$</span>: там <span class="em-apx">$S_n$</span> практически не шевельнулась.',
        'Меняется только сам горб справа — там $S_n$ перестраивается под новый $f$.',
        'Вывод (Теорема 5): сходимость ряда в точке зависит <b>только</b> от поведения $f$ рядом с этой точкой. Далёкие изменения локально не видны.',
      ]}
    >
      <canvas ref={ref} style={{ height: 290 }} />
    </Viz>
  );
}

Object.assign(window, { DirichletKernel, ConvolutionSpotlight, Localization });
