/** Pure, dependency-free model. All currency inputs use the same selected currency. */
export const VERSION = '0.1.0';
export const MODES = { cyber: 'Cyber risk', time: 'AI capacity', cash: 'Cash savings' };
export const DEFAULTS = {
  cyber: { name: 'Protect business email', type: 'cyber', setup: 12000, monthly: 500, delay: 1, frequency: 0.4, impact: 200000, frequencyReduction: 50, impactReduction: 20, introducedRisk: 0, confidence: 'hypothesis', evidence: '', owner: '', validation: 'Validate event frequency and loss range; test control effectiveness.' },
  time: { name: 'Automate document intake', type: 'time', setup: 15000, monthly: 600, delay: 2, volume: 1200, beforeMinutes: 12, afterMinutes: 3, reviewMinutes: 2, adoption: 75, hourlyCost: 65, cashRealisation: 0, introducedRisk: 0, confidence: 'hypothesis', evidence: '', owner: '', validation: 'Time a representative sample, including exceptions and human review.' },
  cash: { name: 'Reduce processing spend', type: 'cash', setup: 18000, monthly: 400, delay: 2, annualSpend: 120000, savingsRate: 35, realisation: 80, introducedRisk: 0, confidence: 'hypothesis', evidence: '', owner: '', validation: 'Confirm which invoices, contracts or overtime payments will actually reduce.' }
};
export function example(type, id) { return { ...DEFAULTS[type], id, isExample: true }; }
export const INITIAL_SETTINGS = { months: 12, currency: 'AUD', discount: 8, benefitDown: 30, benefitUp: 20, costUp: 20, costDown: 0 };
export const LIMITS = {
  setup: [0, 1e9], monthly: [0, 1e8], delay: [0, 120], frequency: [0, 10000], impact: [0, 1e10], frequencyReduction: [0,100], impactReduction:[0,100], introducedRisk:[0,1e9], volume:[0,1e8], beforeMinutes:[0,100000], afterMinutes:[0,100000], reviewMinutes:[0,100000], adoption:[0,100], hourlyCost:[0,100000], cashRealisation:[0,100], annualSpend:[0,1e10], savingsRate:[0,100], realisation:[0,100]
};
export function validate(p) {
  if (!p || !Object.hasOwn(DEFAULTS, p.type)) return ['Unknown opportunity type.'];
  const errors = [];
  if (typeof p.name !== 'string' || !p.name.trim() || p.name.length > 100) errors.push('Name must be 1–100 characters.');
  for (const key of Object.keys(DEFAULTS[p.type])) {
    if (!LIMITS[key]) continue;
    const v = p[key], [min,max] = LIMITS[key];
    if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) errors.push(`${key} must be between ${min} and ${max}.`);
  }
  if (!Number.isInteger(p.delay)) errors.push('Go-live delay must be a whole number of months.');
  if (!['hypothesis','estimated','measured'].includes(p.confidence)) errors.push('Invalid evidence level.');
  for (const key of ['evidence','owner','validation']) if (typeof p[key] !== 'string' || p[key].length > 3000) errors.push(`Invalid ${key}.`);
  return errors;
}
export function validateSettings(s) {
  if (!s || ![12,24,36].includes(s.months) || !['AUD','USD','GBP','EUR','NZD'].includes(s.currency)) return false;
  return ['discount','benefitDown','benefitUp','costUp','costDown'].every(k => typeof s[k] === 'number' && Number.isFinite(s[k]) && s[k] >= 0 && s[k] <= (k === 'benefitUp' || k === 'costUp' ? 200 : k === 'discount' ? 50 : 100));
}
export function annual(p) {
  const errors = validate(p); if (errors.length) throw new RangeError(errors.join(' '));
  let benefit = 0, cash = 0, hours = 0, baseline = 0, residual = 0;
  if (p.type === 'cyber') {
    baseline = p.frequency * p.impact;
    residual = baseline * (1-p.frequencyReduction/100) * (1-p.impactReduction/100);
    benefit = baseline - residual;
  } else if (p.type === 'time') {
    hours = p.volume * 12 * p.adoption/100 * (p.beforeMinutes-p.afterMinutes-p.reviewMinutes)/60;
    benefit = hours * p.hourlyCost;
    cash = benefit * p.cashRealisation/100;
  } else {
    benefit = p.annualSpend * p.savingsRate/100 * p.realisation/100;
    cash = benefit;
  }
  return {benefit, cash, hours, baseline, residual, introducedRisk: p.introducedRisk};
}
/** Sensitivities are stress tests, not probabilities or statistical confidence intervals. */
export function calculate(p, settings = INITIAL_SETTINGS, scenario = 'base') {
  if (!validateSettings(settings)) throw new RangeError('Invalid model settings.');
  if (!['downside','base','upside'].includes(scenario)) throw new RangeError('Unknown scenario.');
  const a = annual(p);
  const lower = scenario === 'downside', higher = scenario === 'upside';
  const benefitScale = lower ? 1-settings.benefitDown/100 : higher ? 1+settings.benefitUp/100 : 1;
  const costScale = lower ? 1+settings.costUp/100 : higher ? 1-settings.costDown/100 : 1;
  // Negative benefits get worse in the downside; upside cannot invent a positive benefit.
  const signedScale = a.benefit < 0 ? (lower ? 1+settings.benefitDown/100 : higher ? Math.max(0,1-settings.benefitUp/100) : 1) : benefitScale;
  let operatingBenefit = a.benefit * signedScale;
  if (p.type === 'cyber') operatingBenefit = Math.min(a.baseline, operatingBenefit);
  if (p.type === 'cash') operatingBenefit = Math.min(p.annualSpend, operatingBenefit);
  if (p.type === 'time') operatingBenefit = Math.min(p.volume*12*p.beforeMinutes/60*p.hourlyCost, operatingBenefit);
  const effectiveScale = a.benefit !== 0 ? operatingBenefit/a.benefit : signedScale;
  const annualBenefit = operatingBenefit - a.introducedRisk;
  const activeMonths = Math.max(0,settings.months-p.delay);
  const setup = p.setup*costScale, monthly = p.monthly*costScale;
  const cost = setup + monthly*settings.months;
  const benefit = annualBenefit*activeMonths/12;
  const cash = a.cash*effectiveScale*activeMonths/12;
  const hours = a.hours*effectiveScale*activeMonths/12;
  let npv=-setup, cumulative=-setup, breakEven=null;
  const flows = [{month:0,benefit:0,cost:setup,cumulative}];
  const rate=Math.pow(1+settings.discount/100,1/12)-1;
  for(let m=1;m<=settings.months;m++) {
    const b=m>p.delay ? annualBenefit/12 : 0;
    cumulative += b-monthly;
    npv += (b-monthly)/Math.pow(1+rate,m);
    flows.push({month:m,benefit:b,cost:monthly,cumulative});
    if(b-monthly>0 && cumulative>=0 && breakEven===null) breakEven=m;
  }
  // The result represents first month-end recovery inside the selected horizon only.
  return { ...a, annualBenefit, operatingBenefit, cost, benefit, net:benefit-cost, cash, capacityValue: p.type==='time' ? (a.benefit-a.cash)*effectiveScale*activeMonths/12 : 0,
    hours, ratio:cost>0 ? benefit/cost : null, cashRatio:cost>0 ? cash/cost : null, hoursPer1000:cost>0 ? hours/cost*1000 : null,
    roi:cost>0 ? (benefit-cost)/cost*100 : null, npv, breakEven, activeMonths, flows, residualAdjusted:p.type==='cyber' ? a.baseline-operatingBenefit+a.introducedRisk : null,
    scenario, costScale, benefitScale };
}
export function parseImport(raw) {
  const data = JSON.parse(raw);
  if (data.schemaVersion !== 1 || !validateSettings(data.settings) || !Array.isArray(data.projects) || data.projects.length < 1 || data.projects.length > 20) throw new Error('Choose a Value Lab JSON export containing 1–20 opportunities.');
  const ids = new Set();
  const projects=data.projects.map(p=>{
    const errors=validate(p); if(errors.length) throw new Error(errors[0]);
    if(typeof p.id!=='string'||!/^[-a-zA-Z0-9_]{1,80}$/.test(p.id)||ids.has(p.id)) throw new Error('Invalid or duplicate opportunity ID.');
    ids.add(p.id);
    return Object.fromEntries(['id','isExample',...Object.keys(DEFAULTS[p.type])].map(k=>[k,k==='isExample' ? p[k]===true : p[k]]));
  });
  return {schemaVersion:1,settings:{...data.settings},projects};
}
export function csvCell(value) {
  let s=String(value??'');
  if(/^[\s]*[=+\-@]/.test(s)) s="'"+s;
  return '"'+s.replaceAll('"','""')+'"';
}
export function toCSV(projects, settings) {
  const header=['Opportunity','Model','Evidence','Horizon months','Currency','Scenario','Total cost','Benefit incl capacity or risk reduction','Net value','Benefit per dollar','Hours recovered','Cash savings before cost','NPV','Month-end break-even','Evidence notes'];
  const rows=projects.flatMap(p=>['downside','base','upside'].map(s=>{const r=calculate(p,settings,s);return [p.name,MODES[p.type],p.confidence,settings.months,settings.currency,s,r.cost,r.benefit,r.net,r.ratio,r.hours,r.cash,r.npv,r.breakEven,p.evidence];}));
  return [header,...rows].map(row=>row.map(csvCell).join(',')).join('\r\n');
}
