/* =====================================================
   coursemap.jsx — карта курса (лендинг) + тизеры блоков 2–5
   ===================================================== */

// ---------- маленькие статичные тизер-иллюстрации ----------
function TeaserViz({ kind }) {
  const ref = useCanvas((ctx, W, H) => {
    clearBg(ctx, W, H, cssVar('--bg-2'));
    const cx = W / 2, cy = H / 2;
    if (kind === 'projection') {
      // вектор и проекция на базис
      const T = makeTransform({ xMin: -0.3, xMax: 2.2, yMin: -0.3, yMax: 1.8, W, H, padL: 30, padB: 24, padT: 14 });
      drawAxes(ctx, T, { xLabel: 'e₁', yLabel: 'e₂', xTick: 1, yTick: 1, xFmt: (x) => x.toFixed(0), yFmt: (y) => y.toFixed(0) });
      drawVector(ctx, T, 0, 0, 1.7, 1.3, { color: cssVar('--c-signal'), lineWidth: 2.4, glow: 5 });
      drawVector(ctx, T, 0, 0, 1.7, 0, { color: cssVar('--c-approx'), lineWidth: 2 });
      drawVector(ctx, T, 0, 0, 0, 1.3, { color: cssVar('--c-approx'), lineWidth: 2 });
      ctx.strokeStyle = cssVar('--c-com'); ctx.setLineDash([4, 3]); ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(T.X(1.7), T.Y(1.3)); ctx.lineTo(T.X(1.7), T.Y(0)); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(T.X(1.7), T.Y(1.3)); ctx.lineTo(T.X(0), T.Y(1.3)); ctx.stroke(); ctx.setLineDash([]);
    } else if (kind === 'family') {
      const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -1.3, yMax: 1.3, W, H, padL: 30, padB: 24, padT: 14 });
      drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
      for (let j = 0; j < 6; j++) {
        const y = j / 5; const col = lerpColor([138, 180, 255], [255, 93, 143], y);
        drawCurve(ctx, T, sampleFn((x) => Math.exp(-x * x * (0.3 + y)) * Math.cos(3 * x), -PI, PI, 300),
          { color: `rgb(${col[0]},${col[1]},${col[2]})`, lineWidth: 1.6, alpha: 0.8 });
      }
    } else if (kind === 'continuous-winding') {
      const T = makeTransform({ xMin: -3, xMax: 3, yMin: -2, yMax: 2, W, H, padL: 30, padB: 24, padT: 14 });
      ctx.strokeStyle = cssVar('--grid'); ctx.lineWidth = 1; ctx.globalAlpha = 0.5;
      ctx.beginPath(); ctx.arc(cx, cy, Math.min(W, H) * 0.32, 0, TAU); ctx.stroke(); ctx.globalAlpha = 1;
      // gaussian spiral winding
      let prev = null; const c1 = [138, 180, 255], c2 = [255, 93, 143];
      for (let i = 0; i <= 400; i++) {
        const t = -3 + 6 * i / 400; const g = Math.exp(-t * t * 0.5);
        const X = T.X(g * Math.cos(t * 4)), Y = T.Y(g * Math.sin(t * 4));
        if (prev) { const col = lerpColor(c1, c2, i / 400); ctx.strokeStyle = `rgb(${col[0]},${col[1]},${col[2]})`; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(prev[0], prev[1]); ctx.lineTo(X, Y); ctx.stroke(); }
        prev = [X, Y];
      }
      drawDot(ctx, T, 0, 0, { color: cssVar('--c-com'), r: 4, glow: 6 });
    } else if (kind === 'delta') {
      const T = makeTransform({ xMin: -PI, xMax: PI, yMin: -0.3, yMax: 3, W, H, padL: 30, padB: 24, padT: 14 });
      drawAxes(ctx, T, { xLabel: 'x', yTick: 1 });
      [0.8, 0.4, 0.18].forEach((eps, j) => {
        const col = lerpColor([138, 180, 255], [124, 255, 107], j / 2);
        drawCurve(ctx, T, sampleFn((x) => Math.exp(-(x * x) / (eps * eps)) / (eps * Math.sqrt(PI)), -PI, PI, 400),
          { color: `rgb(${col[0]},${col[1]},${col[2]})`, lineWidth: 2, glow: j === 2 ? 6 : 0 });
      });
    }
  }, [kind]);
  return <div className="tz-viz-host"><canvas ref={ref} /></div>;
}

// ---------- тизер-страница ----------
function TeaserPage({ block }) {
  const t = TEASERS[block];
  return (
    <div className="teaser rise">
      <div className="tz-kicker">{t.kicker}</div>
      <h1>{t.title}</h1>
      <div className="tz-soon"><span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--faint)', display: 'inline-block' }} />{t.soon}</div>
      <p className="tz-lede" dangerouslySetInnerHTML={{ __html: t.lede }} />
      <TeaserViz kind={t.viz} />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 14, marginTop: 18 }}>
        {t.cards.map((c, i) => (
          <div className="tz-card" key={i}>
            <h3>{c.h}</h3>
            <p dangerouslySetInnerHTML={{ __html: c.p }} />
          </div>
        ))}
      </div>
      <div className="page-nav">
        <a className="prev" href="#map"><span className="dir">← Назад</span><span className="lbl">Карта курса</span></a>
      </div>
    </div>
  );
}

// ---------- карта курса ----------
function CourseMap({ visited }) {
  return (
    <div className="coursemap">
      <div className="map-hero">
        <div className="map-eyebrow rise">МФТИ · 2 курс · поток Редкозубовой</div>
        <h1 className="map-title rise" style={{ animationDelay: '.05s' }}>Гармонический <span className="em">анализ</span></h1>
        <HeroEpicycles />
        <p className="map-lede rise" style={{ animationDelay: '.1s' }}>
          Интерактивный гайд в духе 3Blue1Brown. Живые визуализации рядом со строгими формулировками — увидеть курс за один проход.
        </p>
      </div>

      <div className="map-blocks">
        {BLOCKS.map((b, i) => {
          const active = b.status === 'active';
          const href = active ? '#1.0' : `#teaser-${b.n}`;
          return (
            <a className={`map-block ${active ? 'active' : 'soon'} rise`} href={href} key={b.n} style={{ animationDelay: `${0.12 + i * 0.05}s` }}>
              <div className="bnum">{b.n}</div>
              <div className="binfo">
                <div className="btitle">Блок {b.n} · {b.title}</div>
                <div className="bdesc" dangerouslySetInnerHTML={{ __html: b.desc }} />
              </div>
              <div className="bmeta">
                <span className="tickets">{b.tickets}</span>
                <span className="status">{active ? <React.Fragment><span className="dot" />активен</React.Fragment> : 'coming soon'}</span>
              </div>
            </a>
          );
        })}
      </div>

      <div style={{ maxWidth: 920, margin: '26px auto 8px' }}>
        <div className="sb-group" style={{ margin: '0 0 12px' }}>Блок 1 · §0 (до билетов) + билеты 1–7</div>
        <div className="map-sub">
          {SUBSECTIONS.map((s) => (
            <a href={`#${s.id}`} key={s.id} className="rise" style={{ animationDelay: '.1s' }}>
              {visited && visited.has(s.id) ? <span className="done-dot" /> : null}
              <div className="ssnum">{s.num}</div>
              <div className="sstitle" dangerouslySetInnerHTML={{ __html: s.title }} />
              <div className="ssticket">{s.ticket}</div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { CourseMap, TeaserPage, TeaserViz });
