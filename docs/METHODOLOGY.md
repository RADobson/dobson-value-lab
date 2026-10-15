# Transparent value model — v0.1

All example values are synthetic. No default probability, cost, reduction percentage or sensitivity is an industry benchmark. A confident-looking output does not improve the quality of its inputs.

## Common basis

Choose one currency and a 12-, 24- or 36-month horizon. Currency changes do not convert values. All cash inputs must have the same currency and tax basis.

Let H be horizon months, D the whole-month go-live delay, I implementation cost, C monthly operating cost, and B annual modelled benefit after introduced expected risk.

- Active benefit months: `max(0, H − D)`.
- Total cost: `I + C × H`.
- Horizon benefit: `B × active months / 12`.
- Net economic value: `horizon benefit − total cost`.
- Value per dollar: `horizon benefit / total cost`.
- ROI: `net economic value / total cost × 100%`.
- Ratio and ROI are undefined at zero cost, shown as a dash.
- NPV: upfront implementation cost at month 0 plus each month's net benefit discounted at `(1 + annual discount rate)^(month / 12)`.
- Break-even: first month-end where cumulative undiscounted benefit covers implementation and recurring costs, provided that month's incremental net benefit is positive. Only the selected horizon is evaluated; otherwise display "Not reached".

Costs begin in month 1. Benefits start in month `D + 1` without a ramp. Implementation cost must include internal time, integration, change management and training. Operating cost should include licences, model/API usage, hosting, support and ongoing governance. Taxes, inflation, financing and terminal value are not modelled.

## Cyber risk

Define one loss scenario or a defensible bundle of non-overlapping scenarios.

```
baseline annual expected loss = annual event frequency × mean loss per event
residual loss = baseline × (1 − frequency reduction) × (1 − impact reduction)
annual benefit = baseline − residual − introduced annual expected loss
```

Frequency is an expected count, not a percentage probability. A value of 0.4 means an average of one event per 2.5 years over many equivalent exposures; it does not imply predictable timing. Frequency can exceed 1. Event losses must consistently include direct and indirect loss without duplication. Include uncertainty and extreme-event exposure in discussion; this tool does not simulate a loss distribution or tail risk.

Risk reduction is economic expected loss avoidance. It is not booked cash, an insurance quote, a guarantee or a compliance judgement. Apply controls incrementally; independent opportunities may overlap or interact, so portfolio benefits are not summed.

## AI capacity

```
annual adopted tasks = monthly tasks × 12 × adoption
annual recovered hours = adopted tasks × (manual − retained − extra review minutes) / 60
annual gross value = recovered hours × loaded hourly cost
cash share = gross value × cash realisation
capacity value = gross value − cash share
annual economic benefit = gross value − introduced annual expected loss
```

Retained work includes exception and fallback handling. Review minutes are additional human review not already included in retained work. If the automation increases work, hours and value are negative. Do not silently clamp adverse outcomes to zero.

Cash realisation starts at 0%. Increase it only when an expense will actually fall (for example reduced paid overtime or contractor invoices). The remainder is time available for other work. Cash and capacity are a split of the same benefit, not additive benefits on top of it. Quality, staff wellbeing and service speed can be tracked separately rather than assigned invented dollar values.

The headline hours-per-$1,000 metric uses recovered hours across the chosen horizon divided by total horizon cost. The comparison table uses economic value per dollar across every category so unlike units are not ranked together.

## Cash savings

```
annual gross cash savings = addressable annual spend × reduction × realisation
annual economic benefit = gross cash savings − introduced annual expected loss
```

Use contract, invoice, overtime or other spend that will actually stop. Avoid repeating the labour benefit from an AI capacity opportunity. New expected risk changes economic value but is not represented as a certain cash payment; gross cash savings and cash savings after project cost are labelled separately.

## Sensitivity and evidence

Default downside: benefits 30% lower, costs 20% higher. Default upside: benefits 20% higher, costs unchanged. All are editable fictional stress assumptions.

Only gross benefits and project costs are scaled. Introduced expected risk is held constant. Negative gross benefits become more negative in the downside. Physical caps prevent avoided loss exceeding baseline loss, cash savings exceeding addressable spend, or time value exceeding all manual work value. These are deterministic stress cases, not probability-weighted forecasts or confidence intervals. They do not replace analysis of uncertain input distributions, dependencies or tail losses.

Evidence labels (hypothesis, informed estimate, measured/tested) annotate the case and do not multiply the benefit by an arbitrary confidence factor. Record the source, date, sample size and uncertainty. A future pilot should compare realised measurements with the baseline.

## Reference framing

- [NIST SP 800-30 Rev. 1, Guide for Conducting Risk Assessments](https://csrc.nist.gov/pubs/sp/800/30/r1/final) provides risk-assessment context for decision makers.
- [NIST AI Risk Management Framework](https://www.nist.gov/itl/ai-risk-management-framework) provides voluntary AI trustworthiness and risk-management context.

The formulas, presentation and sensitivities above are Value Lab's simplified design. This is not a complete implementation, certification, endorsement or numerical scoring system supplied by NIST.
