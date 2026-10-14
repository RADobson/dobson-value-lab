# Contributing

Use synthetic data in issues and pull requests. Never post a client's risk register or confidential business case publicly.

1. Fork the repository and run `npm test`.
2. Keep model changes in `dist/model.js` and add an independently calculated regression example.
3. Explain timing, units, evidence and potential double counting in `docs/METHODOLOGY.md`.
4. Check the affected workflow at desktop and phone widths, including keyboard operation.
5. Preserve import/export compatibility or version the schema explicitly.

Do not introduce tracking, remote processing, financial claims, new client-data storage or service integrations without documenting the behaviour and user controls. This project has no runtime package dependencies.
