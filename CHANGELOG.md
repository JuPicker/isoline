# Changelog

## 1.1.0 (2026-10-10)

- New option `open`: `-1` keeps the layered scenes (`product`, `steamer`, `interface`, `word`)
  opening under the pointer on their own; `0` to `1` holds them at that opening, so a page can
  drive it from the scroll. `relief` pillars rise with it.
- The floor (`grid`, `dots`) is cut to the scene's view box: it no longer spills over the page.
- Colours read in every form: `#fff`, `#ffff`, `#ffffff`, `#ffffffff`, `rgb()` and `rgba()`.
  A minified `#fff` used to be read as red and tinted the sides of solid accents brown.

## 1.0.0 (2026-10-09)

- First release: fourteen scenes, solid accents, floors, `toSVG`, `defineScene` and `kit`.
