# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repository is

The **Snowed Under Production Green Theme**: a vendored fork of the
[Antora default UI](https://gitlab.com/antora/antora-ui-default), restyled. It produces exactly one
artefact — `build/ui-bundle.zip` — which a separate Antora site consumes via its playbook:

```yaml
ui:
  bundle:
    url: ./ui/build/ui-bundle.zip
    snapshot: true
```

This tree is typically checked out as `ui/` inside the consuming docs repo. There is no content here —
only templates, CSS, JS and build tooling.

**Two levels of naming — keep them apart.** "Snowed Under Production Green Theme" names *this bundle*
and belongs in `package.json`, the README and this file. It must never reach the rendered output. The
sites built with the bundle (RepFoundry, DartFlac, …) supply their own names at build time through
`site.title` and `site.keys` (see *Branding contract* below).

So: no product name — the theme's or a consumer's — in any template or stylesheet. One bundle serves
every project; a literal name in `src/` couples it to one site and forces a fork.

## Commands

```console
$ npm install
$ npx gulp bundle          # clean → build → zip to build/ui-bundle.zip
$ npx gulp preview         # build + serve preview-src at http://localhost:5252 with watch/rebuild
$ npx gulp build           # stage assets to public/_ without zipping
$ npx gulp clean           # remove build/ and public/
$ npx gulp format          # prettier-eslint over the JS sources
$ npx gulp --tasks-simple  # list tasks
```

There is no test suite.

`npx gulp lint` **fails immediately**: it invokes eslint and stylelint, but the upstream `.eslintrc` and
`.stylelintrc` were not vendored with the fork. Either add the config files or don't run the task; don't
assume lint failures indicate a problem with the source.

`LIVERELOAD=true` enables gulp-connect livereload during preview. `SOURCEMAPS=true` emits sourcemaps from
a non-preview build.

## Build pipeline

`gulpfile.js` composes tasks; the implementations are in `gulp.d/tasks/` (one file per task, wired up by
`gulp.d/tasks/index.js` via `require-directory`).

`gulp.d/tasks/build.js` merges several vinyl streams into `public/_`:

- `src/js/[0-9]*-*.js` — concatenated **in filename order** into `site.js` and uglified. The numeric
  prefix is the load order; renaming a file reorders the bundle.
- `src/js/vendor/*.bundle.js` — run through browserify (with `browser-pack-flat`) and emitted with the
  `.bundle` suffix stripped.
- `src/css/site.css` — a pure `@import` manifest processed by postcss; the import order in that file is
  the cascade order.
- `layouts/`, `partials/`, `helpers/`, `img/`, `ui.yml`, and `static/` (copied to the bundle root).

Preview mode is detected by sniffing `process.argv` for a task name starting with `preview`. In preview
mode cssnano and imagemin are skipped and sourcemaps are on, so preview output is not byte-identical to a
release bundle.

## Theming architecture

This is the main thing that differs from upstream and the main thing to get right when editing.

**Two token layers, both in `src/css/vars.css`.** The `--ui-*` custom properties are the design-system
tokens (palette, surfaces, elevation). Antora's own variables (`--body-background`, `--nav-background`,
`--note-color`, …) are then *bound* to those `--ui-*` tokens. Change the palette by editing the `--ui-*`
block only; the rest of the site follows. Individual component stylesheets reference both layers.

**Themes switch at runtime, not build time.** `:root[data-theme="dark"]` and `:root[data-theme="light"]`
re-bind the `--ui-*` tokens. Dark is the default. Three pieces cooperate:

1. `src/partials/head-prelude.hbs` — an inline pre-paint script that reads `localStorage['docs-theme']`
   (falling back to `prefers-color-scheme`) and stamps `data-theme` on `<html>` before first paint.
   `07-theme-toggle.js` writes the same key; change one and you must change the other.
2. `src/js/07-theme-toggle.js` — the navbar toggle; flips the attribute and persists the choice.
3. `gulp.d/tasks/build.js` — runs `postcss-custom-properties` with **`preserve: true`**.

That `preserve: true` is load-bearing and deliberately diverges from upstream. Upstream flattens custom
properties at build time, which would bake in dark mode and break the toggle entirely. Do not "fix" it.

Any new colour, spacing or radius must go through a custom property. A literal hex in a component
stylesheet will not respond to the theme toggle.

Fonts are Google Fonts `<link>` tags in `src/partials/head-styles.hbs` (Space Grotesk / Manrope /
JetBrains Mono / Material Symbols). The upstream `@fontsource` Roboto packages were dropped; there is no
`src/font/` directory.

## Templates

Handlebars, in `src/layouts/` (page shells) and `src/partials/` (fragments, auto-registered by stem name).
Helpers in `src/helpers/` are registered by filename.

## Branding contract

Everything project-specific comes from the UI model. The wordmark is `site.title`; the rest is optional
and read from `site.keys` in the consuming playbook. **Antora camelCases `site.keys` names**, so the
playbook writes `brand_suffix` and the template reads `site.keys.brandSuffix`.

| Key (playbook / template) | Consumed by | Absent → |
|---|---|---|
| `brand_suffix` / `brandSuffix` | `header-content.hbs` | suffix not rendered |
| `nav_links` / `navLinks` | `header-content.hbs` | falls back to one link per `site.components` entry |
| `home_eyebrow` / `homeEyebrow` | `head-styles.hbs` → `--home-eyebrow` | `home.css` default `"Documentation"` |
| `tagline` | `footer-content.hbs` | line omitted |
| `repo_url` / `repoUrl` | `footer-content.hbs` | source link omitted |

Every branch degrades gracefully, so the bundle renders sensibly with no `site.keys` at all — verify that
path as well as the configured one after touching these partials.

`nav_links` entries are `{text, url, external}`. The `relativize` helper returns any `url` not starting
with `/` unchanged, so absolute URLs pass through and site-root paths are made per-page relative;
`external: true` only adds the `is-external` class. Because Antora namespaces pages under the component
name, a site-root path must include it (`/docs/…` for a component named `docs`).

CSS cannot read the UI model, which is why the home-page eyebrow goes through a custom property injected
by `head-styles.hbs` rather than a literal `content:` string.

## Preview harness

`npx gulp preview` renders `preview-src/*.adoc` (a kitchen-sink page plus a 404) through the real layouts,
using `preview-src/ui-model.yml` as a stand-in for the UI model Antora would supply at build time. That
fixture is a neutral sample site and sets sample `site.keys`, so it exercises the branding contract. Keys
there are written in **camelCase**, matching Antora's output rather than the playbook's snake_case input.

If a template starts reading a new UI-model field, add it to that YAML or the preview will render blank
where the real site renders content.

## Repository hygiene

`build/` (release bundle) and `public/` (preview output) are both generated — `gulp clean` removes exactly
those two — and both are gitignored along with `node_modules/`.
