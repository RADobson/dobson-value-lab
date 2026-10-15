import {VERSION,MODES,DEFAULTS,LIMITS,INITIAL_SETTINGS,example,calculate,validate,validateSettings,parseImport,toCSV} from './model.js';
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='dobson-value-lab-v1';
let state={schemaVersion:1,settings:{...INITIAL_SETTINGS},projects:[example('cyber','email'),example('time','intake'),example('cash','processing')]};
let current='email', scenario='base', remember=false, pending=null;
try{const saved=localStorage.getItem(KEY);if(saved){state=parseImport(saved);current=state.projects[0].id;remember=true;}}catch{ /* Storage can be unavailable; modelling still works. */ }
const selected=()=>state.projects.find(p=>p.id===current);
const fmt=n=>new Intl.NumberFormat('en-AU',{maximumFractionDigits:1}).format(n);
const money=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:state.settings.currency,maximumFractionDigits:0}).format(n);
const compact=n=>new Intl.NumberFormat('en-AU',{style:'currency',currency:state.settings.currency,notation:'compact',maximumFractionDigits:1}).format(n);
const ratio=n=>n===null?'—':`${n.toFixed(2)}×`;
const typeLabel={cyber:'Expected loss avoided',time:'Capacity value + cash share',cash:'Realised spend reduction'};
const evidenceLabels={hypothesis:'Hypothesis',estimated:'Informed estimate',measured:'Measured / tested'};
const colours={cyber:'#649527',time:'#8b6bc1',cash:'#d49a35'};
let toastTimer;
function toast(s){$('#toast').textContent=s;$('#toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').hidden=true,4500);}
function serialise(){return JSON.stringify({...state,modelVersion:VERSION,exportedAt:new Date().toISOString()},null,2);}
function persist(){if(!remember)return;if(!state.projects.every(validProject)||!validateSettings(state.settings)){$('#storage-status').textContent='Fix inputs to update the saved copy.';return;}try{localStorage.setItem(KEY,serialise());$('#storage-status').textContent='Saved on this device.';}catch{$('#storage-status').textContent='Device storage unavailable. Download your analysis instead.';}}
function validProject(p){return validate(p).length===0;}
const numLabels={setup:'Implementation cost',monthly:'Monthly operating cost',delay:'Go-live delay (months)',frequency:'Loss events per year',impact:'Loss per event',frequencyReduction:'Frequency reduction (%)',impactReduction:'Impact reduction (%)',introducedRisk:'New annual expected loss',volume:'Tasks per month',beforeMinutes:'Manual minutes / task',afterMinutes:'Retained work / task (min)',reviewMinutes:'Extra review / task (min)',adoption:'Eligible tasks adopted (%)',hourlyCost:'Loaded cost / hour',cashRealisation:'Cash realisation (%)',annualSpend:'Addressable annual spend',savingsRate:'Spend reduction (%)',realisation:'Savings realised (%)'};
function numberField(p,key,hint='',full=false){const [min,max]=LIMITS[key];const step=key==='delay'?'1':key==='frequency'?'0.01':'any';return `<div class="field ${full?'full':''}"><label for="field-${key}">${esc(numLabels[key])}</label><input id="field-${key}" name="${key}" type="number" min="${min}" max="${max}" step="${step}" value="${esc(p[key])}" required ${hint?`aria-describedby="hint-${key}"`:''}>${hint?`<small id="hint-${key}">${esc(hint)}</small>`:''}</div>`;}
function fieldPair(p,a,b){return `<div class="field-pair full">${numberField(p,a)}${numberField(p,b)}</div>`;}
function renderForm(){const p=selected();let html=`<div class="field full"><label for="field-name">Opportunity name</label><input id="field-name" name="name" maxlength="100" value="${esc(p.name)}" required></div><div class="field-section full">The investment <span>${esc(state.settings.currency)} · all-in cost</span></div>${fieldPair(p,'setup','monthly')}${numberField(p,'delay','Benefits start in the following month. Include internal effort, training and integration in implementation cost.',true)}<div class="field-section full">${p.type==='cyber'?'The risk scenario':p.type==='time'?'The workflow':'The spend baseline'}</div>`;
if(p.type==='cyber')html+=numberField(p,'frequency','Expected number of loss events annually; 0.4 means one event every 2.5 years on average.',true)+numberField(p,'impact','Include response, interruption and recovery costs without counting the same loss twice.',true)+fieldPair(p,'frequencyReduction','impactReduction');
if(p.type==='time')html+=fieldPair(p,'volume','adoption')+numberField(p,'beforeMinutes','Average manual handling time for one task.',true)+fieldPair(p,'afterMinutes','reviewMinutes')+numberField(p,'hourlyCost','Fully loaded staff cost. Retained work must include exception and fallback handling.',true)+numberField(p,'cashRealisation','Use 0% unless recovered time will reduce an actual expense. The remaining share is capacity, not cash.',true);
if(p.type==='cash')html+=numberField(p,'annualSpend','Only spend that this opportunity can affect. Exclude benefits counted in another opportunity.',true)+fieldPair(p,'savingsRate','realisation');
html+=`<details class="full"><summary class="field-title">Additional risk & evidence</summary>${numberField(p,'introducedRisk','Expected annual loss introduced by the change, including errors or new failure modes. Subtracted from economic value.',true)}<div class="field"><label for="field-confidence">Evidence quality</label><select name="confidence" id="field-confidence">${Object.entries(evidenceLabels).map(([v,l])=>`<option value="${v}" ${v===p.confidence?'selected':''}>${l}</option>`).join('')}</select><small>This is a label for your evidence, not a probability.</small></div><div class="field"><label for="field-evidence">Evidence & assumptions</label><textarea id="field-evidence" name="evidence" maxlength="3000" placeholder="Source, measurement date, sample size, exclusions…">${esc(p.evidence)}</textarea></div><div class="field"><label for="field-owner">Decision owner</label><input id="field-owner" name="owner" maxlength="3000" value="${esc(p.owner)}" placeholder="Name or role (optional)"></div><div class="field"><label for="field-validation">Next validation step</label><textarea id="field-validation" name="validation" maxlength="3000">${esc(p.validation)}</textarea></div></details><div class="input-actions full"><button type="button" id="duplicate">Duplicate opportunity</button><button type="button" class="danger" id="delete" ${state.projects.length===1?'disabled':''}>Remove</button></div>`;
$('#assumptions').innerHTML=html;
$('#duplicate').onclick=()=>{if(state.projects.length>=20)return toast('Keep up to 20 opportunities per analysis.');const clone={...p,id:crypto.randomUUID(),name:(p.name+' — alternative').slice(0,100)};state.projects.push(clone);current=clone.id;renderAll();persist();};
$('#delete').onclick=()=>confirmAction('Remove this opportunity?',`${p.name} will be removed from this analysis.`,()=>{state.projects=state.projects.filter(x=>x.id!==p.id);current=state.projects[0].id;renderAll();persist();});
}
const icons={
  cyber:'<path d="M12 3 4.5 6v5.5c0 4.5 7.5 8.5 7.5 8.5s7.5-4 7.5-8.5V6Z"/><path d="m8.5 11.5 2.5 2.5 4.5-5"/>',
  time:'<circle cx="12" cy="12" r="8"/><path d="M12 7v5l3 2"/>',
  cash:'<rect x="3" y="6" width="18" height="12" rx="3"/><circle cx="12" cy="12" r="3"/><path d="M6 12h.01M18 12h.01"/>'
};
const modeNames={cyber:'Cyber risk',time:'Time saved',cash:'Money saved'};
const scenes={
cyber:`<ellipse cx="153" cy="210" rx="83" ry="11" fill="#d2e9aa"/><circle cx="150" cy="111" r="94" fill="#def1bd"/><g transform="rotate(-12 74 104)"><rect x="28" y="57" width="79" height="95" rx="14" fill="#c7e593"/><rect x="28" y="51" width="79" height="95" rx="14" fill="#fff"/><rect x="42" y="70" width="35" height="8" rx="4" fill="#d7e7c8"/><path d="M43 91h47m-47 15h31" stroke="#d7e7c8" stroke-width="7" stroke-linecap="round"/></g><path d="m151 39 65 25v60c0 39-38 66-65 81-27-15-65-42-65-81V64Z" fill="#28492d"/><path d="m151 30 65 25v60c0 39-38 66-65 81-27-15-65-42-65-81V55Z" fill="#426b39"/><path d="m151 45 51 20v49c0 29-28 52-51 66-23-14-51-37-51-66V65Z" fill="#9dd64b"/><path d="m128 107 17 18 33-39" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/><path d="M232 48v18m-9-9h18M67 176v12m-6-6h12" stroke="#73964e" stroke-width="5" stroke-linecap="round"/><circle cx="244" cy="152" r="7" fill="#a4cf6d"/>`,
time:`<ellipse cx="153" cy="210" rx="82" ry="11" fill="#d7cff2"/><circle cx="153" cy="111" r="94" fill="#e3dcfa"/><path d="M36 94h29m-39 22h30m-15 23h22" stroke="#b7a4e7" stroke-width="8" stroke-linecap="round"/><g transform="rotate(10 160 113)"><rect x="149" y="20" width="22" height="31" rx="8" fill="#8370bf"/><rect x="141" y="15" width="38" height="17" rx="7" fill="#b3a0e7"/><circle cx="160" cy="122" r="77" fill="#56438d"/><circle cx="160" cy="113" r="77" fill="#8670ca"/><circle cx="160" cy="113" r="62" fill="#fefeff"/><path d="M160 63v7m0 86v7m-50-50h7m86 0h7" stroke="#d6cbea" stroke-width="5" stroke-linecap="round"/><path d="M160 78v35l27 18" stroke="#58428f" stroke-width="9" stroke-linecap="round" stroke-linejoin="round" fill="none"/><circle cx="160" cy="113" r="8" fill="#b29be7"/></g><path d="m67 38 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#a38ad7"/><circle cx="249" cy="62" r="6" fill="#b09bdf"/>`,
cash:`<ellipse cx="150" cy="210" rx="88" ry="11" fill="#f1d8a3"/><circle cx="150" cy="111" r="94" fill="#f9e6bb"/><g fill="#d69b30"><rect x="43" y="160" width="100" height="24" rx="12"/><rect x="43" y="147" width="100" height="23" rx="11"/></g><rect x="43" y="140" width="100" height="23" rx="11" fill="#f7cd68"/><path d="M56 152h73M59 173h65" stroke="#fff0bc" stroke-width="3" stroke-linecap="round"/><g transform="rotate(-12 162 112)"><circle cx="169" cy="117" r="76" fill="#bd7f20"/><circle cx="162" cy="109" r="76" fill="#efba4f"/><circle cx="162" cy="109" r="61" fill="#ffdc7b" stroke="#f9edb3" stroke-width="4"/><path d="M181 82c-5-9-33-13-36 2-4 20 37 14 35 34-1 16-29 21-40 6m21-59v80" fill="none" stroke="#bc7d20" stroke-width="10" stroke-linecap="round"/></g><path d="m252 138 5 15 15 5-15 5-5 15-5-15-15-5 15-5Z" fill="#d9a342"/><circle cx="60" cy="56" r="6" fill="#eac16a"/>`
};
function art(type){return `<svg viewBox="0 0 300 235" focusable="false" aria-hidden="true">${scenes[type]}</svg>`;}
const groupFields={
  cyber:[[['setup','Upfront investment',100000,100,'$'],['monthly','Monthly cost',5000,50,'$']],[['frequency','Loss events / year',2,.05,''],['impact','Loss per event',1000000,1000,'$']],[['frequencyReduction','Fewer incidents',100,1,'%'],['impactReduction','Lower impact',100,1,'%']]],
  time:[[['setup','Upfront investment',100000,100,'$'],['monthly','Monthly cost',5000,50,'$']],[['volume','Tasks / month',10000,50,''],['beforeMinutes','Manual time / task',60,1,'min']],[['adoption','Adoption',100,1,'%'],['afterMinutes','Work retained / task',60,1,'min']]],
  cash:[[['setup','Upfront investment',100000,100,'$'],['monthly','Monthly cost',5000,50,'$']],[['annualSpend','Annual addressable spend',1000000,1000,'$']],[['savingsRate','Spend reduction',100,1,'%'],['realisation','Savings realised',100,1,'%']]]
};
let view='goals',inputGroup=0;
const currencySymbol=()=>new Intl.NumberFormat('en-AU',{style:'currency',currency:state.settings.currency,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(x=>x.type==='currency').value;
function setView(next,focus=true){
  view=next;
  document.querySelectorAll('.view').forEach(el=>el.hidden=el.id!==next+'-view');
  document.querySelectorAll('.journey [data-view]').forEach(el=>{
    const active=el.dataset.view===next;
    if(active)el.setAttribute('aria-current','step');else el.removeAttribute('aria-current');
  });
  renderResults();
  if(focus){
    window.scrollTo({top:0,behavior:'instant'});
    const target=next==='model'?$('#project-heading'):$('#'+(next==='goals'?'goals-title':'compare-title'));
    target.setAttribute('tabindex','-1');
    target.focus({preventScroll:true});
  }
}
function chooseGoal(type){
  let p=state.projects.find(p=>p.type===type);
  if(!p){if(state.projects.length>=20)return toast('Keep up to 20 opportunities per analysis.');p=example(type,crypto.randomUUID());state.projects.push(p);persist();}
  current=p.id;inputGroup=0;renderAll();setView('model');
}
function renderQuick(){
  const p=selected();
  const questions=['What will it cost?',p.type==='cyber'?'What’s at risk?':p.type==='time'?'What’s the workload?':'What’s the spend?','What could change?'];
  const captions=['Include setup and ongoing costs.',p.type==='cyber'?'Start with a realistic loss scenario.':p.type==='time'?'Use your current monthly workflow.':'Only spend this project can affect.','Set a target you can test.'];
  $('#question-title').textContent=questions[inputGroup];
  $('#question-caption').textContent=captions[inputGroup];
  $('#group-back').disabled=inputGroup===0;
  $('#group-next').innerHTML=inputGroup===2?'Compare options <span aria-hidden="true">→</span>':'Next <span aria-hidden="true">→</span>';
  document.querySelectorAll('[data-group]').forEach(el=>el.setAttribute('aria-pressed',String(Number(el.dataset.group)===inputGroup)));
  $('#quick-controls').innerHTML=groupFields[p.type][inputGroup].map(([key,label,max,step,unit])=>{
    const v=p[key],upper=Math.max(max,Number.isFinite(v)?v:0),percent=Number.isFinite(v)?Math.max(0,Math.min(100,v/upper*100)):0;
    return `<div class="slider-row"><label for="quick-${key}">${label}</label><div class="number-control"><span class="input-unit">${unit==='$'?esc(currencySymbol()):''}</span><input id="quick-${key}" data-key="${key}" type="number" inputmode="decimal" min="${LIMITS[key][0]}" max="${LIMITS[key][1]}" step="any" value="${Number.isFinite(v)?v:''}" required aria-label="${label}">${unit&&unit!=='$'?`<span class="input-unit suffix">${unit}</span>`:''}<div class="nudge-controls"><button type="button" data-nudge="${key}" data-amount="${-step}" aria-label="Decrease ${label.toLowerCase()}">−</button><button type="button" data-nudge="${key}" data-amount="${step}" aria-label="Increase ${label.toLowerCase()}">+</button></div></div><input type="range" data-key="${key}" aria-label="Adjust ${label.toLowerCase()}" min="0" max="${upper}" step="${step}" value="${Number.isFinite(v)?v:0}" style="--fill:${percent}%"></div>`;
  }).join('');
}
function renderSidebar(){
  $('#opportunity-select').innerHTML=state.projects.map(p=>`<option value="${esc(p.id)}" ${p.id===current?'selected':''}>${esc(p.name||'Untitled')}</option>`).join('');
}
function renderHeader(){
  const p=selected(),s=state.settings;
  document.body.dataset.mode=p.type;
  $('#mode-label').textContent=MODES[p.type].toUpperCase();
  $('#model-art').innerHTML=art(p.type);
  $('#project-heading').textContent=p.name||'Untitled opportunity';
  $('#example-badge').textContent=p.isExample?'Example':'Edit';
  $('#example-badge').title=p.isExample?'Edit this illustrative example':'Edit opportunity';
  $('#example-text').textContent=p.isExample?'Illustrative inputs. Add your own evidence.':'Your estimate.';
  $('#mark-own').hidden=!p.isExample;
  $('#horizon').value=s.months;$('#currency').value=s.currency;$('#remember').checked=remember;
  $('#evidence-summary').textContent=evidenceLabels[p.confidence];
  document.querySelectorAll('[data-scenario]').forEach(b=>{b.classList.toggle('active',b.dataset.scenario===scenario);b.setAttribute('aria-pressed',String(b.dataset.scenario===scenario));});
  $('#scenario-caption').textContent=scenario==='base'?'Base assumptions, unchanged.':scenario==='downside'?`Benefits −${s.benefitDown}% · costs +${s.costUp}%`:`Benefits +${s.benefitUp}% · costs −${s.costDown}%`;
  $('#matrix-horizon').textContent=`${s.months} MONTHS · ${s.currency} · ${scenario.toUpperCase()}`;
  $('#value-note').textContent=p.type==='cyber'?'Expected risk reduction':p.type==='time'?`Capacity · ${fmt(p.cashRealisation)}% cash realisation`:'Modelled cash savings';
}
function renderReturnBars(p,r){
  const max=Math.max(1,r.cost,Math.abs(r.benefit));
  const label=p.type==='cyber'?'Risk avoided':p.type==='time'?'Economic value':'Economic savings';
  $('#value-bars').innerHTML=[['Investment',r.cost,'cost'],[label,r.benefit,r.benefit<0?'negative':'benefit']].map(([name,value,kind])=>`<div class="value-bar-row"><div><span>${name}</span><strong>${money(value)}</strong></div><div class="value-bar-track"><span class="${kind}" style="width:${Math.min(100,Math.abs(value)/max*100)}%"></span></div></div>`).join('');
}
function renderComparisonCards(){
  $('#comparison-cards').innerHTML=state.projects.map(p=>{
    if(!validProject(p)||!validateSettings(state.settings))return `<button class="comparison-tile" data-project="${esc(p.id)}"><strong>${esc(p.name)}</strong><span>Check inputs</span></button>`;
    const r=calculate(p,state.settings,scenario);
    return `<button class="comparison-tile ${p.type}" data-project="${esc(p.id)}"><div class="comparison-tile-top"><span class="mini-icon"><svg viewBox="0 0 24 24" aria-hidden="true">${icons[p.type]}</svg></span><span class="example-pill">${p.isExample?'Example':evidenceLabels[p.confidence]}</span></div><strong>${esc(p.name)}</strong><span class="comparison-return ${r.ratio!==null&&r.ratio<0?'negative':''}">${ratio(r.ratio)}</span><span class="comparison-caption">Economic value per ${esc(currencySymbol())}1 <span aria-hidden="true">↗</span></span></button>`;
  }).join('');
}
function renderTrajectory(r){
  const months=state.settings.months;
  const values=r.flows.map(f=>f.cumulative);
  const rawMin=Math.min(0,...values),rawMax=Math.max(0,...values),span=Math.max(1,rawMax-rawMin);
  const min=rawMin-span*.18,max=rawMax+span*.18;
  const width=Math.max(240,$('#trajectory').clientWidth),right=width-12;
  const x=m=>32+m/months*(right-32),y=v=>18+(max-v)/(max-min)*154;
  const points=r.flows.map(f=>`${x(f.month)},${y(f.cumulative)}`);
  const path='M'+points.join(' L'),end=r.flows.at(-1),negative=r.net<0;
  let svg=`<svg class="trajectory" viewBox="0 0 ${width} 210" role="img" aria-labelledby="trajectory-title trajectory-desc"><title id="trajectory-title">Cumulative net economic value</title><desc id="trajectory-desc">Starts at ${esc(money(-r.flows[0].cost))}, ends at ${esc(money(r.net))} after ${months} months. ${r.breakEven===null?'Break-even is not reached.':`First month-end recovery: month ${r.breakEven}.`}</desc><defs><linearGradient id="value-fill" x1="0" y1="0" x2="0" y2="1"><stop stop-color="${negative?'#ba7864':'#79ac92'}" stop-opacity=".18"/><stop offset="1" stop-color="${negative?'#ba7864':'#79ac92'}" stop-opacity=".015"/></linearGradient></defs><line x1="32" y1="${y(0)}" x2="${right}" y2="${y(0)}" stroke="#d7e1da" stroke-dasharray="3 5"/><text x="20" y="${y(0)+4}" text-anchor="end" class="zero-label">$0</text><path d="${path} L${x(months)},${y(0)} L${x(0)},${y(0)} Z" fill="url(#value-fill)"/><path d="${path}" class="value-line ${negative?'negative-line':''}"/><circle cx="${x(months)}" cy="${y(end.cumulative)}" r="5.5" class="end-dot ${negative?'negative-dot':''}"/>`;
  if(r.breakEven!==null){
    const f=r.flows[r.breakEven],xx=x(f.month),yy=y(f.cumulative);
    svg+=`<circle cx="${xx}" cy="${yy}" r="4" fill="#fff" stroke="#3c7668" stroke-width="1.5"/><text x="${xx}" y="${yy+24}" text-anchor="${f.month>months*.75?'end':'middle'}" class="recovery-label">Break-even · month ${f.month}</text>`;
  }
  for(const m of [0,months/2,months]) svg+=`<text x="${x(m)}" y="201" text-anchor="${m===0?'start':m===months?'end':'middle'}">${m===0?'Today':`Month ${m}`}</text>`;
  $('#trajectory').innerHTML=svg+'</svg>';
}
function renderResults(){
  const p=selected(),errors=validate(p);
  if(errors.length||!validateSettings(state.settings)){
    $('#results').innerHTML=`<div class="error-panel" role="alert"><strong>Check your inputs</strong>${esc(errors.join(' ')||'Use valid sensitivity settings.')}</div>`;
    renderComparisonCards();
    for(const id of ['trajectory','summary-metrics','details-metrics','outcome','comparison-rows','value-bars']) $('#'+id).innerHTML='';
    $('#matrix').innerHTML='<p class="chart-note">Correct the inputs to show the matrix.</p>';
    $('#next-copy').textContent='Correct the inputs to continue.';
    return;
  }
  const r=calculate(p,state.settings,scenario),months=state.settings.months;
  const value=p.type==='time'?r.hoursPer1000:p.type==='cash'?r.cashRatio:r.ratio;
  const label=p.type==='time'?`Hours recovered per ${currencySymbol()}1,000`:p.type==='cash'?`Cash saved per ${currencySymbol()}1`:`Risk reduced per ${currencySymbol()}1`;
  const caption=p.type==='cyber'?'Expected loss avoided, less new risk':p.type==='time'?(r.hours<0?'Additional work required':'Time available for higher-value work'):'Gross savings before project cost';
  $('#results').innerHTML=`<div class="return-block"><div class="return-number ${value!==null&&value<0?'negative':''}">${value===null?'—':p.type==='time'?fmt(value):value.toFixed(2)}${value!==null?`<span class="unit">${p.type==='time'?'h':'×'}</span>`:''}</div><p class="return-label">${label}</p><p class="return-caption">${caption}</p></div>`;
  $('#summary-metrics').innerHTML=`<div class="summary-item"><span>Net value</span><strong class="${r.net<0?'negative':'positive'}">${r.net>0?'+':''}${compact(r.net)}</strong></div><div class="summary-item"><span>${p.type==='cash'&&p.introducedRisk===0?'Cash break-even':'Economic break-even'}</span><strong>${r.breakEven===null?'—':`${r.breakEven} <span class="unit">months</span>`}</strong></div>`;
  $('#details-metrics').innerHTML=`<span>Total cost<b>${money(r.cost)}</b></span><span>Net economic value<b>${money(r.net)}</b></span><span>ROI<b>${r.roi===null?'—':fmt(r.roi)+'%'}</b></span><span>NPV<b>${money(r.npv)}</b></span><span>Benefits active<b>${r.activeMonths} months</b></span><span>Break-even<b>${r.breakEven===null?'Not reached':r.breakEven+' months'}</b></span>`;
  renderReturnBars(p,r);renderComparisonCards();renderTrajectory(r);
const bar=(label,value,max,light=false)=>`<div class="bar-row"><div class="bar-label"><span>${esc(label)}</span><b>${money(value)}</b></div><div class="bar-track"><div class="bar-fill ${light?'light':''}" style="width:${Math.max(0,Math.min(100,max>0?value/max*100:0))}%"></div></div></div>`;
if(p.type==='cyber')$('#outcome').innerHTML=bar('Baseline annual expected loss',r.baseline,Math.max(r.baseline,r.residualAdjusted))+bar('Residual annual loss, including new risk',r.residualAdjusted,Math.max(r.baseline,r.residualAdjusted),true)+`<p class="outcome-note">${money(r.annualBenefit)} annual expected loss reduction after go-live. A modelled risk benefit, not guaranteed cash savings.</p><div class="outcome-split"><span>Risk reduction</span><strong>${r.baseline>0?fmt(r.annualBenefit/r.baseline*100)+'%':'No baseline loss'}</strong></div>`;
if(p.type==='time')$('#outcome').innerHTML=bar('Capacity value (non-cash)',r.capacityValue,Math.max(0,r.capacityValue+r.cash))+bar('Cash share backed by expense reduction',r.cash,Math.max(0,r.capacityValue+r.cash),true)+`<p class="outcome-note">${fmt(r.hours)} hours ${r.hours<0?'of extra work':'recovered'} over ${months} months. These are two parts of the same value; they are not added twice.${p.introducedRisk>0?` New risk subtracts ${money(p.introducedRisk*r.activeMonths/12)} from the total.`:''}</p><div class="outcome-split"><span>Economic value / $1</span><strong>${ratio(r.ratio)}</strong></div>`;
if(p.type==='cash')$('#outcome').innerHTML=bar('Gross cash savings across horizon',r.cash,Math.max(r.cash,r.cost))+bar('Total project cost across horizon',r.cost,Math.max(r.cash,r.cost),true)+`<p class="outcome-note">${money(r.cash-r.cost)} cash savings after project cost, before any new expected risk. Validate each saving against an expense that will actually reduce.</p><div class="outcome-split"><span>New expected risk in horizon</span><strong>${money(p.introducedRisk*r.activeMonths/12)}</strong></div>`;
$('#next-heading').textContent=p.confidence==='measured'?'Check that the benefit holds.':p.confidence==='estimated'?'Turn the estimate into a pilot.':'Test the biggest uncertainty.';
$('#next-copy').textContent=p.validation||'Define a baseline, a pilot period and a measurable success threshold.';
renderMatrix();renderComparison();}
function renderMatrix(){const ps=state.projects.filter(validProject),rs=ps.map(p=>calculate(p,state.settings,scenario));const max=Math.max(1000,...rs.flatMap(r=>[r.cost,r.benefit]))*1.2;const min=Math.min(0,...rs.map(r=>r.benefit))*1.2;const left=58,top=30,w=310,h=220;const x=v=>left+v/max*w,y=v=>top+h-(v-min)/(max-min)*h;let svg=`<svg class="plot" viewBox="0 0 400 305" role="group" aria-labelledby="plot-title plot-desc"><title id="plot-title">Investment versus modelled economic value</title><desc id="plot-desc">Horizontal axis: total cost. Vertical axis: benefit. Both in ${esc(state.settings.currency)} over ${state.settings.months} months. Opportunities above the diagonal return more modelled value than their cost. Values are also available in the comparison table.</desc><rect x="58" y="30" width="310" height="220" rx="3" fill="#f8faf5"/><path d="M${x(0)},${y(0)} L${x(max)},${y(max)} L${x(0)},${y(max)} Z" fill="#e9f1dd"/>`;
for(let i=0;i<=4;i++){const v=max*i/4,yy=min+(max-min)*i/4;svg+=`<line x1="${x(v)}" y1="30" x2="${x(v)}" y2="250" stroke="#e0e6d9"/><line x1="58" y1="${y(yy)}" x2="368" y2="${y(yy)}" stroke="#e0e6d9"/><text x="${x(v)}" y="267" text-anchor="middle">${esc(compact(v))}</text><text x="51" y="${y(yy)+3}" text-anchor="end">${esc(compact(yy))}</text>`;}
svg+=`<path d="M${x(0)},${y(0)} L${x(max)},${y(max)}" stroke="#99ac88" stroke-dasharray="4 4"/><text x="70" y="47" style="font-size:8px;fill:#68815a;letter-spacing:.06em">VALUE EXCEEDS COST</text><text x="300" y="240" style="font-size:8px">BREAK-EVEN ↗</text><text x="213" y="292" text-anchor="middle" class="axis-label">TOTAL INVESTMENT (${state.settings.currency}) →</text><text x="10" y="143" text-anchor="middle" transform="rotate(-90 10 143)" class="axis-label">ECONOMIC VALUE (${state.settings.currency}) →</text>`;
ps.forEach((p,i)=>{const r=rs[i],idx=state.projects.indexOf(p)+1;svg+=`<g class="point" data-project="${esc(p.id)}" role="button" tabindex="0" aria-label="${esc(p.name)}: cost ${esc(money(r.cost))}, value ${esc(money(r.benefit))}"><title>${esc(p.name)} · ${esc(ratio(r.ratio))} value / cost</title><circle cx="${x(r.cost)}" cy="${y(r.benefit)}" r="${p.id===current?13:10}" fill="${colours[p.type]}" ${p.id===current?'class="selected-point"':''}/><text x="${x(r.cost)}" y="${y(r.benefit)+3}" text-anchor="middle">${idx}</text></g>`;});
$('#matrix').innerHTML=svg+'</svg>';}
function renderComparison(){ $('#comparison-rows').innerHTML=state.projects.map((p,i)=>{if(!validProject(p))return `<tr><td>${esc(p.name)}</td><td colspan="5">Correct invalid inputs.</td></tr>`;const r=calculate(p,state.settings,scenario);return `<tr><td><button data-project="${esc(p.id)}">${String(i+1).padStart(2,'0')} &nbsp; ${esc(p.name)}</button><small>${typeLabel[p.type]}${p.isExample?' · example':''}</small></td><td>${money(r.cost)}</td><td>${ratio(r.ratio)}${p.type==='time'?`<small>${fmt(r.hoursPer1000??0)} hours / $1,000</small>`:''}</td><td class="${r.net<0?'warning':''}">${money(r.net)}</td><td>${r.breakEven===null?'Not reached':r.breakEven+' months'}</td><td><span class="pill">${evidenceLabels[p.confidence]}</span></td></tr>`;}).join('');}
function renderSensitivity(){const labels={benefitDown:'Downside benefit reduction (%)',costUp:'Downside cost increase (%)',benefitUp:'Upside benefit increase (%)',costDown:'Upside cost reduction (%)',discount:'Annual discount rate (%)'};$('#sensitivity-fields').innerHTML=Object.entries(labels).map(([k,l])=>`<div class="field"><label for="setting-${k}">${l}</label><input id="setting-${k}" data-setting="${k}" type="number" min="0" max="${k==='discount'?50:k==='benefitUp'||k==='costUp'?200:100}" step="any" value="${state.settings[k]}" required></div>`).join('');}
function renderAll(){renderSidebar();renderHeader();renderForm();renderQuick();renderSensitivity();renderResults();}
function selectProject(id){current=id;inputGroup=0;renderAll();setView('model');}
function download(content,name,type){const url=URL.createObjectURL(new Blob([content],{type}));const link=document.createElement('a');link.href=url;link.download=name;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
function exportJSON(){if(!allValid())return;download(serialise(),'dobson-value-lab-analysis.json','application/json');toast('Analysis downloaded. It includes your inputs and evidence notes.');}
function allValid(){if(!state.projects.every(validProject)||!validateSettings(state.settings)){toast('Correct invalid inputs before exporting.');return false;}return true;}
function confirmAction(title,copy,action){pending=action;$('#confirm-title').textContent=title;$('#confirm-copy').textContent=copy;$('#confirm-dialog').showModal();}
function brief(){if(!allValid())return;const s=state.settings;$('#brief').innerHTML=`<div class="brief-head"><p class="eyebrow">DOBSON DEVELOPMENT / VALUE LAB ${VERSION}</p><h2>Investment decision brief</h2><p>${new Intl.DateTimeFormat('en-AU',{dateStyle:'long'}).format(new Date())} · ${s.currency} · ${s.months} months · ${esc(scenario)} case · annual discount rate ${s.discount}%</p><p>Prepared from user assumptions. Examples are fictional. This is a decision aid, not a prediction or an assurance of performance.</p></div>`+state.projects.map(p=>{const r=calculate(p,s,scenario);return `<section class="brief-project"><p class="eyebrow">${MODES[p.type].toUpperCase()} / ${esc(evidenceLabels[p.confidence])}${p.isExample?' / ILLUSTRATIVE EXAMPLE':''}</p><h3>${esc(p.name)}</h3><div class="brief-stats"><div>Total investment<strong>${money(r.cost)}</strong></div><div>Economic value / $1<strong>${ratio(r.ratio)}</strong></div><div>Net value<strong>${money(r.net)}</strong></div><div>NPV<strong>${money(r.npv)}</strong></div><div>Economic break-even<strong>${r.breakEven===null?'Not reached':r.breakEven+' months'}</strong></div></div>${p.type==='time'?`<p><strong>${fmt(r.hours)} hours recovered; ${money(r.cash)} cash share and ${money(r.capacityValue)} non-cash capacity value before costs and new risk.</strong></p>`:p.type==='cash'?`<p><strong>${money(r.cash)} gross cash savings before cost; ${money(r.cash-r.cost)} after cost and before new expected risk.</strong></p>`:`<p><strong>Baseline annual loss ${money(r.baseline)}; residual annual loss ${money(r.residualAdjusted)} including new risk.</strong></p>`}<div class="brief-assumptions">${Object.keys(DEFAULTS[p.type]).filter(k=>LIMITS[k]).map(k=>`<span>${numLabels[k]}<b>${fmt(p[k])}</b></span>`).join('')}</div><table class="brief-scenarios"><thead><tr><th>Scenario</th><th>Total cost</th><th>Economic benefit</th><th>Net value</th><th>Value / $1</th></tr></thead><tbody>${['downside','base','upside'].map(sc=>{const z=calculate(p,s,sc);return `<tr><td>${sc}</td><td>${money(z.cost)}</td><td>${money(z.benefit)}</td><td>${money(z.net)}</td><td>${ratio(z.ratio)}</td></tr>`;}).join('')}</tbody></table><p><b>Owner:</b> ${esc(p.owner||'Not assigned')}<br><b>Evidence:</b> ${esc(p.evidence||'No source evidence recorded.')}<br><b>Next step:</b> ${esc(p.validation||'Not defined.')}</p></section>`;}).join('')+`<section class="brief-project"><h3>Model notes & next decision</h3><p>Downside: gross benefits −${s.benefitDown}%, costs +${s.costUp}%. Upside: gross benefits +${s.benefitUp}%, costs −${s.costDown}%. Benefits are capped at modelled physical limits; negative benefits get worse in the downside. New expected risk is unchanged. These are sensitivity cases, not confidence intervals.</p><p>Setup is paid at month 0, operating costs from month 1, benefits after go-live delay. NPV discounts monthly net value. Expected cyber loss and staff capacity are not guaranteed cash savings. Do not total overlapping opportunities. Check mandatory requirements, service quality, human oversight and residual risk before approval.</p><p><b>Cyber:</b> events/year × loss/event, reduced by frequency and impact controls.<br><b>Capacity:</b> tasks × adoption × minutes saved after retained work and review ÷ 60 × loaded hourly cost.<br><b>Cash:</b> annual addressable spend × reduction × realisation.<br>All models subtract introduced expected risk from economic benefit, and all project costs from net value.</p><p>Source: https://github.com/RADobson/dobson-value-lab<br>Reference framing: NIST SP 800-30 Rev. 1; NIST AI Risk Management Framework. This simplified model is not a certification of either framework.</p><p><b>Pilot success measure:</b> ___________________________<br><b>Review date and owner:</b> ___________________________<br><b>Decision / conditions:</b> ___________________________</p></section>`;$('#brief-dialog').showModal();}
$('#quick-controls').addEventListener('submit',e=>e.preventDefault());
$('#quick-controls').addEventListener('input',e=>{
  const el=e.target,key=el.dataset.key;
  if(!key)return;
  const value=el.value===''?NaN:Number(el.value);
  selected()[key]=value;
  const row=el.closest('.slider-row'),slider=row.querySelector('input[type=range]'),number=row.querySelector('input[type=number]');
  if(el.type==='range')number.value=value;
  else if(Number.isFinite(value)){
    slider.max=Math.max(Number(slider.max),value);
    slider.value=value;
  }
  slider.style.setProperty('--fill',`${Number.isFinite(value)?Math.max(0,Math.min(100,value/Number(slider.max)*100)):0}%`);
  $('#field-'+key).value=Number.isFinite(value)?value:'';
  renderResults();persist();
});
$('#quick-controls').addEventListener('change',e=>{
  const key=e.target.dataset.key;if(key&&Number.isFinite(selected()[key]))renderHeader();
});
for(const [trigger,target] of Object.entries({'export-open':'export-dialog','assumptions-open':'assumptions-dialog','example-badge':'assumptions-dialog','details-open':'details-dialog','scenario-settings':'sensitivity-dialog'})){
  $('#'+trigger).onclick=()=>$('#'+target).showModal();
}
$('#assumptions').addEventListener('input',e=>{const el=e.target;if(!el.name)return;const p=selected();p[el.name]=LIMITS[el.name]?(el.value===''?NaN:Number(el.value)):el.value;renderSidebar();renderHeader();renderQuick();renderResults();persist();});
$('#assumptions').addEventListener('submit',e=>e.preventDefault());
$('#sensitivity-fields').addEventListener('input',e=>{const k=e.target.dataset.setting;if(!k)return;state.settings[k]=e.target.value===''?NaN:Number(e.target.value);renderHeader();renderResults();persist();});
document.addEventListener('click',e=>{const project=e.target.closest('[data-project]');if(project){selectProject(project.dataset.project);return;}const close=e.target.closest('[data-close]');if(close){$('#'+close.dataset.close).close();return;}const sc=e.target.closest('[data-scenario]');if(sc){scenario=sc.dataset.scenario;renderHeader();renderResults();return;}const add=e.target.closest('[data-add]');if(add){if(state.projects.length>=20)return toast('Keep up to 20 opportunities per analysis.');const p=example(add.dataset.add,crypto.randomUUID());state.projects.push(p);current=p.id;inputGroup=0;$('#add-dialog').close();renderAll();setView('model');persist();}});
$('#matrix').addEventListener('keydown',e=>{const p=e.target.closest('[data-project]');if(p&&['Enter',' '].includes(e.key)){e.preventDefault();selectProject(p.dataset.project);}});
$('#horizon').onchange=e=>{state.settings.months=Number(e.target.value);renderHeader();renderResults();persist();};
$('#currency').onchange=e=>{state.settings.currency=e.target.value;renderAll();persist();toast('Currency label changed. Input amounts are not converted.');};
$('#mark-own').onclick=()=>{selected().isExample=false;renderAll();persist();};
$('#remember').onchange=e=>{remember=e.target.checked;if(remember)persist();else{try{localStorage.removeItem(KEY);}catch{}$('#storage-status').textContent='Device copy cleared. Current page is unchanged.';}};
$('#method-open').onclick=()=>$('#method-dialog').showModal();
$('#add-open').onclick=()=>$('#add-dialog').showModal();
$('#focus-evidence').onclick=()=>{$('#details-dialog').close();$('#assumptions-dialog').showModal();const el=$('#field-evidence');el.closest('details').open=true;el.focus();};
$('#export-csv').onclick=()=>{if(allValid()){download(toCSV(state.projects,state.settings),'dobson-value-lab-comparison.csv','text/csv;charset=utf-8');toast('Comparison downloaded with all three sensitivity cases.');}};
$('#export-json').onclick=$('#confirm-save').onclick=exportJSON;
$('#import-json').onclick=()=>$('#import-file').click();
$('#import-file').onchange=async e=>{const f=e.target.files[0];if(!f)return;try{if(f.size>1000000)throw new Error('Choose a JSON export under 1 MB.');const imported=parseImport(await f.text());confirmAction('Open this analysis?','This replaces the current opportunities and settings. Save your current analysis first if you want to keep it.',()=>{state=imported;current=state.projects[0].id;scenario='base';inputGroup=0;renderAll();setView('model');$('#export-dialog').close();persist();toast('Analysis opened.');});}catch(err){toast('Could not open analysis: '+err.message);}finally{e.target.value='';}};
$('#reset').onclick=()=>confirmAction('Reset to the examples?','This clears the current analysis and its saved device copy. Download your analysis first if you want to keep it.',()=>{try{localStorage.removeItem(KEY);}catch{}remember=false;state={schemaVersion:1,settings:{...INITIAL_SETTINGS},projects:[example('cyber','email'),example('time','intake'),example('cash','processing')]};current='email';scenario='base';$('#storage-status').textContent='';inputGroup=0;renderAll();setView('goals');$('#export-dialog').close();toast('Reset to illustrative examples.');});
$('#confirm-yes').onclick=()=>{const action=pending;pending=null;$('#confirm-dialog').close();action?.();};
$('#print').onclick=()=>{$('#export-dialog').close();brief();};$('#print-now').onclick=()=>window.print();
document.querySelectorAll('[data-art]').forEach(el=>el.innerHTML=art(el.dataset.art));
document.addEventListener('click',e=>{
  const goal=e.target.closest('[data-goal]');if(goal){chooseGoal(goal.dataset.goal);return;}
  const nav=e.target.closest('[data-view]');if(nav){setView(nav.dataset.view);return;}
  const group=e.target.closest('[data-group]');if(group){inputGroup=Number(group.dataset.group);renderQuick();return;}
  const nudge=e.target.closest('[data-nudge]');if(nudge){
    const key=nudge.dataset.nudge,p=selected(),[min,max]=LIMITS[key];
    p[key]=Math.min(max,Math.max(min,Number(((Number.isFinite(p[key])?p[key]:0)+Number(nudge.dataset.amount)).toFixed(6))));
    $('#field-'+key).value=p[key];
    // Keep the focused button in place for repeated keyboard or pointer adjustments.
    const row=nudge.closest('.slider-row'),number=row.querySelector('input[type=number]');
    number.value=p[key];number.dispatchEvent(new Event('input',{bubbles:true}));
  }
});
$('#group-back').onclick=()=>{inputGroup=Math.max(0,inputGroup-1);renderQuick();};
$('#group-next').onclick=()=>{if(inputGroup<2){inputGroup++;renderQuick();$('#question-title').setAttribute('tabindex','-1');$('#question-title').focus();}else setView('compare');};
$('#opportunity-select').onchange=e=>selectProject(e.target.value);
$('#compare-brief').onclick=brief;
let resizeFrame;
window.addEventListener('resize',()=>{cancelAnimationFrame(resizeFrame);resizeFrame=requestAnimationFrame(renderResults);});
renderAll();
setView('goals',false);
