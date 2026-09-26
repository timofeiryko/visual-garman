/* Три семейства интерактивов; аналитические значения не зависят от сетки рисунка. */
function ParameterTail() {
  const [alpha,setAlpha]=useState(0.5),[R,setR]=useState(4);
  const ref=useCanvas((ctx,W,H)=>{
    clearBg(ctx,W,H,cssVar('--bg-2'));
    const T=makeTransform({xMin:0,xMax:20,yMin:0,yMax:2.1,W,H,padL:42,padB:32,padT:15,padR:15});
    drawAxes(ctx,T,{xLabel:'t',yLabel:'α exp(−αt)',xTick:5,yTick:0.5});
    drawSignedArea(ctx,T,t=>alpha*Math.exp(-alpha*t),R,20,{alpha:0.3,n:400});
    drawCurve(ctx,T,sampleFn(t=>alpha*Math.exp(-alpha*t),0,20,500),{color:cssVar('--c-signal'),lineWidth:2.5});
    drawCurve(ctx,T,[[R,0],[R,2]],{color:cssVar('--c-warn'),dash:[5,4]});
  },[alpha,R]);
  return <Viz title="Один R для всех параметров?" tag="равномерность"
    controls={<><Slider label="параметр α" value={alpha} setValue={setAlpha} min={0.02} max={2} step={0.02}/><Slider label="отсечение R" value={R} setValue={setR} min={1} max={18} step={0.5}/></>}
    readout={<span>Полный интеграл = 1 · хвост до ∞ = <b>{Math.exp(-alpha*R).toFixed(4)}</b></span>}
    note="Зафиксируй R и уменьши α: хвост снова становится большим. На α ≥ α₀ > 0 один R работает для всех; на α > 0 — нет. Заштрихован только видимый участок хвоста до t = 20; число учитывает весь хвост до бесконечности."
    steps={['Увеличь R: для выбранного α хвост уменьшается.','Не меняя R, приблизь α к нулю: затухание замедляется.','Равномерность требует контроля самого плохого параметра, а не только текущей кривой.']}><canvas ref={ref} aria-label="Экспоненциальный сигнал и хвост интеграла после R"/></Viz>;
}

function FourierPair() {
  const [a,setA]=useState(1),[kind,setKind]=useState('gauss');
  const ref=useCanvas((ctx,W,H)=>{
    clearBg(ctx,W,H,cssVar('--bg-2'));
    const T=makeTransform({xMin:-6,xMax:6,yMin:-0.7,yMax:3.2,W,H,padL:40,padB:32,padT:15,padR:15});
    drawAxes(ctx,T,{xLabel:'x / y',xTick:2,yTick:1});
    const f=x=>kind==='gauss'?Math.exp(-x*x/(2*a*a)):(Math.abs(x)<=a?1:0);
    const hat=y=>kind==='gauss'?a*Math.exp(-a*a*y*y/2):Math.sqrt(2/Math.PI)*(Math.abs(y)<1e-9?a:Math.sin(a*y)/y);
    drawCurve(ctx,T,sampleFn(f,-6,6,800),{color:cssVar('--c-signal'),lineWidth:2.5});
    drawCurve(ctx,T,sampleFn(hat,-6,6,800),{color:cssVar('--c-approx'),lineWidth:2.5});
  },[a,kind]);
  return <Viz title="Уже сигнал → шире спектр" tag="симметричная нормировка"
    legend={[{c:cssVar('--c-signal'),t:'сигнал f(x)'},{c:cssVar('--c-approx'),t:'спектр f̂(y)'}]}
    controls={<><ButtonGroup label="форма сигнала" options={[{value:'gauss',label:'Гаусс'},{value:'rect',label:'Прямоугольник'}]} value={kind} setValue={setKind}/><Slider label="ширина a" value={a} setValue={setA} min={0.3} max={2.5} step={0.05}/></>}
    readout={<span>{kind==='gauss'?'f(x) = exp(−x²/(2a²)); f̂(y) = a exp(−a²y²/2)':'f(x) = 1 при |x| ≤ a; f̂(y) = √(2/π) sin(ay)/y'}</span>}
    note="Кривые наложены для сравнения ширины: у сигнала горизонтальная переменная x, у спектра y. Это разные области, не поточечное сравнение двух функций времени. При a = 1 гаусс совпадает со своим образом."
    steps={['Уменьши a: сигнал становится уже.','Спектр расширяется, но его высота также меняется.','Переключи на прямоугольник: резкие края создают осциллирующий спектр sinc.']}><canvas ref={ref} aria-label="Сигнал и его аналитическое преобразование Фурье"/></Viz>;
}

function DeltaProbe() {
  const [eps,setEps]=useState(0.5),[center,setCenter]=useState(0);
  const phi=x=>Math.abs(x)<2?Math.exp(1-1/(1-x*x/4)):0;
  const eta=x=>Math.exp(-(((x-center)/eps)**2))/(eps*Math.sqrt(Math.PI));
  const value=useMemo(()=>{let s=0;const h=4/2000;for(let j=0;j<=2000;j++){const x=-2+j*h;s+=(j===0||j===2000?0.5:1)*eta(x)*phi(x);}return s*h;},[eps,center]);
  const ref=useCanvas((ctx,W,H)=>{
    clearBg(ctx,W,H,cssVar('--bg-2'));
    const T=makeTransform({xMin:-3,xMax:3,yMin:0,yMax:Math.max(1.2,1/(eps*Math.sqrt(Math.PI))*1.08),W,H,padL:40,padB:32,padT:15,padR:15});
    drawAxes(ctx,T,{xLabel:'x',xTick:1,yTick:1});
    drawCurve(ctx,T,sampleFn(eta,-3,3,700),{color:cssVar('--c-signal'),lineWidth:2.5});
    drawCurve(ctx,T,sampleFn(phi,-3,3,700),{color:cssVar('--c-approx'),lineWidth:2.5});
  },[eps,center]);
  return <Viz title="Дельта считывает пробник" tag="действие, не график δ"
    legend={[{c:cssVar('--c-signal'),t:'приближение ηε, площадь 1'},{c:cssVar('--c-approx'),t:'пробная функция φ ∈ 𝒟'}]}
    controls={<><Slider label="ширина ε" value={eps} setValue={setEps} min={0.08} max={1} step={0.02}/><Slider label="центр a" value={center} setValue={setCenter} min={-1.5} max={1.5} step={0.05}/></>}
    readout={<span>∫ ηε φ ≈ <b>{value.toFixed(4)}</b> · φ(a) = <b>{phi(center).toFixed(4)}</b></span>}
    note="При ε → 0 интеграл приближается к φ(a): это сходимость к δₐ в 𝒟′. Сам гауссов пик не финитен, но задаёт регулярную обобщённую функцию. Зелёный пробник гладкий и равен нулю вне [−2,2]. Вертикальный масштаб автоматически меняется."
    steps={['Выбери центр a и запомни φ(a).','Уменьшай ε: ширина уходит, площадь пика остаётся 1.','Смотри на интеграл, не на высоту пика: он стремится к показанию пробника в центре.']}><canvas ref={ref} aria-label="Гауссово приближение к дельта-функции и компактный гладкий пробник"/></Viz>;
}

function NormBalls() {
  return <div className="tbox"><h3>Как сопоставить фигуру с нормой</h3><p>Отмечаем концы всех векторов (u,v) с нормой ≤ 1. На границе норма = 1. Это плоская модель, не график функции.</p>
    <svg viewBox="0 0 660 240" role="img" aria-label="L1 ромб, L2 круг, максимальная норма квадрат" style={{width:'100%',height:'auto'}}>
      <g fill="none" stroke="currentColor" opacity=".3"><path d="M15 105H205M110 10V200M235 105H425M330 10V200M455 105H645M550 10V200"/></g>
      <g strokeWidth="3" fillOpacity=".15"><path d="M110 25L190 105L110 185L30 105Z" fill="#7cff6b" stroke="#7cff6b"/><circle cx="330" cy="105" r="80" fill="#8ab4ff" stroke="#8ab4ff"/><rect x="470" y="25" width="160" height="160" fill="#ff5d8f" stroke="#ff5d8f"/></g>
      <g fill="currentColor" fontSize="16" textAnchor="middle"><text x="110" y="216">L₁ · ромб</text><text x="330" y="216">L₂ · круг</text><text x="550" y="216">max · квадрат</text></g>
    </svg><p><b>Ромб:</b> |u| + |v| ≤ 1 — общий бюджет координат. <b>Круг:</b> u² + v² ≤ 1 — Пифагор. <b>Квадрат:</b> обе координаты по модулю ≤ 1 независимо.</p><p>Для функций: L₁ — площадь под |f|; L₂ — корень из ∫|f|²; C-норма — максимум |f|, аналог квадрата.</p></div>;
}

for (const s of SUBSECTIONS_EXTRA) {
  const V=s.id.startsWith('3.')?ParameterTail:s.id.startsWith('4.')?FourierPair:DeltaProbe;
  SECTION_COMPONENTS[s.id]=()=> <SectionLayout id={s.id} vizzes={[V]}/>;
}
SECTION_COMPONENTS['2.1']=()=> <SectionLayout id="2.1" vizzes={[NormBalls,InnerProductGeometry]}/>;
