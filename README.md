# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and Oxlint's TypeScript related rules in your project.

## Google Sheets

1. Create a Google Sheet and open `Extensions > Apps Script`.
2. Copy the contents of `google-apps-script/Code.gs` into the Apps Script editor and deploy it as a Web app.
3. Set access to `Anyone` and copy the deployed Web app URL.
4. Copy `.env.example` to `.env`, then set `VITE_GOOGLE_SHEETS_URL` to that URL.
5. Restart the Vite development server.

Proposal data is still saved locally as a fallback. The E-KTP file data is also sent with the proposal payload, so restrict spreadsheet access appropriately.
