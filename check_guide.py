"""Browser smoke: all routes, formulas, mobile overflow, controls and offline load.
Run with a local server: python check_guide.py http://127.0.0.1:8767/
Requires the workspace's Playwright installation.
"""
from pathlib import Path
import json, sys
from playwright.sync_api import sync_playwright

url = sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8767/'
with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={'width':1440,'height':1000})
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    page.wait_for_selector('.map-block',timeout=60000)
    result=page.evaluate(r'''() => {
      const failures=[]; let count=0;
      function walk(v,where) {
        if(typeof v==='string') {
          const d=document.createElement('div');d.innerHTML=v;
          const text=d.textContent;
          for(const m of text.matchAll(/\$\$([\s\S]*?)\$\$|\$([^$\n]+)\$/g)) {
            try{katex.renderToString(m[1]??m[2],{throwOnError:true,strict:'ignore'});count++;}
            catch(e){failures.push({where,tex:m[1]??m[2],error:String(e)});}
          }
        } else if(v && typeof v==='object') Object.entries(v).forEach(([k,x])=>walk(x,where+'.'+k));
      }
      walk(CONTENT,'content');walk(ALL_PROOFS,'proofs');
      const missing=[];
      Object.entries(SECTION_PROOFS).forEach(([s,ids])=>ids.forEach(id=>{if(!ALL_PROOFS[id])missing.push(id)}));
      return {count,failures,missing,sections:Object.keys(CONTENT),proofs:Object.keys(ALL_PROOFS),active:BLOCKS.filter(b=>b.status==='active').length};
    }''')
    print(json.dumps(result,ensure_ascii=True))
    assert not result['failures'], 'Invalid formulas'
    assert not result['missing'] and result['active']==5
    routes=result['sections']+['proof-'+x for x in result['proofs']]
    for route in routes:
        page.evaluate('(r)=>location.hash=r',route)
        page.wait_for_timeout(480)
        assert page.locator('.sec-title,.proof-title').count(),(route,errors)
        assert page.locator('.katex-error').count()==0,route
    for route in ['3.2','4.1','5.1']:
        page.evaluate('(r)=>location.hash=r',route);page.wait_for_timeout(500)
        slider=page.locator('input[type=range]').first
        slider.fill(slider.get_attribute('min'));slider.dispatch_event('input');page.wait_for_timeout(100)
        assert page.locator('canvas').count(),route
    page.evaluate("location.hash='3.2'");page.wait_for_timeout(500)
    page.screenshot(path=str(Path('/tmp')/'garman-desktop.png') if sys.platform!='win32' else str(Path.home()/'AppData/Local/Temp/garman-desktop.png'),full_page=False)
    page.set_viewport_size({'width':390,'height':844})
    overflow=[]
    for route in result['sections']:
        page.evaluate('(r)=>location.hash=r',route);page.wait_for_timeout(460)
        if page.evaluate('document.documentElement.scrollWidth>innerWidth+2'):overflow.append(route)
    print('Mobile overflow:',overflow)
    assert not overflow
    page.screenshot(path=str(Path.home()/'AppData/Local/Temp/garman-mobile.png') if sys.platform=='win32' else '/tmp/garman-mobile.png')
    offline=browser.new_context(offline=True)
    off=offline.new_page();off.on('pageerror',lambda e:errors.append('offline: '+str(e)))
    off.goto(Path('гайд_оффлайн.html').resolve().as_uri()+'#5.1')
    off.wait_for_selector('.sec-title',timeout=60000)
    assert '20' in off.locator('.sec-head').inner_text()
    assert off.locator('.katex-error').count()==0
    print('Runtime errors:',errors)
    assert not errors
    browser.close()
