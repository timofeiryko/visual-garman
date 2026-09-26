/* =====================================================
   app.jsx — маршрутизация, навигация, KaTeX, прогресс
   ===================================================== */

const ORDER = ['1.0', '1.1', '1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8',
  '2.0', '2.1', '2.2', '2.3', '2.4', '2.5', '2.6', ...SUBSECTIONS_EXTRA.map(s => s.id)];
const BLOCK_TITLES = { '1': 'Ряды Фурье', '2': 'Гильбертова теория', '3':'Интегралы с параметром', '4':'Преобразование Фурье', '5':'Обобщённые функции' };
const blockOf = (id) => (id && id.indexOf('.') > 0 ? id.split('.')[0] : '1');
const blockHome = (id) => blockOf(id) + '.0';

function parseRoute() {
  const h = (window.location.hash || '#map').slice(1);
  return h || 'map';
}

function App() {
  const [route, setRoute] = useState(parseRoute());
  const [mode, setMode] = useState('dark');
  const [visited, setVisited] = useState(() => new Set());
  const contentRef = useRef(null);

  // resizable sidebar width (persisted; survives offline file:// via try/catch)
  const [sbW, setSbW] = useState(() => {
    try { const v = parseInt(localStorage.getItem('haGuideSidebarW'), 10); if (v >= 210 && v <= 620) return v; } catch (e) {}
    return 280;
  });
  useEffect(() => { try { localStorage.setItem('haGuideSidebarW', String(sbW)); } catch (e) {} }, [sbW]);
  const startSbDrag = (e) => {
    e.preventDefault();
    const startX = e.clientX, startW = sbW;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    const onMove = (ev) => setSbW(Math.min(620, Math.max(210, startW + (ev.clientX - startX))));
    const onUp = () => {
      document.body.style.cursor = ''; document.body.style.userSelect = '';
      window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  useEffect(() => {
    const onHash = () => { setRoute(parseRoute()); window.scrollTo({ top: 0, behavior: 'auto' }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // theme
  useEffect(() => {
    if (mode === 'light') document.documentElement.setAttribute('data-mode', 'light');
    else document.documentElement.removeAttribute('data-mode');
  }, [mode]);

  // mark visited
  useEffect(() => {
    if (ORDER.includes(route)) setVisited((v) => { if (v.has(route)) return v; const n = new Set(v); n.add(route); return n; });
  }, [route]);

  // KaTeX render after route change (and after a tick for canvases)
  useEffect(() => {
    const render = () => {
      if (contentRef.current && window.renderMathInElement) {
        window.renderMathInElement(contentRef.current, {
          delimiters: [{ left: '$$', right: '$$', display: true }, { left: '$', right: '$', display: false }],
          throwOnError: false, strict: false,
        });
      }
    };
    const id = setTimeout(render, 40);
    const id2 = setTimeout(render, 400); // re-pass once viz notes/readouts settle
    return () => { clearTimeout(id); clearTimeout(id2); };
  }, [route, mode]);

  // ---- view ----
  let view, crumbs;
  if (route === 'map') {
    view = <CourseMap visited={visited} />;
    crumbs = null;
  } else if (route.startsWith('teaser-')) {
    const b = parseInt(route.split('-')[1], 10);
    const id = b + '.0';
    const Comp = SECTION_COMPONENTS[id];
    view = Comp ? <Comp key={id} /> : <CourseMap visited={visited} />;
    crumbs = <div className="crumbs"><a href="#map">Карта курса</a><span className="sep">→</span><span className="here">Блок {b}</span></div>;
  } else if (route.startsWith('proof-')) {
    const pid = route.slice(6);
    const p = window.ALL_PROOFS[pid];
    view = <ProofPage id={pid} />;
    const pb = p ? blockOf(p.sec) : '1';
    crumbs = (
      <div className="crumbs">
        <a href="#map">Карта курса</a><span className="sep">→</span>
        <a href={`#${pb}.0`}>Блок {pb} · {BLOCK_TITLES[pb]}</a><span className="sep">→</span>
        {p ? <a href={`#${p.sec}`}>{window.CONTENT[p.sec] ? window.CONTENT[p.sec].num : p.sec} · {p.secTitle}</a> : null}<span className="sep">→</span>
        <span className="here">{p ? p.kicker : 'Доказательство'}</span>
      </div>
    );
  } else if (SECTION_COMPONENTS[route]) {
    const Comp = SECTION_COMPONENTS[route];
    const c = CONTENT[route];
    view = <Comp key={route} />;
    const cb = blockOf(route);
    crumbs = (
      <div className="crumbs">
        <a href="#map">Карта курса</a><span className="sep">→</span>
        <a href={`#${cb}.0`}>Блок {cb} · {BLOCK_TITLES[cb]}</a><span className="sep">→</span>
        <span className="here">{c.ticket && c.ticket.startsWith('Билет') ? `${c.ticket} · ${c.title}` : `§${c.num} · ${c.title}`}</span>
      </div>
    );
  } else {
    view = <CourseMap visited={visited} />;
    crumbs = null;
  }

  // prev/next within block 1
  let prev = null, next = null;
  if (ORDER.includes(route)) {
    const i = ORDER.indexOf(route);
    prev = i > 0 ? ORDER[i - 1] : 'map';
    next = i < ORDER.length - 1 ? ORDER[i + 1] : null;
  }

  // prev/next within proofs
  let proofPrev = null, proofNext = null, isProof = route.startsWith('proof-');
  if (isProof) {
    const pid = route.slice(6);
    const po = window.PROOF_ORDER || [];
    const i = po.indexOf(pid);
    if (i >= 0) {
      proofPrev = i > 0 ? po[i - 1] : null;
      proofNext = i < po.length - 1 ? po[i + 1] : null;
    }
  }

  const NavLink = ({ id }) => {
    const c = CONTENT[id];
    return (
      <a className={`sb-link ${route === id ? 'active' : ''}`} href={`#${id}`}>
        <span className="num">{c.num}</span>
        <span>{c.title}{visited.has(id) && route !== id ? '' : ''}</span>
        {visited.has(id) ? <span className="done-dot" /> : null}
      </a>
    );
  };

  const shortKicker = (k) => k
    .replace('Теорема ', 'Т').replace('Леммы ', 'Л').replace('Лемма ', 'Л')
    .replace('Следствие ', 'Сл.').replace('Свойства ', 'С. ').replace('Полнота ↔ замкнутость', 'Замкнут.');
  const ProofLinks = ({ block }) => (window.PROOF_ORDER || [])
    .filter((pid) => window.ALL_PROOFS[pid] && blockOf(window.ALL_PROOFS[pid].sec) === block)
    .map((pid) => {
      const p = window.ALL_PROOFS[pid];
      return (
        <a className={`sb-sublink ${route === 'proof-' + pid ? 'active' : ''}`} href={`#proof-${pid}`} key={pid}>
          <span className="pm">{shortKicker(p.kicker)}</span>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.title}</span>
        </a>
      );
    });

  return (
    <div className="app">
      <div className="paper-bg" />
      <aside className="sidebar" style={{ '--sb-w': sbW + 'px' }}>
        <a className="sb-brand" href="#map">
          <div className="mark">Гармонический анализ</div>
          <div className="sub">интерактивный гайд · все 20 билетов</div>
        </a>
        <div className="sb-links">
          <a className={`sb-home ${route === 'map' ? 'active' : ''}`} href="#map">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Карта курса
          </a>

          <div className="sb-group">Блок 1 · §0 до билетов</div>
          {['1.0', '1.1'].map((id) => <NavLink key={id} id={id} />)}

          <div className="sb-group">Блок 1 · билеты 1–7</div>
          {['1.2', '1.3', '1.4', '1.5', '1.6', '1.7', '1.8'].map((id) => <NavLink key={id} id={id} />)}

          <div className="sb-group">Доказательства · блок 1</div>
          <ProofLinks block="1" />

          <div className="sb-group">Блок 2 · §0 до билетов</div>
          {['2.0', '2.1'].map((id) => <NavLink key={id} id={id} />)}

          <div className="sb-group">Блок 2 · билеты 8–12</div>
          {['2.2', '2.3', '2.4', '2.5', '2.6'].map((id) => <NavLink key={id} id={id} />)}

          <div className="sb-group">Доказательства · блок 2</div>
          <ProofLinks block="2" />

          {['3','4','5'].map(block => <React.Fragment key={block}>
            <div className="sb-group">Блок {block} · {BLOCK_TITLES[block]}</div>
            {SUBSECTIONS_EXTRA.filter(s=>s.id.startsWith(block+'.')).map(s=><NavLink key={s.id} id={s.id}/>)}
            <ProofLinks block={block}/>
          </React.Fragment>)}

          <div className="mode-toggle" role="button" tabIndex={0}
            onClick={() => setMode((m) => m === 'dark' ? 'light' : 'dark')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setMode((m) => m === 'dark' ? 'light' : 'dark'); } }}>
            {mode === 'dark'
              ? <React.Fragment><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2m0 18v2M4.2 4.2l1.4 1.4m12.8 12.8 1.4 1.4M1 12h2m18 0h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>режим чтения (светлый)</React.Fragment>
              : <React.Fragment><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>тёмная тема</React.Fragment>}
          </div>
        </div>
      </aside>
      <div className="sb-resizer" style={{ left: sbW - 3 }} onMouseDown={startSbDrag}
        onDoubleClick={() => setSbW(280)} role="separator" aria-orientation="vertical"
        title="Потяни, чтобы изменить ширину · двойной клик — сброс" />

      <main className="content" ref={contentRef} key={route}>
        {crumbs}
        {view}
        {isProof && (proofPrev || proofNext) && (
          <div className="page-nav">
            {proofPrev ? (
              <a className="prev" href={`#proof-${proofPrev}`}>
                <span className="dir">← Предыдущее</span>
                <span className="lbl">{window.ALL_PROOFS[proofPrev].kicker} · {window.ALL_PROOFS[proofPrev].title}</span>
              </a>
            ) : (
              <a className="prev" href={`#${window.ALL_PROOFS[route.slice(6)] ? window.ALL_PROOFS[route.slice(6)].sec : '1.0'}`}>
                <span className="dir">← К разделу</span>
                <span className="lbl">{window.ALL_PROOFS[route.slice(6)] ? `${window.ALL_PROOFS[route.slice(6)].sec} ${window.ALL_PROOFS[route.slice(6)].secTitle}` : 'Раздел'}</span>
              </a>
            )}
            {proofNext ? (
              <a className="next" href={`#proof-${proofNext}`}>
                <span className="dir">Следующее →</span>
                <span className="lbl">{window.ALL_PROOFS[proofNext].kicker} · {window.ALL_PROOFS[proofNext].title}</span>
              </a>
            ) : <span style={{ flex: 1 }} />}
          </div>
        )}
        {(prev || next) && (
          <div className="page-nav">
            {prev ? (
              <a className="prev" href={`#${prev}`}>
                <span className="dir">← Назад</span>
                <span className="lbl">{prev === 'map' ? 'Карта курса' : `${CONTENT[prev].num} ${CONTENT[prev].title}`}</span>
              </a>
            ) : <span style={{ flex: 1 }} />}
            {next ? (
              <a className="next" href={`#${next}`}>
                <span className="dir">Далее →</span>
                <span className="lbl">{CONTENT[next].num} {CONTENT[next].title}</span>
              </a>
            ) : (
              <a className="next" href="#map">
                <span className="dir">Курс пройден →</span>
                <span className="lbl">Карта курса · повторение</span>
              </a>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
