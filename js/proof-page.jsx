/* =====================================================
   proof-page.jsx — рендер страницы доказательства
   + мини-визуализации, специфичные для доказательств
   ===================================================== */

// ---- мини-виз: оценка интеграла индикатора (для T2, шаг 1) ----
function IndicatorBoundViz() {
  const [lam, setLam] = useState(8);
  const a = -1.4, b = 1.1;
  const re = (x) => Math.cos(lam * x), im = (x) => Math.sin(lam * x);
  // integral value
  const I = useMemo(() => {
    if (Math.abs(lam) < 1e-6) return { re: b - a, im: 0 };
    return { re: (Math.sin(lam * b) - Math.sin(lam * a)) / lam, im: -(Math.cos(lam * b) - Math.cos(lam * a)) / lam };
  }, [lam]);
  const mag = Math.hypot(I.re, I.im);

  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -1.25, yMax: 1.25, W, H, padL: 34, padB: 24, padT: 12 });
    // shaded indicator region
    ctx.fillStyle = 'rgba(255,211,77,0.06)';
    ctx.fillRect(T.X(a), T.padT, T.dxToPx(b - a), H - T.padT - T.padB);
    // signed areas of cos under indicator
    drawSignedArea(ctx, T, (x) => (x >= a && x <= b ? re(x) : 0), a, b, { alpha: 0.4, n: 500 });
    drawAxes(ctx, T, { xLabel: 'x', yTick: 0.5 });
    drawCurve(ctx, T, sampleFn(re, a, b, 500), { color: cssVar('--c-approx'), lineWidth: 2, glow: 4 });
    // indicator edges
    ctx.strokeStyle = cssVar('--c-signal'); ctx.lineWidth = 1.6;
    [a, b].forEach(e => { ctx.beginPath(); ctx.moveTo(T.X(e), T.Y(0)); ctx.lineTo(T.X(e), T.Y(1)); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(T.X(a), T.Y(1)); ctx.lineTo(T.X(b), T.Y(1)); ctx.stroke();
  }, [lam]);

  return (
    <Viz
      title="Оценка ∫ e^{iλx} на отрезке" tag="к шагу 1"
      formula="|∫| ≤ 2/|λ|"
      legend={[{ c: cssVar('--c-signal'), t: 'индикатор χ_J' }, { c: cssVar('--c-approx'), t: 'cos λx' }, { c: cssVar('--c-com'), t: '+' }, { c: cssVar('--c-warn'), t: '−' }]}
      readout={<React.Fragment>
        <span><span className="k">λ</span> <span className="v">{lam.toFixed(1)}</span></span>
        <span><span className="k">|∫ χ e^&#123;iλx&#125;|</span> <span className="v com">{mag.toFixed(3)}</span></span>
        <span><span className="k">2/|λ|</span> <span className="v">{(2 / Math.max(0.001, Math.abs(lam))).toFixed(3)}</span></span>
      </React.Fragment>}
      controls={<Slider label="частота λ" value={lam} setValue={setLam} min={0.5} max={40} step={0.1} />}
      note={<span>Площадь под $\cos\lambda x$ на фиксированном отрезке зажата величиной $2/|\lambda|$ и тает с ростом $\lambda$ — это шаг 1 леммы Римана в чистом виде.</span>}
    >
      <canvas ref={ref} style={{ height: 240 }} />
    </Viz>
  );
}

// ---- мини-виз: суммирование геометрической прогрессии векторов (для L3 / L6) ----
function GeomSumViz() {
  const [n, setN] = useState(6);
  const [t, setT] = useState(0.6);
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H);
    const cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H) * 0.13;
    // chain of unit vectors e^{ikt}, k=0..n (tip to tail), scaled
    ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(20, cy); ctx.lineTo(W - 20, cy); ctx.stroke();
    let px = cx - (n * R * Math.cos(0)) / 2, py = cy + 40;
    const startX = px, startY = py;
    for (let k = 0; k <= n; k++) {
      const ang = k * t;
      const nx = px + R * Math.cos(ang), ny = py - R * Math.sin(ang);
      drawVector(ctx, { X: x => x, Y: y => y, dxToPx: d => d }, px, py, nx, ny, { color: cssVar('--c-approx'), lineWidth: 1.8, head: 6 });
      px = nx; py = ny;
    }
    // resultant
    drawVector(ctx, { X: x => x, Y: y => y, dxToPx: d => d }, startX, startY, px, py, { color: cssVar('--c-com'), lineWidth: 2.4, head: 9, glow: 6 });
    ctx.fillStyle = cssVar('--muted'); ctx.font = '11px "IBM Plex Mono", monospace'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillText('цепочка e^{ikt}, k=0…' + n + '  →  сумма (зелёная)', 16, 10);
  }, [n, t]);

  return (
    <Viz
      title="Сумма прогрессии векторов" tag="к выводу формулы"
      formula="Σ e^{ikt} = (e^{(n+1)it}−1)/(e^{it}−1)"
      legend={[{ c: cssVar('--c-approx'), t: 'слагаемые e^{ikt}' }, { c: cssVar('--c-com'), t: 'сумма' }]}
      controls={<div className="row">
        <Slider label="число членов n" value={n} setValue={setN} min={1} max={16} step={1} />
        <Slider label="угол t" value={t} setValue={setT} min={0.05} max={1.4} step={0.01} />
      </div>}
      note={<span>{'Слагаемые $e^{ikt}$ — единичные векторы, повёрнутые на $kt$. Их сумма «голова к хвосту» сворачивается замкнутой формулой — отсюда и берётся компактный вид ядер Дирихле и Фейера.'}</span>}
    >
      <canvas ref={ref} style={{ height: 240 }} />
    </Viz>
  );
}

const PROOF_VIZ = {
  IndicatorBoundViz, GeomSumViz,
};
// какие мини-визы показывать в каких доказательствах
const PROOF_EXTRA_VIZ = {
  T2: 'IndicatorBoundViz',
  L3: 'GeomSumViz',
  L6: 'GeomSumViz',
};

function ProofPage({ id }) {
  const p = ALL_PROOFS[id];
  if (!p) return <div className="proof"><p>Доказательство не найдено.</p></div>;
  const ExtraViz = PROOF_EXTRA_VIZ[id] ? PROOF_VIZ[PROOF_EXTRA_VIZ[id]] : null;
  // link to the related section interactive (kept as a link, not embedded, to keep proof pages light)
  const related = p.related && p.related.label ? p.related : null;

  return (
    <div className="proof">
      <div className="proof-head rise">
        <div className="proof-eyebrow">
          <span className="proof-kicker">{p.kicker}</span>
          <span className="ticket-badge">раздел {window.CONTENT[p.sec] ? window.CONTENT[p.sec].num : p.sec} · {p.secTitle}</span>
        </div>
        <h1 className="proof-title">{p.title}</h1>
      </div>

      <div className="proof-block rise" style={{ animationDelay: '.05s' }}>
        <div className="proof-statement">
          <div className="pl">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
            Что доказываем
          </div>
          <div className="pbody" dangerouslySetInnerHTML={{ __html: p.statement }} />
        </div>
      </div>

      {p.idea ? (
        <div className="proof-block rise" style={{ animationDelay: '.08s' }}>
          <div className="proof-idea">
            <span className="ic"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36-.7-.7M6.34 6.34l-.7-.7m12.72 0-.7.7M6.34 17.66l-.7.7"/><circle cx="12" cy="12" r="4"/></svg></span>
            <span className="it" dangerouslySetInnerHTML={{ __html: '<b>Идея.</b> ' + p.idea }} />
          </div>
        </div>
      ) : null}

      {ExtraViz ? (
        <div className="proof-viz-wrap rise" style={{ animationDelay: '.1s' }}><ExtraViz /></div>
      ) : null}

      <div className="proof-section-label">Доказательство по шагам</div>
      <div className="proof-steps">
        {p.steps.map((s, i) => (
          <div className="proof-step rise" key={i} style={{ animationDelay: `${0.04 * i}s` }}>
            <span className="psn">{i + 1}</span>
            <div className="pcontent">
              <div className="pmove" dangerouslySetInnerHTML={{ __html: s.move }} />
              {s.why ? (
                <div className="pwhy">
                  <span className="wl">Откуда / почему</span>
                  <span dangerouslySetInnerHTML={{ __html: s.why }} />
                </div>
              ) : null}
              {s.reveal ? <Reveal label="Разобрать подробнее" html={s.reveal} /> : null}
            </div>
          </div>
        ))}
      </div>

      {p.qed ? (
        <div className="proof-qed rise">
          <span className="box"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
          <span className="qt" dangerouslySetInnerHTML={{ __html: '<b>Что мы получили. </b>' + p.qed }} />
        </div>
      ) : null}

      {related ? (
        <a className="proof-link" href={`#${p.sec}`} style={{ marginTop: 18 }}>
          <span className="plicon">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          </span>
          <span className="plmeta">
            <span className="plnum">Посмотреть вживую</span>
            <span className="pltitle">{related.label}</span>
          </span>
        </a>
      ) : null}
    </div>
  );
}

Object.assign(window, { ProofPage, IndicatorBoundViz, GeomSumViz });
