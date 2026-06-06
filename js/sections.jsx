/* =====================================================
   sections.jsx — сборка разделов 1.0–1.8 (теория + интерактивы)
   ===================================================== */

function ProofLinks({ secId }) {
  const ids = (window.SECTION_PROOFS && window.SECTION_PROOFS[secId]) || [];
  if (!ids.length) return null;
  return (
    <div className="proof-links">
      <div className="proof-section-label">Доказательства этого раздела</div>
      <div className="proof-links-grid">
        {ids.map((pid) => {
          const p = window.ALL_PROOFS[pid];
          if (!p) return null;
          return (
            <a className="proof-link" href={`#proof-${pid}`} key={pid}>
              <span className="plicon">
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><path d="M9 15l2 2 4-4"/></svg>
              </span>
              <span className="plmeta">
                <span className="plnum">{p.kicker}</span>
                <span className="pltitle">{p.title}</span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

function SectionLayout({ id, vizzes }) {
  const c = CONTENT[id];
  return (
    <React.Fragment>
      <SectionHead num={c.num} title={c.title} ticket={c.ticket} hook={c.hook} />
      <div className="sec-grid">
        <div className="sec-theory sticky rise" style={{ animationDelay: '.06s' }}>
          <TheoryBoxes boxes={c.boxes} />
        </div>
        <div className="sec-viz-col rise" style={{ animationDelay: '.12s' }}>
          {vizzes.map((V, i) => <V key={i} />)}
        </div>
      </div>
      <ProofLinks secId={id} />
    </React.Fragment>
  );
}

const Section_1_0 = () => <SectionLayout id="1.0" vizzes={[WaveAssembly, EpicycleStage]} />;
const Section_1_1 = () => <SectionLayout id="1.1" vizzes={[WindingMachine, Orthogonality]} />;
const Section_1_2 = () => <SectionLayout id="1.2" vizzes={[RiemannCancellation, Staircase]} />;
const Section_1_3 = () => <SectionLayout id="1.3" vizzes={[DirichletKernel, ConvolutionSpotlight, Localization]} />;
const Section_1_4 = () => <SectionLayout id="1.4" vizzes={[MidpointConvergence, GibbsCloseup]} />;
const Section_1_5 = () => <SectionLayout id="1.5" vizzes={[DecaySpectrum, DiffMultiply]} />;
const Section_1_6 = () => <SectionLayout id="1.6" vizzes={[UniformVsPointwise]} />;
const Section_1_7 = () => <SectionLayout id="1.7" vizzes={[DirichletVsFejer, SnVsSigma]} />;
const Section_1_8 = () => <SectionLayout id="1.8" vizzes={[WeierstrassChase]} />;

const Section_2_0 = () => <SectionLayout id="2.0" vizzes={[ProjectionResidual]} />;
const Section_2_1 = () => <SectionLayout id="2.1" vizzes={[InnerProductGeometry]} />;
const Section_2_2 = () => <SectionLayout id="2.2" vizzes={[BesselClimb]} />;
const Section_2_3 = () => <SectionLayout id="2.3" vizzes={[ParsevalGap]} />;
const Section_2_4 = () => <SectionLayout id="2.4" vizzes={[RieszReconstruct]} />;
const Section_2_5 = () => <SectionLayout id="2.5" vizzes={[MeanSquareConverge]} />;
const Section_2_6 = () => <SectionLayout id="2.6" vizzes={[CompletenessHole]} />;

const SECTION_COMPONENTS = {
  '1.0': Section_1_0, '1.1': Section_1_1, '1.2': Section_1_2,
  '1.3': Section_1_3, '1.4': Section_1_4, '1.5': Section_1_5,
  '1.6': Section_1_6, '1.7': Section_1_7, '1.8': Section_1_8,
  '2.0': Section_2_0, '2.1': Section_2_1, '2.2': Section_2_2,
  '2.3': Section_2_3, '2.4': Section_2_4, '2.5': Section_2_5, '2.6': Section_2_6,
};

Object.assign(window, { SectionLayout, SECTION_COMPONENTS });
