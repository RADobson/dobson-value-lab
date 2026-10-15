# Dobson Development — Value Lab

**Make the case. See the trade-offs.**

An open-source, browser-local sales discovery and investment workbench for cybersecurity and AI automation. Compare **expected risk reduced**, **hours recovered** and **actual spend reduced** per dollar invested, with all assumptions visible.

[Methodology](docs/METHODOLOGY.md) · [Sales playbook and product ideas](docs/PRODUCT.md) · [MIT licence](LICENSE)

A private ChatGPT Site has been registered, but publication is pending because the current app session rejected the publishing helper's input. The reserved address is `https://dobson-value-lab.richard-arthur-dobso.chatgpt.site`; it is not yet a verified live deployment. Repository code is public and can be self-hosted. Website audience is configured separately in Sites.

## What it does

- Three opportunity models: cyber risk, AI capacity and cash savings.
- Editable, clearly fictional examples, with up to 20 opportunities.
- A comparable cost/value matrix and an accessible comparison table.
- 12-, 24- or 36-month horizon, monthly operating costs and go-live delay.
- Downside/base/upside sensitivities, net value, ROI, NPV and month-end break-even.
- Evidence quality, source notes, decision owner and a pilot validation step.
- Printable decision briefs, CSV comparison and validated JSON import/export.
- Optional device storage; no analytics, account integration, AI calls or application backend.
- Responsive layout, keyboard controls, native accessible forms and no external fonts or dependencies.

Currency selection relabels inputs; it does **not** convert exchange rates. Recovered capacity is not automatically a cash saving. Expected loss reduction is not a guaranteed saving. Benefits across opportunities are not summed because they may overlap.

## Run locally

Use Node.js 20 or newer. No dependency installation is needed.

```sh
npm start
# Open http://127.0.0.1:4173
npm test
```

Serve `dist/` from any static host. JavaScript modules need an HTTP origin; do not open `index.html` using `file://`.

## Structure

- `dist/index.html` — accessible page and methodology content
- `dist/styles.css` — responsive design and print stylesheet
- `dist/model.js` — pure calculations, validation, CSV and import logic
- `dist/app.js` — browser interaction and decision brief
- `tests/model.test.mjs` — independent calculation examples and edge cases
- `docs/` — methodology, use in a client discussion and product roadmap
- `serve.mjs` — local-only static preview server

A ChatGPT Sites checkout additionally has `.openai/hosting.json` binding it to a particular Site. That deployment identity is excluded from the portable GitHub source. GitHub and Sites have separate source histories; do not force-push one over the other.

## Tests

`npm test` checks model arithmetic, delayed benefits, recurring costs, zero denominators, adverse automation outcomes, physical benefit caps, discounting, import validation, spreadsheet formula neutralisation and cashflow reconciliation.

## Privacy

The application processes inputs in the browser. It stores analysis only when the user enables **Remember on this device**. Reset clears that stored analysis. Exports and printed briefs contain entered assumptions and evidence. Anyone sharing the browser profile can read saved device data. The hosting provider may process normal access logs and authentication.

Do not submit confidential client cases in public GitHub issues. Use synthetic cases for bug reports.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Keep calculations independent of the UI, explain model changes, add a meaningful regression case, and preserve the distinction between cash, capacity and expected risk reduction. This early release is intended for discovery and prioritisation, not compliance certification.
