# Design source

Imported from Claude Design project **Edward's World Portfolio**
`https://claude.ai/design/p/eb398ee6-24cd-4b55-aff7-8dee2799c2be`

Remote files: `.thumbnail`, `Edwards World Concept.dc.html`, `scenes.js`, `support.js`

- `support.js` — the generated Claude Design runtime (`dc-runtime`) that renders
  `.dc.html` documents: `<x-dc>` templates, `<helmet>`, `{{ }}` interpolation,
  `sc-if` / `sc-for`, and the `DCLogic` component class. It may exist in a local
  design workspace, but it is ignored because the app and standalone concept
  board do not depend on it.
- `Edwards World Concept.dc.html` — not mirrored locally. It is the design's
  source of truth and lives in the project above; re-fetch it with the
  DesignSync tool (`get_file`) rather than editing a stale copy.

## What was implemented

`../index.html` is a standalone conversion of `Edwards World Concept.dc.html`,
with the DC runtime removed:

| `.dc.html`                          | local                                        |
|-------------------------------------|----------------------------------------------|
| `<helmet>` (fonts, base style)      | real `<head>`                                |
| `<x-dc>` wrapper                    | dropped                                      |
| `sc-if value="{{ showLabels }}"`    | `.world-labels` + `body[data-labels]`        |
| `DCLogic` + `data-props`            | plain ES module + two checkboxes (`#props`)  |
| `import('./scenes.js')`             | static `import` of `../scenes.js`            |

`../scenes.js` is transcribed from the remote file — the pixel renderer for
all twelve scenes; verified in-browser against the design. Any change to the artwork belongs there, then flows back to
the design project.

## Running

ES module imports are CORS-blocked on `file://`, so serve it:

    python3 -m http.server 8080
    open http://localhost:8080/
