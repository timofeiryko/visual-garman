/* =====================================================
   viz-common.jsx — хуки, контролы, боксы теории, оболочка раздела
   ===================================================== */
const { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } = React;

const prefersReducedMotion = () =>
  window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// --- useCanvas: DPR-aware, redraw on deps + resize ---
function useCanvas(drawFn, deps = []) {
  const ref = useRef(null);
  const drawRef = useRef(drawFn);
  drawRef.current = drawFn;

  const doDraw = useCallback(() => {
    const cvs = ref.current;
    if (!cvs) return false;
    const rect = cvs.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    const { ctx, W, H } = setupCanvas(cvs);
    try { drawRef.current(ctx, W, H); } catch (e) { console.error('draw error', e); }
    return true;
  }, []);

  useLayoutEffect(() => {
    const cvs = ref.current;
    if (!cvs) return;
    let raf = 0, retries = 0;
    const tryDraw = () => { if (doDraw()) { retries = 0; return; } if (retries++ < 60) raf = requestAnimationFrame(tryDraw); };
    const schedule = () => { cancelAnimationFrame(raf); retries = 0; raf = requestAnimationFrame(tryDraw); };
    window.addEventListener('resize', schedule);
    const ro = new ResizeObserver(schedule);
    if (cvs.parentElement) ro.observe(cvs.parentElement);
    schedule();
    cvs.__redraw = doDraw;
    return () => { window.removeEventListener('resize', schedule); ro.disconnect(); cancelAnimationFrame(raf); };
  }, []);

  useEffect(() => { doDraw(); }, deps);
  return ref;
}

// --- useAnimatedCanvas: DPR sizing + rAF loop. draw(ctx,W,H,clock) ---
// `running` toggles the loop; when paused it still redraws on deps/resize.
function useAnimatedCanvas(draw, running, deps = []) {
  const ref = useRef(null);
  const drawRef = useRef(draw); drawRef.current = draw;
  const runningRef = useRef(running);
  const clock = useRef(0);

  const paint = useCallback(() => {
    const cvs = ref.current; if (!cvs) return false;
    const rect = cvs.getBoundingClientRect();
    if (rect.width < 4 || rect.height < 4) return false;
    let r;
    try { r = setupCanvas(cvs); } catch (e) { console.error('setup canvas', e); return false; }
    try { drawRef.current(r.ctx, r.W, r.H, clock.current); } catch (e) { console.error('anim draw', e); }
    return true;
  }, []);

  // Guaranteed first paint + repaint on deps change. Timer-based retry so it
  // lands even when rAF is throttled (background/hidden iframes) and even before
  // the animation loop's first frame fires.
  useEffect(() => {
    let t = 0, tries = 0, cancelled = false;
    const attempt = () => {
      if (cancelled) return;
      if (paint()) return;
      if (tries++ < 90) t = setTimeout(attempt, 32);
    };
    attempt();
    return () => { cancelled = true; clearTimeout(t); };
  }, deps);

  // Resize: paint directly from the observer/listener (not deferred to rAF).
  useLayoutEffect(() => {
    const cvs = ref.current; if (!cvs) return;
    const repaint = () => paint();
    window.addEventListener('resize', repaint);
    const ro = new ResizeObserver(repaint);
    if (cvs.parentElement) ro.observe(cvs.parentElement);
    return () => { window.removeEventListener('resize', repaint); ro.disconnect(); };
  }, []);

  // Animation loop via rAF while running. A timer kick covers the case where the
  // first rAF frame is delayed/throttled so the canvas is never left blank.
  useEffect(() => {
    runningRef.current = running;
    if (!running) { paint(); return; }
    let raf = 0, last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      clock.current += dt;
      paint();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const kick = setTimeout(paint, 60);
    return () => { cancelAnimationFrame(raf); clearTimeout(kick); };
  }, [running]);

  return ref;
}

// --- animation loop hook: calls cb(dt, t) each frame while running ---
function useAnimLoop(cb, running) {
  const cbRef = useRef(cb); cbRef.current = cb;
  useEffect(() => {
    if (!running) return;
    let raf = 0, last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      cbRef.current(dt, now / 1000);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
}

// --- controls ---
function Slider({ label, value, setValue, min, max, step = 0.01, fmt }) {
  const f = fmt || ((v) => (typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : v));
  return (
    <div className="ctl">
      <div className="ctl-label"><span>{label}</span><span className="val">{f(value)}</span></div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(parseFloat(e.target.value))} aria-label={label} />
    </div>
  );
}

function Toggle({ label, value, setValue }) {
  return (
    <div className={`ctl-toggle ${value ? 'on' : ''}`} role="switch" aria-checked={value}
      tabIndex={0}
      onClick={() => setValue(!value)}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setValue(!value); } }}>
      <span>{label}</span><span className="pip"></span>
    </div>
  );
}

function ButtonGroup({ label, options, value, setValue, columns = 2 }) {
  return (
    <div className="ctl">
      {label ? <div className="ctl-label"><span>{label}</span></div> : null}
      <div className="ctl-btn-group" style={{ gridTemplateColumns: `repeat(${columns},minmax(0,1fr))` }}>
        {options.map(o => (
          <div key={o.value} className={`ctl-btn ${value === o.value ? 'active' : ''}`}
            onClick={() => setValue(o.value)}>{o.label}</div>
        ))}
      </div>
    </div>
  );
}

function PlayButton({ playing, setPlaying, labels }) {
  const L = labels || ['Пауза', 'Запустить'];
  return (
    <div className="play-btn" role="button" tabIndex={0}
      onClick={() => setPlaying(!playing)}
      onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); setPlaying(!playing); } }}>
      {playing
        ? <svg viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/></svg>
        : <svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z"/></svg>}
      <span>{playing ? L[0] : L[1]}</span>
    </div>
  );
}

// --- viz wrapper ---
function Viz({ title, tag, formula, glow = true, children, legend, controls, readout, note, steps }) {
  const [open, setOpen] = useState(false);
  const stepsRef = useRef(null);
  useEffect(() => {
    if (open && stepsRef.current && window.renderMathInElement) {
      window.renderMathInElement(stepsRef.current, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false, strict: false,
      });
    }
  }, [open]);
  return (
    <div className="viz">
      <div className="viz-head">
        <span className="vt">{title}{tag ? <span className="tag">{tag}</span> : null}</span>
        {formula ? <span className="formula">{formula}</span> : null}
      </div>
      <div className="viz-canvas-host">
        {children}
        {glow ? <div className="viz-glow" /> : null}
      </div>
      {legend ? <div className="viz-legend">{legend.map((l, i) => (
        <span className="lg" key={i}><span className="sw" style={{ background: l.c }} />{l.t}</span>
      ))}</div> : null}
      {readout ? <div className="readout">{readout}</div> : null}
      {controls ? <div className="viz-controls">{controls}</div> : null}
      {note ? <div className="viz-note">{note}</div> : null}
      {steps && steps.length ? (
        <div className="viz-steps">
          <button className={`viz-steps-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}>
            <svg className="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
            <span>Как это работает · разбор по шагам</span>
            <span className="spacer"></span>
            <span className="hint">{open ? 'свернуть' : `${steps.length} шага`}</span>
          </button>
          {open ? (
            <div className="viz-steps-body" ref={stepsRef}>
              {steps.map((s, i) => (
                <div className="viz-step" key={i}>
                  <span className="sn">{i + 1}</span>
                  <span className="st" dangerouslySetInnerHTML={{ __html: typeof s === 'string' ? s : s.t }} />
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function Legend(items) { return items; }

// --- theory box icons (lucide-style) ---
const ICONS = {
  def: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  form: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>,
  essence: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14"/></svg>,
  idea: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.36 6.36-.7-.7M6.34 6.34l-.7-.7m12.72 0-.7.7M6.34 17.66l-.7.7"/><circle cx="12" cy="12" r="4"/></svg>,
  tasks: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>,
};
const BOX_META = {
  def:     { label: 'Определение', icon: ICONS.def,   cls: 'def' },
  form:    { label: 'Формулировка', icon: ICONS.form, cls: 'form' },
  essence: { label: 'Суть',         icon: ICONS.essence, cls: 'essence' },
  idea:    { label: 'Идея',         icon: ICONS.idea,  cls: 'idea' },
  tasks:   { label: 'В задачах',    icon: ICONS.tasks, cls: 'tasks' },
};

// expandable "where does this come from" explainer
function Reveal({ label, html, children }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (open && ref.current && window.renderMathInElement) {
      window.renderMathInElement(ref.current, {
        delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
        throwOnError: false, strict: false,
      });
    }
  }, [open]);
  return (
    <div className="reveal">
      <button className={`reveal-toggle ${open ? 'open' : ''}`} onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <svg className="rdot" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        <span>{label || 'Откуда это берётся'}</span>
      </button>
      {open ? (
        html
          ? <div className="reveal-body" ref={ref} dangerouslySetInnerHTML={{ __html: html }} />
          : <div className="reveal-body" ref={ref}>{children}</div>
      ) : null}
    </div>
  );
}

// dangerouslySetInnerHTML so $...$ survives to KaTeX auto-render pass
function TheoryBox({ type, title, children, html, reveal }) {
  const m = BOX_META[type] || BOX_META.essence;
  return (
    <div className={`tbox ${m.cls}`}>
      <div className="tbox-label">{m.icon}<span>{m.label}</span></div>
      {title ? <div className="tbox-title">{title}</div> : null}
      {html
        ? <div className="tbox-body" dangerouslySetInnerHTML={{ __html: html }} />
        : <div className="tbox-body">{children}</div>}
      {reveal ? <Reveal label={reveal.label} html={reveal.html} /> : null}
    </div>
  );
}

// render theory boxes from a content array
function TheoryBoxes({ boxes }) {
  return <React.Fragment>{(boxes || []).map((b, i) => (
    <TheoryBox key={i} type={b.type} title={b.title} html={b.html} reveal={b.reveal} />
  ))}</React.Fragment>;
}

// --- section shell (header + breadcrumb handled by app) ---
function SectionHead({ num, title, ticket, hook }) {
  return (
    <div className="sec-head rise">
      <div className="sec-eyebrow">
        <span className="sec-num">{num}</span>
        {ticket ? <span className="ticket-badge">{ticket}</span> : null}
      </div>
      <h1 className="sec-title">{title}</h1>
      {hook ? <p className="sec-hook">{hook}</p> : null}
    </div>
  );
}

Object.assign(window, {
  useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback,
  prefersReducedMotion, useCanvas, useAnimLoop, useAnimatedCanvas,
  Slider, Toggle, ButtonGroup, PlayButton, Viz, Legend,
  TheoryBox, TheoryBoxes, SectionHead, Reveal,
});
