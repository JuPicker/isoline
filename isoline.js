/*!
 * Isoline · picker.studio/tools/isoline · github.com/JuPicker/isoline
 * Small animated isometric scenes drawn in hairlines: a city, a supply chain,
 * a flight, a drone delivery, a cargo port, a production line, exploded
 * products, a keyboard, a UI in layers, your word or logo. Add your own with
 * Isoline.defineScene. Vanilla JS, no dependency.
 * MIT © 2026 Julien Picker (picker.studio).
 *
 * The line language and the iso maths (orthographic camera, solids drawn as
 * one silhouette and their creases, plates filled with the ground colour and
 * painted back to front, the stepped falloff) are adapted from hairline by
 * Lucas Marques, MIT: https://github.com/lucasmarkes/hairline
 */
/* eslint-disable @typescript-eslint/no-this-alias -- ES5 on purpose, so the exported file runs anywhere: closures keep `self`. */
(function (global) {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";

  var DEFAULTS = {
    scene: "city", // city | supply | flight | delivery | port | line | product | steamer | cabinet | lockers | keyboard | interface | relief | word
    // relief scene: rows of digits, one per cell, 0 empty and 1 to 9 the pillar's height
    grid: ["0990", "9009", "9999", "9009"],
    // word scene: the outline rings of the letters, [x, y] in world units (holes included)
    shape: [],
    product: "phone", // phone | speaker | floppy | ps1 (product scene)
    seed: 7,
    density: 0.5,
    // how far exploded views, the steamer, the interface and cut words open, 0 to 1
    explode: 0.5,
    // -1: layered scenes breathe and open under the pointer on their own; 0 to 1 holds them
    // at that opening instead (drive it from the page's scroll). Relief pillars rise with it.
    open: -1,
    // accents as solid fills (shaded sides, full top); false draws them as lines
    solidAccent: true,
    // a floor under the scene that fades out towards the edges: none | grid | dots
    floor: "none",
    floorSpacing: 0.5, // 0 dense to 1 wide
    floorReach: 0.5, // how far it runs before it fades out, 0 to 1
    floorStrength: 0.6, // 0 faint to 1 strong
    floorColor: "", // empty: the palette's mid tone
    speed: 1,
    azimuth: 45,
    elevation: 30,
    spin: false,
    parallax: true,
    interactive: true,
    labels: true,
    // your own label text, in the order the scene lists them (Isoline.labels); empty keeps the default
    names: [],
    stroke: 0.9,
    plate: "#08090a",
    hi: "#d0d6e0",
    edge: "#5b5d64",
    mid: "#3e3e44",
    lo: "#29292d",
    accent: "#d0d6e0",
    respectReducedMotion: true,
  };

  var CSS =
    ".il-root{position:relative;width:100%;height:100%;touch-action:pan-y;user-select:none;-webkit-user-select:none}" +
    ".il-root>svg{position:absolute;inset:0;width:100%;height:100%;display:block;overflow:visible}" +
    ".il-root path{fill:var(--il-plate);stroke:var(--il-mid);stroke-width:var(--il-sw);vector-effect:non-scaling-stroke;stroke-linejoin:round;stroke-linecap:round}" +
    ".il-root .sil{stroke:var(--il-edge)}.il-root .sil.hi{stroke:var(--il-hi)}.il-root .sil.acc{stroke:var(--il-acc)}.il-root .sil.tf{stroke:none}" +
    // solid accents (il-solid): the shade on the sides, the full colour on top, the lines cut in the ground colour
    ".il-root.il-solid .sil.acc{fill:var(--il-acc2);stroke:var(--il-plate)}.il-root.il-solid .sil.acc.top{fill:var(--il-acc)}.il-root.il-solid .sil.acc.tf{stroke:none}" +
    ".il-root .ed{fill:none;stroke:var(--il-mid)}.il-root .ed.hi{stroke:var(--il-edge)}.il-root .ed.acc{stroke:var(--il-acc);stroke-opacity:.55}.il-root.il-solid .ed.acc{stroke:var(--il-plate);stroke-opacity:.7}" +
    ".il-root .fl{stroke:var(--il-lo)}.il-root .fl.mid{stroke:var(--il-mid)}.il-root .fl.acc{stroke:var(--il-acc)}.il-root.il-solid .fl.acc{fill:var(--il-acc);stroke:var(--il-plate)}" +
    ".il-root .ln{fill:none}.il-root .ln.lo{stroke:var(--il-lo)}.il-root .ln.hi{stroke:var(--il-hi)}.il-root .ln.acc{stroke:var(--il-acc)}" +
    ".il-root .dash{stroke-dasharray:1 3}" +
    // a7 to a1: an accent fading in or out, drawn over the plain part
    ".il-root .a1{opacity:.125}.il-root .a2{opacity:.25}.il-root .a3{opacity:.375}.il-root .a4{opacity:.5}.il-root .a5{opacity:.625}.il-root .a6{opacity:.75}.il-root .a7{opacity:.875}" +
    ".il-root .win{stroke:var(--il-hi);stroke-dasharray:1.2 2.2}" +
    ".il-root .flow{stroke-dasharray:2 4;animation:il-flow .9s linear infinite}" +
    ".il-root .dt{stroke:none;fill:var(--il-hi)}.il-root .dt.m{fill:var(--il-edge)}.il-root .dt.lo{fill:var(--il-lo)}.il-root .dt.acc{fill:var(--il-acc)}" +
    ".il-root .rg{fill:none;stroke:var(--il-edge)}.il-root .rg.lo{stroke:var(--il-lo)}.il-root .rg.acc{stroke:var(--il-acc)}" +
    ".il-root .sh{fill:var(--il-lo);stroke:none}" +
    ".il-root .pf{fill:none;stroke:var(--il-lo)}.il-root .fo{stroke:none}.il-root.il-solid .fo.acc{fill:var(--il-acc2)}" +
    ".il-root text{fill:var(--il-edge);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:500;letter-spacing:.06em;text-transform:uppercase}" +
    ".il-root text.hi{fill:var(--il-hi)}.il-root text.acc{fill:var(--il-acc)}" +
    "@keyframes il-flow{to{stroke-dashoffset:-12}}" +
    "@media (prefers-reduced-motion:reduce){.il-root .flow{animation:none}}";

  function injectCss() {
    if (document.querySelector("style[data-isoline]")) return;
    var s = document.createElement("style");
    s.setAttribute("data-isoline", "");
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  /* ================================================================
   * Maths
   * ============================================================== */

  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var rad = function (d) { return (d * Math.PI) / 180; };
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var ss = function (a, b, x) { var t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  var dist = function (a, b) { return Math.hypot(a[0] - b[0], a[1] - b[1]); };
  /**
   * A colour as [r, g, b]: #rgb, #rgba, #rrggbb, #rrggbbaa, rgb() and rgba(). Anything else
   * (a name, hsl()…) is resolved by the browser. CSS minifiers turn #ffffff into #fff, so the
   * short forms must read right.
   */
  var _cx = null;
  function rgbOf(c) {
    var s = String(c || "").trim(), m;
    if (!/^(#|rgb)/i.test(s) && typeof document !== "undefined") {
      try { _cx = _cx || document.createElement("canvas").getContext("2d"); _cx.fillStyle = "#000"; _cx.fillStyle = s; s = String(_cx.fillStyle); } catch (e) { /* keep s */ }
    }
    if (s.charAt(0) === "#") {
      var h = s.slice(1);
      if (h.length === 3 || h.length === 4) h = h.replace(/./g, "$&$&");
      return [0, 1, 2].map(function (i) { return parseInt(h.slice(i * 2, i * 2 + 2), 16) || 0; });
    }
    if ((m = s.match(/rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i))) return [+m[1], +m[2], +m[3]];
    return [0, 0, 0];
  }
  /** Two colours mixed, t of the first, as #rrggbb. */
  function mixHex(a, b, t) {
    var A = rgbOf(a), B = rgbOf(b), out = "#";
    for (var i = 0; i < 3; i++) out += ("0" + Math.round(A[i] * t + B[i] * (1 - t)).toString(16)).slice(-2);
    return out;
  }
  /** The shaded side of an accent: the accent, a third of the way to the ground. */
  function accShade(o) { return mixHex(o.accent, o.plate, 0.68); }
  /** The shortest turn from angle a towards b, a fraction t of the way. */
  var alerp = function (a, b, t) {
    var d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI;
    return a + d * t;
  };
  /** Label i: the visitor's text if they wrote one, else the scene's own. */
  function nm(o, i, d) {
    var n = o.names && o.names[i];
    return n && String(n).trim() ? String(n).trim().slice(0, 32) : d;
  }
  /** Where the sun throws shadows: so far along x and y per unit of height. */
  var SUN = [0.34, 0.2];

  function rng(seed) {
    var a = seed >>> 0 || 1;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /** Hairline's falloff: 1 at the pointer, .31 at 42% of the radius, .09 at the edge, then nothing. */
  function falloff(u) {
    if (u <= 0) return 1;
    if (u <= 0.417) return 1 - (u / 0.417) * 0.6875;
    if (u <= 1) return 0.3125 - ((u - 0.417) / 0.583) * 0.2185;
    return Math.max(0, 0.094 - (u - 1) * 0.094);
  }

  function camera(azDeg, elDeg) {
    var az = rad(azDeg), k = Math.sin(rad(clamp(elDeg, 5, 85)));
    return { c: Math.cos(az), s: Math.sin(az), k: k, zf: Math.sqrt(1 - k * k) };
  }
  function project(C, x, y, z) {
    var X = x * C.c - y * C.s, Y = x * C.s + y * C.c;
    return [X, Y * C.k - z * C.zf];
  }
  /**
   * Where the pointer's line of sight crosses height z. A hit test must use
   * the height of what it tests (a tower's top, a cloud, a roof): the ground
   * point under the pointer lies well behind anything tall, and the hover
   * then lands on the wrong thing.
   */
  function ptrAt(x, z) { return unproject(x.pen.C, x.ptr.sx, x.ptr.sy, z); }
  /**
   * How far the pointer's line of sight passes from something standing at
   * (cx, cy), from the ground up to height h: 0 when the pointer is anywhere
   * on it, its top or its side.
   */
  function ptrDist(x, cx, cy, h) { return segDist([cx, cy], ptrAt(x, 0), ptrAt(x, h)); }
  function unproject(C, sx, sy, z) {
    var X = sx, Y = (sy + z * C.zf) / C.k;
    return [X * C.c + Y * C.s, -X * C.s + Y * C.c];
  }
  /**
   * The paint key of a point: its distance towards the eye. Larger is nearer.
   * Things that stand on the ground are keyed at their base, so a tall tower
   * behind a low one never paints over it.
   */
  function ekey(C, x, y, z) { return (x * C.s + y * C.c) * C.zf + z * C.k; }

  function poly(pts) {
    var s = "M";
    for (var i = 0; i < pts.length; i++) s += (i ? "L" : "") + r2(pts[i][0]) + " " + r2(pts[i][1]);
    return s + "Z";
  }
  function open(pts) {
    if (pts.length < 2) return "";
    var s = "M";
    for (var i = 0; i < pts.length; i++) s += (i ? "L" : "") + r2(pts[i][0]) + " " + r2(pts[i][1]);
    return s;
  }
  function seg(a, b) { return "M" + r2(a[0]) + " " + r2(a[1]) + "L" + r2(b[0]) + " " + r2(b[1]); }

  /** A rounded rectangle about the origin, sampled with outward normals; n = 0 is sharp corners. */
  function rrect(w, d, r, n) {
    var u0 = -w / 2, v0 = -d / 2, u1 = w / 2, v1 = d / 2, out = [];
    r = n ? Math.max(0, Math.min(r, w / 2, d / 2)) : 0;
    var cs = [[u1 - r, v1 - r, 0], [u0 + r, v1 - r, 90], [u0 + r, v0 + r, 180], [u1 - r, v0 + r, 270]];
    for (var c = 0; c < 4; c++) {
      if (!n) {
        var a = rad(cs[c][2] + 45);
        out.push({ u: cs[c][0], v: cs[c][1], nu: Math.cos(a), nv: Math.sin(a) });
        continue;
      }
      for (var k = 0; k <= n; k++) {
        var b = rad(cs[c][2] + (90 * k) / n), cb = Math.cos(b), sb = Math.sin(b);
        out.push({ u: cs[c][0] + r * cb, v: cs[c][1] + r * sb, nu: cb, nv: sb });
      }
    }
    return out;
  }
  function circ(R, n) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var a = (k / n) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      out.push({ u: R * ca, v: R * sa, nu: ca, nv: sa });
    }
    return out;
  }
  /** Turns a ring by rot (radians) and moves it to (cx, cy). */
  function place(ring, cx, cy, rot) {
    var c = Math.cos(rot), s = Math.sin(rot);
    return ring.map(function (q) {
      return { u: cx + q.u * c - q.v * s, v: cy + q.u * s + q.v * c, nu: q.nu * c - q.nv * s, nv: q.nu * s + q.nv * c };
    });
  }
  function boxRing(cx, cy, w, d, r, rot) {
    return place(rrect(w, d, r, r > 1.5 ? 4 : r > 0.25 ? 2 : 0), cx, cy, rot || 0);
  }
  function hull(input) {
    var pts = input.slice().sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; });
    var x = function (o, a, b) { return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]); };
    var lo = [], up = [], i, p;
    for (i = 0; i < pts.length; i++) { p = pts[i]; while (lo.length > 1 && x(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (i = pts.length - 1; i >= 0; i--) { p = pts[i]; while (up.length > 1 && x(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop();
    return lo.concat(up);
  }
  /** The cyclic run of samples whose normal faces the camera. */
  function frontRun(C, ring) {
    var keep = function (q) { return q.nu * C.s + q.nv * C.c >= -1e-6; };
    var n = ring.length, s = -1, i;
    for (i = 0; i < n; i++) if (keep(ring[i]) && !keep(ring[(i + n - 1) % n])) { s = i; break; }
    if (s < 0) return keep(ring[0]) ? ring.slice() : [];
    var out = [];
    for (var k = 0; k < n && keep(ring[(s + k) % n]); k++) out.push(ring[(s + k) % n]);
    return out;
  }
  function bez(E, K, S, t) {
    var u = 1 - t;
    return [u * u * E[0] + 2 * u * t * K[0] + t * t * S[0], u * u * E[1] + 2 * u * t * K[1] + t * t * S[1]];
  }
  function bezTan(E, K, S, t) {
    return [2 * (1 - t) * (K[0] - E[0]) + 2 * t * (S[0] - K[0]), 2 * (1 - t) * (K[1] - E[1]) + 2 * t * (S[1] - K[1])];
  }
  /** Distance from p to the segment ab. */
  function segDist(p, a, b) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
    var t = L ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1) : 0;
    return Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
  }

  /* ================================================================
   * Solids: rings of 3D points, joined ring to ring and capped.
   * A convex solid shows one silhouette and the creases between the
   * faces that look at the eye. That is the whole drawing.
   * ============================================================== */

  /** A local frame: x forward, y left, z up; yaw about z, pitch nose up, roll about x. */
  function xf(cx, cy, cz, yaw, pitch, roll, scale) {
    var cY = Math.cos(yaw || 0), sY = Math.sin(yaw || 0), cP = Math.cos(pitch || 0), sP = Math.sin(pitch || 0);
    var cR = Math.cos(roll || 0), sR = Math.sin(roll || 0);
    var dir = function (x, y, z) {
      var y1 = y * cR - z * sR, z1 = y * sR + z * cR;
      var x2 = x * cP - z1 * sP, z2 = x * sP + z1 * cP;
      return [x2 * cY - y1 * sY, x2 * sY + y1 * cY, z2];
    };
    var K = scale || 1;
    var f = function (x, y, z) { var r = dir(x * K, y * K, z * K); return [cx + r[0], cy + r[1], cz + r[2]]; };
    f.dir = dir;
    return f;
  }

  function rRect(x0, x1, y0, y1, z) { return [[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]]; }
  function boxR(x0, x1, y0, y1, z0, z1) { return [rRect(x0, x1, y0, y1, z0), rRect(x0, x1, y0, y1, z1)]; }
  /** A chamfered rectangle (octagon) at height z. */
  function rOct(hx, hy, z, ch) {
    return [[hx - ch, -hy, z], [hx, -hy + ch, z], [hx, hy - ch, z], [hx - ch, hy, z], [-hx + ch, hy, z], [-hx, hy - ch, z], [-hx, -hy + ch, z], [-hx + ch, -hy, z]];
  }
  /** An ellipse of n points around c, in the plane across `axis`. */
  function rCirc(axis, c, r1, r2v, n) {
    var out = [];
    for (var k = 0; k < n; k++) {
      var a = (k / n) * Math.PI * 2, u = r1 * Math.cos(a), v = r2v * Math.sin(a);
      out.push(axis === "x" ? [c[0], c[1] + u, c[2] + v] : axis === "y" ? [c[0] + u, c[1], c[2] + v] : [c[0] + u, c[1] + v, c[2]]);
    }
    return out;
  }
  /** A side profile [x, z, halfWidth?] in the x–z plane, extruded across y. */
  function extrudeY(prof, hw) {
    return [1, -1].map(function (sg) { return prof.map(function (p) { return [p[0], sg * (p[2] != null ? p[2] : hw), p[1]]; }); });
  }
  /** A profile [y, z] in the y–z plane, extruded along x. */
  function extrudeX(prof, x0, x1) { return [x0, x1].map(function (x) { return prof.map(function (p) { return [x, p[0], p[1]]; }); }); }
  /** A plan [x, y, z0?, thickness?] extruded up. */
  function extrudeZ(pts, z0, t) {
    return [0, 1].map(function (k) {
      return pts.map(function (p) { var zb = p[2] != null ? p[2] : z0; return [p[0], p[1], zb + k * (p[3] != null ? p[3] : t)]; });
    });
  }
  /** A beam from a to b (plan points), w wide, between z0 and z1. */
  function beamR(a, b, w, z0, z1) {
    var dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, nx = ((-dy / L) * w) / 2, ny = ((dx / L) * w) / 2;
    return [a, b].map(function (p) { return [[p[0] + nx, p[1] + ny, z0], [p[0] - nx, p[1] - ny, z0], [p[0] - nx, p[1] - ny, z1], [p[0] + nx, p[1] + ny, z1]]; });
  }
  function coneR(x, y, z, R, h, n) { return [rCirc("z", [x, y, z], R, R, n || 16), rCirc("z", [x, y, z + h], 0.001, 0.001, n || 16)]; }
  /** A dome on a circle of radius R at z, h tall (dumplings, buns, a woven lid). */
  function domeR(x, y, z, R, h, n) {
    return [[1, 0], [0.97, 0.3], [0.86, 0.58], [0.64, 0.82], [0.34, 0.96], [0.02, 1]].map(function (q) { return rCirc("z", [x, y, z + h * q[1]], R * q[0], R * q[0], n || 18); });
  }
  function sub3(a, b) { return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]; }
  function unit3(v) { var L = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / L, v[1] / L, v[2] / L]; }
  function cross3(a, b) { return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; }
  function mid3(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }
  /** A bar of w × h section between two 3D points (robot links, crane stays). */
  function bar3(p0, p1, w, h) {
    var d = unit3(sub3(p1, p0)), up = Math.abs(d[2]) > 0.95 ? [1, 0, 0] : [0, 0, 1];
    var sd = unit3(cross3(d, up)), uu = cross3(sd, d);
    return [p0, p1].map(function (p) {
      return [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(function (q) {
        return [p[0] + (sd[0] * q[0] * w) / 2 + (uu[0] * q[1] * h) / 2, p[1] + (sd[1] * q[0] * w) / 2 + (uu[1] * q[1] * h) / 2, p[2] + (sd[2] * q[0] * w) / 2 + (uu[2] * q[1] * h) / 2];
      });
    });
  }
  /** A cylinder of radius r about an axis through c, hl either side (joints, wheels on any axle). */
  function cylAx(c, ax, r, hl, n) {
    var a = unit3(ax), ref = Math.abs(a[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1], u = unit3(cross3(a, ref)), v = cross3(a, u), N = n || 12;
    return [-hl, hl].map(function (t) {
      var out = [];
      for (var k = 0; k < N; k++) {
        var ang = (k / N) * Math.PI * 2, cs = Math.cos(ang) * r, sn = Math.sin(ang) * r;
        out.push([c[0] + a[0] * t + u[0] * cs + v[0] * sn, c[1] + a[1] * t + u[1] * cs + v[1] * sn, c[2] + a[2] * t + u[2] * cs + v[2] * sn]);
      }
      return out;
    });
  }
  /** 0 → 1 with a straight middle and soft ends: a glide path, a climb. */
  function rampSoft(t, a) {
    t = clamp(t, 0, 1);
    var k = 2 * a * (1 - a);
    return t < a ? (t * t) / k : t > 1 - a ? 1 - ((1 - t) * (1 - t)) / k : (t - a / 2) / (1 - a);
  }

  /* ---- screen-space clipping, for what is seen through an opening ---- */

  function polyArea(p) { var a = 0; for (var i = 0; i < p.length; i++) { var q = p[(i + 1) % p.length]; a += p[i][0] * q[1] - q[0] * p[i][1]; } return a; }
  /** Sutherland–Hodgman: subject clipped to a convex polygon. */
  function clipPoly(subject, clip) {
    var sg = polyArea(clip) > 0 ? 1 : -1, out = subject;
    for (var i = 0; i < clip.length && out.length; i++) {
      var A = clip[i], B = clip[(i + 1) % clip.length], inp = out;
      var side = function (p) { return sg * ((B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])); };
      out = [];
      for (var j = 0; j < inp.length; j++) {
        var P0 = inp[j], P1 = inp[(j + 1) % inp.length], s0 = side(P0), s1 = side(P1);
        if (s0 >= 0) out.push(P0);
        if (s0 >= 0 !== s1 >= 0) { var t = s0 / (s0 - s1); out.push([P0[0] + (P1[0] - P0[0]) * t, P0[1] + (P1[1] - P0[1]) * t]); }
      }
    }
    return out;
  }
  /** Cyrus–Beck: the part of segment ab inside a convex polygon, or null. */
  function clipSeg(a, b, poly) {
    var sg = polyArea(poly) > 0 ? 1 : -1, t0 = 0, t1 = 1;
    for (var i = 0; i < poly.length; i++) {
      var A = poly[i], B = poly[(i + 1) % poly.length], nx = -sg * (B[1] - A[1]), ny = sg * (B[0] - A[0]);
      var f0 = nx * (a[0] - A[0]) + ny * (a[1] - A[1]), fd = nx * (b[0] - a[0]) + ny * (b[1] - a[1]);
      if (Math.abs(fd) < 1e-9) { if (f0 < 0) return null; continue; }
      var t = -f0 / fd;
      if (fd > 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t);
      if (t0 > t1) return null;
    }
    return [[a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0], [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1]];
  }

  /**
   * Draws a convex solid given as rings of world points. Faces are found with
   * Newell's normal and turned outward from the centroid, so a ring may run
   * either way round. Creases are the edges between two faces that both look
   * at the eye, folded by more than `crease` (a cosine).
   */
  function solidPaths(pen, rings, cls, o) {
    var C = pen.C, e = pen.e, R = rings.length, N = rings[0].length, V = [], i, j, a;
    for (i = 0; i < R; i++) for (j = 0; j < N; j++) V.push(rings[i][j]);
    var cx = 0, cy = 0, cz = 0;
    for (i = 0; i < V.length; i++) { cx += V[i][0]; cy += V[i][1]; cz += V[i][2]; }
    cx /= V.length; cy /= V.length; cz /= V.length;
    var F = [], cap0 = [], cap1 = [];
    for (i = 0; i < R - 1; i++) for (j = 0; j < N; j++) F.push([i * N + j, i * N + ((j + 1) % N), (i + 1) * N + ((j + 1) % N), (i + 1) * N + j]);
    for (j = 0; j < N; j++) { cap0.push(j); cap1.push((R - 1) * N + j); }
    F.push(cap0, cap1);
    var Q = V.map(function (p) { return project(C, p[0], p[1], p[2]); });
    var edges = {}, lim = o.crease == null ? 0.82 : o.crease, acc = cls.indexOf("acc") >= 0, tops = [];
    for (i = 0; i < F.length; i++) {
      var f = F[i], nx = 0, ny = 0, nz = 0, fx = 0, fy = 0, fz = 0;
      for (a = 0; a < f.length; a++) {
        var p = V[f[a]], q = V[f[(a + 1) % f.length]];
        nx += (p[1] - q[1]) * (p[2] + q[2]);
        ny += (p[2] - q[2]) * (p[0] + q[0]);
        nz += (p[0] - q[0]) * (p[1] + q[1]);
        fx += p[0]; fy += p[1]; fz += p[2];
      }
      var L = Math.hypot(nx, ny, nz);
      if (L < 1e-9) continue;
      nx /= L; ny /= L; nz /= L;
      if (nx * (fx / f.length - cx) + ny * (fy / f.length - cy) + nz * (fz / f.length - cz) < 0) { nx = -nx; ny = -ny; nz = -nz; }
      if (nx * e[0] + ny * e[1] + nz * e[2] <= 1e-6) continue;
      if (acc && nz > 0.55) tops.push(f);
      for (a = 0; a < f.length; a++) {
        var i0 = f[a], i1 = f[(a + 1) % f.length];
        var A = V[i0], B = V[i1];
        if (Math.abs(A[0] - B[0]) + Math.abs(A[1] - B[1]) + Math.abs(A[2] - B[2]) < 1e-6) continue;
        var key = i0 < i1 ? i0 + "," + i1 : i1 + "," + i0, ed = edges[key];
        if (!ed) edges[key] = { a: i0, b: i1, n: [nx, ny, nz], c: 1, d: 1 };
        else { ed.c++; ed.d = ed.n[0] * nx + ed.n[1] * ny + ed.n[2] * nz; }
      }
    }
    var cr = "";
    for (var k in edges) { var E = edges[k]; if (E.c === 2 && E.d < lim) cr += seg(Q[E.a], Q[E.b]); }
    var out = [[poly(hull(Q)), "sil" + cls]];
    tops.forEach(function (f) { out.push([poly(f.map(function (ix) { return Q[ix]; })), "sil" + cls + " top tf"]); });
    if (cr && !o.noCrease) out.push([cr, "ed" + cls]);
    return out;
  }

  /* ================================================================
   * The pen: what a scene draws with
   * ============================================================== */

  /**
   * Scenes never touch the DOM: they describe one frame to the pen, which
   * projects it. Items sit on a layer (0 ground, 1 solids, 2 air, 3 marks on
   * top) and carry a paint key; the renderer paints back to front. A model
   * (a car, a plane) opens a group: all its parts share the model's key and
   * paint in the order the model draws them, so it can get its own overlaps
   * right and never interleave with a neighbour.
   */
  function Pen(C) {
    this.C = C;
    this.e = [C.s * C.zf, C.c * C.zf, C.k];
    this.items = [];
    this.texts = [];
    this.fd = null;
    this.grp = null;
    this.sub = 0;
  }

  /**
   * Inside a group, `sub` orders parts (a robot's links by depth); parts with
   * the same sub paint in the order drawn.
   */
  Pen.prototype.add = function (layer, key, paths) {
    var n = this.items.length, g = this.grp;
    this.items.push(g ? { l: g.l, g: g.k, k: this.sub, n: n, p: paths } : { l: layer, g: this.fd != null ? this.fd : key, k: 0, n: n, p: paths });
  };
  Pen.prototype.begin = function (key, layer) { this.grp = { k: key, l: layer == null ? 1 : layer }; this.sub = 0; };
  Pen.prototype.end = function () { this.grp = null; this.sub = 0; };
  /** Forces every following loose item onto one key, so they paint in the order drawn. null releases it. */
  Pen.prototype.seq = function (d) { this.fd = d; };
  Pen.prototype.key = function (x, y, z) { return ekey(this.C, x, y, z || 0); };
  /** Whether a world direction looks at the eye. */
  Pen.prototype.sees = function (v) { return v[0] * this.e[0] + v[1] * this.e[1] + v[2] * this.e[2] > 0.01; };
  Pen.prototype.raw = function (d, cls, layer, key) { if (d) this.add(layer == null ? 3 : layer, key || 0, [[d, cls]]); };

  Pen.prototype._prism = function (ring, z, h, cls, sharpEdge) {
    var C = this.C, z1 = z + h, pts = [], k;
    for (k = 0; k < ring.length; k++) {
      pts.push(project(C, ring[k].u, ring[k].v, z1));
      pts.push(project(C, ring[k].u, ring[k].v, z));
    }
    var paths = [[poly(hull(pts)), "sil" + cls]];
    if (cls.indexOf("acc") >= 0) paths.push([poly(ring.map(function (q) { return project(C, q.u, q.v, z1); })), "sil" + cls + " top tf"]);
    if (h > 0.05) {
      var fr = frontRun(C, ring);
      if (fr.length > 1) paths.push([open(fr.map(function (q) { return project(C, q.u, q.v, z1); })), "ed" + cls]);
    }
    if (sharpEdge && h > 0.4) {
      var best = ring[0];
      for (k = 1; k < ring.length; k++) if (ring[k].u * C.s + ring[k].v * C.c > best.u * C.s + best.v * C.c) best = ring[k];
      paths.push([open([project(C, best.u, best.v, z), project(C, best.u, best.v, z1)]), "ed" + cls]);
    }
    return paths;
  };

  /** A rounded box standing on z, centred on (cx, cy). o: r, rot (deg), cls, layer, key. */
  Pen.prototype.box = function (cx, cy, z, w, d, h, o) {
    o = o || {};
    var r = o.r == null ? 0.6 : o.r, ring = boxRing(cx, cy, w, d, r, rad(o.rot || 0));
    this.add(o.layer == null ? 1 : o.layer, o.key != null ? o.key : this.key(cx, cy, z),
      this._prism(ring, z, h, o.cls ? " " + o.cls : "", r <= 0.25 || r < Math.min(w, d) * 0.2));
    return ring;
  };

  Pen.prototype.cyl = function (cx, cy, z, R, h, o) {
    o = o || {};
    var ring = place(circ(R, R > 6 ? 40 : R > 1.2 ? 24 : 14), cx, cy, 0);
    this.add(o.layer == null ? 1 : o.layer, o.key != null ? o.key : this.key(cx, cy, z), this._prism(ring, z, h, o.cls ? " " + o.cls : "", false));
    return ring;
  };

  /** A convex solid from rings of world points. */
  Pen.prototype.solid = function (rings, o) {
    o = o || {};
    var r = rings[0], cx = 0, cy = 0, cz = 0;
    r.forEach(function (p) { cx += p[0] / r.length; cy += p[1] / r.length; cz += p[2] / r.length; });
    this.add(o.layer == null ? 1 : o.layer, o.key != null ? o.key : this.key(cx, cy, cz), solidPaths(this, rings, o.cls ? " " + o.cls : "", o));
  };

  /** A filled polygon lying in space (usually flat on the ground). */
  Pen.prototype.flat = function (pts, o) {
    o = o || {};
    var C = this.C, cx = 0, cy = 0, cz = 0;
    pts.forEach(function (p) { cx += p[0] / pts.length; cy += p[1] / pts.length; cz += (p[2] || 0) / pts.length; });
    this.add(o.layer == null ? 0 : o.layer, o.key != null ? o.key : this.key(cx, cy, cz),
      [[poly(pts.map(function (p) { return project(C, p[0], p[1], p[2] || 0); })), "fl" + (o.cls ? " " + o.cls : "")]]);
  };
  Pen.prototype.rect = function (cx, cy, z, w, d, o) {
    this.flat([[cx - w / 2, cy - d / 2, z], [cx + w / 2, cy - d / 2, z], [cx + w / 2, cy + d / 2, z], [cx - w / 2, cy + d / 2, z]], o);
  };

  Pen.prototype.line = function (pts, o) {
    o = o || {};
    var C = this.C, m = pts[Math.floor(pts.length / 2)];
    this.add(o.layer == null ? 3 : o.layer, o.key != null ? o.key : this.key(m[0], m[1], m[2] || 0),
      [[open(pts.map(function (p) { return project(C, p[0], p[1], p[2] || 0); })), "ln" + (o.cls ? " " + o.cls : "")]]);
  };

  function ellipse(q, rx, ry) {
    return "M" + r2(q[0] - rx) + " " + r2(q[1]) + "a" + r2(rx) + " " + r2(ry) + " 0 1 0 " + r2(2 * rx) + " 0a" + r2(rx) + " " + r2(ry) + " 0 1 0 " + r2(-2 * rx) + " 0Z";
  }

  /** A disc lying flat at height z: filled, a ring with o.ring, or any class with o.full. */
  Pen.prototype.dot = function (x, y, z, R, o) {
    o = o || {};
    this.add(o.layer == null ? 3 : o.layer, o.key != null ? o.key : this.key(x, y, z),
      [[ellipse(project(this.C, x, y, z), R, R * this.C.k), o.full || (o.ring ? "rg" : "dt") + (o.cls ? " " + o.cls : "")]]);
  };

  /** A sphere: in an orthographic view its outline is always a circle. */
  Pen.prototype.sphere = function (x, y, z, R, o) {
    o = o || {};
    this.add(o.layer == null ? 1 : o.layer, o.key != null ? o.key : this.key(x, y, z),
      [[ellipse(project(this.C, x, y, z), R, R), o.full || "sil" + (o.cls ? " " + o.cls : "")]]);
  };

  /** A light or a pin head: a small filled sphere, round from every side. */
  Pen.prototype.light = function (x, y, z, R, o) {
    o = o || {};
    this.sphere(x, y, z, R, { full: "dt" + (o.cls ? " " + o.cls : ""), layer: o.layer == null ? 3 : o.layer, key: o.key });
  };

  /** The shadow a set of world points throws on the ground, as one filled hull. */
  Pen.prototype.shadow = function (pts, o) {
    o = o || {};
    var C = this.C;
    var q = pts.map(function (p) { return project(C, p[0] + p[2] * SUN[0], p[1] + p[2] * SUN[1], 0.1); });
    this.add(0, o.key != null ? o.key : 5e6, [[poly(hull(q)), "sh"]]);
  };

  /** A polyline already in screen units (leaders that point at labels). */
  Pen.prototype.screenLine = function (pts, o) {
    o = o || {};
    this.add(o.layer == null ? 3 : o.layer, o.key || 0, [[open(pts), "ln" + (o.cls ? " " + o.cls : "")]]);
  };
  Pen.prototype.screenText = function (sx, sy, str, o) {
    o = o || {};
    this.texts.push({ x: sx, y: sy, s: str, a: o.anchor || "start", c: o.cls || "" });
  };
  Pen.prototype.text = function (x, y, z, str, o) {
    o = o || {};
    var q = project(this.C, x, y, z);
    this.texts.push({ x: q[0] + (o.dx || 0), y: q[1] + (o.dy || 0), s: str, a: o.anchor || "middle", c: o.cls || "" });
  };
  /** A label on a pin: a short line up from (x, y, z), the text above it. */
  Pen.prototype.callout = function (x, y, z, str, o) {
    o = o || {};
    var h = o.h || 6;
    this.line([[x, y, z], [x, y, z + h]], { cls: o.cls ? o.cls : "lo" });
    this.light(x, y, z + h, 0.5, { cls: o.cls ? o.cls : "m" });
    this.text(x, y, z + h + 1.2, str, { cls: o.cls, dy: -1.2 });
  };

  /** A model's parts, drawn in its local frame. */
  function Model(P, f, cls) { this.P = P; this.f = f; this.cls = cls || ""; }
  Model.prototype.w = function (p) { return this.f(p[0], p[1], p[2]); };
  Model.prototype.solid = function (rings, cls, o) {
    var self = this, c = cls == null ? this.cls : cls;
    this.P.add(1, 0, solidPaths(this.P, rings.map(function (r) { return r.map(function (p) { return self.w(p); }); }), c ? " " + c : "", o || {}));
  };
  Model.prototype.line = function (pts, cls, layer) { var self = this; this.P.line(pts.map(function (p) { return self.w(p); }), { cls: cls, layer: layer }); };
  Model.prototype.flat = function (pts, cls, layer) { var self = this; this.P.flat(pts.map(function (p) { return self.w(p); }), { cls: cls, layer: layer == null ? 1 : layer }); };
  Model.prototype.dot = function (p, r, cls, ring) { var q = this.w(p); this.P.dot(q[0], q[1], q[2], r, { cls: cls, ring: ring }); };
  Model.prototype.light = function (p, r, cls) { var q = this.w(p); this.P.light(q[0], q[1], q[2], r, { cls: cls }); };
  Model.prototype.sphere = function (p, r, cls) { var q = this.w(p); this.P.sphere(q[0], q[1], q[2], r, { cls: cls }); };
  Model.prototype.sees = function (x, y, z) { return this.P.sees(this.f.dir(x, y, z)); };
  Model.prototype.key = function (p) { var q = this.w(p); return this.P.key(q[0], q[1], q[2]); };
  /** A window or a door: a filled pane on a facade, with an optional cross. */
  Model.prototype.pane = function (pts, cross) {
    this.flat(pts, "mid");
    if (cross) {
      this.line([mid(pts[0], pts[1]), mid(pts[2], pts[3])], "lo");
      this.line([mid(pts[1], pts[2]), mid(pts[3], pts[0])], "lo");
    }
  };
  function mid(a, b) { return [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2]; }

  /* ================================================================
   * Models
   * ============================================================== */

  /* ---- road vehicles: x forward, y left, z up, origin on the ground at the centre ---- */

  var CARS = {
    sedan: { len: 6, hw: 1.35, wr: 0.6, ax: [1.95, -1.95], light: 1.05,
      body: [[-3, 0.45], [3, 0.45], [3.05, 1.15], [2.55, 1.5], [-2.75, 1.6], [-3.05, 1.2]],
      cabin: [[-2.3, 1.58, 1.25], [1.25, 1.52, 1.25], [0.3, 2.35, 1.0], [-1.75, 2.4, 1.0]] },
    hatch: { len: 5.2, hw: 1.3, wr: 0.58, ax: [1.65, -1.65], light: 1.05,
      body: [[-2.6, 0.45], [2.6, 0.45], [2.65, 1.15], [2.15, 1.5], [-2.5, 1.6], [-2.65, 1.2]],
      cabin: [[-2.5, 1.58, 1.2], [0.95, 1.52, 1.2], [0.05, 2.42, 0.98], [-2.3, 2.45, 0.98]] },
    suv: { len: 6.2, hw: 1.42, wr: 0.72, ax: [2.0, -2.0], light: 1.3,
      body: [[-3.1, 0.55], [3.1, 0.55], [3.15, 1.45], [2.6, 1.85], [-3.0, 1.9], [-3.15, 1.5]],
      cabin: [[-3.0, 1.88, 1.32], [1.35, 1.84, 1.32], [0.55, 2.95, 1.12], [-2.85, 2.95, 1.12]] },
    van: { len: 6.6, hw: 1.42, wr: 0.66, ax: [2.25, -2.25], light: 1.2,
      body: [[-3.3, 0.5], [3.3, 0.5], [3.35, 1.35], [2.6, 1.8], [-3.3, 1.85]],
      cabin: [[-3.3, 1.83, 1.4], [2.55, 1.8, 1.4], [1.6, 3.15, 1.3], [-3.3, 3.2, 1.3]] },
    bus: { len: 11, hw: 1.45, wr: 0.72, ax: [3.6, -3.4], light: 1.1, band: true,
      body: [[-5.5, 0.55], [5.5, 0.55], [5.6, 2.8], [5.3, 3.6], [-5.4, 3.6], [-5.55, 3.1]] },
  };
  CARS.taxi = CARS.sedan;

  function wheel(m, ax, y0, y1, r) {
    m.solid([rCirc("y", [ax, y0, r], r, r, 10), rCirc("y", [ax, y1, r], r, r, 10)], "");
  }

  function drawCar(P, x, y, yaw, kind, cls) {
    var s = CARS[kind] || CARS.sedan, m = new Model(P, xf(x, y, 0, yaw), cls), near = m.sees(0, 1, 0) ? 1 : -1, L2 = s.len / 2;
    P.begin(P.key(x, y, 0));
    m.solid(extrudeY(s.body, s.hw));
    s.ax.forEach(function (ax) { wheel(m, ax, near * (s.hw + 0.06), near * (s.hw - 0.42), s.wr); });
    if (s.cabin) m.solid(extrudeY(s.cabin, s.hw));
    if (s.band) {
      var yy = near * (s.hw + 0.02);
      m.line([[-4.9, yy, 2.05], [4.7, yy, 2.05]], "lo");
      m.line([[-4.9, yy, 3.2], [4.7, yy, 3.2]], "lo");
      for (var bx = -4.9; bx <= 4.8; bx += 1.6) m.line([[bx, yy, 2.05], [bx, yy, 3.2]], "lo");
    }
    if (kind === "taxi") m.solid(boxR(-0.95, -0.25, -0.5, 0.5, 2.38, 2.8), "acc");
    if (m.sees(1, 0, 0)) [-1, 1].forEach(function (k) { m.light([L2 + 0.06, k * (s.hw - 0.45), s.light], 0.22, ""); });
    if (m.sees(-1, 0, 0)) [-1, 1].forEach(function (k) { m.light([-L2 - 0.06, k * (s.hw - 0.4), s.light + 0.1], 0.22, "acc"); });
    P.end();
  }

  /* ---- semi truck: the tractor's origin is the hitch, the trailer's is its kingpin ---- */

  var CAB = [[2.0, 1.0], [5.2, 1.0], [5.3, 2.2], [5.0, 4.2], [2.2, 4.4], [2.0, 4.2]];
  function drawTractor(P, x, y, yaw, cls) {
    var f = xf(x, y, 0, yaw), m = new Model(P, f, cls), near = m.sees(0, 1, 0) ? 1 : -1, c = f(2.6, 0, 0);
    P.begin(P.key(c[0], c[1], 0));
    m.solid(boxR(-0.2, 4.6, -1.0, 1.0, 0.55, 1.1), "");
    m.solid(extrudeY(CAB, 1.3));
    [4.1, 0.6].forEach(function (ax) { wheel(m, ax, near * 1.36, near * 0.9, 0.8); });
    var yy = near * 1.31;
    m.line([[3.4, yy, 2.6], [4.95, yy, 2.6], [4.8, yy, 3.9], [3.4, yy, 3.9], [3.4, yy, 2.6]], "lo");
    m.solid([rCirc("z", [1.7, near * 0.9, 1.1], 0.2, 0.2, 8), rCirc("z", [1.7, near * 0.9, 5.3], 0.2, 0.2, 8)], "");
    if (m.sees(1, 0, 0)) [-1, 1].forEach(function (k) { m.light([5.32, k * 0.85, 1.6], 0.26, ""); });
    P.end();
  }
  function drawTrailer(P, x, y, yaw, cls) {
    var f = xf(x, y, 0, yaw), m = new Model(P, f, cls), near = m.sees(0, 1, 0) ? 1 : -1, c = f(-6.4, 0, 0);
    P.begin(P.key(c[0], c[1], 0));
    m.line([[-1.6, near * 1.05, 1.25], [-1.6, near * 1.05, 0.15]], "");
    m.solid(boxR(-12.6, -0.3, -1.35, 1.35, 1.25, 5.0));
    var yy = near * 1.37;
    for (var rx = -11.4; rx < -0.8; rx += 1.5) m.line([[rx, yy, 1.4], [rx, yy, 4.85]], "lo");
    [-10.1, -11.4].forEach(function (ax) { wheel(m, ax, near * 1.4, near * 0.95, 0.8); });
    if (m.sees(-1, 0, 0)) {
      m.line([[-12.62, 0, 1.4], [-12.62, 0, 4.85]], "lo");
      [-1, 1].forEach(function (k) { m.light([-12.64, k * 1.0, 1.55], 0.26, "acc"); });
    }
    P.end();
  }

  /* ---- airliner: x forward, y left, z up, origin at the fuselage axis ---- */

  // fuselage stations: x, centre height, vertical radius, half width
  var FUS = [[12.0, 0.25, 0.06, 0.06], [11.4, 0.2, 0.62, 0.6], [10.2, 0.05, 1.15, 1.1], [8.6, 0, 1.4, 1.35], [-5.5, 0, 1.4, 1.35], [-8.5, 0.33, 1.05, 1.0], [-11.0, 0.85, 0.45, 0.42], [-11.8, 1.05, 0.15, 0.14]];
  function planeParts(sgN) {
    var wing = function (sg) { return extrudeZ([[2.6, 0.9 * sg, -0.55, 0.36], [-2.4, 0.9 * sg, -0.55, 0.36], [-5.6, 11.8 * sg, 0.35, 0.14], [-3.6, 11.8 * sg, 0.35, 0.14]]); };
    var stab = function (sg) { return extrudeZ([[-8.6, 0.5 * sg, 0.7, 0.2], [-10.6, 0.5 * sg, 0.7, 0.2], [-12.0, 5.0 * sg, 0.95, 0.12], [-11.0, 5.0 * sg, 0.95, 0.12]]); };
    var eng = function (sg) { return [[2.2, 0.5], [1.7, 0.66], [-0.9, 0.62], [-1.7, 0.36]].map(function (s) { return rCirc("x", [s[0], 4.6 * sg, -1.35], s[1], s[1], 12); }); };
    var pylon = function (sg) { return beamR([0.9, 4.6 * sg], [-0.8, 4.6 * sg], 0.22, -0.85, -0.3); };
    return {
      fus: FUS.map(function (s) { return rCirc("x", [s[0], 0, s[1]], s[3], s[2], 14); }),
      fin: extrudeY([[-7.6, 1.2], [-11.6, 1.2], [-12.3, 5.6], [-10.9, 5.6]], 0.16),
      wn: wing(sgN), wf: wing(-sgN), sn: stab(sgN), sf: stab(-sgN), en: eng(sgN), ef: eng(-sgN), pn: pylon(sgN), pf: pylon(-sgN),
    };
  }
  function drawPlane(P, x, y, z, yaw, pitch, roll, o) {
    o = o || {};
    var f = xf(x, y, z, yaw, pitch, roll, o.k), m = new Model(P, f, "acc"), near = m.sees(0, 1, 0) ? 1 : -1, pt = planeParts(near);
    P.begin(P.key(x, y, z), o.layer == null ? 2 : o.layer);
    if (o.gear) {
      [[9, 0, -1.25], [-0.8, 1.7, -1.0], [-0.8, -1.7, -1.0]].forEach(function (g) {
        m.line([[g[0], g[1], g[2]], [g[0], g[1], -2.5]], "");
        m.light([g[0], g[1], -2.55], 0.4, "m");
      });
    }
    m.solid(pt.ef); m.solid(pt.pf); m.solid(pt.wf); m.solid(pt.sf);
    m.solid(pt.fus, null, { crease: 0.55 });
    m.line([[8.2, near * 1.37, 0.42], [-5.2, near * 1.37, 0.42]], "win");
    m.line([[10.0, near * 1.12, 0.66], [10.55, near * 0.95, 0.7], [11.05, near * 0.68, 0.6]], "hi");
    m.solid(pt.en); m.solid(pt.pn); m.solid(pt.wn); m.solid(pt.sn);
    m.solid(pt.fin);
    if (o.blink) { m.light([-4.6, near * 11.8, 0.52], 0.4, "acc"); m.light([-3, 0, 1.45], 0.34, "acc"); }
    P.end();
  }
  /** The plane's shadow: its fuselage, wings and tailplane, thrown on the ground. */
  function planeShadow(P, x, y, z, yaw, pitch, roll, k) {
    var f = xf(x, y, z, yaw, pitch, roll, k), pt = planeParts(1);
    [pt.fus, pt.wn, pt.wf, pt.sn, pt.sf].forEach(function (rings) {
      var pts = [];
      rings.forEach(function (r) { r.forEach(function (p) { pts.push(f(p[0], p[1], p[2])); }); });
      P.shadow(pts);
    });
  }

  /* ---- quadcopter: origin at the body's underside ---- */

  var DRONE_LEGS = 2.85;

  function drawDrone(P, x, y, z, yaw, pitch, spin, o) {
    o = o || {};
    var f = xf(x, y, z, yaw, pitch, 0), m = new Model(P, f, "");
    P.begin(P.key(x, y, z), 2);
    // tall legs: the parcel rides between the skids
    [[1, 1], [1, -1], [-1, 1], [-1, -1]].forEach(function (q) { m.line([[q[0] * 1.1, q[1] * 0.8, 0.05], [q[0] * 1.3, q[1] * 1.6, -DRONE_LEGS]], ""); });
    [1, -1].forEach(function (sy) { m.line([[-2.2, sy * 1.6, -DRONE_LEGS], [2.2, sy * 1.6, -DRONE_LEGS]], "hi"); });
    m.sphere([1.45, 0, -0.3], 0.55, "");
    var tips = [[4.3, 4.3], [4.3, -4.3], [-4.3, 4.3], [-4.3, -4.3]].map(function (t, i) { return { t: t, i: i, k: m.key([t[0], t[1], 0.8]) }; });
    tips.sort(function (a, b) { return a.k - b.k; });
    var bk = m.key([0, 0, 0.8]);
    var arm = function (a) {
      m.solid(beamR([a.t[0] * 0.3, a.t[1] * 0.3], a.t, 0.55, 0.5, 0.9), "");
      m.solid([rCirc("z", [a.t[0], a.t[1], 0.4], 0.62, 0.62, 12), rCirc("z", [a.t[0], a.t[1], 1.4], 0.62, 0.62, 12)], "");
    };
    tips.forEach(function (a) { if (a.k < bk) arm(a); });
    m.solid([rOct(1.7, 1.25, 0, 0.5), rOct(2.15, 1.6, 0.65, 0.6), rOct(1.55, 1.1, 1.35, 0.45)], "hi");
    tips.forEach(function (a) { if (a.k >= bk) arm(a); });
    // props sit above everything else on the drone, so they paint last
    tips.forEach(function (a) {
      m.dot([a.t[0], a.t[1], 1.58], 2.3, "lo", true);
      var ang = spin + a.i * 0.9, c = Math.cos(ang) * 2.2, s = Math.sin(ang) * 2.2;
      m.line([[a.t[0] - c, a.t[1] - s, 1.58], [a.t[0] + c, a.t[1] + s, 1.58]], "hi");
      if (a.t[0] > 0 || o.blink) m.light([a.t[0], a.t[1], 1.45], 0.3, a.t[0] > 0 ? "" : "acc");
    });
    P.end();
  }

  /** A taped carton. x0..x1 trims it along its own x (a crate half through a wall). */
  function drawCrate(P, x, y, z, s, yaw, cls, x0, x1, layer, key) {
    var h = s / 2, a = x0 == null ? -h : x0, b = x1 == null ? h : x1;
    if (b - a < 0.15) return;
    var m = new Model(P, xf(x, y, z, yaw), cls);
    if (key !== false) P.begin(key != null ? key : P.key(x, y, z), layer);
    m.solid(boxR(a, b, -h, h, 0, s));
    m.line([[a, 0, s + 0.01], [b, 0, s + 0.01]], cls === "acc" ? "acc" : "lo");
    if (b === h && m.sees(1, 0, 0)) m.line([[h + 0.01, 0, s], [h + 0.01, 0, s * 0.55]], cls === "acc" ? "acc" : "lo");
    if (a === -h && m.sees(-1, 0, 0)) m.line([[-h - 0.01, 0, s], [-h - 0.01, 0, s * 0.55]], cls === "acc" ? "acc" : "lo");
    if (key !== false) P.end();
  }

  /* ---- buildings ---- */

  /** A house with a gable roof; its front (door) faces local +y. sc scales it. */
  function drawHouse(P, x, y, yaw, o) {
    o = o || {};
    var sc = o.s || 1, W = 6 * sc, D = 5 * sc, H = 6 * sc, ov = 0.8 * sc;
    var m = new Model(P, xf(x, y, 0, yaw), o.cls || "");
    P.begin(P.key(x, y, 0));
    m.solid(boxR(-W, W, -D, D, 0, H));
    var win = function (pts) { m.pane(pts, true); };
    if (m.sees(0, 1, 0)) {
      var yf = D + 0.03;
      m.pane([[-0.8 * sc, yf, 0], [0.8 * sc, yf, 0], [0.8 * sc, yf, 3.2 * sc], [-0.8 * sc, yf, 3.2 * sc]]);
      [-3.4, 3.4].forEach(function (cx) { win([[(cx - 1) * sc, yf, 2.4 * sc], [(cx + 1) * sc, yf, 2.4 * sc], [(cx + 1) * sc, yf, 4.3 * sc], [(cx - 1) * sc, yf, 4.3 * sc]]); });
    }
    if (m.sees(0, -1, 0)) {
      var yb = -D - 0.03;
      [-3.4, 3.4].forEach(function (cx) { win([[(cx - 1) * sc, yb, 2.4 * sc], [(cx + 1) * sc, yb, 2.4 * sc], [(cx + 1) * sc, yb, 4.3 * sc], [(cx - 1) * sc, yb, 4.3 * sc]]); });
    }
    [1, -1].forEach(function (sx) {
      if (!m.sees(sx, 0, 0)) return;
      var xx = sx * (W + 0.03);
      win([[xx, -1 * sc, 2.4 * sc], [xx, 1 * sc, 2.4 * sc], [xx, 1 * sc, 4.3 * sc], [xx, -1 * sc, 4.3 * sc]]);
    });
    m.solid(extrudeX([[-D - ov, H - 0.4 * sc], [D + ov, H - 0.4 * sc], [0, H + 4 * sc]], -W - ov, W + ov), o.roof || null);
    m.solid(boxR(2.4 * sc, 3.4 * sc, -2.9 * sc, -1.9 * sc, H + 1.3 * sc, H + 4.7 * sc));
    P.end();
  }

  /** A tree. pine: two stacked cones; otherwise a round crown on a trunk. */
  function drawTree(P, x, y, s, pine, layer) {
    P.begin(P.key(x, y, 0), layer);
    if (pine) {
      P.line([[x, y, 0], [x, y, 1.2 * s]], { cls: "" });
      P.solid(coneR(x, y, 0.9 * s, 2.3 * s, 3.6 * s));
      P.solid(coneR(x, y, 2.9 * s, 1.7 * s, 3.3 * s));
    } else {
      P.line([[x, y, 0], [x, y, 2.4 * s]], { cls: "" });
      P.sphere(x - 0.5 * s, y + 0.4 * s, 3.4 * s, 1.5 * s);
      P.sphere(x, y, 4.0 * s, 2.0 * s);
    }
    P.end();
  }

  /** Floor lines wrapped round the visible faces of a ring, every `step` from z0 to z1. */
  function floors(P, ring, z0, z1, step, cls) {
    var run = frontRun(P.C, ring), d = "", C = P.C;
    if (run.length < 2) return;
    for (var z = z0 + step; z < z1 - 0.7; z += step) d += open(run.map(function (q) { return project(C, q.u, q.v, z); }));
    P.raw(d, "ln " + (cls || "lo"), 1);
  }
  /** Vertical lines along the visible faces of a ring, about `every` apart. */
  function mullions(P, ring, z0, z1, every, cls) {
    var run = frontRun(P.C, ring), d = "", C = P.C, acc = every / 2;
    for (var i = 1; i < run.length; i++) {
      var a = run[i - 1], b = run[i], L = Math.hypot(b.u - a.u, b.v - a.v);
      while (acc < L) {
        var t = acc / L, u = a.u + (b.u - a.u) * t, v = a.v + (b.v - a.v) * t;
        d += seg(project(C, u, v, z0), project(C, u, v, z1));
        acc += every;
      }
      acc -= L;
    }
    P.raw(d, "ln " + (cls || "lo"), 1);
  }

  function ringLine(P, ring, z, cls) {
    var run = frontRun(P.C, ring), C = P.C;
    if (run.length > 1) P.raw(open(run.map(function (q) { return project(C, q.u, q.v, z); })), "ln " + (cls || "lo"), 1);
  }

  /**
   * An open container seen from above: its walls, the floor through the
   * opening, the contents, then the front walls again over the contents, so
   * whatever sits low inside is hidden by the near wall. outer and inner are
   * rings with normals; depth is how far the floor sits under the rim.
   */
  function drawOpen(P, outer, inner, z, H, depth, o) {
    o = o || {};
    var C = P.C, c = o.cls ? " " + o.cls : "";
    P.add(1, 0, P._prism(outer, z, H, c, false));
    var rim = inner.map(function (q) { return project(C, q.u, q.v, z + H); });
    P.add(1, 0, [[poly(rim), "fl"]]);
    var zf = z + H - depth;
    var floor = clipPoly(inner.map(function (q) { return project(C, q.u, q.v, zf); }), rim);
    if (floor.length > 2) {
      P.add(1, 0, [[poly(floor), "fl"]]);
      if (o.slats) {
        var d = "", cx = o.cx || 0, cy = o.cy || 0, R = o.reach || 20;
        for (var t = -R + o.slats; t < R; t += o.slats) {
          var cs = clipSeg(project(C, cx + t, cy - R, zf), project(C, cx + t, cy + R, zf), floor);
          if (cs) d += seg(cs[0], cs[1]);
        }
        P.raw(d, "ln lo", 1);
      }
    }
    if (o.inside) o.inside(zf);
    var run = frontRun(C, outer);
    if (run.length > 1) {
      var top = run.map(function (q) { return project(C, q.u, q.v, z + H); }), bot = run.map(function (q) { return project(C, q.u, q.v, z); }).reverse();
      P.add(1, 0, [[poly(top.concat(bot)), "sil" + c]]);
      if (o.sharp) {
        var best = outer[0];
        outer.forEach(function (q) { if (q.u * C.s + q.v * C.c > best.u * C.s + best.v * C.c) best = q; });
        P.raw(seg(project(C, best.u, best.v, z), project(C, best.u, best.v, z + H)), "ed" + c, 1);
      }
      var irun = frontRun(C, inner);
      if (irun.length > 1) P.raw(open(irun.map(function (q) { return project(C, q.u, q.v, z + H); })), "ln lo", 1);
    }
  }

  /** Labels in a column beside an object: fixed slots, each leader bent to its part. */
  function labelColumn(P, rows, colX, fs) {
    rows.forEach(function (r) {
      P.screenLine([r.edge, [colX - 3, r.slot], [colX, r.slot]], { cls: r.hi ? "acc" : "lo" });
      P.screenText(colX + 1.5, r.slot + fs * 0.35, r.text, { cls: r.hi ? "acc" : "" });
    });
  }

  /** n points on a circle of radius r, from angle a0. */
  function ringOf(n, r, a0) {
    var out = [];
    for (var i = 0; i < n; i++) { var a = (a0 || 0) + (i / n) * Math.PI * 2; out.push([r * Math.cos(a), r * Math.sin(a)]); }
    return out;
  }
  /** Small things set on a floor, painted back to front. */
  function backToFront(P, pts, draw) {
    pts.slice().sort(function (a, b) { return P.key(a[0], a[1], 0) - P.key(b[0], b[1], 0); }).forEach(draw);
  }

  /** A city tower of one of five kinds, h tall, in its own paint group. */
  function drawTower(P, b, h, cls, blink) {
    var z0 = 0.35, C = P.C, top = z0 + h, ring;
    P.begin(P.key(b.cx, b.cy, 0));
    if (b.type === "round") {
      ring = P.cyl(b.cx, b.cy, z0, b.w / 2, h, { cls: cls });
      floors(P, ring, z0, top, 2.6);
      P.cyl(b.cx, b.cy, top, b.w / 2 - 1.2, 1.6, { cls: cls });
      P.dot(b.cx, b.cy, top + 1.65, b.w / 2 - 2.6, { ring: true, cls: "lo" });
      top += 1.6;
    } else if (b.type === "stepped") {
      var tiers = [[1, 0.55], [0.72, 0.3], [0.46, 0.15]], z = z0;
      tiers.forEach(function (t) {
        var hh = h * t[1];
        ring = P.box(b.cx, b.cy, z, b.w * t[0], b.d * t[0], hh, { r: 0.5, cls: cls });
        floors(P, ring, z, z + hh, 3);
        z += hh;
      });
      top = z;
    } else if (b.type === "slab") {
      ring = P.box(b.cx, b.cy, z0, b.w, b.d, h, { r: 0.2, cls: cls });
      floors(P, ring, z0, top, 3);
      mullions(P, ring, z0 + 0.6, top - 0.5, 2.2);
      P.box(b.cx, b.cy, top, b.w - 0.6, b.d - 0.6, 0.6, { r: 0.2, cls: cls });
      top += 0.6;
    } else if (b.type === "low") {
      ring = P.box(b.cx, b.cy, z0, b.w, b.d, h, { r: 0.3, cls: cls });
      floors(P, ring, z0, top, 3.2);
      for (var u = 0; u < b.units; u++) P.box(b.cx - b.w * 0.22 + u * 2.6, b.cy + b.d * 0.2, top, 1.8, 1.4, 1.1, { r: 0.2, cls: cls });
    } else {
      ring = P.box(b.cx, b.cy, z0, b.w, b.d, h, { r: 1.4, cls: cls });
      floors(P, ring, z0, top, 2.2);
      if (!b.helipad) { P.box(b.cx, b.cy, top, b.w * 0.5, b.d * 0.42, 1.6, { r: 0.4, cls: cls }); top += 1.6; }
    }
    if (b.tank) {
      var tx = b.cx - b.w * 0.2, ty = b.cy - b.d * 0.2;
      [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]].forEach(function (q) { P.line([[tx + q[0], ty + q[1], top], [tx + q[0], ty + q[1], top + 1.2]], { cls: "" }); });
      P.cyl(tx, ty, top + 1.2, 1.05, 1.7, { cls: cls });
      P.solid(coneR(tx, ty, top + 2.9, 1.15, 0.8, 14), { cls: cls });
    }
    if (b.helipad) {
      P.dot(b.cx, b.cy, top + 0.02, Math.min(b.w, b.d) * 0.36, { ring: true, cls: "lo" });
      var hs = Math.min(b.w, b.d) * 0.12;
      P.raw(seg(project(C, b.cx - hs, b.cy - hs, top + 0.02), project(C, b.cx - hs, b.cy + hs, top + 0.02)) +
        seg(project(C, b.cx + hs, b.cy - hs, top + 0.02), project(C, b.cx + hs, b.cy + hs, top + 0.02)) +
        seg(project(C, b.cx - hs, b.cy, top + 0.02), project(C, b.cx + hs, b.cy, top + 0.02)), "ln", 1);
    }
    if (b.ant) {
      P.line([[b.cx, b.cy, top], [b.cx, b.cy, top + 7]], { cls: "" });
      if (blink) P.light(b.cx, b.cy, top + 7, 0.6, { cls: "acc" });
    }
    P.end();
  }

  /**
   * A cumulus drawn the way an illustrator draws one: round puffs on one flat
   * base, always facing the eye, so it never deforms when the camera moves.
   * The first pass strokes every puff; the second fills them a hair smaller and
   * covers the strokes inside, so only the cloud's outer edge is left.
   */
  function drawCloud(P, cl, ox, oy, fs) {
    var a = project(P.C, cl.x + ox, cl.y + oy, cl.z), s = cl.s, base = a[1], sh = fs * 0.16;
    var arc = function (p, k) {
      var r = p[1] * s - k, cx = a[0] + p[0] * s, cy = base - p[1] * s * 0.55, b = base - k, dy = b - cy;
      if (r <= 0 || dy >= r) return "";
      var hx = Math.sqrt(r * r - dy * dy);
      return "M" + r2(cx - hx) + " " + r2(b) + "A" + r2(r) + " " + r2(r) + " 0 " + (dy > 0 ? 1 : 0) + " 1 " + r2(cx + hx) + " " + r2(b) + "Z";
    };
    var line = "", fill = "";
    cl.puffs.forEach(function (p) { line += arc(p, 0); fill += arc(p, sh); });
    P.begin(P.key(cl.x + ox, cl.y + oy, cl.z), 2);
    P.add(2, 0, [[line, "sil"]]);
    P.add(2, 0, [[fill, "fo"]]);
    P.end();
  }

  /* ================================================================
   * Paths: fillets, loops, following
   * ============================================================== */

  /** A path through the corners, each rounded with radius r (capped at half of each side); closed or open. */
  function makePath(pts, r, closed) {
    var out = [], n = pts.length;
    for (var i = 0; i < n; i++) {
      if (!closed && (i === 0 || i === n - 1)) { out.push(pts[i]); continue; }
      var a = pts[(i + n - 1) % n], b = pts[i], c = pts[(i + 1) % n];
      var l1 = dist(a, b), l2 = dist(b, c), rr = Math.min(r, l1 / 2, l2 / 2);
      var p1 = [b[0] - ((b[0] - a[0]) / l1) * rr, b[1] - ((b[1] - a[1]) / l1) * rr];
      var p2 = [b[0] + ((c[0] - b[0]) / l2) * rr, b[1] + ((c[1] - b[1]) / l2) * rr];
      for (var k = 0; k <= 8; k++) out.push(bez(p1, b, p2, k / 8));
    }
    if (closed) out.push(out[0]);
    var S = [0];
    for (i = 1; i < out.length; i++) S.push(S[i - 1] + dist(out[i - 1], out[i]));
    return { P: out, S: S, L: S[S.length - 1] };
  }
  function makeLoop(pts, r) { return makePath(pts, r, true); }
  /** The point at arc length s on a loop (wrapping), with its heading. */
  function loopAt(lp, s) {
    s = ((s % lp.L) + lp.L) % lp.L;
    var lo = 0, hi = lp.S.length - 1;
    while (hi - lo > 1) { var md = (lo + hi) >> 1; if (lp.S[md] <= s) lo = md; else hi = md; }
    var a = lp.P[lo], b = lp.P[hi], L = lp.S[hi] - lp.S[lo] || 1, t = (s - lp.S[lo]) / L;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  function loopNearest(lp, p) {
    var best = 1e9, bs = 0;
    for (var i = 1; i < lp.P.length; i++) {
      var a = lp.P[i - 1], b = lp.P[i], dx = b[0] - a[0], dy = b[1] - a[1], L = dx * dx + dy * dy;
      var t = L ? clamp(((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L, 0, 1) : 0;
      var d = Math.hypot(p[0] - a[0] - dx * t, p[1] - a[1] - dy * t);
      if (d < best) { best = d; bs = lp.S[i - 1] + Math.sqrt(L) * t; }
    }
    return bs;
  }
  /** The loop's centreline offset sideways by o: one road edge. */
  function loopOffset(lp, o) {
    var out = [];
    for (var i = 0; i < lp.P.length - 1; i++) {
      var a = lp.P[i], b = lp.P[i + 1], L = dist(a, b) || 1;
      out.push([a[0] - ((b[1] - a[1]) / L) * o, a[1] + ((b[0] - a[0]) / L) * o, 0.05]);
    }
    out.push(out[0]);
    return out;
  }
  /** A speed that stops exactly `gap` ahead: as fast as vmax allows, braking at `brake`. */
  function follow(v, vmax, gap, brake, accel, dt) {
    var vt = gap <= 0 ? 0 : Math.min(vmax, Math.sqrt(2 * brake * gap));
    return vt < v ? vt : Math.min(vt, v + accel * dt);
  }

  /* ================================================================
   * City traffic: cars drive the road grid, keep their distance, and take
   * turns through each crossing (one car in a crossing at a time).
   * ============================================================== */

  var DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  var KINDS = ["sedan", "sedan", "hatch", "suv", "van", "taxi", "sedan", "hatch", "bus"];

  function makeTraffic(n, B, RW, count, R) {
    var T = { n: n, step: B + RW, n0: RW / 2, off: RW / 2 + 3, lane: 2.5, cars: [], locks: {}, R: R };
    T.EL = T.step - 2 * T.off;
    for (var tries = 0; T.cars.length < count && tries < 600; tries++) {
      var a = [Math.floor(R() * (n + 1)), Math.floor(R() * (n + 1))], d = Math.floor(R() * 4);
      if (!inGrid(T, a[0] + DIRS[d][0], a[1] + DIRS[d][1])) continue;
      var kind = KINDS[Math.floor(R() * KINDS.length)], len = CARS[kind].len;
      if (len > T.EL - 2) continue;
      var s = len / 2 + R() * (T.EL - len);
      var clash = T.cars.some(function (c) { return c.a[0] === a[0] && c.a[1] === a[1] && c.d === d && Math.abs(c.s - s) < (c.len + len) / 2 + 2; });
      if (clash) continue;
      var car = { id: T.cars.length, a: a, d: d, s: s, v: 0, phase: 0, kind: kind, len: len, vmax: 6 + R() * 2.5, acc: kind === "taxi" };
      car.d2 = nextDir(T, car);
      T.cars.push(car);
    }
    return T;
  }
  function inGrid(T, i, j) { return i >= 0 && j >= 0 && i <= T.n && j <= T.n; }
  function nodeOf(c) { return [c.a[0] + DIRS[c.d][0], c.a[1] + DIRS[c.d][1]]; }
  function nextDir(T, c) {
    var b = nodeOf(c), opts = [];
    for (var d = 0; d < 4; d++) {
      if (d === (c.d + 2) % 4 || !inGrid(T, b[0] + DIRS[d][0], b[1] + DIRS[d][1])) continue;
      opts.push(d);
      if (d === c.d) opts.push(d);
    }
    return opts[Math.floor(T.R() * opts.length)];
  }
  function laneRight(d) { return [DIRS[d][1], -DIRS[d][0]]; }
  function turnGeom(T, c) {
    var b = nodeOf(c), N = [T.n0 + b[0] * T.step, T.n0 + b[1] * T.step], dv = DIRS[c.d], dw = DIRS[c.d2];
    var rv = laneRight(c.d), rw = laneRight(c.d2);
    var E = [N[0] - dv[0] * T.off + rv[0] * T.lane, N[1] - dv[1] * T.off + rv[1] * T.lane];
    var S = [N[0] + dw[0] * T.off + rw[0] * T.lane, N[1] + dw[1] * T.off + rw[1] * T.lane];
    var K;
    if (c.d2 === c.d) K = [(E[0] + S[0]) / 2, (E[1] + S[1]) / 2];
    else { var t = (S[0] - E[0]) * dv[0] + (S[1] - E[1]) * dv[1]; K = [E[0] + dv[0] * t, E[1] + dv[1] * t]; }
    var L = 0, prev = E;
    for (var k = 1; k <= 12; k++) { var p = bez(E, K, S, k / 12); L += dist(prev, p); prev = p; }
    return { E: E, K: K, S: S, L: L, node: b[0] + "," + b[1] };
  }
  function onEdge(o, a, d) { return o.phase === 0 && o.d === d && o.a[0] === a[0] && o.a[1] === a[1]; }
  function stepTraffic(T, dt) {
    var cars = T.cars;
    cars.forEach(function (c) {
      var gap = 1e9, b = nodeOf(c), nk = b[0] + "," + b[1];
      if (c.phase === 0) {
        cars.forEach(function (o) { if (o !== c && onEdge(o, c.a, c.d) && o.s > c.s) gap = Math.min(gap, o.s - c.s - (o.len + c.len) / 2 - 1.4); });
        if (T.locks[nk] !== c.id) {
          // ask for the crossing when close; take it only if it is free and there is room beyond it
          var room = !cars.some(function (o) { return o !== c && onEdge(o, b, c.d2) && o.s < (o.len + c.len) / 2 + 3; });
          if (T.EL - c.s - c.len / 2 < 6 && T.locks[nk] == null && room) { T.locks[nk] = c.id; c.tg = turnGeom(T, c); }
          if (T.locks[nk] !== c.id) gap = Math.min(gap, T.EL - c.s - c.len / 2 - 0.3);
        }
      } else {
        cars.forEach(function (o) { if (onEdge(o, b, c.d2)) gap = Math.min(gap, c.tg.L - c.s + o.s - (o.len + c.len) / 2 - 1.4); });
      }
      c.v = follow(c.v, c.vmax * (c.phase ? 0.65 : 1), gap, 9, 4, dt);
      c.s += c.v * dt;
      if (c.phase === 0 && c.s >= T.EL) {
        if (T.locks[nk] === c.id) { c.phase = 1; c.s -= T.EL; }
        else c.s = T.EL;
      } else if (c.phase === 1 && c.s >= c.tg.L) {
        var over = c.s - c.tg.L;
        delete T.locks[c.tg.node];
        c.a = b; c.d = c.d2; c.d2 = nextDir(T, c); c.phase = 0; c.s = over;
      }
    });
  }
  function carPose(T, c) {
    if (c.phase === 1) {
      var t = clamp(c.s / c.tg.L, 0, 1), p = bez(c.tg.E, c.tg.K, c.tg.S, t), tn = bezTan(c.tg.E, c.tg.K, c.tg.S, t);
      return [p[0], p[1], Math.atan2(tn[1], tn[0])];
    }
    var dv = DIRS[c.d], rt = laneRight(c.d);
    return [T.n0 + c.a[0] * T.step + dv[0] * (T.off + c.s) + rt[0] * T.lane, T.n0 + c.a[1] * T.step + dv[1] * (T.off + c.s) + rt[1] * T.lane, Math.atan2(dv[1], dv[0])];
  }

  /* ================================================================
   * Scenes
   * ============================================================== */

  function plinth(P, b) {
    P.box((b[0] + b[2]) / 2, (b[1] + b[3]) / 2, -3, b[2] - b[0] + 8, b[3] - b[1] + 8, 3, { r: 6, layer: 0, key: -1e9 });
  }
  /** The scene's own corners at ground level, for framing. */
  function corners(b, z) { return [[b[0], b[1], z], [b[2], b[1], z], [b[2], b[3], z], [b[0], b[3], z]]; }

  var SCENES = {};

  /* City: towers of five kinds, a park, and traffic that keeps to its lanes. Towers near the pointer rise. */
  SCENES.city = {
    init: function (o, R) {
      var n = 3 + Math.round(o.density * 3), B = 24, RW = 10, S = n * B + (n + 1) * RW, half = S / 2;
      var blocks = [], bs = [], trees = [], parkBlock = n >= 4 ? Math.floor(R() * n * n) : -1;
      for (var bi = 0; bi < n; bi++) for (var bj = 0; bj < n; bj++) {
        var bx = RW + bi * (B + RW), by = RW + bj * (B + RW), idx = bi * n + bj, park = idx === parkBlock;
        blocks.push({ cx: bx + B / 2, cy: by + B / 2, park: park });
        if (park) {
          for (var t = 0; t < 40 && trees.length < 60; t++) {
            var tx = bx + 2.5 + R() * (B - 5), ty = by + 2.5 + R() * (B - 5);
            if (Math.abs(tx - bx - B / 2) < 2 || Math.abs(ty - by - B / 2) < 2 || Math.hypot(tx - bx - B / 2, ty - by - B / 2) < 5.5) continue;
            if (trees.some(function (q) { return Math.hypot(q.x - tx, q.y - ty) < 3.6; })) continue;
            trees.push({ x: tx, y: ty, s: 0.6 + R() * 0.3, pine: R() < 0.35 });
          }
          continue;
        }
        for (var li = 0; li < 2; li++) for (var lj = 0; lj < 2; lj++) {
          var cx = bx + 5.5 + li * 13, cy = by + 5.5 + lj * 13;
          if (R() < 0.07) { trees.push({ x: cx - 1.5, y: cy, s: 0.6, pine: false }, { x: cx + 2, y: cy + 2, s: 0.55, pine: true }); continue; }
          var dc = Math.hypot(cx - half, cy - half) / half;
          var h = 5 + Math.pow(R(), 1.5) * 40 * Math.max(0.2, 1.1 - 0.85 * dc);
          var type = h > 26 ? ["glass", "stepped", "round"][Math.floor(R() * 3)] : h > 13 ? ["glass", "slab", "round", "slab"][Math.floor(R() * 4)] : R() < 0.5 ? "low" : "slab";
          var w = 8 + R() * 2, d = 8 + R() * 2;
          if (type === "round") w = d = 9.4;
          if (type === "low") h = Math.min(h, 9);
          var tank = type === "low" || (type === "slab" && R() < 0.4);
          bs.push({ cx: cx, cy: cy, w: w, d: d, h: h, type: type, ant: !tank && type !== "round" && R() < 0.3, tank: tank, units: 1 + Math.floor(R() * 2) });
        }
      }
      var tall = bs.reduce(function (a, b) { return b.h > a.h ? b : a; }, bs[0]);
      tall.ant = true; tall.tank = false;
      if (tall.type === "glass") tall.helipad = true;
      var fit = corners([0, 0, S, S], -3).concat(corners([0, 0, S, S], 0));
      bs.forEach(function (b) { fit.push([b.cx, b.cy, b.h + (b.ant ? 8 : 2) + 6]); });
      return { b: [0, 0, S, S, 50], fit: fit, n: n, B: B, RW: RW, S: S, blocks: blocks, bs: bs, trees: trees, tall: tall, traffic: makeTraffic(n, B, RW, 4 + Math.round(o.density * 12), R), c: 0 };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, C = P.C, k;
      st.c += x.dt;
      plinth(P, st.b);
      st.blocks.forEach(function (b) { P.box(b.cx, b.cy, 0, st.B, st.B, 0.35, { r: 1.6, layer: 0, key: -1e7 }); });
      // lane dashes between crossings, zebra crossings at each approach
      var step = st.B + st.RW, n0 = st.RW / 2, hw = st.RW / 2, dash = "", zebra = "";
      var pr = function (px, py) { return project(C, px, py, 0.02); };
      for (k = 0; k <= st.n; k++) for (var e = 0; e < st.n; e++) {
        var a0 = n0 + e * step + hw + 3.6, a1 = n0 + (e + 1) * step - hw - 3.6, rc = n0 + k * step;
        for (var t = a0; t < a1 - 0.5; t += 3) {
          var t1 = Math.min(t + 1.4, a1);
          dash += seg(pr(t, rc), pr(t1, rc)) + seg(pr(rc, t), pr(rc, t1));
        }
      }
      for (var i = 0; i <= st.n; i++) for (var j = 0; j <= st.n; j++) for (var d = 0; d < 4; d++) {
        if (!inGrid(st.traffic, i + DIRS[d][0], j + DIRS[d][1])) continue;
        var dv = DIRS[d], bx0 = n0 + i * step + dv[0] * (hw + 0.8), by0 = n0 + j * step + dv[1] * (hw + 0.8);
        for (var l = -3.75; l < 3.8; l += 1.5) {
          var px = bx0 - dv[1] * l, py = by0 + dv[0] * l;
          zebra += seg(pr(px, py), pr(px + dv[0] * 1.8, py + dv[1] * 1.8));
        }
      }
      P.raw(dash, "ln lo", 0, -2e7);
      P.raw(zebra, "ln lo", 0, -2e7);
      // the park: crossing paths and a fountain
      st.blocks.forEach(function (b) {
        if (!b.park) return;
        P.line([[b.cx - st.B / 2 + 0.5, b.cy, 0.37], [b.cx - 4.6, b.cy, 0.37]], { cls: "lo", layer: 0, key: -9e6 });
        P.line([[b.cx + 4.6, b.cy, 0.37], [b.cx + st.B / 2 - 0.5, b.cy, 0.37]], { cls: "lo", layer: 0, key: -9e6 });
        P.line([[b.cx, b.cy - st.B / 2 + 0.5, 0.37], [b.cx, b.cy - 4.6, 0.37]], { cls: "lo", layer: 0, key: -9e6 });
        P.line([[b.cx, b.cy + 4.6, 0.37], [b.cx, b.cy + st.B / 2 - 0.5, 0.37]], { cls: "lo", layer: 0, key: -9e6 });
        P.begin(P.key(b.cx, b.cy, 0));
        P.cyl(b.cx, b.cy, 0.35, 3.6, 0.7);
        P.dot(b.cx, b.cy, 1.06, 2.9, { ring: true, cls: "lo" });
        P.cyl(b.cx, b.cy, 1.05, 0.5, 1.4);
        P.sphere(b.cx, b.cy, 2.9, 0.75, { cls: "hi" });
        P.end();
      });
      var on = x.ptr.on && x.o.interactive;
      st.bs.forEach(function (b, bi) {
        var lift = on ? 30 * falloff(ptrDist(x, b.cx, b.cy, b.hc || b.h) / 36) : 0;
        var h = (b.hc = x.ease("b" + bi, b.h + lift, 7));
        drawTower(P, b, h, lift > 6 ? "acc" : "", b === st.tall || b.ant ? Math.sin(st.c * 4 + bi) > 0 : false);
      });
      st.trees.forEach(function (tr) { drawTree(P, tr.x, tr.y, tr.s, tr.pine); });
      stepTraffic(st.traffic, x.dt);
      st.traffic.cars.forEach(function (c) {
        var p = carPose(st.traffic, c);
        drawCar(P, p[0], p[1], p[2], c.kind, c.acc ? "acc" : "");
      });
    },
  };

  /* Supply chain: factory, belt, warehouse, trucks on a loop, store. Hovering slows the clock. */
  SCENES.supply = {
    init: function (o, R) {
      var W = 186, D = 82, lp = makeLoop([[84, 47], [180, 47], [180, 74], [84, 74]], 7);
      var stops = [{ s: loopNearest(lp, [104, 47]), at: "warehouse" }, { s: loopNearest(lp, [161, 47]), at: "store" }];
      var nT = o.density > 0.55 ? 2 : 1, trucks = [];
      for (var k = 0; k < nT; k++) trucks.push({ s: stops[0].s - 30 - (k * lp.L) / 2, v: 0, dwell: 0, acc: k === 0 });
      trucks.forEach(function (t) {
        var best = 1e9;
        stops.forEach(function (sp, i) { var dd = (((sp.s - t.s) % lp.L) + lp.L) % lp.L; if (dd < best) { best = dd; t.next = i; } });
      });
      // keep-out zones for anything planted: buildings, yard, belt, road, parking
      // keep-out zones; trees stay well clear of the belt, so none stands just behind it
      var zones = [[2, 6, 44, 56], [36, 4, 90, 33], [80, 4, 124, 46], [144, 10, 176, 41], [126, 54, 176, 66], [4, 58, 74, 80]];
      var free = function (p) {
        if (p[0] < 3 || p[1] < 3 || p[0] > W - 3 || p[1] > D - 3) return false;
        if (zones.some(function (z) { return p[0] > z[0] && p[0] < z[2] && p[1] > z[1] && p[1] < z[3]; })) return false;
        for (var i = 1; i < lp.P.length; i++) if (segDist(p, lp.P[i - 1], lp.P[i]) < 7) return false;
        return true;
      };
      var trees = [];
      for (var t = 0; t < 400 && trees.length < 12 + o.density * 14; t++) {
        var p = [R() * W, R() * D];
        if (!free(p) || trees.some(function (q) { return dist(q, p) < 4.2; })) continue;
        trees.push([p[0], p[1], 0.7 + R() * 0.35, R() < 0.45]);
      }
      var parked = [];
      for (k = 0; k < 7; k++) if (R() < 0.7) parked.push({ x: 131 + k * 6.4, y: 60, yaw: (R() < 0.5 ? 1 : -1) * Math.PI / 2, kind: ["sedan", "hatch", "suv", "van"][Math.floor(R() * 4)] });
      var fit = corners([0, 0, W, D], -3).concat(corners([0, 0, W, D], 0), [[11, 15, 34], [18, 13, 30], [102, 24, 18], [23, 23, 16]]);
      return { b: [0, 0, W, D, 34], fit: fit, lp: lp, stops: stops, trucks: trucks, trees: trees, parked: parked, crates: 4 + Math.round(o.density * 3), c: 0, belt: 0, count: 12 };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, k, lp = st.lp;
      var dt = x.dt * x.ease("slow", on ? 0.22 : 1, 4);
      st.c += dt;
      plinth(P, st.b);
      var near = -1, best = 40;
      if (on) [[23, 23], [102, 24], [160, 25]].forEach(function (s, i) { var dd = ptrDist(x, s[0], s[1], 12); if (dd < best) { best = dd; near = i; } });
      var cl = function (i) { return near === i ? "acc" : ""; };

      // the road loop, its edges and its centre line
      P.line(loopOffset(lp, 4), { cls: "", layer: 0, key: -2e7 });
      P.line(loopOffset(lp, -4), { cls: "", layer: 0, key: -2e7 });
      P.line(lp.P.map(function (p) { return [p[0], p[1], 0.05]; }), { cls: "lo dash", layer: 0, key: -2e7 });
      // parking: stall lines on the island
      var stalls = "";
      for (k = 0; k <= 7; k++) stalls += seg(project(C, 128 + k * 6.4, 56, 0.05), project(C, 128 + k * 6.4, 64, 0.05));
      stalls += seg(project(C, 128, 64, 0.05), project(C, 128 + 7 * 6.4, 64, 0.05));
      P.raw(stalls, "ln lo", 0, -2e7);

      // factory: a hall under a sawtooth roof, two chimneys, silos beside it
      var fm = new Model(P, xf(23, 23, 0, 0), cl(0));
      P.begin(P.key(23, 23, 0));
      fm.solid(boxR(-18, 18, -14, 14, 0, 10));
      if (fm.sees(1, 0, 0)) fm.pane([[18.03, -2.6, 3.4], [18.03, 2.6, 3.4], [18.03, 2.6, 8], [18.03, -2.6, 8]]);
      if (fm.sees(0, 1, 0)) {
        fm.pane([[-12, 14.03, 0], [-5, 14.03, 0], [-5, 14.03, 6], [-12, 14.03, 6]]);
        for (var sl = 1.2; sl < 6; sl += 1.2) fm.line([[-12, 14.05, sl], [-5, 14.05, sl]], "lo");
        fm.pane([[0, 14.03, 0], [1.8, 14.03, 0], [1.8, 14.03, 3.2], [0, 14.03, 3.2]]);
      }
      for (k = 0; k < 4; k++) {
        var xa = -18 + k * 9;
        fm.solid(extrudeY([[xa, 10], [xa + 9, 10], [xa, 13.4]], 14));
        if (fm.sees(-1, 0, 0)) for (var g = -11; g <= 11; g += 2.75) fm.line([[xa - 0.02, g, 10.3], [xa - 0.02, g, 13.1]], "lo");
      }
      [[-12, -8, 1.7, 16], [-5, -10, 1.3, 12]].forEach(function (ch) {
        fm.solid([rCirc("z", [ch[0], ch[1], 10], ch[2], ch[2], 18), rCirc("z", [ch[0], ch[1], 10 + ch[3]], ch[2], ch[2], 18)]);
        fm.solid([rCirc("z", [ch[0], ch[1], 10 + ch[3] - 0.6], ch[2] + 0.3, ch[2] + 0.3, 18), rCirc("z", [ch[0], ch[1], 10 + ch[3]], ch[2] + 0.3, ch[2] + 0.3, 18)], "acc");
      });
      P.end();
      [[11, 15, 26.4], [18, 13, 22.4]].forEach(function (ch, j) {
        for (var i = 0; i < 4; i++) {
          var p = (st.c * 0.28 + i / 4 + j * 0.13) % 1;
          P.sphere(ch[0] + p * 8, ch[1] - p * 3, ch[2] + 1.5 + p * 12, 0.9 + p * 2.8, { full: "pf", layer: 3 });
        }
      });
      [[10, 47], [19, 47]].forEach(function (sp) {
        P.begin(P.key(sp[0], sp[1], 0));
        P.solid([rCirc("z", [sp[0], sp[1], 0], 3.6, 3.6, 24), rCirc("z", [sp[0], sp[1], 12], 3.6, 3.6, 24), rCirc("z", [sp[0], sp[1], 13.6], 2.9, 2.9, 24), rCirc("z", [sp[0], sp[1], 14.6], 1.6, 1.6, 24), rCirc("z", [sp[0], sp[1], 15], 0.3, 0.3, 24)], { crease: 0.6 });
        floors(P, place(circ(3.6, 24), sp[0], sp[1], 0), 0, 12, 3);
        P.end();
      });
      P.line([[19, 43.4, 13], [19, 37, 13], [19, 37.1, 10]], { cls: "" });
      // a solar field: rows of tilted panels on posts
      for (var row = 0; row < 4; row++) for (var bay = 0; bay < 5; bay++) {
        var y0 = 59.5 + row * 5, x0 = 7 + bay * 13.2, key = P.key(x0 + 6, y0 + 1.6, 0);
        P.begin(key);
        [x0 + 1, x0 + 11].forEach(function (lx) { P.line([[lx, y0 + 0.4, 0], [lx, y0 + 0.4, 1.1]], { cls: "" }); P.line([[lx, y0 + 2.8, 0], [lx, y0 + 2.8, 2.3]], { cls: "" }); });
        P.solid(extrudeX([[y0, 1.0], [y0 + 3.2, 2.4], [y0 + 3.2, 2.6], [y0, 1.2]], x0, x0 + 12));
        var cells = "";
        for (var cx2 = x0 + 2.4; cx2 < x0 + 12; cx2 += 2.4) cells += seg(project(C, cx2, y0, 1.21), project(C, cx2, y0 + 3.2, 2.61));
        cells += seg(project(C, x0, y0 + 1.6, 1.91), project(C, x0 + 12, y0 + 1.6, 1.91));
        P.raw(cells, "ln lo", 1);
        P.end();
      }
      // yard pallets
      [[32, 45], [38, 45], [32, 51]].forEach(function (pp, i) {
        P.begin(P.key(pp[0], pp[1], 0));
        P.box(pp[0], pp[1], 0, 4.4, 4.4, 0.5, { r: 0.1 });
        var load = [[-1, -1, 0.5], [1, -1, 0.5], [-1, 1, 0.5]];
        if (i !== 1) load.push([1, 1, 0.5]);
        if (i === 0) load.push([-1, -1, 2.5]);
        load.sort(function (a, b) { return a[2] - b[2] || P.key(a[0], a[1], 0) - P.key(b[0], b[1], 0); }).forEach(function (q) { drawCrate(P, pp[0] + q[0], pp[1] + q[1], q[2], 2, 0, "", null, null, 1, false); });
        P.end();
      });

      // belt: legs, bed, cartons trimmed where they pass through the walls
      // the belt carries its cartons: one group, belt first, cartons back to front
      P.begin(P.key(62, 23, 0));
      [46, 58, 70].forEach(function (lx) { [-2, 2].forEach(function (oy) { P.line([[lx, 23 + oy, 0], [lx, 23 + oy, 3.6]], { cls: "" }); }); });
      P.box(62, 23, 3.6, 42, 5, 0.8, { r: 0.15 });
      var belt = [];
      for (k = 0; k < st.crates; k++) belt.push({ x: 41 + ((st.c * 4 + (k * 41) / st.crates) % 41), acc: k === 0 });
      belt.sort(function (a, b) { return P.key(a.x, 23, 0) - P.key(b.x, 23, 0); }).forEach(function (cr) {
        drawCrate(P, cr.x, 23, 4.4, 3, 0, cr.acc ? "acc" : "", Math.max(-1.5, 41.2 - cr.x), Math.min(1.5, 82.8 - cr.x), 1, false);
      });
      P.end();

      // warehouse: gable roof, three dock doors, a loading platform
      var wm = new Model(P, xf(102, 24, 0, 0), cl(1));
      P.begin(P.key(102, 24, 0));
      wm.solid(boxR(-19, 19, -16, 16, 0, 10));
      if (wm.sees(0, 1, 0)) [-10, 0, 10].forEach(function (dx) {
        wm.pane([[dx - 3, 16.03, 1.4], [dx + 3, 16.03, 1.4], [dx + 3, 16.03, 6.4], [dx - 3, 16.03, 6.4]]);
        for (var s2 = 2.4; s2 < 6.4; s2 += 1) wm.line([[dx - 3, 16.05, s2], [dx + 3, 16.05, s2]], "lo");
      });
      wm.solid(extrudeX([[-16.8, 9.7], [16.8, 9.7], [0, 13.2]], -19.6, 19.6));
      P.end();
      P.begin(P.key(102, 41.6, 0));
      P.box(102, 41.6, 0, 36, 3.2, 1.4, { r: 0.1 });
      drawCrate(P, 92, 41.6, 1.4, 2.2, 0, "", null, null, 1, false);
      drawCrate(P, 112, 41.6, 1.4, 2.2, 0.3, "", null, null, 1, false);
      P.end();

      // store: glass front, striped awning, a sign
      var sm = new Model(P, xf(160, 25, 0, 0), cl(2));
      P.begin(P.key(160, 25, 0));
      sm.solid(boxR(-13, 13, -10, 10, 0, 7.5));
      if (sm.sees(0, 1, 0)) {
        sm.pane([[-11, 10.03, 0.6], [11, 10.03, 0.6], [11, 10.03, 5], [-11, 10.03, 5]]);
        for (var mx = -7.3; mx < 11; mx += 3.7) sm.line([[mx, 10.05, 0.6], [mx, 10.05, 5]], "lo");
      }
      sm.solid(extrudeX([[10, 5.7], [13.4, 4.7], [13.4, 4.4], [10, 5.4]], -12.5, 12.5), "acc");
      for (var ax = -11.3; ax < 12.5; ax += 2.4) sm.line([[ax, 10.1, 5.72], [ax, 13.4, 4.72]], "acc");
      sm.solid(boxR(-6, 6, 8.8, 9.6, 7.5, 9.8));
      P.end();

      st.trees.forEach(function (t) { drawTree(P, t[0], t[1], t[2], t[3]); });
      st.parked.forEach(function (c) { drawCar(P, c.x, c.y, c.yaw, c.kind, ""); });

      // trucks: follow the loop, keep their distance, wait at each dock
      var L = lp.L, nT = st.trucks.length;
      st.trucks.forEach(function (t, i) {
        var gap = 1e9;
        if (nT > 1) { var oth = st.trucks[(i + 1) % nT]; gap = ((((oth.s - t.s) % L) + L) % L) - 5.4 - 12.6 - 3; }
        if (t.dwell > 0) {
          t.dwell -= dt;
          t.v = 0;
          if (t.dwell <= 0) { if (st.stops[t.next].at === "store") st.count++; t.next = (t.next + 1) % st.stops.length; }
        } else {
          var toStop = ((((st.stops[t.next].s - t.s) % L) + L) % L);
          if (toStop < 0.05 && t.v < 0.3) t.dwell = 2.6;
          else t.v = follow(t.v, 11, Math.min(gap, toStop), 5, 3.5, dt);
        }
        t.s += t.v * dt;
        var h = loopAt(lp, t.s), fr = loopAt(lp, t.s + 4.1), rr = loopAt(lp, t.s - 10.8);
        drawTrailer(P, h[0], h[1], Math.atan2(h[1] - rr[1], h[0] - rr[0]), t.acc ? "acc" : "");
        drawTractor(P, h[0], h[1], Math.atan2(fr[1] - h[1], fr[0] - h[0]), "");
      });

      if (o.labels) {
        P.callout(32, 18, 13.4, nm(o, 0, "Factory"), { cls: cl(0) });
        P.callout(102, 24, 13.2, nm(o, 1, "Warehouse"), { cls: cl(1) });
        P.callout(160, 23, 9.8, nm(o, 2, "Store") + " · " + st.count, { cls: cl(2) });
      }
    },
  };

  /* Flight: two airports, a field-and-river landscape, an airliner flying a circuit between them. Clouds make way for the pointer. */
  var PLANE_K = 0.8;
  /** The fuselage axis height when the main wheels touch, for a given pitch (the plane rotates on its main gear). */
  function planeRide(k, pitch) { return k * (0.8 * Math.sin(pitch) + 2.55 * Math.cos(pitch)); }
  /**
   * One leg, runway X to runway Y: take-off roll, climb-out, a wide S over the
   * country, a long straight final, rollout, ending a little right of the
   * centreline so the turnaround lands back on it.
   */
  function flightRoute(X, Y) {
    var dx = Y[0] - X[0], dy = Y[1] - X[1], Ld = Math.hypot(dx, dy), d = [dx / Ld, dy / Ld], lf = [-d[1], d[0]];
    var at = function (c, a, b) { return [c[0] + d[0] * a + lf[0] * b, c[1] + d[1] * a + lf[1] * b]; };
    var mid = [(X[0] + Y[0]) / 2 + lf[0] * 30, (X[1] + Y[1]) / 2 + lf[1] * 30];
    var r = makePath([at(X, -22, -2.6), at(X, -10, 0), at(X, 24, 0), mid, at(Y, -64, 0), at(Y, 10, 0), at(Y, 22, -2.6)], 26, false);
    r.lo = loopNearest(r, at(X, 6, 0));
    r.td = loopNearest(r, at(Y, -8, 0));
    r.climb = 50; r.desc = 84;
    var room = r.td - r.lo - 4;
    if (r.climb + r.desc > room) { var f = room / (r.climb + r.desc); r.climb *= f; r.desc *= f; }
    return r;
  }
  function routeAlt(r, s, H) { return H * Math.min(rampSoft((s - r.lo) / r.climb, 0.25), rampSoft((r.td - s) / r.desc, 0.25)); }

  SCENES.flight = {
    init: function (o, R) {
      var W = 196, D = 110, A = [38, 80], B = [158, 30];
      var dx = B[0] - A[0], dy = B[1] - A[1], AB = Math.hypot(dx, dy), u = [dx / AB, dy / AB], p = [-u[1], u[0]];
      // airport buildings go on the far side of each runway, so they never hide it
      var az = rad(o.azimuth), side = p[0] * Math.sin(az) + p[1] * Math.cos(az) > 0 ? -1 : 1;
      var at = function (c, a, b) { return [c[0] + u[0] * a + p[0] * b * side, c[1] + u[1] * a + p[1] * b * side]; };
      var caps = [];
      [A, B].forEach(function (c) {
        caps.push({ a: at(c, -32, 0), b: at(c, 32, 0), r: 7 });
        caps.push({ a: at(c, -30, 21), b: at(c, 28, 21), r: 11 });
      });
      var mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], river = [];
      for (var t = -110; t <= 110; t += 3) {
        var rp = [mid[0] + p[0] * t + u[0] * Math.sin(t * 0.055) * 9, mid[1] + p[1] * t + u[1] * Math.sin(t * 0.055) * 9];
        if (rp[0] > 1 && rp[1] > 1 && rp[0] < W - 1 && rp[1] < D - 1) river.push(rp);
      }
      for (var ri = 1; ri < river.length; ri++) caps.push({ a: river[ri - 1], b: river[ri], r: 7.5 });
      var free = function (q, extra) {
        if (q[0] < 4 || q[1] < 4 || q[0] > W - 4 || q[1] > D - 4) return false;
        return !caps.some(function (cp) { return segDist(q, cp.a, cp.b) < cp.r + extra; });
      };
      var ang = Math.atan2(u[1], u[0]), fields = [], trees = [], village = [];
      for (t = 0; t < 300 && fields.length < 7 + o.density * 8; t++) {
        var fc = [6 + R() * (W - 12), 6 + R() * (D - 12)], fw = 14 + R() * 12, fd = 9 + R() * 7;
        var fcs = [[-fw / 2, -fd / 2], [fw / 2, -fd / 2], [fw / 2, fd / 2], [-fw / 2, fd / 2]].map(function (q) { return [fc[0] + u[0] * q[0] + p[0] * q[1], fc[1] + u[1] * q[0] + p[1] * q[1]]; });
        if (!fcs.concat([fc]).every(function (q) { return free(q, 0); })) continue;
        var lu = (fc[0] - A[0]) * u[0] + (fc[1] - A[1]) * u[1], lv = (fc[0] - A[0]) * p[0] + (fc[1] - A[1]) * p[1];
        if (fields.some(function (f) { return Math.abs(f.lu - lu) < (f.w + fw) / 2 + 1.5 && Math.abs(f.lv - lv) < (f.d + fd) / 2 + 1.5; })) continue;
        fields.push({ c: fc, w: fw, d: fd, lu: lu, lv: lv, pts: fcs, rows: R() < 0.5 });
      }
      var inField = function (q) {
        return fields.some(function (f) {
          var lu2 = (q[0] - A[0]) * u[0] + (q[1] - A[1]) * u[1], lv2 = (q[0] - A[0]) * p[0] + (q[1] - A[1]) * p[1];
          return Math.abs(f.lu - lu2) < f.w / 2 + 2 && Math.abs(f.lv - lv2) < f.d / 2 + 2;
        });
      };
      for (t = 0; t < 80 && village.length < 6; t++) {
        var vc = village.length ? [village[0].x + (R() - 0.5) * 22, village[0].y + (R() - 0.5) * 16] : [20 + R() * (W - 40), 15 + R() * (D - 30)];
        if (!free(vc, 4) || inField(vc) || village.some(function (h) { return Math.hypot(h.x - vc[0], h.y - vc[1]) < 8.5; })) continue;
        village.push({ x: vc[0], y: vc[1], yaw: ang + (R() < 0.5 ? 0 : Math.PI / 2) });
      }
      for (t = 0; t < 900 && trees.length < 26 + o.density * 30; t++) {
        var cc = trees.length && R() < 0.75 ? trees[Math.floor(R() * trees.length)] : null;
        var tp = cc ? [cc.x + (R() - 0.5) * 9, cc.y + (R() - 0.5) * 9] : [R() * W, R() * D];
        if (!free(tp, 1) || inField(tp) || village.some(function (h) { return Math.hypot(h.x - tp[0], h.y - tp[1]) < 6; })) continue;
        if (trees.some(function (q) { return Math.hypot(q.x - tp[0], q.y - tp[1]) < 2.6; })) continue;
        trees.push({ x: tp[0], y: tp[1], s: 0.45 + R() * 0.2, pine: R() < 0.55 });
      }
      var waves = [];
      for (t = 0; t < river.length * 0.8; t++) waves.push({ s: R() * (river.length - 2), o: (R() - 0.5) * 5.4 });
      var clouds = [], TPL = [[-1.45, 0.52], [-0.78, 0.78], [0.1, 1.0], [0.92, 0.74], [1.55, 0.5]];
      for (t = 0; t < 3 + Math.round(o.density * 3); t++) {
        clouds.push({ x: 20 + R() * (W - 40), y: 14 + R() * (D - 28), z: 24 + R() * 14, s: 4.2 + R() * 2.4, ph: R() * 6, amp: 8 + R() * 10,
          puffs: TPL.map(function (q) { return [q[0] + (R() - 0.5) * 0.25, q[1] * (0.85 + R() * 0.3)]; }) });
      }
      var rAB = flightRoute(A, B), rBA = flightRoute(B, A);
      var fit = corners([0, 0, W, D], -3).concat(corners([0, 0, W, D], 0), corners([20, 15, W - 20, D - 15], 46));
      rAB.P.concat(rBA.P).forEach(function (q) { fit.push([q[0], q[1], 20]); });
      return {
        b: [0, 0, W, D, 48], fit: fit, A: A, B: B, u: u, p: p, side: side, ang: ang, AB: AB, river: river, waves: waves, fields: fields, trees: trees, village: village, clouds: clouds, c: 0,
        rAB: rAB, rBA: rBA, pl: { dir: 1, mode: "fly", s: 0, v: 0, th: 0 }, hold: o.density > 0.5 ? { s: 0 } : null,
      };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, u = st.u, p = st.p, k;
      st.c += x.dt;
      plinth(P, st.b);

      // ground: fields with furrows, the river with ripples, the village, woods
      st.fields.forEach(function (f, i) {
        P.flat(f.pts.map(function (q) { return [q[0], q[1], 0.05]; }), { key: -1e8 + i });
        var d = "", n = Math.floor(f.d / 1.8);
        for (var r = 1; r < n; r++) {
          var v = -f.d / 2 + (r * f.d) / n, a = [f.c[0] - (u[0] * f.w) / 2 + p[0] * v, f.c[1] - (u[1] * f.w) / 2 + p[1] * v], b = [f.c[0] + (u[0] * f.w) / 2 + p[0] * v, f.c[1] + (u[1] * f.w) / 2 + p[1] * v];
          if (f.rows) d += seg(project(C, a[0], a[1], 0.06), project(C, b[0], b[1], 0.06));
          else if (r % 2) d += seg(project(C, a[0] + u[0] * 2, a[1] + u[1] * 2, 0.06), project(C, b[0] - u[0] * 2, b[1] - u[1] * 2, 0.06));
        }
        P.raw(d, "ln lo", 0, -1e8 + i + 0.5);
      });
      if (st.river.length > 1) {
        var bank = function (off) {
          return st.river.map(function (q, i) {
            var a = st.river[Math.max(0, i - 1)], b = st.river[Math.min(st.river.length - 1, i + 1)], L = dist(a, b) || 1;
            return [q[0] - ((b[1] - a[1]) / L) * off, q[1] + ((b[0] - a[0]) / L) * off, 0.05];
          });
        };
        var b1 = bank(4.2), b2 = bank(-4.2);
        P.flat(b1.concat(b2.slice().reverse()), { cls: "mid", key: -9e7 });
        var rip = "", wv = st.waves;
        for (k = 0; k < wv.length; k++) {
          var w = wv[k], pos = (w.s + st.c * 1.6) % (st.river.length - 2), i0 = Math.floor(pos), f0 = pos - i0;
          var ra = st.river[i0], rb = st.river[i0 + 1], L0 = dist(ra, rb) || 1, tx = (rb[0] - ra[0]) / L0, ty = (rb[1] - ra[1]) / L0;
          var cx = ra[0] + (rb[0] - ra[0]) * f0 - ty * w.o, cy = ra[1] + (rb[1] - ra[1]) * f0 + tx * w.o;
          rip += open([[-1.2, 0], [-0.6, 0.35], [0, 0], [0.6, -0.35], [1.2, 0]].map(function (vv) { return project(C, cx + tx * vv[0] - ty * vv[1], cy + ty * vv[0] + tx * vv[1], 0.06); }));
        }
        P.raw(rip, "ln lo", 0, -9e7 + 1);
      }

      // airports: runway with thresholds, taxiway, apron, terminal, tower, hangar
      [[st.A, nm(o, 0, "CDG")], [st.B, nm(o, 1, "JFK")]].forEach(function (ap) {
        var c = ap[0], m = new Model(P, xf(c[0], c[1], 0, st.ang), ""), sd = st.side;
        P.seq(-8e7);
        m.flat([[-29, -3.4, 0.08], [29, -3.4, 0.08], [29, 3.4, 0.08], [-29, 3.4, 0.08]], "mid", 0);
        var d = "";
        for (var t = -23; t < 23; t += 4) { var a0 = m.w([t, 0, 0.1]), a1 = m.w([t + 2, 0, 0.1]); d += seg(project(C, a0[0], a0[1], 0.1), project(C, a1[0], a1[1], 0.1)); }
        [-1, 1].forEach(function (e) {
          [-2.5, -1.5, 1.5, 2.5].forEach(function (bb) { var q0 = m.w([e * 27.6, bb, 0.1]), q1 = m.w([e * 25, bb, 0.1]); d += seg(project(C, q0[0], q0[1], 0.1), project(C, q1[0], q1[1], 0.1)); });
        });
        P.raw(d, "ln", 0, -8e7);
        m.line([[-25, 8.5 * sd, 0.08], [25, 8.5 * sd, 0.08]], "lo", 0);
        m.line([[-25, 8.5 * sd, 0.08], [-28, 3.4 * sd, 0.08]], "lo", 0);
        m.line([[25, 8.5 * sd, 0.08], [28, 3.4 * sd, 0.08]], "lo", 0);
        m.flat([[-15, 10.5 * sd, 0.06], [15, 10.5 * sd, 0.06], [15, 17 * sd, 0.06], [-15, 17 * sd, 0.06]], "", 0);
        P.seq(null);
        var bk = function (q) { var w = m.w(q); return P.key(w[0], w[1], 0); };
        P.begin(bk([0, 21 * sd, 0]));
        m.solid(boxR(-14, 14, 18 * sd, 24 * sd, 0, 4.2));
        if (m.sees(0, -sd, 0)) m.line([[-13, 17.97 * sd, 2.4], [13, 17.97 * sd, 2.4]], "lo");
        P.end();
        [-8, 0, 8].forEach(function (jx) {
          P.begin(bk([jx, 16.5 * sd, 0]));
          m.solid(boxR(jx - 0.7, jx + 0.7, 14.6 * sd, 18 * sd, 2, 3.1), "");
          m.line([[jx, 15 * sd, 0], [jx, 15 * sd, 2]], "");
          P.end();
        });
        var tw = [21, 21 * sd];
        P.begin(bk([tw[0], tw[1], 0]));
        m.solid([rCirc("z", [tw[0], tw[1], 0], 1.2, 1.2, 14), rCirc("z", [tw[0], tw[1], 12.5], 1.2, 1.2, 14)]);
        m.solid([rCirc("z", [tw[0], tw[1], 12.5], 1.7, 1.7, 18), rCirc("z", [tw[0], tw[1], 13.2], 2.4, 2.4, 18), rCirc("z", [tw[0], tw[1], 15], 2.4, 2.4, 18)], "hi");
        m.solid([rCirc("z", [tw[0], tw[1], 15], 2.7, 2.7, 18), rCirc("z", [tw[0], tw[1], 15.45], 2.7, 2.7, 18)]);
        m.line([[tw[0], tw[1], 15.45], [tw[0], tw[1], 18.5]], "");
        if (Math.sin(st.c * 3) > 0) m.light([tw[0], tw[1], 18.5], 0.45, "acc");
        P.end();
        P.begin(bk([-22, 21 * sd, 0]));
        var arc = [];
        for (var ai = 0; ai <= 8; ai++) { var aa = (ai / 8) * Math.PI; arc.push([21 * sd - Math.cos(aa) * 5.5, Math.sin(aa) * 5.5]); }
        m.solid(extrudeX(arc, -27, -17), null, { crease: 0.5 });
        if (m.sees(1, 0, 0)) {
          m.pane([[-16.97, 18 * sd, 0], [-16.97, 24 * sd, 0], [-16.97, 24 * sd, 4], [-16.97, 18 * sd, 4]]);
          for (var hd = 19.2; hd < 24; hd += 1.2) m.line([[-16.95, hd * sd, 0], [-16.95, hd * sd, 4]], "lo");
        }
        P.end();
        if (o.labels) { var lw = m.w([tw[0], tw[1], 0]); P.callout(lw[0], lw[1], 19, ap[1]); }
      });
      st.village.forEach(function (h) { drawHouse(P, h.x, h.y, h.yaw, { s: 0.45 }); });
      st.trees.forEach(function (t) { drawTree(P, t.x, t.y, t.s, t.pine); });

      // clouds drift to and fro; near the pointer they part
      var on = x.ptr.on && o.interactive;
      st.clouds.forEach(function (cl, i) {
        var push = 0, angp = 0, cx = cl.x + Math.sin(st.c * 0.12 + cl.ph) * cl.amp;
        if (on) { var pw = ptrAt(x, cl.z), dd = Math.hypot(cx - pw[0], cl.y - pw[1]); push = 18 * falloff(dd / 42); angp = Math.atan2(cl.y - pw[1], cx - pw[0]); }
        drawCloud(P, cl, cx - cl.x + x.ease("cx" + i, Math.cos(angp) * push, 3), x.ease("cy" + i, Math.sin(angp) * push, 3), x.fs);
      });

      // the airliner: rolls, rotates, climbs out, banks through an S, glides down a long final, flares, rolls out, turns round
      var pl = st.pl, K = PLANE_K, H = 15, rt = pl.dir > 0 ? st.rAB : st.rBA, nx = pl.dir > 0 ? st.rBA : st.rAB;
      var px, py, yaw, alt = 0, pitchT = 0, rollT = 0;
      if (pl.mode === "fly") {
        var rest = rt.L - pl.s, brakeD = (pl.v * pl.v) / (2 * 3.4), airborne = pl.s > rt.lo && pl.s < rt.td;
        pl.v = rest < brakeD + 0.3 ? Math.max(0.6, pl.v - 3.4 * x.dt) : Math.min(airborne ? 17 : 15, pl.v + 3.2 * x.dt);
        pl.s = Math.min(rt.L, pl.s + pl.v * x.dt);
        var q = loopAt(rt, Math.min(pl.s, rt.L - 0.01)), q2 = loopAt(rt, Math.min(pl.s + 3, rt.L - 0.01));
        px = q[0]; py = q[1]; yaw = q[2];
        alt = routeAlt(rt, pl.s, H);
        var slope = (routeAlt(rt, pl.s + 1, H) - routeAlt(rt, pl.s - 1, H)) / 2;
        var dpsi = alerp(0, q2[2] - q[2], 1) / 3;
        rollT = alt > 2 ? clamp(-dpsi * 9, -0.42, 0.42) : 0;
        if (pl.s < rt.lo - 7) pitchT = 0;
        else if (pl.s < rt.lo + 1) pitchT = 0.16 * ss(rt.lo - 7, rt.lo, pl.s);
        else if (pl.s > rt.td) pitchT = 0.13 * (1 - ss(rt.td + 1, rt.td + 9, pl.s));
        else if (slope > 0.02) pitchT = 0.07 + slope * 0.5;
        else if (slope < -0.02) pitchT = pl.s > rt.td - 13 ? 0.14 : 0.04;
        else pitchT = 0.015;
        if (pl.s >= rt.L - 0.01) { pl.mode = "turn"; pl.th = 0; pl.h0 = yaw; pl.E = [px, py]; pl.dh = (((loopAt(nx, 0.5)[2] - yaw) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI); }
      } else {
        // a slow teardrop at the runway end: the semicircle lands back on the centreline
        pl.th = Math.min(Math.PI, pl.th + x.dt * 0.85);
        var dv = [Math.cos(pl.h0), Math.sin(pl.h0)], lv = [-dv[1], dv[0]];
        px = pl.E[0] + lv[0] * 2.6 * (1 - Math.cos(pl.th)) + dv[0] * 2.6 * Math.sin(pl.th);
        py = pl.E[1] + lv[1] * 2.6 * (1 - Math.cos(pl.th)) + dv[1] * 2.6 * Math.sin(pl.th);
        yaw = pl.h0 + (pl.dh * pl.th) / Math.PI;
        if (pl.th >= Math.PI) { pl.mode = "fly"; pl.dir = -pl.dir; pl.s = 0; pl.v = 0; }
      }
      var pitch = x.ease("pitch", pitchT, 3), roll = x.ease("roll", rollT, 2.2), zc = planeRide(K, pitch) + alt;
      planeShadow(P, px, py, zc, yaw, pitch, roll, K);
      drawPlane(P, px, py, zc, yaw, pitch, roll, { gear: alt < 5, blink: Math.sin(st.c * 5) > 0.3, k: K });
      if (o.labels && alt > 3) P.text(px, py, zc + 2, "FL" + String(Math.round((alt / H) * 240)).padStart(3, "0"), { cls: "acc", anchor: "start", dx: 13 });

      // a second airliner holds above, on a racetrack, banking through the turns
      if (st.hold) {
        var hold = st.hold, Rr = 24, half = 30, mid = [(st.A[0] + st.B[0]) / 2, (st.A[1] + st.B[1]) / 2], Lst = 2 * half;
        var Ltot = 2 * Lst + 2 * Math.PI * Rr, HZ = 40;
        hold.s = (hold.s + x.dt * 13) % Ltot;
        var s = hold.s, hx, hy, hyaw, rl = 0;
        if (s < Lst) { hx = mid[0] - u[0] * half + u[0] * s - p[0] * Rr; hy = mid[1] - u[1] * half + u[1] * s - p[1] * Rr; hyaw = st.ang; }
        else if (s < Lst + Math.PI * Rr) {
          var th = (s - Lst) / Rr, c1 = [mid[0] + u[0] * half, mid[1] + u[1] * half];
          hx = c1[0] + u[0] * Rr * Math.sin(th) - p[0] * Rr * Math.cos(th); hy = c1[1] + u[1] * Rr * Math.sin(th) - p[1] * Rr * Math.cos(th);
          hyaw = st.ang + th; rl = -0.38;
        } else if (s < 2 * Lst + Math.PI * Rr) {
          var s3 = s - Lst - Math.PI * Rr;
          hx = mid[0] + u[0] * half - u[0] * s3 + p[0] * Rr; hy = mid[1] + u[1] * half - u[1] * s3 + p[1] * Rr; hyaw = st.ang + Math.PI;
        } else {
          var th2 = (s - 2 * Lst - Math.PI * Rr) / Rr, c2 = [mid[0] - u[0] * half, mid[1] - u[1] * half];
          hx = c2[0] - u[0] * Rr * Math.sin(th2) + p[0] * Rr * Math.cos(th2); hy = c2[1] - u[1] * Rr * Math.sin(th2) + p[1] * Rr * Math.cos(th2);
          hyaw = st.ang + Math.PI + th2; rl = -0.38;
        }
        var bankH = x.ease("bank", rl, 2);
        planeShadow(P, hx, hy, HZ, hyaw, 0, bankH, K);
        drawPlane(P, hx, hy, HZ, hyaw, 0, bankH, { blink: Math.sin(st.c * 5 + 2) > 0.3, k: K });
      }
    },
  };

  /* Delivery: a drone carries parcels from the depot to the houses. Click a house to send it there next. */
  SCENES.delivery = {
    init: function (o, R) {
      var m = 2 + Math.round(o.density * 2), houses = [], trees = [], W = 74 + m * 24, D = 88;
      for (var k = 0; k < m; k++) {
        houses.push({ cx: 62 + k * 24, cy: 24, yaw: 0, side: 1 });
        houses.push({ cx: 62 + k * 24, cy: 70, yaw: Math.PI, side: -1 });
      }
      for (k = 0; k <= m; k++) [16, 78].forEach(function (ty) { if (R() < 0.8) trees.push([50 + k * 24, ty + (R() - 0.5) * 3, 0.85 + R() * 0.25, R() < 0.4]); });
      for (k = 0; k < m; k++) [6, 83].forEach(function (ty) { if (R() < 0.6) trees.push([62 + k * 24 + (R() - 0.5) * 10, ty, 0.7 + R() * 0.2, R() < 0.6]); });
      // a small park across the street from the depot
      for (var t = 0; t < 80 && trees.length < 40; t++) {
        var tp = [8 + R() * 36, 58 + R() * 26];
        if (Math.hypot(tp[0] - 26, tp[1] - 74) < 6 || trees.some(function (q) { return Math.hypot(q[0] - tp[0], q[1] - tp[1]) < 4.4; })) continue;
        trees.push([tp[0], tp[1], 0.75 + R() * 0.3, R() < 0.45]);
      }
      var parked = [];
      for (k = 0; k < m; k++) if (R() < 0.55) parked.push({ x: 74 + k * 24, y: R() < 0.5 ? 43.7 : 50.3, kind: ["sedan", "hatch", "suv"][Math.floor(R() * 3)] });
      var fit = corners([0, 0, W, D], -3).concat(corners([0, 0, W, D], 0), corners([20, 20, W - 10, D - 20], 32));
      return { b: [0, 0, W, D, 34], fit: fit, W: W, houses: houses, trees: trees, parked: parked, s: 0, target: 0, done: [], yaws: {}, queue: [], dropped: false, c: 0, yaw: 0, last: null };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, k;
      st.c += x.dt;
      plinth(P, st.b);
      var hub = [24, 22], pad = 8;
      if (x.click && o.interactive) {
        var hit = -1, bd = 10;
        // the click's line of sight, from the ground to the roofs, as for the hover
        var k0 = x.click.length > 2 ? unproject(C, x.click[2], x.click[3], 0) : x.click, k1 = x.click.length > 2 ? unproject(C, x.click[2], x.click[3], 6) : x.click;
        st.houses.forEach(function (h, i) { var d = segDist([h.cx, h.cy], k0, k1); if (d < bd) { bd = d; hit = i; } });
        if (hit >= 0 && st.queue.indexOf(hit) < 0 && hit !== st.target) st.queue.push(hit);
      }
      // the delivery round, nine beats long
      st.s += x.dt * 0.85;
      if (st.s >= 9) {
        st.s -= 9;
        st.dropped = false;
        if (st.done.length >= st.houses.length) st.done = [];
        var next = st.queue.length ? st.queue.shift() : -1;
        if (next < 0) for (k = 1; k <= st.houses.length; k++) { var cand = (st.target + k) % st.houses.length; if (st.done.indexOf(cand) < 0) { next = cand; break; } }
        st.target = next < 0 ? 0 : next;
      }
      var T = st.houses[st.target], door = [T.cx, T.cy + T.side * 7.6], cruise = 28, hov = 18, s = st.s, base = pad + DRONE_LEGS + 0.02;
      var dx, dy, dz, cable = 0.3, carry = s < 5;
      if (s < 1) { dx = hub[0]; dy = hub[1]; dz = lerp(base, cruise, ss(0, 1, s)); }
      else if (s < 3) { var u = ss(1, 3, s); dx = lerp(hub[0], door[0], u); dy = lerp(hub[1], door[1], u); dz = cruise; }
      else if (s < 6.4) { dx = door[0]; dy = door[1]; dz = s < 4 ? lerp(cruise, hov, ss(3, 4, s)) : s < 5.6 ? hov : lerp(hov, cruise, ss(5.6, 6.4, s)); }
      else if (s < 8.4) { var v = ss(6.4, 8.4, s); dx = lerp(door[0], hub[0], v); dy = lerp(door[1], hub[1], v); dz = cruise; }
      else { dx = hub[0]; dy = hub[1]; dz = lerp(cruise, base, ss(8.4, 9, s)); }
      var maxC = hov - 0.1 - 2.2;
      if (s >= 4 && s < 5) cable = lerp(0.3, maxC, ss(4, 5, s));
      else if (s >= 5 && s < 5.6) cable = lerp(maxC, 0.3, ss(5, 5.6, s));
      if (s >= 5 && !st.dropped) { st.dropped = true; st.yaws[st.target] = st.yaw; if (st.done.indexOf(st.target) < 0) st.done.push(st.target); }
      var vx = 0, vy = 0;
      if (st.last) { vx = (dx - st.last[0]) / Math.max(1e-3, x.dt); vy = (dy - st.last[1]) / Math.max(1e-3, x.dt); }
      st.last = [dx, dy];
      var sp = Math.hypot(vx, vy);
      if (sp > 2) st.yaw = alerp(st.yaw, Math.atan2(vy, vx), 1 - Math.exp(-4 * x.dt));
      var pitch = -x.ease("pitch", clamp(sp * 0.012, 0, 0.2), 4);

      // street, sidewalks, driveways
      P.rect((4 + st.W - 4) / 2, 47, 0.05, st.W - 8, 10, { cls: "mid", key: -1e8 });
      var marks = "";
      for (var t = 10; t < st.W - 6; t += 4) marks += seg(project(C, t, 47, 0.06), project(C, t + 2, 47, 0.06));
      marks += seg(project(C, 6, 40.5, 0.05), project(C, st.W - 4, 40.5, 0.05)) + seg(project(C, 6, 53.5, 0.05), project(C, st.W - 4, 53.5, 0.05));
      st.houses.forEach(function (h) {
        var y0 = h.cy + h.side * 5, y1 = h.side > 0 ? 40.5 : 53.5;
        marks += seg(project(C, h.cx - 1, y0, 0.05), project(C, h.cx - 1, y1, 0.05)) + seg(project(C, h.cx + 1, y0, 0.05), project(C, h.cx + 1, y1, 0.05));
      });
      P.raw(marks, "ln lo", 0, -9e7);

      // depot: a pad on the roof, roller doors on the street, a van outside
      var hm = new Model(P, xf(hub[0], hub[1], 0, 0), "");
      P.begin(P.key(hub[0], hub[1], 0));
      hm.solid(boxR(-15, 15, -11, 11, 0, pad));
      if (hm.sees(0, 1, 0)) {
        [-8, 3].forEach(function (cx) {
          hm.pane([[cx - 4, 11.03, 0], [cx + 4, 11.03, 0], [cx + 4, 11.03, 5.4], [cx - 4, 11.03, 5.4]]);
          for (var rd = 1; rd < 5.4; rd += 1) hm.line([[cx - 4, 11.05, rd], [cx + 4, 11.05, rd]], "lo");
        });
        hm.pane([[10, 11.03, 0], [12, 11.03, 0], [12, 11.03, 3.4], [10, 11.03, 3.4]]);
      }
      hm.dot([0, 0, pad + 0.02], 6, "lo", true);
      hm.line([[-1.6, -2, pad + 0.02], [-1.6, 2, pad + 0.02]], "");
      hm.line([[1.6, -2, pad + 0.02], [1.6, 2, pad + 0.02]], "");
      hm.line([[-1.6, 0, pad + 0.02], [1.6, 0, pad + 0.02]], "");
      P.end();
      drawCar(P, 20, 37.8, 0, "van", "acc");
      st.parked.forEach(function (c) { drawCar(P, c.x, c.y, c.y < 47 ? 0 : Math.PI, c.kind, ""); });

      var on = x.ptr.on && o.interactive;
      st.houses.forEach(function (h, i) {
        var hover = on && ptrDist(x, h.cx, h.cy, 6) < 7, queued = st.queue.indexOf(i) >= 0;
        drawHouse(P, h.cx, h.cy, h.yaw, { roof: hover || queued ? "acc" : null });
        if (st.done.indexOf(i) >= 0 && !(i === st.target && s < 5)) drawCrate(P, h.cx, h.cy + h.side * 7.6, 0, 2.2, st.yaws[i] || 0, "acc");
      });
      st.trees.forEach(function (t2) { drawTree(P, t2[0], t2[1], t2[2], t2[3]); });

      // a pin over the target, bobbing
      var bob = Math.abs(Math.sin(st.c * 3)) * 1.6;
      P.line([[T.cx, T.cy - T.side * 1.5, 9.4], [T.cx, T.cy - T.side * 1.5, 13 + bob]], { cls: "acc" });
      P.sphere(T.cx, T.cy - T.side * 1.5, 13.8 + bob, 0.9, { cls: "acc", layer: 3 });

      // the drone, its parcel on a winch line, its shadow
      P.dot(dx + dz * SUN[0], dy + dz * SUN[1], 0.1, 4.6 * (1 - dz / 60), { full: "sh", layer: 0, key: 4e6 });
      if (carry || cable > 0.45) {
        P.line([[dx, dy, dz - 0.05], [dx, dy, dz - 0.1 - cable]], { cls: "lo", layer: 2, key: P.key(dx, dy, dz) - 0.5 });
        if (carry) drawCrate(P, dx, dy, dz - 0.1 - cable - 2.2, 2.2, st.yaw, "acc", null, null, 2);
      }
      drawDrone(P, dx, dy, dz, st.yaw, pitch, st.c * 40, { blink: Math.sin(st.c * 6) > 0 });

      if (o.labels) {
        P.callout(hub[0] - 12, hub[1] + 8, pad, nm(o, 0, "Depot") + " · " + st.done.length + "/" + st.houses.length, { h: 4 });
      }
    },
  };

  /* Exploded product. Across: the gap opens. Down: picks a layer. */
  var PRODUCTS = {
    phone: [
      { n: "Shell", h: 4, f: function (P, z, c) {
        P.box(0, 0, z, 34, 66, 4, { r: 7, cls: c });
        P.box(-9.5, -24.5, z + 4, 12, 12, 0.9, { r: 3.4, cls: c });
        [[-12.2, -27.2], [-6.8, -21.8]].forEach(function (l) { P.cyl(l[0], l[1], z + 4.9, 2, 0.7, { cls: c }); P.dot(l[0], l[1], z + 5.62, 1.1, { ring: true, cls: "lo", layer: 1 }); });
        P.dot(-6.8, -27.2, z + 4.92, 0.7, { cls: "m", layer: 1 });
      } },
      { n: "Battery", h: 2.4, f: function (P, z, c) { P.box(0, 7, z, 24, 36, 2.4, { r: 2, cls: c }); P.rect(0, 7, z + 2.45, 12, 4, { layer: 1, cls: "mid" }); P.rect(0, -12.4, z + 2.45, 6, 1.6, { layer: 1, cls: "mid" }); } },
      { n: "Logic board", h: 1.2, f: function (P, z, c) {
        P.box(0, 0, z, 30, 60, 1.2, { r: 6, cls: c });
        P.box(-4, -16, z + 1.2, 8, 8, 1.1, { r: 0.4, cls: c });
        P.box(7, -18, z + 1.2, 5, 9, 0.8, { r: 0.3, cls: c });
        P.cyl(-9, -24, z + 1.2, 3, 2.2, { cls: c });
        P.box(5, 20, z + 1.2, 10, 6, 0.8, { r: 0.3, cls: c });
        P.line([[0, -16, z + 1.22], [0, -6, z + 1.22], [5, -1, z + 1.22], [5, 17, z + 1.22]], { cls: "lo", layer: 1 });
      } },
      { n: "Display", h: 1.4, f: function (P, z, c) {
        P.box(0, 0, z, 33, 65, 1.4, { r: 6.6, cls: c });
        P.rect(0, -22, z + 1.45, 24, 7, { layer: 1, cls: "mid" });
        P.rect(-6.5, -6, z + 1.45, 11, 11, { layer: 1, cls: "mid" });
        P.rect(6.5, -6, z + 1.45, 11, 11, { layer: 1, cls: "mid" });
        P.rect(0, 14, z + 1.45, 24, 16, { layer: 1, cls: "mid" });
      } },
      { n: "Glass", h: 0.8, f: function (P, z, c) { P.box(0, 0, z, 34, 66, 0.8, { r: 7, cls: c || "hi" }); P.box(0, -29.2, z + 0.8, 7, 2, 0.05, { r: 1, cls: "" }); } },
    ],
    speaker: [
      { n: "Base", h: 4, f: function (P, z, c) { P.cyl(0, 0, z, 16, 4, { cls: c }); } },
      { n: "Battery", h: 7, f: function (P, z, c) { P.cyl(0, 0, z, 9, 7, { cls: c }); } },
      { n: "Driver", h: 2, f: function (P, z, c) {
        P.cyl(0, 0, z, 14, 2, { cls: c });
        [10, 7, 4].forEach(function (r, i) { P.dot(0, 0, z + 2.2 + i * 0.9, r, { ring: true, cls: i === 2 ? "" : "lo", layer: 1 }); });
        P.dot(0, 0, z + 5, 1.6, { cls: "m", layer: 1 });
      } },
      { n: "Grille", h: 1.6, f: function (P, z, c) {
        P.cyl(0, 0, z, 16, 1.6, { cls: c });
        for (var i = -12; i <= 12; i += 3) for (var j = -12; j <= 12; j += 3) if (i * i + j * j < 150) P.dot(i, j, z + 1.65, 0.45, { cls: "m", layer: 1 });
      } },
      { n: "Cap", h: 1.2, f: function (P, z, c) {
        P.cyl(0, 0, z, 16, 1.2, { cls: c || "hi" });
        P.dot(0, 0, z + 1.25, 4, { ring: true, layer: 1 });
        [-7, 7].forEach(function (u) { P.dot(u, 0, z + 1.25, 1, { cls: "acc", layer: 1 }); });
      } },
    ],
  };

  /* ---- dim sum steamer: a wok on a burner, three bamboo baskets, a woven lid ---- */

  function weave(P, z, H, R) {
    var ring = place(circ(R, 40), 0, 0, 0);
    ringLine(P, ring, z + 0.9, "lo");
    ringLine(P, ring, z + H - 0.9, "lo");
    mullions(P, ring, z + H - 0.9, z + H - 0.15, 1.5);
    mullions(P, ring, z + 0.15, z + 0.9, 1.5);
  }
  function basket(H, contents) {
    return function (P, z, c, t) {
      var outer = place(circ(16, 40), 0, 0, 0), inner = place(circ(15.2, 40), 0, 0, 0);
      drawOpen(P, outer, inner, z, H, H - 2.2, { cls: c, slats: 2.4, reach: 16, inside: function (zf) { contents(P, zf, c, t); } });
      ringLine(P, outer, z + H / 2, "lo");
      weave(P, z, H, 16);
    };
  }
  var STEAMER = [
    { n: "Wok", h: 0.7, f: function (P, z, c, t) {
      P.cyl(0, 0, z - 14.5, 7, 1.4, {});
      P.dot(0, 0, z - 13.08, 5, { ring: true, cls: "lo", layer: 1 });
      ringOf(10, 5, 0).forEach(function (q, i) { P.solid(coneR(q[0], q[1], z - 13.1, 0.55, 1.3 + 0.7 * Math.abs(Math.sin(t * 7 + i * 1.7)), 8), { cls: "acc" }); });
      P.solid([rCirc("z", [0, 0, z - 9.5], 2.6, 2.6, 36), rCirc("z", [0, 0, z - 7.8], 9.5, 9.5, 36), rCirc("z", [0, 0, z - 4.4], 16, 16, 36), rCirc("z", [0, 0, z - 1.6], 19, 19, 36), rCirc("z", [0, 0, z], 19.8, 19.8, 36)], { cls: c, crease: 0.4 });
      P.cyl(0, 0, z, 20.2, 0.7, { cls: c });
      [13.5, 9.5, 5.5].forEach(function (r, i) { P.dot(0, 0, z + 0.72, r + Math.sin(t * 2 + i) * 0.6, { ring: true, cls: "lo", layer: 1 }); });
      [1, -1].forEach(function (sx) { P.solid(bar3([sx * 20, 0, z + 0.35], [sx * 24.5, 0, z + 0.9], 1.6, 0.7), { cls: c }); });
    } },
    { n: "Har gow", h: 8, f: basket(8, function (P, zf, c) {
      backToFront(P, ringOf(6, 9.6, 0.3).concat([[0, 0]]), function (q) {
        P.solid(domeR(q[0], q[1], zf, 2.9, 2.5, 16), { cls: c, crease: 0.45 });
        var seam = [];
        for (var k = -4; k <= 4; k++) { var u = k / 4; seam.push([q[0] + u * 2.3, q[1] - 0.2, zf + 0.05 + 2.5 * Math.sqrt(Math.max(0, 1 - u * u * 0.86))]); }
        P.line(seam, { cls: "lo", layer: 1 });
        for (k = -2; k <= 2; k++) { var p = seam[4 + k * 1.5 | 0]; P.line([[p[0] - 0.2, p[1] - 0.7, p[2] - 0.35], [p[0] + 0.2, p[1] + 0.5, p[2]]], { cls: "lo", layer: 1 }); }
      });
    }) },
    { n: "Siu mai", h: 8, f: basket(8, function (P, zf, c) {
      backToFront(P, ringOf(7, 9.6, 0).concat([[0, 0]]), function (q) {
        P.cyl(q[0], q[1], zf, 2.3, 2.6, { cls: c });
        P.dot(q[0], q[1], zf + 2.62, 1.7, { ring: true, cls: "lo", layer: 1 });
        P.dot(q[0], q[1], zf + 2.66, 0.6, { cls: "acc", layer: 1 });
      });
    }) },
    { n: "Char siu bao", h: 9, f: basket(9, function (P, zf, c) {
      backToFront(P, ringOf(5, 8.8, 0.6).concat([[0, 0]]), function (q) {
        P.solid(domeR(q[0], q[1], zf, 4.1, 3.6, 18), { cls: c, crease: 0.45 });
        var tz = zf + 3.62;
        [0, 2.1, 4.2].forEach(function (a) { P.line([[q[0], q[1], tz], [q[0] + Math.cos(a) * 1.3, q[1] + Math.sin(a) * 1.3, tz - 0.2]], { cls: "lo", layer: 1 }); });
      });
    }) },
    { n: "Lid", h: 7.6, f: function (P, z, c, t) {
      P.cyl(0, 0, z, 16.3, 2, { cls: c });
      mullions(P, place(circ(16.3, 40), 0, 0, 0), z + 0.2, z + 1.8, 1.5);
      P.solid(domeR(0, 0, z + 2, 16.3, 3.4, 40), { cls: c, crease: 0.35 });
      var C = P.C, d = "";
      [12.5, 8.5, 4.5].forEach(function (r) { ringLine(P, place(circ(r, 36), 0, 0, 0), z + 2 + 3.4 * Math.sqrt(1 - (r / 16.3) * (r / 16.3)), "lo"); });
      for (var k = 0; k < 16; k++) {
        var a = (k / 16) * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
        if (ca * C.s + sa * C.c < 0.05) continue;
        var pts = [];
        for (var r = 15.8; r >= 4.4; r -= 1.9) pts.push(project(C, ca * r, sa * r, z + 2 + 3.4 * Math.sqrt(1 - (r / 16.3) * (r / 16.3))));
        d += open(pts);
      }
      P.raw(d, "ln lo", 1);
      // the loop handle: a little bamboo arch on top of the dome
      var top = z + 5.4, arch = [];
      for (var ai = 0; ai <= 8; ai++) { var aa = (ai / 8) * Math.PI; arch.push([Math.cos(aa) * 3.4, 0, top - 0.2 + Math.sin(aa) * 2.6]); }
      var near = P.sees([0, 1, 0]) ? 1 : -1;
      [-near, near].forEach(function (sg) {
        for (var bi = 0; bi < 8; bi++) {
          var a0 = arch[bi], a1 = arch[bi + 1];
          P.solid(bar3([a0[0], sg * 0.55, a0[2]], [a1[0], sg * 0.55, a1[2]], 0.6, 0.6), { cls: c });
        }
      });
      // steam escaping through the weave and from under the rim
      for (var i = 0; i < 12; i++) {
        var p = (t * 0.32 + i / 12) % 1, ang = i * 2.4, r0 = i % 2 ? 15.6 : 3 + (i % 3) * 3;
        P.sphere(Math.cos(ang) * r0 + p * 4, Math.sin(ang) * r0 - p * 2, (i % 2 ? z + 1 : z + 5.4) + p * 20, 0.8 + p * 3.2, { full: "pf", layer: 3 });
      }
    } },
  ];

  /* ---- 3.5" floppy disk: shells, dust liners, the magnetic disk, the shutter, the write-protect tab ---- */

  var FLOPPY_PLAN = [[-18, -18.8], [16.4, -18.8], [18, -17.2], [18, 18.8], [-18, 18.8]];
  function floppyShell(P, z, h, c) {
    P.solid(extrudeZ(FLOPPY_PLAN.map(function (q) { return [q[0], q[1], z, h]; })), { cls: c });
  }
  /** A rectangle lying on a face at height z, as a pane. */
  function padRect(P, x0, y0, x1, y1, z, cls) { P.flat([[x0, y0, z], [x1, y0, z], [x1, y1, z], [x0, y1, z]], { cls: cls || "mid", layer: 1 }); }
  var FLOPPY = [
    { n: "Bottom shell", h: 1.6, f: function (P, z, c) {
      floppyShell(P, z, 1.6, c);
      var t = z + 1.62;
      P.dot(0, 0, t, 14.6, { ring: true, cls: "lo", layer: 1 });
      P.dot(0, 0, t, 5.2, { full: "fl", layer: 1 });
      padRect(P, -3.2, 8, 3.2, 15.4, t);
      padRect(P, 14.4, -17.6, 16.8, -15.2, t);
      P.line([[-12, 12, t], [-8, 12, t], [-8, 15, t]], { cls: "lo", layer: 1 });
      [[-16.2, -16.6], [16.2, 16.8], [-16.2, 16.8]].forEach(function (q) { P.dot(q[0], q[1], t, 0.8, { ring: true, cls: "", layer: 1 }); });
    } },
    { n: "Write-protect tab", h: 0.7, f: function (P, z, c, t, e) {
      // pulled out of its corner and off to the side, clear of the liners above it
      var dx = e * 13, dy = e * 10;
      P.box(15.4 + dx, -16.2 + dy, z, 3, 2.4, 0.8, { r: 0.2, cls: c });
      P.line([[14.6 + dx, -16.2 + dy, z + 0.82], [16.2 + dx, -16.2 + dy, z + 0.82]], { cls: "lo", layer: 1 });
    } },
    { n: "Dust liner", h: 0.15, f: function (P, z, c) {
      P.cyl(0, 0, z, 14.2, 0.15, { cls: c });
      P.dot(0, 0, z + 0.16, 5.4, { full: "fl", layer: 1 });
    } },
    { n: "Magnetic disk", h: 0.7, f: function (P, z, c, t) {
      P.cyl(0, 0, z, 13.8, 0.2, { cls: c });
      P.cyl(0, 0, z + 0.2, 4.6, 0.5, { cls: c });
      var tz = z + 0.72, a = t * 1.4;
      P.flat([[-0.9, -0.9, tz], [0.9, -0.9, tz], [0.9, 0.9, tz], [-0.9, 0.9, tz]].map(function (q) { return [q[0] * Math.cos(a) - q[1] * Math.sin(a), q[0] * Math.sin(a) + q[1] * Math.cos(a), tz]; }), { cls: "mid", layer: 1 });
      var hx = Math.cos(a) * 2.6, hy = Math.sin(a) * 2.6;
      P.flat([[hx - 0.6, hy - 0.4, tz], [hx + 0.6, hy - 0.4, tz], [hx + 0.6, hy + 0.4, tz], [hx - 0.6, hy + 0.4, tz]], { cls: "mid", layer: 1 });
      [0.6, 2.4].forEach(function (b) { P.line([[Math.cos(a + b) * 7, Math.sin(a + b) * 7, z + 0.21], [Math.cos(a + b) * 12.6, Math.sin(a + b) * 12.6, z + 0.21]], { cls: "lo", layer: 1 }); });
    } },
    { n: "Dust liner", h: 0.15, f: function (P, z, c) {
      P.cyl(0, 0, z, 14.2, 0.15, { cls: c });
      P.dot(0, 0, z + 0.16, 5.4, { full: "fl", layer: 1 });
    } },
    { n: "Top shell", h: 1.6, f: function (P, z, c) {
      floppyShell(P, z, 1.6, c);
      var t = z + 1.62;
      padRect(P, -14, -17.4, 14, -1.4, t);
      P.flat([[-12.6, -16, t + 0.01], [12.6, -16, t + 0.01], [12.6, -2.8, t + 0.01], [-12.6, -2.8, t + 0.01]], { layer: 1 });
      padRect(P, -11.4, 3.6, 9, 18.8, t);
      padRect(P, -16.8, -17.6, -14.6, -15.4, t);
      P.line([[12, 15, t], [14, 14, t], [14, 16, t], [12, 15, t]], { cls: "", layer: 1 });
    } },
    { n: "Shutter", h: 0.4, f: function (P, z, c, t, e) {
      var dy = e * 14, y0 = 3.6 + dy, y1 = 18.8 + dy;
      P.box(-1.2, (y0 + y1) / 2, z, 20.4, y1 - y0, 0.4, { r: 0.2, cls: c });
      padRect(P, -4.4, 8 + dy, 2, 15.4 + dy, z + 0.42);
    } },
  ];

  /* ---- PlayStation (1994): shells, power supply, mainboard, drive, disc, lid ---- */

  /** A polygon with its corners rounded (convex or concave), n points per corner. */
  function roundPoly(pts, r, n) {
    var out = [];
    pts.forEach(function (p, i) {
      var a = pts[(i + pts.length - 1) % pts.length], b = pts[(i + 1) % pts.length];
      var la = Math.hypot(a[0] - p[0], a[1] - p[1]), lb = Math.hypot(b[0] - p[0], b[1] - p[1]), rr = Math.min(r, la / 2, lb / 2);
      var p0 = [p[0] + ((a[0] - p[0]) / la) * rr, p[1] + ((a[1] - p[1]) / la) * rr], p1 = [p[0] + ((b[0] - p[0]) / lb) * rr, p[1] + ((b[1] - p[1]) / lb) * rr];
      for (var k = 0; k <= n; k++) {
        var t = k / n, u = 1 - t;
        out.push([u * u * p0[0] + 2 * u * t * p[0] + t * t * p1[0], u * u * p0[1] + 2 * u * t * p[1] + t * t * p1[1]]);
      }
    });
    return out;
  }
  // 275 x 190 x 64 mm: wide and chunky, the front cut back in the middle where the ports are (+y is the front)
  var PS1_W = 27.5, PS1_D = 19, PS1_NX = 11, PS1_NY = 14, PS1_LID = [0, -1.5];
  var PS1_PLAN = (function () {
    var r = roundPoly([[-PS1_W, PS1_D], [-PS1_NX, PS1_D], [-PS1_NX, PS1_NY], [PS1_NX, PS1_NY], [PS1_NX, PS1_D], [PS1_W, PS1_D], [PS1_W, -PS1_D], [-PS1_W, -PS1_D]], 1.6, 4);
    return { rings: [ringArea(r) > 0 ? r : r.reverse()] };
  })();
  /** A shell: the console's outline, recess and all, from z to z + h. */
  function ps1Shell(P, z, h, c) { drawSlab(P, PS1_PLAN, z, z + h, c); }
  /** Vents on the right flank, when it faces the eye. */
  function ps1Vents(P, z0, z1) {
    if (P.C.s <= 0.05) return;
    var d = "", C = P.C;
    for (var vy = -15; vy <= 15; vy += 1.25) d += seg(project(C, PS1_W + 0.02, vy, z0), project(C, PS1_W + 0.02, vy, z1));
    P.raw(d, "ln lo", 1);
  }
  /** A rounded slot drawn on the recess face (y = PS1_NY), centred on x, from z0 to z1. */
  function ps1Port(P, x, w, z0, z1, cls) {
    var y = PS1_NY + 0.03, r = (z1 - z0) / 2, pts = [];
    for (var k = 0; k <= 8; k++) { var a = Math.PI / 2 + (k / 8) * Math.PI; pts.push([x - w / 2 + r + Math.cos(a) * r, y, z0 + r + Math.sin(a) * r]); }
    for (k = 0; k <= 8; k++) { a = -Math.PI / 2 + (k / 8) * Math.PI; pts.push([x + w / 2 - r + Math.cos(a) * r, y, z0 + r + Math.sin(a) * r]); }
    pts.push(pts[0]);
    P.line(pts, { cls: cls || "", layer: 1 });
  }
  var PS1 = [
    { n: "Bottom shell", h: 5, f: function (P, z, c) {
      ps1Shell(P, z, 5, c);
      var t = z + 5.02;
      [[-24.5, -16], [24.5, -16], [-24.5, 16], [24.5, 16], [0, -16]].forEach(function (q) { P.cyl(q[0], q[1], t - 0.02, 0.9, 1, {}); });
      // the two controller ports, low in the front recess
      if (P.C.c > 0) [-5.5, 5.5].forEach(function (x) { ps1Port(P, x, 7, z + 1.1, z + 3.3); ps1Port(P, x, 5, z + 1.8, z + 2.6, "lo"); });
      ps1Vents(P, z + 1, z + 4);
    } },
    { n: "Power supply", h: 3.6, f: function (P, z, c) {
      P.box(-17.5, -10, z, 15, 11, 3.6, { r: 0.4, cls: c });
      padRect(P, -23, -14, -12, -10.5, z + 3.62);
      P.box(-17.5, -16.2, z, 4, 1.6, 2.2, { r: 0.3 });
      P.cyl(-12.5, -6, z + 3.6, 1.3, 1.4, { cls: c });
    } },
    { n: "Mainboard", h: 0.6, f: function (P, z, c) {
      P.box(0, -1.8, z, 51, 31.5, 0.6, { r: 0.8, cls: c });
      var t = z + 0.6;
      P.box(-6, 3, t, 6.5, 6.5, 0.7, { r: 0.3, cls: c });
      P.box(6, 3, t, 6.5, 6.5, 0.7, { r: 0.3 });
      [[-14.5, 4], [-14.5, -4]].forEach(function (q) { P.box(q[0], q[1], t, 3, 6, 0.5, { r: 0.2 }); });
      [[15, -5], [15, 4]].forEach(function (q) { P.box(q[0], q[1], t, 4.4, 4.4, 0.5, { r: 0.2 }); });
      P.box(-2, -11, t, 5, 2.6, 0.5, { r: 0.2 });
      // controller and memory card connectors, behind the front recess
      [-5.5, 5.5].forEach(function (x) { P.box(x, 11.6, t, 7.4, 3.6, 2.6, { r: 0.3, cls: c }); P.box(x, 10.9, t + 2.6, 6.6, 1.6, 1.2, { r: 0.2 }); });
      var C = P.C, d = "";
      [[-6, 3, -14.5, 4], [6, 3, 15, 4], [-6, 3, 6, 3], [6, 3, 15, -5], [-6, 3, -2, -11], [-6, 3, -5.5, 11.6], [6, 3, 5.5, 11.6]].forEach(function (q) {
        d += seg(project(C, q[0], q[1], t + 0.01), project(C, q[0], q[3], t + 0.01)) + seg(project(C, q[0], q[3], t + 0.01), project(C, q[2], q[3], t + 0.01));
      });
      P.raw(d, "ln lo", 1);
    } },
    { n: "Disc drive", h: 2, f: function (P, z, c, t) {
      var lx = PS1_LID[0], ly = PS1_LID[1];
      P.box(lx, ly, z, 25, 25, 1, { r: 1, cls: c });
      [-1.2, 1.2].forEach(function (rx) { P.line([[lx + 7 + rx, ly - 10.5, z + 1.02], [lx + 7 + rx, ly + 10.5, z + 1.02]], { cls: "lo", layer: 1 }); });
      var sy = Math.sin(t * 0.8) * 7;
      P.box(lx + 7, ly + sy, z + 1, 3.4, 4, 0.9, { r: 0.3, cls: c });
      P.light(lx + 7, ly + sy, z + 2.05, 0.45, { cls: "acc", layer: 1 });
      P.cyl(lx, ly, z + 1, 1.8, 1, { cls: c });
    } },
    { n: "Disc", h: 0.2, f: function (P, z, c, t) {
      var lx = PS1_LID[0], ly = PS1_LID[1];
      P.cyl(lx, ly, z, 11.5, 0.2, { cls: c });
      P.dot(lx, ly, z + 0.21, 2.2, { full: "fl", layer: 1 });
      P.dot(lx, ly, z + 0.21, 4, { ring: true, cls: "lo", layer: 1 });
      var a = t * 3;
      [0, 2.2].forEach(function (b) { P.line([[lx + Math.cos(a + b) * 4.8, ly + Math.sin(a + b) * 4.8, z + 0.22], [lx + Math.cos(a + b) * 10.6, ly + Math.sin(a + b) * 10.6, z + 0.22]], { cls: "lo", layer: 1 }); });
    } },
    { n: "Top shell", h: 5, f: function (P, z, c) {
      ps1Shell(P, z, 5, c);
      var t = z + 5.02, lx = PS1_LID[0], ly = PS1_LID[1];
      // the round well the lid sits in, the rear band, the buttons in the two front wings
      P.dot(lx, ly, t, 14, { ring: true, cls: "", layer: 1 });
      P.dot(lx, ly, t, 13.3, { ring: true, cls: "lo", layer: 1 });
      P.line([[-PS1_W + 2, -15.8, t], [PS1_W - 2, -15.8, t]], { cls: "lo", layer: 1 });
      P.cyl(-19.5, 11, t - 0.05, 3.3, 0.6, {});
      P.dot(-19.5, 11, t + 0.56, 2.5, { ring: true, cls: "lo", layer: 1 });
      P.cyl(-21.5, 3, t - 0.05, 1.4, 0.5, {});
      P.light(-16.3, 5, t + 0.12, 0.42, { cls: "acc", layer: 1 });
      P.cyl(19.5, 11, t - 0.05, 3.3, 0.6, {});
      P.dot(19.5, 11, t + 0.56, 2.5, { ring: true, cls: "lo", layer: 1 });
      // the memory card slots, high in the front recess
      if (P.C.c > 0) [-5.5, 5.5].forEach(function (x) { ps1Port(P, x, 6.4, z + 2.6, z + 3.4); });
      ps1Vents(P, z + 1, z + 4);
    } },
    { n: "Disc lid", h: 1.2, f: function (P, z, c) {
      var lx = PS1_LID[0], ly = PS1_LID[1];
      [-5, 5].forEach(function (x) { P.box(lx + x, ly - 13.4, z, 3, 1.6, 0.8, { r: 0.3 }); });
      P.cyl(lx, ly, z, 13.2, 0.9, { cls: c });
      P.cyl(lx, ly, z + 0.9, 12.7, 0.3, { cls: c });
      P.dot(lx, ly, z + 1.21, 10.5, { ring: true, cls: "lo", layer: 1 });
    } },
  ];

  PRODUCTS.floppy = FLOPPY;
  PRODUCTS.ps1 = PS1;

  var STACKS = {
    phone: { layers: PRODUCTS.phone, foot: [[-17, -33], [17, -33], [17, 33], [-17, 33]], guides: [[-17, 33], [17, 33], [17, -33], [-17, -33]], gap: 13, span: 38 },
    speaker: { layers: PRODUCTS.speaker, foot: ringOf(16, 16), guides: [[0, 16], [16, 0], [0, -16], [-16, 0]], gap: 13, span: 20 },
    steamer: { layers: STEAMER, foot: ringOf(24, 20.2), guides: [], gap: 9, span: 25, below: 15, steam: 26 },
    floppy: { layers: FLOPPY, foot: [[-18, -18.8], [18, -18.8], [18, 18.8], [-18, 18.8]], guides: [[-16.2, 16.8], [16.2, 16.8]], gap: 9, span: 32 },
    ps1: { layers: PS1, foot: [[-PS1_W, -PS1_D], [PS1_W, -PS1_D], [PS1_W, PS1_D], [-PS1_W, PS1_D]], guides: [[-25.5, 17], [25.5, -17]], gap: 9, span: 31 },
  };

  /**
   * An object as a stack of layers. At rest it breathes open and shut; under
   * the pointer it opens, and the layer at the pointer's height lights up.
   * Labels keep fixed slots (where each layer sits fully open), so they never
   * pile up when the stack closes.
   */
  SCENES.product = {
    init: function (o) {
      var sk = o.scene === "steamer" ? STACKS.steamer : STACKS[o.product] || STACKS.phone, gap = sk.gap * (0.15 + 2.85 * clamp(+o.explode || 0, 0, 1)), H = 0, sp = sk.span;
      sk.layers.forEach(function (l) { H += l.h; });
      var top = H + gap * (sk.layers.length - 1) + (sk.steam || 4);
      var fit = corners([-sp, -sp, sp, sp], -(sk.below || 0)).concat(corners([-sp, -sp, sp, sp], top));
      return { b: [-sp, -sp, sp, sp, top], fit: fit, sk: sk, L: sk.layers, gap: gap, c: 0, flat: true, cols: true };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, L = st.L, C = P.C, sk = st.sk, on = x.ptr.on && o.interactive;
      st.c += x.dt;
      var auto = ss(0.18, 0.82, 0.5 - 0.5 * Math.cos(st.c * 0.55));
      var held = o.open >= 0, e = x.ease("e", held ? clamp(+o.open, 0, 1) : on ? 1 : auto, held ? 12 : on ? 3 : 1.6);
      var zs = [], zs1 = [], z = 0;
      L.forEach(function (l, i) { zs.push(z + e * st.gap * i); zs1.push(z + st.gap * i); z += l.h; });
      var top = zs[zs.length - 1] + L[L.length - 1].h;
      var pick = -1;
      if (on && e > 0.45) {
        var bd = 1e9;
        L.forEach(function (l, i) { var dd = Math.abs(project(C, 0, 0, zs[i] + l.h / 2)[1] - x.ptr.sy); if (dd < bd) { bd = dd; pick = i; } });
      }
      sk.guides.forEach(function (q) { P.line([[q[0], q[1], 0], [q[0], q[1], top]], { cls: "lo dash", layer: 1, key: -1e9 }); });
      L.forEach(function (l, i) { P.seq(i * 1000); l.f(P, zs[i], i === pick ? "acc" : "", st.c, e); P.seq(null); });
      if (o.labels) {
        var col = -1e9, edgeAt = function (zz) {
          var best = null;
          sk.foot.forEach(function (q) { var pt = project(C, q[0], q[1], zz); if (!best || pt[0] > best[0]) best = pt; });
          return best;
        };
        sk.foot.forEach(function (q) { col = Math.max(col, project(C, q[0], q[1], 0)[0]); });
        labelColumn(P, L.map(function (l, i) {
          return { edge: edgeAt(zs[i] + l.h / 2), slot: edgeAt(zs1[i] + l.h / 2)[1], text: String(i + 1).padStart(2, "0") + " " + nm(o, i, l.n), hi: i === pick };
        }), col + 12, x.fs);
      }
    },
  };
  SCENES.steamer = SCENES.product;

  /* Interface: an app window in layers. A cursor works the cards; the pointer takes it over. */
  SCENES.interface = {
    init: function (o) {
      var D = 1.5 + clamp(+o.explode || 0, 0, 1) * 11;
      return { b: [-52, -36, 52, 36, D * 3 + 16], D: D, c: 0, flat: true };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, on = x.ptr.on && o.interactive, k;
      st.c += x.dt;
      var D = o.open >= 0 ? st.D * x.ease("open", 0.12 + 0.88 * clamp(+o.open, 0, 1), 12) : st.D * (0.8 + 0.2 * Math.sin(st.c * 0.8));
      P.seq(0);
      P.box(0, 0, 0, 100, 68, 1.6, { r: 4 });
      [0, 1, 2].forEach(function (i) { P.dot(-45 + i * 3.4, -30, 1.65, 0.9, { cls: i === 0 ? "acc" : "m", layer: 1 }); });
      P.line([[-50, -26.5, 1.65], [50, -26.5, 1.65]], { cls: "lo", layer: 1 });
      P.seq(1000);
      P.box(-37, 5, D, 20, 54, 1, { r: 2.5 });
      var active = Math.floor(st.c * 0.5) % 5;
      for (k = 0; k < 5; k++) P.box(-37, -14 + k * 7, D + 1, 14, 3.6, 0.5, { r: 1.6, cls: k === active ? "acc" : "" });
      P.box(9, -20, D, 70, 7, 1, { r: 2 });
      P.box(0, -20, D + 1, 30, 3.6, 0.4, { r: 1.8 });
      P.dot(38, -20, D + 1.05, 2, { cls: "m", layer: 1 });
      var cards = [[-12, -4], [10, -4], [32, -4]], cur, tgt;
      var ci = Math.floor(st.c * 0.45) % 3, cp = (st.c * 0.45) % 1;
      if (on) { var w = unproject(P.C, x.ptr.sx, x.ptr.sy, 2 * D); cur = [w[0], w[1]]; }
      else { tgt = cards[ci]; cur = [x.ease("kx", tgt[0] + 3, 3), x.ease("ky", tgt[1] + 2, 3)]; }
      P.seq(2000);
      var lifted = cards.map(function (c, i) {
        var near = on ? falloff(Math.hypot(c[0] - cur[0], c[1] - cur[1]) / 14) : i === ci ? ss(0.15, 0.4, cp) * (1 - ss(0.75, 1, cp)) : 0;
        return { c: c, lift: x.ease("c" + i, near * 9, 8) };
      }).sort(function (a, b) { return a.lift - b.lift || P.key(a.c[0], a.c[1], 0) - P.key(b.c[0], b.c[1], 0); });
      lifted.forEach(function (it) {
        var c = it.c, lift = it.lift, cls = lift > 3 ? "acc" : "";
        P.box(c[0], c[1], 2 * D + lift, 20, 14, 1.2, { r: 2, cls: cls });
        P.dot(c[0] - 6, c[1] - 3, 2 * D + lift + 1.25, 1.6, { cls: lift > 3 ? "acc" : "m", layer: 1 });
        P.line([[c[0] - 7.5, c[1] + 1.5, 2 * D + lift + 1.25], [c[0] + 5, c[1] + 1.5, 2 * D + lift + 1.25]], { cls: "lo", layer: 1 });
        P.line([[c[0] - 7.5, c[1] + 4, 2 * D + lift + 1.25], [c[0] + 1, c[1] + 4, 2 * D + lift + 1.25]], { cls: "lo", layer: 1 });
      });
      P.box(-1, 18, 2 * D, 42, 20, 1.2, { r: 2 });
      for (k = 0; k < 8; k++) {
        var bh = 1.5 + 7 * (0.5 + 0.5 * Math.sin(st.c * 1.2 + k * 0.8));
        P.box(-17 + k * 4.6, 21, 2 * D + 1.2, 2.6, 2.6, bh, { r: 0.4, cls: k === 7 ? "acc" : "" });
      }
      P.box(32, 18, 2 * D, 20, 20, 1.2, { r: 2 });
      var tog = Math.sin(st.c * 0.9) > 0, kx = x.ease("tog", tog ? 3 : -3, 6);
      P.box(32, 18, 2 * D + 1.2, 11, 5.6, 0.6, { r: 2.8, cls: tog ? "acc" : "" });
      P.cyl(32 + kx, 18, 2 * D + 1.8, 2.1, 1, { cls: tog ? "hi" : "" });
      P.seq(3000);
      var cz = 3 * D + 6, A = [[0, 0], [0, 7.5], [1.9, 5.6], [3.3, 8.6], [4.6, 8], [3.2, 5], [5.6, 5]];
      P.flat(A.map(function (p) { return [cur[0] + p[0], cur[1] + p[1], cz]; }), { cls: "mid", layer: 1 });
      if (!on && cp > 0.15 && cp < 0.5) P.dot(cards[ci][0] + 3, cards[ci][1] + 2, 2 * D + 9, 2 + (cp - 0.15) * 22, { ring: true, cls: "acc" });
      P.line([[cur[0], cur[1], cz], [cur[0], cur[1], 2 * D + 1.5]], { cls: "lo dash" });
      P.seq(null);
      if (o.labels) {
        [[0, "Surface"], [D, "Navigation"], [2 * D, "Content"], [cz, "Cursor"]].forEach(function (l, i) {
          P.text(54, 30, l[0], nm(o, i, l[1]), { anchor: "start" });
        });
      }
    },
  };

  /*
   * Filing cabinet, after hairline's Drawer: a rounded carcass on a plinth set
   * back under it, four drawers whose fronts are bevelled plates with a card
   * holder and a bar pull. A drawer out shows its opening on the carcass face
   * above its box, and inside, hanging folders on two rails. Point at a drawer
   * to open it, then at a folder to lift it out.
   */
  var DRAWERS = ["Briefs", "Contracts", "Invoices", "Archive"];
  var FCAB = { W: 30, D: 32, Z0: 1.8, M: 1.2, PITCH: 12.4, G: 0.8, FT: 1.3, ZB: 2.6 };
  FCAB.H = FCAB.ZB + 4 * FCAB.PITCH + 1.2;
  function drawerZ(k) { return FCAB.ZB + k * FCAB.PITCH + FCAB.G / 2; }
  /** A drawer front: a bevelled plate in the x–z plane from y0 to y1, a card holder, a bar pull. */
  function drawerFront(P, k, y0, cls) {
    var z0 = drawerZ(k), z1 = z0 + FCAB.PITCH - FCAB.G, x0 = -FCAB.W / 2 + FCAB.M, x1 = FCAB.W / 2 - FCAB.M, y1 = y0 + FCAB.FT, C = P.C;
    var face = rrect(x1 - x0, z1 - z0, 1.2, 3).map(function (q) { return [q.u, q.v]; });
    P.solid(extrudeY(face.map(function (q) { return [q[0], q[1] + (z0 + z1) / 2]; }), 1).map(function (r, i) {
      return r.map(function (p) { return [p[0], i ? y0 : y1, p[2]]; });
    }), { cls: cls });
    // the bevel: an inset outline on the face
    var bev = rrect(x1 - x0 - 1.6, z1 - z0 - 1.6, 0.8, 3).map(function (q) { return project(C, q.u, y1 + 0.02, q.v + (z0 + z1) / 2); });
    P.add(1, 0, [[poly(bev), "ln lo"]]);
    var zm = z1 - 2.6;
    P.add(1, 0, [[poly([[-3.4, zm - 1.1], [3.4, zm - 1.1], [3.4, zm + 1.1], [-3.4, zm + 1.1]].map(function (q) { return project(C, q[0], y1 + 0.03, q[1]); })), "fl mid"]]);
    P.add(1, 0, [[poly([[-2.8, zm - 0.6], [2.8, zm - 0.6], [2.8, zm + 0.6], [-2.8, zm + 0.6]].map(function (q) { return project(C, q[0], y1 + 0.05, q[1]); })), "fl"]]);
    var zp = (z0 + z1) / 2 - 0.6;
    [-4.6, 4.6].forEach(function (px) { P.solid(bar3([px, y1, zp], [px, y1 + 1.1, zp], 0.6, 0.6), { cls: cls }); });
    P.solid(bar3([-5, y1 + 1.1, zp], [5, y1 + 1.1, zp], 0.75, 0.75), { cls: cls });
  }
  /** An open drawer: only what is pulled out is drawn, back to front: floor, far wall, rails, folders, near wall, front. */
  function drawDrawer(P, k, o, folders, lifts, pick, cls) {
    var D2 = FCAB.D / 2, zd = drawerZ(k), zb = zd + 0.9, zt = zd + FCAB.PITCH - FCAB.G - 3.2, y0 = D2, yb = D2 + Math.max(0.05, o), C = P.C;
    var xl = -FCAB.W / 2 + FCAB.M + 2, xr = FCAB.W / 2 - FCAB.M - 2, near = C.s >= 0 ? 1 : -1;
    P.begin(1e4 + P.key(0, (y0 + yb) / 2, zd));
    // the opening on the carcass face, seen above the box
    var op = rrect(xr - xl + 1.6, FCAB.PITCH - FCAB.G - 3.4, 0.8, 2).map(function (q) { return project(C, q.u, D2 + 0.02, q.v + zd + 1.6 + (FCAB.PITCH - FCAB.G - 3.4) / 2); });
    P.add(1, 0, [[poly(op), "fl"]]);
    if (o > 0.3) {
      P.box(0, (y0 + yb) / 2, zb, xr - xl, yb - y0, 0.6, { r: 0.2 });
      var wall = function (x) { P.solid(boxR(x - 0.6, x + 0.6, y0, yb, zb + 0.6, zt), { cls: cls }); };
      wall(near < 0 ? xr - 0.6 : xl + 0.6);
      var rails = "";
      [xl + 1.6, xr - 1.6].forEach(function (rx) { rails += seg(project(C, rx, y0, zt - 0.4), project(C, rx, yb - 0.3, zt - 0.4)); });
      P.raw(rails, "ln", 1);
      folders.forEach(function (f, i) {
        var fy = f.y + o, l = lifts[i] || 0, c = i === pick ? "acc" : "";
        if (fy < y0 + 0.7 || fy > yb - 0.9) return;
        var top = zt - 0.4 + l;
        // the hanging bar, its hooks over the rails
        P.solid(bar3([xl + 0.9, fy, top], [xr - 0.9, fy, top], 0.35, 0.35), { cls: c });
        P.solid(boxR(xl + 2.2, xr - 2.2, fy - 0.12, fy + 0.12, zb + 0.9 + l, top), { cls: c });
        var tx = xl + 3 + f.tab * ((xr - xl - 10) / 2);
        P.solid(boxR(tx, tx + 4.4, fy - 0.12, fy + 0.12, top, top + 1.5), { cls: c });
        if (C.c > 0) P.add(1, 0, [[poly([[tx + 0.6, top + 0.35], [tx + 3.8, top + 0.35], [tx + 3.8, top + 1.15], [tx + 0.6, top + 1.15]].map(function (q) { return project(C, q[0], fy + 0.13, q[1]); })), "fl" + (c ? " acc" : "")]]);
        for (var s = 0; s < f.sheets; s++) {
          var st2 = top + (l > 1 ? 1.6 : -0.4) - s * 0.5, py = fy + 0.26 + s * 0.12;
          P.solid(boxR(xl + 2.8 + s * 0.4, xr - 3.2 + s * 0.3, py, py + 0.05, zb + 1.2 + l, st2), {});
          if (l > 1 && s === f.sheets - 1 && C.c > 0) {
            var dd = "";
            for (var tz = st2 - 1.2; tz > st2 - 4.8; tz -= 0.9) dd += seg(project(C, xl + 4, py + 0.07, tz), project(C, xr - 6 - (tz % 2), py + 0.07, tz));
            P.raw(dd, "ln lo", 1);
          }
        }
        P.solid(boxR(xl + 2.2, xr - 2.2, fy + 0.6, fy + 0.78, zb + 0.9 + l, top - 2.2), { cls: c });
      });
      wall(near < 0 ? xl + 0.6 : xr - 0.6);
    }
    drawerFront(P, k, yb, cls);
    P.end();
  }

  SCENES.cabinet = {
    init: function (o, R) {
      var reach = 15 + o.density * 8;
      var folders = DRAWERS.map(function () {
        var f = [];
        for (var y = -13.5; y <= 12.5; y += 2.4) f.push({ y: y, tab: Math.floor(R() * 3), sheets: 1 + Math.floor(R() * 3) });
        return f;
      });
      var W2 = FCAB.W / 2 + 1, D2 = FCAB.D / 2 + 1;
      var fit = corners([-W2, -D2, W2, D2 + reach + 2], 0).concat(corners([-W2, -D2, W2, D2 + reach], FCAB.H + 12));
      return { b: [-W2, -D2, W2, D2 + reach, FCAB.H + 12], fit: fit, reach: reach, folders: folders, c: 0, flat: true, cols: true };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, k, D2 = FCAB.D / 2;
      st.c += x.dt;
      // at rest: one drawer stands part-way out, a folder lifts, then the next drawer
      var cyc = st.c / 4.2, autoI = (Math.floor(cyc) + 1) % 4, autoF = cyc % 1, pickD = -1;
      if (on) {
        // the pointer, put on each front's plane, top down: a higher drawer covers a lower one
        for (k = 3; k >= 0 && pickD < 0; k--) {
          var y = D2 + FCAB.FT + x.ease("d" + k, 0, 0) * st.reach, xq = (x.ptr.sx + y * C.s) / C.c, zq = ((xq * C.s + y * C.c) * C.k - x.ptr.sy) / C.zf;
          if (Math.abs(xq) <= FCAB.W / 2 && zq >= drawerZ(k) && zq <= drawerZ(k) + FCAB.PITCH) pickD = k;
        }
        if (pickD < 0) {
          var bd = 1e9;
          for (k = 0; k < 4; k++) { var dd2 = Math.abs(project(C, 0, D2, drawerZ(k) + 6)[1] - x.ptr.sy); if (dd2 < bd) { bd = dd2; pickD = k; } }
        }
      }
      var opens = [];
      for (k = 0; k < 4; k++) {
        var tg = on ? (k === pickD ? 1 : 0) : k === autoI ? 0.75 * ss(0, 0.2, autoF) * (1 - ss(0.85, 1, autoF)) : 0;
        opens.push(x.ease("d" + k, tg, 4) * st.reach);
      }
      // carcass and plinth
      P.begin(P.key(0, 0, 0));
      P.box(0, 0, 0, FCAB.W - 2.4, FCAB.D - 2.4, FCAB.Z0, { r: 1 });
      P.box(0, 0, FCAB.Z0, FCAB.W, FCAB.D, FCAB.H - FCAB.Z0, { r: 1.4 });
      ringLine(P, place(rrect(FCAB.W - 1.6, FCAB.D - 1.6, 0.8, 2), 0, 0, 0), FCAB.H, "lo");
      for (k = 0; k < 4; k++) if (opens[k] < 0.05) drawerFront(P, k, D2, "");
      // a plant on top
      P.solid([rCirc("z", [6, -8, FCAB.H], 2.6, 2.6, 18), rCirc("z", [6, -8, FCAB.H + 4.4], 3.3, 3.3, 18)]);
      P.dot(6, -8, FCAB.H + 4.42, 2.8, { ring: true, cls: "lo", layer: 1 });
      [[5, -9, 7.2, 1.9], [7.6, -7.2, 8.2, 2.2], [5.6, -6.6, 9.6, 1.8], [6.4, -8.4, 10.6, 1.6]].forEach(function (lf) { P.sphere(lf[0], lf[1], FCAB.H + lf[2] - 2, lf[3]); });
      P.end();
      var labelHi = on ? pickD : opens[autoI] > 1 ? autoI : -1;
      for (k = 0; k < 4; k++) {
        if (opens[k] < 0.05) continue;
        var zd = drawerZ(k), pick = -1, fl = st.folders[k];
        if (on && k === pickD) {
          var w = unproject(C, x.ptr.sx, x.ptr.sy, zd + FCAB.PITCH - 3), bf = 3;
          fl.forEach(function (f, i) { var fy = f.y + opens[k]; if (fy < D2 + 0.7) return; var d3 = Math.abs(fy - w[1]); if (d3 < bf) { bf = d3; pick = i; } });
        } else if (!on && k === autoI && autoF > 0.35 && autoF < 0.75) pick = Math.floor(fl.length * 0.7);
        var lifts = fl.map(function (f, i) { return x.ease("f" + k + "-" + i, i === pick ? 8 : 0, 6); });
        drawDrawer(P, k, opens[k], fl, lifts, pick, k === labelHi ? "acc" : "");
      }
      if (o.labels) {
        var col = -1e9;
        st.fit.forEach(function (q) { col = Math.max(col, project(C, q[0], q[1], 0)[0]); });
        var ex = C.s >= 0 ? FCAB.W / 2 : -FCAB.W / 2, ey = C.c >= 0 ? -D2 : D2;
        labelColumn(P, DRAWERS.map(function (n, i) {
          var e = project(C, ex, ey, drawerZ(i) + 6);
          return { edge: e, slot: e[1], text: String(i + 1).padStart(2, "0") + " " + nm(o, i, n), hi: i === labelHi };
        }), col + 6, x.fs);
      }
    },
  };

  /*
   * Lockers, after hairline's: a bank of ten, five across and two high, on a
   * plinth. Each door is a thin plate with louvred vents, a number plate and a
   * latch cup, hung on a hinge down its left side. The door under the pointer
   * swings open and shows the locker's inside: a shelf, a floor, what is kept
   * there. At rest one door stands ajar.
   */
  var LK = { COLS: 5, ROWS: 2, W: 11, H: 19, GAP: 0.6, FM: 1.4, ZP: 2.2, D: 13 };
  LK.BW = LK.COLS * LK.W + 2 * LK.FM; LK.BH = LK.ROWS * LK.H + 2 * LK.FM; LK.DW = LK.W - 2 * LK.GAP; LK.DH = LK.H - 2 * LK.GAP;
  function lockerAt(i) {
    var c = i % LK.COLS, r = Math.floor(i / LK.COLS);
    return { x0: -LK.BW / 2 + LK.FM + c * LK.W + LK.GAP, z0: LK.ZP + LK.FM + r * LK.H + LK.GAP };
  }
  /** A door's marks on its outer face: three louvres, a number plate, a latch cup; f maps (u, v) on the face to the world. */
  function doorMarks(P, f, cls) {
    var C = P.C, DW = LK.DW, DH = LK.DH, d = "";
    var face = function (pts) { return pts.map(function (q) { var w = f(q[0], q[1]); return project(C, w[0], w[1], w[2]); }); };
    for (var k = 0; k < 3; k++) { var v = DH - 3.4 - k * 1.5; d += poly(face([[2.2, v], [DW - 2.2, v], [DW - 2.2, v + 0.6], [2.2, v + 0.6]])); }
    P.add(1, 0, [[d, "ln lo"]]);
    P.add(1, 0, [[poly(face([[DW / 2 - 1.8, DH - 9.4], [DW / 2 + 1.8, DH - 9.4], [DW / 2 + 1.8, DH - 7.8], [DW / 2 - 1.8, DH - 7.8]])), "fl mid"]]);
    P.add(1, 0, [[poly(face([[DW - 2.4, DH / 2 - 2.6], [DW - 1.2, DH / 2 - 2.6], [DW - 1.2, DH / 2 + 0.8], [DW - 2.4, DH / 2 + 0.8]])), "fl" + (cls ? " " + cls : " mid")]]);
  }
  SCENES.lockers = {
    init: function (o, R) {
      var items = [];
      for (var i = 0; i < LK.COLS * LK.ROWS; i++) items.push(R() < 0.5 ? "box" : R() < 0.5 ? "ball" : "stack");
      var X = LK.BW / 2 + 2, Y = LK.D / 2 + LK.DW + 2;
      var fit = corners([-X, -LK.D / 2 - 2, X, Y], 0).concat(corners([-X, -LK.D / 2 - 2, X, LK.D / 2 + 2], LK.ZP + LK.BH + 2));
      return { b: [-X, -LK.D / 2 - 2, X, Y, LK.ZP + LK.BH + 2], fit: fit, items: items, c: 0, flat: true, far: 70 + o.density * 40 };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, i, D2 = LK.D / 2, N = LK.COLS * LK.ROWS;
      st.c += x.dt;
      var act = -1;
      if (on) {
        var y0 = D2, xq = (x.ptr.sx + y0 * C.s) / C.c, zq = ((xq * C.s + y0 * C.c) * C.k - x.ptr.sy) / C.zf;
        for (i = 0; i < N; i++) { var L = lockerAt(i); if (xq >= L.x0 && xq <= L.x0 + LK.DW && zq >= L.z0 && zq <= L.z0 + LK.DH) act = i; }
      }
      var restI = (Math.floor(st.c / 5) * 3 + 6) % N;
      var angles = [], lit = [];
      // the accent fades in and out on its own, quicker than the door swings
      for (i = 0; i < N; i++) lit.push(x.ease("lit" + i, (on ? i === act : i === restI) ? 1 : 0, 6));
      for (i = 0; i < N; i++) angles.push(x.ease("a" + i, on ? (i === act ? st.far : 0) : i === restI ? 24 : 0, 3));
      // the bank: plinth, carcass, the closed doors as plates on its face
      P.begin(P.key(0, 0, 0));
      P.box(0, 0, 0, LK.BW - 2, LK.D - 2, LK.ZP, { r: 0.6 });
      P.box(0, 0, LK.ZP, LK.BW, LK.D, LK.BH, { r: 0.6 });
      for (i = 0; i < N; i++) {
        if (angles[i] > 0.5) continue;
        var Lc = lockerAt(i), fc = function (u, v) { return [Lc.x0 + u, D2 + 0.02, Lc.z0 + v]; };
        P.add(1, 0, [[poly([[0, 0], [LK.DW, 0], [LK.DW, LK.DH], [0, LK.DH]].map(function (q) { var w = fc(q[0], q[1]); return project(C, w[0], w[1], w[2]); })), "fl mid"]]);
        doorMarks(P, fc, "");
      }
      P.end();
      // open lockers: their inside through the opening, then the door swung on its hinge
      for (i = 0; i < N; i++) {
        if (angles[i] <= 0.5) continue;
        var Lo = lockerAt(i), a = rad(angles[i]);
        // everything on the bank's face paints after the bank itself, whatever the locker's place in the row
        P.begin(1e4 + P.key(Lo.x0 + LK.DW / 2, D2 + 1, Lo.z0));
        var opening = [[Lo.x0, Lo.z0], [Lo.x0 + LK.DW, Lo.z0], [Lo.x0 + LK.DW, Lo.z0 + LK.DH], [Lo.x0, Lo.z0 + LK.DH]].map(function (q) { return project(C, q[0], D2 + 0.02, q[1]); });
        P.add(1, 0, [[poly(opening), "fl"]]);
        var inside = "", cut = function (A, B) { var s2 = clipSeg(project(C, A[0], A[1], A[2]), project(C, B[0], B[1], B[2]), opening); if (s2) inside += seg(s2[0], s2[1]); };
        var xa = Lo.x0 + 0.4, xb = Lo.x0 + LK.DW - 0.4, back = -D2 + 1, zs = Lo.z0 + LK.DH * 0.66;
        [[Lo.z0 + 0.6], [zs]].forEach(function (zz) {
          cut([xa, D2, zz[0]], [xb, D2, zz[0]]); cut([xa, D2, zz[0]], [xa, back, zz[0]]); cut([xb, D2, zz[0]], [xb, back, zz[0]]); cut([xa, back, zz[0]], [xb, back, zz[0]]);
        });
        cut([xa, back, Lo.z0], [xa, back, Lo.z0 + LK.DH]); cut([xb, back, Lo.z0], [xb, back, Lo.z0 + LK.DH]);
        P.raw(inside, "ln lo", 1);
        // what is kept there, cut to the opening
        var item = st.items[i], mx = Lo.x0 + LK.DW / 2, kept = [];
        if (item === "ball") { for (var t = 0; t < 24; t++) { var an = (t / 24) * Math.PI * 2, q = project(C, mx, -1, Lo.z0 + 0.6 + 2.6); kept.push([q[0] + Math.cos(an) * 2.6, q[1] + Math.sin(an) * 2.6]); } }
        else {
          var bz = item === "stack" ? zs : Lo.z0 + 0.6, bh = item === "stack" ? 2.4 : 4.2, ring = boxRing(mx, -1.5, 6, 6, 0.3, 0.2), pts = [];
          ring.forEach(function (rq) { pts.push(project(C, rq.u, rq.v, bz)); pts.push(project(C, rq.u, rq.v, bz + bh)); });
          kept = hull(pts);
        }
        var shown = clipPoly(kept, opening);
        if (shown.length > 2) P.add(1, 0, [[poly(shown), "sil"]]);
        // the door, turned on its hinge down its left side; lit, it is drawn again in the accent over itself, as strong as it is lit
        var f = xf(Lo.x0, D2, Lo.z0, a);
        var door = function (c) {
          var m = new Model(P, f, c);
          m.solid(boxR(0, LK.DW, 0, 0.35, 0, LK.DH));
          if (m.sees(0, 1, 0)) doorMarks(P, function (u, v) { return f(u, 0.37, v); }, c);
        };
        door("");
        if (lit[i] > 0.06) door(lit[i] > 0.94 ? "acc" : "acc a" + clamp(Math.round(lit[i] * 8), 1, 7));
        P.end();
      }
      if (o.labels && (on ? act : restI) >= 0) {
        var li = on ? act : restI, Ll = lockerAt(li);
        P.callout(Ll.x0 + LK.DW / 2, D2, Ll.z0 + LK.DH, nm(o, 0, "Locker") + " " + String(li + 1).padStart(2, "0"), { cls: "acc", h: 3 });
      }
    },
  };

  /* Cargo port: two ship-to-shore cranes work a moored container ship. Hover a container to read its number. */
  var CODES = ["MSKU", "CMAU", "TGHU", "HLXU", "OOLU", "EGHU", "MRKU", "TCNU"];
  var PORT = { QZ: 2.5, Q: 38, DECK: 8, SHIP_Y: 50, SAFE: 23.9, BUF_Y: 31.75 };
  function bayX(b) { return 48 + b * 13.5; }
  function rowY(r) { return PORT.SHIP_Y - 6.5 + r * 2.6; }

  /** A 40 ft box: corrugated long side, doors at one end. */
  function drawContainer(P, cx, cy, z, cls) {
    var C = P.C;
    P.box(cx, cy, z, 12, 2.5, 2.6, { r: 0, cls: cls });
    var d = "", fy = C.c >= 0 ? 1.27 : -1.27, fx = C.s >= 0 ? 6.02 : -6.02;
    for (var t = -5.4; t <= 5.45; t += 1.2) d += seg(project(C, cx + t, cy + fy, z + 0.25), project(C, cx + t, cy + fy, z + 2.35));
    d += seg(project(C, cx + fx, cy - 0.4, z + 0.2), project(C, cx + fx, cy - 0.4, z + 2.4)) + seg(project(C, cx + fx, cy + 0.4, z + 0.2), project(C, cx + fx, cy + 0.4, z + 2.4));
    P.raw(d, "ln " + (cls === "acc" ? "acc" : "lo"), 1);
  }
  function drawStack(P, cx, cy, z0, list, key, hiTop) {
    if (!list.length) return;
    P.begin(key);
    list.forEach(function (b, i) { drawContainer(P, cx, cy, z0 + i * 2.6, hiTop && i === list.length - 1 ? "hi" : b.acc ? "acc" : ""); });
    P.end();
  }
  function hullRings(bob) {
    return [[30, 8.4, 8], [33, 9, 8], [112, 9, 8], [122, 7.6, 8.4], [128, 4.6, 8.8], [131.5, 0.9, 9.2]].map(function (h) {
      var y = PORT.SHIP_Y, hw = h[1];
      return [[h[0], y + hw, h[2] + bob], [h[0], y + hw, 1.4 + bob], [h[0], y + hw * 0.86, 0], [h[0], y - hw * 0.86, 0], [h[0], y - hw, 1.4 + bob], [h[0], y - hw, h[2] + bob]];
    });
  }
  /** The crane's next lift: unload three boxes to the quay, load three back, then move along a bay. */
  function planLift(cr, st) {
    var bay = st.ship[cr.bays[cr.bi]], buf = st.buf[cr.id], r, best;
    if (cr.mode === "unload") {
      best = -1;
      bay.forEach(function (row, i) { if (best < 0 || row.length > bay[best].length) best = i; });
      if (cr.moves >= 3 || buf.length >= 3 || !bay[best].length) { cr.mode = "load"; cr.moves = 0; return planLift(cr, st); }
      cr.src = { ship: true, r: best }; cr.dst = { ship: false };
    } else {
      best = -1;
      for (r = 0; r < bay.length; r++) if (bay[r].length < 5 && (best < 0 || bay[r].length < bay[best].length)) best = r;
      if (cr.moves >= 3 || !buf.length || best < 0) {
        cr.mode = "unload"; cr.moves = 0; cr.bi = (cr.bi + 1) % cr.bays.length; cr.gx = bayX(cr.bays[cr.bi]);
        return planLift(cr, st);
      }
      cr.src = { ship: false }; cr.dst = { ship: true, r: best };
    }
  }
  function liftTop(st, cr, at) {
    if (at.ship) return PORT.DECK + st.ship[cr.bays[cr.bi]][at.r].length * 2.6;
    return PORT.QZ + st.buf[cr.id].length * 2.6;
  }
  function liftY(at) { return at.ship ? rowY(at.r) : PORT.BUF_Y; }
  /** Moves value v toward t at speed sp; returns whether it arrived. */
  function toward(o, k, t, sp, dt) {
    var d = t - o[k];
    if (Math.abs(d) <= sp * dt) { o[k] = t; return true; }
    o[k] += Math.sign(d) * sp * dt;
    return false;
  }
  function stepCrane(cr, st, dt) {
    if (cr.gx != null) {
      cr.hz = Math.min(PORT.SAFE, cr.hz + 6 * dt);
      if (toward(cr, "x", cr.gx, 5, dt)) cr.gx = null;
      return;
    }
    var bay = st.ship[cr.bays[cr.bi]], buf = st.buf[cr.id];
    if (cr.phase === 0) { var a = toward(cr, "hz", PORT.SAFE, 6, dt), b = toward(cr, "ty", liftY(cr.src), 9, dt); if (a && b) cr.phase = 1; }
    else if (cr.phase === 1) { if (toward(cr, "hz", liftTop(st, cr, cr.src), 6, dt)) { cr.phase = 2; cr.wait = 0.5; } }
    else if (cr.phase === 2) { cr.wait -= dt; if (cr.wait <= 0) { cr.carry = cr.src.ship ? bay[cr.src.r].pop() : buf.pop(); cr.phase = 3; } }
    else if (cr.phase === 3) { if (toward(cr, "hz", PORT.SAFE, 6, dt)) cr.phase = 4; }
    else if (cr.phase === 4) { if (toward(cr, "ty", liftY(cr.dst), 9, dt)) cr.phase = 5; }
    else if (cr.phase === 5) { if (toward(cr, "hz", liftTop(st, cr, cr.dst) + 2.6, 6, dt)) { cr.phase = 6; cr.wait = 0.5; } }
    else if (cr.phase === 6) { cr.wait -= dt; if (cr.wait <= 0) { (cr.dst.ship ? bay[cr.dst.r] : buf).push(cr.carry); cr.carry = null; cr.phase = 7; } }
    else if (cr.phase === 7) { if (toward(cr, "hz", PORT.SAFE, 6, dt)) { cr.moves++; planLift(cr, st); cr.phase = 0; } }
  }
  /**
   * A ship-to-shore crane. Legs and portal stand on the quay; the boom, the
   * A-frame, the machinery house and the trolley ride above everything, so they
   * paint on the air layer. A spreader lowered between stacks joins the stack it
   * works, so the stacks in front of it still cover it.
   */
  function drawCrane(P, cr, cls, slotKey) {
    var x = cr.x, QZ = PORT.QZ, C = P.C;
    [[x - 7.5, 27], [x + 7.5, 27], [x - 7.5, 36.5], [x + 7.5, 36.5]].forEach(function (l) {
      P.begin(P.key(l[0], l[1], QZ));
      P.box(l[0], l[1], QZ, 1.8, 2.6, 1, { r: 0.2 });
      P.box(l[0], l[1], QZ + 1, 1.3, 1.3, 22.6, { r: 0.1, cls: cls });
      P.end();
    });
    P.begin(P.key(x, PORT.BUF_Y, 23.6));
    [[x, 27, 16.3, 1.3], [x, 36.5, 16.3, 1.3], [x - 7.5, 31.75, 1.3, 10.8], [x + 7.5, 31.75, 1.3, 10.8]].forEach(function (b) {
      P.sub = P.key(b[0], b[1], 24); P.box(b[0], b[1], 23.6, b[2], b[3], 1.8, { r: 0, cls: cls });
    });
    P.end();
    var top = cr.hz + 0.6, ty = cr.ty;
    var hook = function () {
      P.line([[x - 1.4, ty, 24.6], [x - 1.4, ty, top]], { cls: "" });
      P.line([[x + 1.4, ty, 24.6], [x + 1.4, ty, top]], { cls: "" });
      if (cr.carry) drawContainer(P, x, ty, cr.hz - 2.6, cr.carry.acc ? "acc" : "");
      P.box(x, ty, cr.hz, 12.4, 2.8, 0.6, { r: 0.1, cls: "acc" });
    };
    var low = cr.hz < 22;
    if (low) { P.begin(slotKey + 0.01); hook(); P.end(); }
    P.begin(P.key(x, 40, 26), 2);
    P.sub = -1e6;
    P.box(x, ty, 24.6, 4.4, 5, 1.2, { r: 0.2 });
    if (!low) hook();
    P.sub = 0;
    P.box(x, 48, 25.8, 3.4, 72, 1.7, { r: 0, cls: cls });
    var vis = C.s >= 0 ? 1.72 : -1.72, z0 = 25.85, z1 = 27.45, d = "";
    for (var yy = 12; yy < 84; yy += 3) d += seg(project(C, x + vis, yy, z0), project(C, x + vis, yy + 1.5, z1)) + seg(project(C, x + vis, yy + 1.5, z1), project(C, x + vis, yy + 3, z0));
    P.raw(d, "ln lo", 2);
    P.box(x, 18.5, 27.5, 5.5, 8, 3.6, { r: 0.3, cls: cls });
    var apex = [x, 31.5, 38];
    [[x - 1.4, 22.6, 27.5], [x + 1.4, 22.6, 27.5], [x - 1.4, 40.5, 27.5], [x + 1.4, 40.5, 27.5]].forEach(function (b) { P.solid(bar3(b, apex, 0.9, 0.9), { cls: cls }); });
    P.line([apex, [x, 84, 27.5]], { cls: "" });
    P.line([apex, [x, 12, 27.5]], { cls: "" });
    P.end();
  }
  /** A harbour tug: a short hull, a deckhouse, a wheelhouse, a funnel. */
  function drawTug(P, x, y, yaw, key) {
    var f = xf(x, y, 0, yaw), m = new Model(P, f, ""), near = m.sees(0, 1, 0) ? 1 : -1;
    P.begin(key);
    m.line([[-5, 0, 0.05], [-13, 3.4, 0.05]], "lo");
    m.line([[-5, 0, 0.05], [-13, -3.4, 0.05]], "lo");
    m.solid([[-5, 1.8, 2.2], [-4.6, 2, 2.2], [2.5, 2, 2.4], [4.4, 1.3, 2.8], [5.2, 0.3, 3]].map(function (s) {
      return [[s[0], s[1], s[2]], [s[0], s[1], 0.9], [s[0], s[1] * 0.85, 0], [s[0], -s[1] * 0.85, 0], [s[0], -s[1], 0.9], [s[0], -s[1], s[2]]];
    }), "", { crease: 0.6 });
    m.line([[-4.8, near * 2.05, 1.6], [3.6, near * 1.85, 1.9]], "lo");
    m.solid(boxR(-2.6, 1.8, -1.3, 1.3, 2.3, 4.3), "");
    m.solid(boxR(-0.4, 1.6, -1.05, 1.05, 4.3, 5.9), "");
    if (m.sees(1, 0, 0)) m.line([[1.62, -0.8, 5.2], [1.62, 0.8, 5.2]], "hi");
    m.solid(boxR(-2.4, -1.4, -0.55, 0.55, 4.3, 6.8), "");
    m.solid(boxR(-2.5, -1.3, -0.65, 0.65, 6.1, 6.7), "acc");
    P.end();
  }

  SCENES.port = {
    init: function (o, R) {
      var W = 200, D = 88;
      var code = function () { return CODES[Math.floor(R() * CODES.length)] + " " + String(Math.floor(100000 + R() * 899999)) + " " + Math.floor(R() * 10); };
      var box = function () { return { code: code(), acc: R() < 0.16 }; };
      var ship = [];
      for (var b = 0; b < 6; b++) {
        var bay = [];
        for (var r = 0; r < 6; r++) { var n = 1 + Math.floor(R() * 3) + (r > 0 && r < 5 ? 1 : 0), st = []; for (var i = 0; i < n; i++) st.push(box()); bay.push(st); }
        ship.push(bay);
      }
      var yard = [], cols = [12, 25, 146, 159, 172, 185];
      cols.forEach(function (cx) {
        for (var r = 0; r < 7; r++) {
          var n = Math.floor(R() * (2 + o.density * 2)), st = [];
          for (var i = 0; i < n; i++) st.push(box());
          yard.push({ x: cx, y: 6 + r * 2.7, list: st });
        }
      });
      var cranes = [{ id: 0, bays: [0, 1, 2] }, { id: 1, bays: [4, 5] }].map(function (c) {
        c.bi = 0; c.x = bayX(c.bays[0]); c.gx = null; c.ty = PORT.BUF_Y; c.hz = PORT.SAFE; c.mode = c.id ? "load" : "unload"; c.moves = 0; c.phase = 0; c.carry = null;
        return c;
      });
      var buf = [[], [box(), box()]];
      var st0 = { ship: ship, buf: buf };
      cranes.forEach(function (c) { planLift(c, st0); });
      var waves = [];
      for (var k = 0; k < 110; k++) waves.push([4 + R() * (W - 8), 62 + R() * (D - 65), R() * 6]);
      var fit = corners([0, 0, W, D], -3).concat(corners([0, 0, W, D], 0), [[48, 31, 40], [116, 31, 40], [48, 84, 28], [116, 84, 28], [48, 12, 31], [116, 12, 31]]);
      return { b: [0, 0, W, D, 40], fit: fit, W: W, D: D, ship: ship, yard: yard, cranes: cranes, buf: buf, waves: waves, tug: { s: 0, lp: makeLoop([[30, 81], [176, 81], [176, 68], [30, 68]], 6) }, c: 0 };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, QZ = PORT.QZ, Q = PORT.Q;
      st.c += x.dt;
      plinth(P, st.b);
      var SHIP = 1e5, FRONT = 2e5;
      // quay: slab, edge, bollards, fenders, crane rails
      P.box(st.W / 2, Q / 2, 0, st.W, Q, QZ, { r: 0.4, layer: 0, key: -5e8 });
      var marks = "";
      [27, 36.5].forEach(function (ry) { marks += seg(project(C, 1, ry, QZ + 0.02), project(C, st.W - 1, ry, QZ + 0.02)); });
      for (var bx = 8; bx < st.W; bx += 16) marks += seg(project(C, bx, PORT.BUF_Y, QZ + 0.02), project(C, bx + 8, PORT.BUF_Y, QZ + 0.02));
      P.raw(marks, "ln lo", 0, -4e8);
      if (C.c > 0) for (bx = 10; bx < st.W; bx += 14) P.flat([[bx - 1.2, Q + 0.03, 0.3], [bx + 1.2, Q + 0.03, 0.3], [bx + 1.2, Q + 0.03, 2.1], [bx - 1.2, Q + 0.03, 2.1]], { cls: "mid", key: -4e8 });
      for (bx = 17; bx < st.W; bx += 14) { P.begin(P.key(bx, Q - 0.9, QZ)); P.cyl(bx, Q - 0.9, QZ, 0.5, 0.8); P.cyl(bx, Q - 0.9, QZ + 0.8, 0.75, 0.3); P.end(); }
      // the water: wavelets drifting
      var wv = "";
      st.waves.forEach(function (w) {
        var wx = ((w[0] + st.c * 1.2 + Math.sin(st.c * 0.7 + w[2]) * 0.6) % (st.W - 8)) + 4, wy = w[1];
        if (wy > 40 && wy < 61 && wx > 28 && wx < 134) return;
        wv += open([[-1.2, 0], [-0.6, 0.3], [0, 0], [0.6, -0.3], [1.2, 0]].map(function (v) { return project(C, wx + v[0], wy + v[1], 0.05); }));
      });
      P.raw(wv, "ln lo", 0, -3e8);

      // hover: the stack under the pointer shows its top box's number
      var hov = null;
      if (on) {
        var w = unproject(C, x.ptr.sx, x.ptr.sy, 10), bd = 4;
        st.ship.forEach(function (bay, b) { bay.forEach(function (row, r) { var dd = Math.hypot((bayX(b) - w[0]) / 4, rowY(r) - w[1]); if (row.length && dd < bd) { bd = dd; hov = { ship: true, b: b, r: r }; } }); });
        var w2 = unproject(C, x.ptr.sx, x.ptr.sy, 4);
        st.yard.forEach(function (s2, i) { var dd = Math.hypot((s2.x - w2[0]) / 4, s2.y - w2[1]); if (s2.list.length && dd < bd) { bd = dd; hov = { yard: i }; } });
      }
      // yard and quay-side buffers
      st.yard.forEach(function (s2, i) { drawStack(P, s2.x, s2.y, QZ, s2.list, P.key(s2.x, s2.y, QZ), hov && hov.yard === i); });
      st.cranes.forEach(function (cr) { drawStack(P, cr.x, PORT.BUF_Y, QZ, st.buf[cr.id], P.key(cr.x, PORT.BUF_Y, QZ)); });

      // the ship: hull, bridge, funnel, the bays
      var bob = Math.sin(st.c * 0.8) * 0.12, deck = PORT.DECK + bob, sy = PORT.SHIP_Y;
      P.begin(SHIP - 50);
      P.solid(hullRings(bob), { crease: 0.6 });
      var vy = C.c >= 0 ? sy + 9.03 : sy - 9.03;
      // the boot-top: a quiet band along the waterline, not an accent (accent means "under the pointer")
      P.line([[33, vy, 1.4 + bob], [112, vy, 1.4 + bob]], { cls: "lo" });
      P.line([[33, vy, 2.3 + bob], [112, vy, 2.3 + bob]], { cls: "lo" });
      P.end();
      P.begin(SHIP + P.key(37, sy, deck));
      var ring = P.box(37.2, sy, deck, 8.4, 16.6, 14, { r: 0.3 });
      floors(P, ring, deck, deck + 14, 2.6);
      P.box(40, sy, deck + 12, 2.8, 21, 1.2, { r: 0.2 });
      ringLine(P, ring, deck + 12.4, "hi");
      ringLine(P, ring, deck + 13.4, "hi");
      P.box(35.4, sy, deck + 14, 3.4, 5, 5, { r: 0.4 });
      P.box(35.4, sy, deck + 17.2, 3.6, 5.2, 1.2, { r: 0.4, cls: "acc" });
      P.line([[38.6, sy, deck + 14], [38.6, sy, deck + 19]], { cls: "" });
      P.line([[38.6, sy - 1.6, deck + 18], [38.6, sy + 1.6, deck + 18]], { cls: "" });
      P.end();
      st.ship.forEach(function (bay, b) {
        bay.forEach(function (row, r) {
          var hi = hov && hov.ship && hov.b === b && hov.r === r;
          drawStack(P, bayX(b), rowY(r), deck, row, SHIP + P.key(bayX(b), rowY(r), deck), hi);
        });
      });

      // cranes
      st.cranes.forEach(function (cr) {
        stepCrane(cr, st, x.dt);
        var at = cr.phase <= 2 ? cr.src : cr.dst, slotKey = at.ship ? SHIP + P.key(cr.x, rowY(at.r), deck) : P.key(cr.x, PORT.BUF_Y, QZ);
        drawCrane(P, cr, "", slotKey);
      });

      // the tug, out in front
      var tg = st.tug;
      tg.s = (tg.s + x.dt * 6) % tg.lp.L;
      var tp = loopAt(tg.lp, tg.s);
      drawTug(P, tp[0], tp[1], tp[2], FRONT + P.key(tp[0], tp[1], 0));

      if (hov) {
        var list = hov.ship ? st.ship[hov.b][hov.r] : st.yard[hov.yard].list, top = list[list.length - 1];
        var hx = hov.ship ? bayX(hov.b) : st.yard[hov.yard].x, hy = hov.ship ? rowY(hov.r) : st.yard[hov.yard].y, hz = (hov.ship ? deck : QZ) + list.length * 2.6;
        P.callout(hx, hy, hz, top.code, { cls: "acc", h: 5 });
      }
      if (o.labels) {
        P.callout(127, sy + 4, deck + 1.2, nm(o, 0, "MV Isoline"), { h: 4 });
        P.callout(165, 14, QZ + 9, nm(o, 1, "Yard"), { h: 4 });
      }
    },
  };

  /**
   * An industrial arm: base, turret, shoulder, two links, wrist, a gripper
   * pointing down. Two-link inverse kinematics, elbow up. Each part carries
   * its own depth so the arm paints right in any pose.
   */
  function drawRobot(P, bx, by, tgt, grip, cls, key, L1, L2, carry) {
    var sz = 3.8, tool = 2.4, yaw = Math.atan2(tgt[1] - by, tgt[0] - bx), cy = Math.cos(yaw), sy = Math.sin(yaw);
    var W = [tgt[0], tgt[1], tgt[2] + tool], r = Math.hypot(W[0] - bx, W[1] - by), h = W[2] - sz, d = clamp(Math.hypot(r, h), 1, L1 + L2 - 0.05);
    var a1 = Math.atan2(h, r) + Math.acos(clamp((L1 * L1 + d * d - L2 * L2) / (2 * L1 * d), -1, 1));
    var S = [bx, by, sz], E = [bx + cy * L1 * Math.cos(a1), by + sy * L1 * Math.cos(a1), sz + L1 * Math.sin(a1)];
    var dw = unit3(sub3(W, E)), Wr = [E[0] + dw[0] * L2, E[1] + dw[1] * L2, E[2] + dw[2] * L2], side = [-sy, cy, 0];
    var link = cls || "acc", K = function (p) { return P.key(p[0], p[1], p[2]); };
    P.begin(key);
    P.sub = -1e6; P.cyl(bx, by, 0, 2.6, 1.2, { cls: cls });
    P.sub = -1e6 + 1; P.cyl(bx, by, 1.2, 1.9, 2.6, { cls: cls });
    P.sub = K(S); P.solid(cylAx(S, side, 1.3, 1.25, 14), { cls: cls });
    P.sub = K(mid3(S, E)); P.solid(bar3(S, E, 1.7, 1.5), { cls: link });
    P.sub = K(E); P.solid(cylAx(E, side, 1.05, 1.0, 14), { cls: cls });
    P.sub = K(mid3(E, Wr)); P.solid(bar3(E, Wr, 1.3, 1.2), { cls: link });
    P.sub = K(Wr) + 0.01; P.sphere(Wr[0], Wr[1], Wr[2], 0.8, { cls: cls });
    var T0 = [Wr[0], Wr[1], Wr[2] - 0.5], T1 = [Wr[0], Wr[1], Wr[2] - tool + 0.7];
    if (carry) { P.sub = K(T1) - 0.5; carry(Wr[2] - tool); }
    P.sub = K(T1); P.solid(bar3(T0, T1, 1, 1), { cls: cls });
    var sp = 0.45 + (1 - grip) * 0.5;
    [-1, 1].forEach(function (sg) {
      var a = [T1[0] + side[0] * sp * sg, T1[1] + side[1] * sp * sg, T1[2]], b = [a[0], a[1], tgt[2]];
      P.solid(bar3(a, b, 0.25, 0.6), { cls: cls });
    });
    P.end();
  }

  /** A part on the line: a housing that gets stamped, welded, inspected. x0/x1 trim it at a wall. */
  function drawPart(P, px, py, z, stage, key, x0) {
    var a = x0 == null ? -2.6 : Math.max(-2.6, x0);
    if (2.6 - a < 0.15) return;
    P.begin(key);
    P.solid([rRect(px + a, px + 2.6, py - 2.2, py + 2.2, z), rRect(px + a, px + 2.6, py - 2.2, py + 2.2, z + 2.4)]);
    if (a === -2.6) {
      var tz = z + 2.42;
      if (stage >= 1) P.flat([[px - 1.7, py - 1.3, tz], [px + 1.7, py - 1.3, tz], [px + 1.7, py + 1.3, tz], [px - 1.7, py + 1.3, tz]], { cls: "mid", layer: 1 });
      if (stage >= 2) P.line([[px - 2.6, py + 2.22, z + 2.4], [px + 2.6, py + 2.22, z + 2.4]], { cls: "acc", layer: 1 });
      if (stage >= 3) P.line([[px - 0.8, py + 0.1, tz], [px - 0.2, py + 0.7, tz], [px + 0.9, py - 0.6, tz]], { cls: "acc", layer: 1 });
    }
    P.end();
  }

  /* Production line: stamp, weld, inspect, pack. Hover a station to name it. */
  var STATIONS = [{ n: "Press", x: 30, y: 48, z: 21 }, { n: "Weld", x: 48, y: 57, z: 15 }, { n: "QC scan", x: 66, y: 48, z: 13 }, { n: "Pack", x: 96, y: 44.5, z: 16 }];
  SCENES.line = {
    init: function (o) {
      var W = 132, D = 74;
      var fit = corners([0, 0, W, D], -3).concat(corners([0, 0, W, D], 0), corners([0, 0, W, 2], 20), corners([0, 0, 2, D], 20), [[30, 48, 21]]);
      return { b: [0, 0, W, D, 21], fit: fit, W: W, D: D, c: 0, T: 4.4 - o.density * 1.6 };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, k;
      st.c += x.dt;
      plinth(P, st.b);
      var T = st.T, n = Math.floor(st.c / T), f = (st.c % T) / T, moving = f < 0.3, mv = ss(0, 0.3, f), g = clamp((f - 0.3) / 0.7, 0, 1);
      var q = moving ? n - 1 + mv : n; // continuous station count: a part entering at cycle k sits at station q - k
      var hov = -1;
      if (on) { var bd = 14; STATIONS.forEach(function (s2, i) { var dd = ptrDist(x, s2.x, s2.y, 8); if (dd < bd) { bd = dd; hov = i; } }); }
      var hc = function (i) { return hov === i ? "acc" : ""; };

      // walls on the far sides, in segments, windows and doorways
      var WH = 20;
      if (C.c > 0) for (var wx = 0; wx < st.W; wx += 16) {
        var w1 = Math.min(st.W, wx + 16), m1 = new Model(P, xf(0, 0, 0, 0), "");
        P.begin(P.key((wx + w1) / 2, 1, 0));
        m1.solid(boxR(wx, w1, 0, 2, 0, WH));
        if (wx + 8 < st.W) m1.pane([[wx + 4, 2.03, 9], [wx + 12, 2.03, 9], [wx + 12, 2.03, 16], [wx + 4, 2.03, 16]], true);
        if (wx === 96) m1.flat([[104, 2.02, 0], [112, 2.02, 0], [112, 2.02, 8], [104, 2.02, 8]], "");
        P.end();
      }
      if (C.s > 0) [[2, 20], [20, 40], [40, 56], [56, st.D]].forEach(function (sgm) {
        var wy = sgm[0], y1w = sgm[1], m2 = new Model(P, xf(0, 0, 0, 0), "");
        P.begin(P.key(1, (wy + y1w) / 2, 0));
        m2.solid(boxR(0, 2, wy, y1w, 0, WH));
        if (wy !== 40) m2.pane([[2.03, wy + 4, 9], [2.03, y1w - 4, 9], [2.03, y1w - 4, 16], [2.03, wy + 4, 16]], true);
        else m2.flat([[2.02, 44.6, 0], [2.02, 51.4, 0], [2.02, 51.4, 7.5], [2.02, 44.6, 7.5]], "");
        P.end();
      });
      // floor: a walkway around the line, robot zones
      var fl = "";
      [[4, 34], [122, 34], [122, 66], [4, 66], [4, 34]].reduce(function (a, b) { fl += seg(project(C, a[0], a[1], 0.03), project(C, b[0], b[1], 0.03)); return b; });
      P.raw(fl, "ln lo dash", 0, -1e7);
      [[48, 57], [96, 44.5]].forEach(function (rb) { P.dot(rb[0], rb[1], 0.03, 9, { ring: true, cls: "lo", layer: 0, key: -1e7 }); });

      // the main belt, one piece; far-side machines paint before it, near-side ones after its parts
      var beltKey = P.key(47, 48, 0);
      var keyFor = function (xx, yy, zz) { var kk = P.key(xx, yy, zz); return (yy - 48) * C.c < 0 ? Math.min(kk, beltKey - 1) : Math.max(kk, beltKey + 1); };
      P.begin(beltKey);
      for (k = 7; k < 92; k += 10) [45.6, 50.4].forEach(function (ly) { P.line([[k, ly, 0], [k, ly, 4.2]], { cls: "" }); });
      P.box(47, 48, 4.2, 90, 6, 0.8, { r: 0 });
      var rl = "", off = (q * 18) % 2;
      for (var rx = 3 + off; rx < 91.5; rx += 2) rl += seg(project(C, rx, 45.2, 5.01), project(C, rx, 50.8, 5.01));
      P.raw(rl, "ln lo", 1);
      P.end();

      // parts riding the belt (the one at the end is the robot's)
      var held = !moving && g >= 0.28;
      // a station marks the part once its tool has done its job
      var passed = function (s0, j, gt) { return s0 > j + 0.001 || (Math.abs(s0 - j) < 0.001 && !moving && g > gt); };
      for (k = n - 6; k <= n + 1; k++) {
        var s = q - k;
        if (s < -1 || s > 4.0001 || (s > 3.999 && held)) continue;
        var px = 12 + s * 18, stage = passed(s, 3, 0.6) ? 3 : passed(s, 2, 0.8) ? 2 : passed(s, 1, 0.27) ? 1 : 0;
        drawPart(P, px, 48, 5, stage, beltKey + 0.5 + px * 1e-4, 2 - px);
      }

      // press: two pillars, a crown, a ram that comes down on the part
      var bump = moving ? 0 : Math.sin(Math.PI * clamp((g - 0.12) / 0.3, 0, 1)), ramZ = 7.5 + (1 - bump) * 5.8;
      [[30, 42.4], [30, 53.6]].forEach(function (pp) {
        P.begin(keyFor(pp[0], pp[1], 0));
        var rg = P.box(pp[0], pp[1], 0, 4.2, 2.6, 16, { r: 0.2, cls: hc(0) });
        if (pp[1] > 48) mullions(P, rg, 0.5, 2.6, 0.8, "acc");
        P.end();
      });
      P.begin(keyFor(30, 48, 16));
      P.box(30, 48, 16, 6.4, 15.4, 3.6, { r: 0.4, cls: hc(0) });
      P.box(30, 48, 18.4, 6.5, 15.5, 0.6, { r: 0.4, cls: "acc" });
      P.end();
      P.begin(keyFor(30, 48, ramZ));
      P.box(30, 48, ramZ + 0.8, 2.2, 2.2, 16 - ramZ - 0.8, { r: 0.3 });
      P.box(30, 48, ramZ, 5, 4, 0.8, { r: 0.2, cls: hc(0) });
      P.end();

      // weld robot: traces the seam along the near edge, sparks at the tip
      var wt, sparks = false;
      if (moving) wt = [48, 53, 12];
      else if (g < 0.2) wt = lerp3([48, 53, 12], [45.4, 50.6, 7.6], ss(0, 0.2, g));
      else if (g < 0.8) { wt = [lerp(45.4, 50.6, (g - 0.2) / 0.6), 50.6, 7.6]; sparks = true; }
      else wt = lerp3([50.6, 50.6, 7.6], [48, 53, 12], ss(0.8, 0.95, g));
      drawRobot(P, 48, 57, wt, 1, hc(1), keyFor(48, 57, 0), 7.6, 7.2);
      if (sparks) {
        var sd = "";
        for (k = 0; k < 6; k++) { var ang = (Math.sin(st.c * 91 + k * 7.1) + 1) * Math.PI, rr = 0.4 + ((st.c * 37 + k * 13) % 1.4); sd += seg(project(C, wt[0], wt[1], wt[2]), project(C, wt[0] + Math.cos(ang) * rr, wt[1] + Math.sin(ang) * rr, wt[2] + rr * 0.6)); }
        P.raw(sd, "ln acc", 3);
        P.dot(wt[0], wt[1], wt[2], 0.7, { ring: true, cls: "acc" });
      }

      // QC arch: a scanner sweeps a line across the part; the light turns on when it passes
      [[66, 43.4], [66, 52.6]].forEach(function (pp) { P.begin(keyFor(pp[0], pp[1], 0)); P.box(pp[0], pp[1], 0, 1.6, 1.6, 10.5, { r: 0.2, cls: hc(2) }); P.end(); });
      P.begin(keyFor(66, 48, 10.5));
      P.box(66, 48, 10.5, 2.4, 11.2, 1.3, { r: 0.2, cls: hc(2) });
      P.box(66, 48, 9.3, 3, 3, 1.2, { r: 0.3, cls: hc(2) });
      P.cyl(66, 51.5, 11.8, 0.5, 0.8, {});
      P.light(66, 51.5, 12.62, 0.45, { cls: !moving && g > 0.82 ? "acc" : "m" });
      if (!moving && g > 0.2 && g < 0.8) {
        var lx = 66 + Math.sin(((g - 0.2) / 0.6) * Math.PI * 2) * 2.4;
        P.line([[66, 48, 9.3], [lx, 45.8, 7.45]], { cls: "lo" });
        P.line([[66, 48, 9.3], [lx, 50.2, 7.45]], { cls: "lo" });
        P.line([[lx, 45.8, 7.45], [lx, 50.2, 7.45]], { cls: "acc" });
      }
      P.end();
      // an operator panel by the scanner
      P.begin(keyFor(72, 58, 0));
      P.box(72, 58, 0, 0.8, 0.8, 4, { r: 0.1 });
      P.box(72, 58, 4, 3.6, 0.8, 2.6, { r: 0.2 });
      if (C.c > 0) P.flat([[70.6, 58.42, 4.4], [73.4, 58.42, 4.4], [73.4, 58.42, 6.2], [70.6, 58.42, 6.2]], { cls: "mid", layer: 1 });
      P.end();

      // outfeed: cartons ride toward the back wall; the one at the robot is open
      var ofKey = P.key(108, 24, 0);
      P.begin(ofKey);
      for (k = 6; k < 46; k += 10) [104.6, 111.4].forEach(function (lx2) { P.line([[lx2, k, 0], [lx2, k, 3.2]], { cls: "" }); });
      P.box(108, 24, 3.2, 8, 44, 0.8, { r: 0 });
      P.end();
      for (k = n - 10; k <= n + 1; k++) {
        var cp = q - k - 4, cy2 = 40 - cp * 9;
        if (cp < -1 || cy2 < -2) continue;
        var a0 = Math.max(-3, 2 - cy2), b0 = Math.min(3, 44.6 - cy2), ck = ofKey + 0.5 + cy2 * 1e-4;
        if (b0 <= -3) continue;
        if (b0 - a0 < 0.15) continue;
        var openBox = cp < 0.001 && !(cp > -0.001 && g > 0.86);
        if (!openBox || a0 > -3 || b0 < 3) { drawCarton(P, 108, cy2, 4, a0, b0, !openBox, ck); continue; }
        P.begin(ck);
        var inBox = cp > -0.001 && g >= 0.62 && !moving;
        drawOpen(P, boxRing(108, cy2, 6.6, 6, 0, 0), boxRing(108, cy2, 6, 5.4, 0, 0), 4, 3.8, 3.4, { sharp: true, inside: function (zf) { if (inBox) drawPartIn(P, 108, cy2, zf); } });
        [-1, 1].forEach(function (sg) { P.flat([[108 + sg * 3.3, cy2 - 3, 7.8], [108 + sg * 3.3, cy2 + 3, 7.8], [108 + sg * 5.2, cy2 + 3, 9.3], [108 + sg * 5.2, cy2 - 3, 9.3]], { cls: "mid", layer: 1 }); });
        P.end();
      }
      // carton erector at the start of the outfeed
      P.begin(P.key(108, 48.5, 0));
      P.box(108, 48.5, 0, 10, 7.8, 5.6, { r: 0.4 });
      P.box(108, 49.5, 5.6, 6, 3.4, 1.4, { r: 0.3 });
      P.cyl(111.6, 51, 5.6, 0.5, 1, {});
      P.light(111.6, 51, 6.62, 0.48, { cls: Math.sin(st.c * 4) > 0 ? "acc" : "m" });
      P.end();
      // pallets of blanks by the entry
      [[12, 58], [12, 64.5], [20, 58]].forEach(function (pp, i) {
        P.begin(P.key(pp[0], pp[1], 0));
        P.box(pp[0], pp[1], 0, 6, 5.6, 0.6, { r: 0.1 });
        for (var lv = 0; lv < 3 - (i === 2 ? 1 : 0); lv++) P.box(pp[0], pp[1], 0.6 + lv * 1.2, 5.6, 5.2, 1.2, { r: 0.1 });
        P.end();
      });

      // pack robot: picks the part at the end of the belt and sets it in the carton
      var home = [92, 40, 12], pick = [84, 48, 7.5], drop = [108, 40, 7.0], pt, gr = 1, carry = null;
      if (moving) pt = home;
      else if (g < 0.12) pt = lerp3(home, [84, 48, 11], ss(0, 0.12, g));
      else if (g < 0.22) pt = lerp3([84, 48, 11], pick, ss(0.12, 0.22, g));
      else if (g < 0.28) { pt = pick; gr = 1 - ss(0.22, 0.28, g); }
      else if (g < 0.38) { pt = lerp3(pick, [84, 48, 13], ss(0.28, 0.38, g)); gr = 0; }
      else if (g < 0.52) { pt = lerp3([84, 48, 13], [108, 40, 13], ss(0.38, 0.52, g)); gr = 0; }
      else if (g < 0.6) { pt = lerp3([108, 40, 13], drop, ss(0.52, 0.6, g)); gr = 0; }
      else if (g < 0.66) { pt = drop; gr = ss(0.6, 0.66, g); }
      else if (g < 0.78) pt = lerp3(drop, [108, 40, 13], ss(0.66, 0.78, g));
      else pt = lerp3([108, 40, 13], home, ss(0.78, 1, g));
      if (held && g < 0.62) carry = function (tz) { var c3 = pt; P.solid([rRect(c3[0] - 2.6, c3[0] + 2.6, c3[1] - 2.2, c3[1] + 2.2, tz - 2.4 + 0.1), rRect(c3[0] - 2.6, c3[0] + 2.6, c3[1] - 2.2, c3[1] + 2.2, tz + 0.1)]); };
      drawRobot(P, 96, 44.5, pt, gr, hc(3), Math.max(P.key(96, 44.5, 0), beltKey + 1), 8.2, 7.8, carry);

      if (o.labels || hov >= 0) STATIONS.forEach(function (s2, i) { if (o.labels || i === hov) P.callout(s2.x, s2.y, s2.z, nm(o, i, s2.n), { cls: i === hov ? "acc" : "", h: 4 }); });
    },
  };
  function lerp3(a, b, t) { return [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]; }
  /** A carton on the outfeed, trimmed along y where it enters the machine or the wall; taped once closed. */
  function drawCarton(P, x, y, z, a, b, taped, key) {
    var C = P.C;
    P.begin(key);
    P.solid(boxR(x - 3.3, x + 3.3, y + a, y + b, z, z + 3.8));
    if (taped) {
      P.line([[x, y + a, z + 3.81], [x, y + b, z + 3.81]], { cls: "lo", layer: 1 });
      if (C.c > 0 && b === 3) P.line([[x, y + 3.01, z + 3.8], [x, y + 3.01, z + 2.2]], { cls: "lo", layer: 1 });
    }
    P.end();
  }
  /** The finished part sitting in its carton. */
  function drawPartIn(P, x, y, z) {
    P.solid([rRect(x - 2.6, x + 2.6, y - 2.2, y + 2.2, z), rRect(x - 2.6, x + 2.6, y - 2.2, y + 2.2, z + 2.4)]);
  }

  /*
   * Word, cut open: a word (or a logo) as thick letters, extruded from their
   * real outlines, holes and all, then cut like a dollhouse. Each letter keeps
   * its plinth and its roof; between them a room (two with more density),
   * walled at the back, open at the front, furnished. Counters (the hole of
   * an O) go through the roof as a skylight and mark the floor as a rug;
   * between two floors they are an atrium with a railing. At rest the roofs float a little; under
   * the pointer they lift, most of all over the letter at hand, whose lamps
   * and screens come on.
   */
  /** A rounded rectangle, counter-clockwise, n points per corner. */
  function roundRing(x0, y0, x1, y1, r, n) {
    var out = [];
    [[x1 - r, y0 + r, -Math.PI / 2], [x1 - r, y1 - r, 0], [x0 + r, y1 - r, Math.PI / 2], [x0 + r, y0 + r, Math.PI]].forEach(function (c) {
      for (var i = 0; i <= n; i++) { var a = c[2] + (i / n) * (Math.PI / 2); out.push([c[0] + Math.cos(a) * r, c[1] + Math.sin(a) * r]); }
    });
    return out;
  }
  // a chunky "OK": a rounded O with a slot for its counter, a K with heavy arms (y runs down the letter)
  var DEFAULT_SHAPE = [
    roundRing(-31, -21, -3, 21, 11, 7),
    roundRing(-19.5, -12, -14.5, 12, 2.5, 4),
    [[3, -21], [15, -21], [15, -6], [22, -21], [34, -21], [23, -2], [34, 21], [22, 21], [15, 7], [15, 21], [3, 21]],
  ];
  function inRing(p, ring) {
    var inside = false;
    for (var i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      var a = ring[i], b = ring[j];
      if (a[1] > p[1] !== b[1] > p[1] && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }
  function ringArea(r) { var s = 0; for (var i = 0; i < r.length; i++) { var q = r[(i + 1) % r.length]; s += r[i][0] * q[1] - q[0] * r[i][1]; } return s / 2; }
  /** Drops bad points and points closer than eps to the previous one. */
  function cleanRing(r, eps) {
    var out = [];
    (Array.isArray(r) ? r : []).forEach(function (q) {
      if (!Array.isArray(q) || !isFinite(q[0]) || !isFinite(q[1])) return;
      var p = out[out.length - 1];
      if (!p || Math.hypot(q[0] - p[0], q[1] - p[1]) > eps) out.push([+q[0], +q[1]]);
    });
    while (out.length > 2 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= eps) out.pop();
    return out;
  }
  /** Rings → letters: each outer ring with the holes nested in it; outers run one way, holes the other. */
  function lettersOf(rings) {
    var depth = rings.map(function (r, i) { return rings.reduce(function (n, o, j) { return n + (j !== i && inRing(r[0], o) ? 1 : 0); }, 0); });
    var letters = [];
    rings.forEach(function (r, i) {
      if (depth[i] % 2) return;
      var outer = ringArea(r) > 0 ? r : r.slice().reverse();
      var holes = rings.filter(function (h, j) { return depth[j] === depth[i] + 1 && inRing(h[0], r); }).map(function (h) { return ringArea(h) < 0 ? h : h.slice().reverse(); });
      letters.push({ rings: [outer].concat(holes) });
    });
    return letters;
  }
  function inLetter(p, L) { return inRing(p, L.rings[0]) && !L.rings.slice(1).some(function (h) { return inRing(p, h); }); }
  function edgeDist(p, L) {
    var d = 1e9;
    L.rings.forEach(function (r) { for (var i = 0; i < r.length; i++) d = Math.min(d, segDist(p, r[i], r[(i + 1) % r.length])); });
    return d;
  }
  function boundsOf(pts, b) {
    b = b || [1e9, 1e9, -1e9, -1e9];
    pts.forEach(function (q) { b[0] = Math.min(b[0], q[0]); b[1] = Math.min(b[1], q[1]); b[2] = Math.max(b[2], q[0]); b[3] = Math.max(b[3], q[1]); });
    return b;
  }
  /** The widest a letter gets: the radius of the largest circle inside it, sampled. */
  function innerRadius(L) {
    var b = boundsOf(L.rings[0]), st = Math.max(b[2] - b[0], b[3] - b[1]) / 32, best = 0;
    for (var x = b[0] + st / 2; x < b[2]; x += st) for (var y = b[1] + st / 2; y < b[3]; y += st) {
      if (inLetter([x, y], L)) best = Math.max(best, edgeDist([x, y], L));
    }
    return best;
  }

  /**
   * One slab of one letter, from z0 to z1. Walls whose face looks at the eye,
   * nearest last, each with its foot and its corners; then the top, over them.
   * Outer rings run counter-clockwise and holes clockwise, so the material is
   * always on the left of an edge and its face looks to the right.
   */
  function drawSlab(P, L, z0, z1, cls) {
    var C = P.C, c = cls ? " " + cls : "", walls = [];
    L.rings.forEach(function (r) {
      var n = r.length, vis = [], nrm = [];
      for (var i = 0; i < n; i++) {
        var a = r[i], b = r[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
        nrm.push([dy / len, -dx / len]);
        vis.push((dy / len) * C.s + (-dx / len) * C.c > 0.001);
      }
      for (i = 0; i < n; i++) {
        if (!vis[i]) continue;
        var p = r[i], q = r[(i + 1) % n], prev = (i + n - 1) % n, next = (i + 1) % n;
        var quad = [project(C, p[0], p[1], z0), project(C, q[0], q[1], z0), project(C, q[0], q[1], z1), project(C, p[0], p[1], z1)];
        var lines = seg(quad[0], quad[1]);
        // a corner line where the wall turns sharply, or where it meets a wall facing away (a silhouette)
        var turnIn = nrm[prev][0] * nrm[i][0] + nrm[prev][1] * nrm[i][1], turnOut = nrm[i][0] * nrm[next][0] + nrm[i][1] * nrm[next][1];
        if (!vis[prev] || turnIn < 0.82) lines += seg(quad[0], quad[3]);
        if (!vis[next] || turnOut < 0.82) lines += seg(quad[1], quad[2]);
        walls.push({ k: ((p[0] + q[0]) / 2) * C.s + ((p[1] + q[1]) / 2) * C.c, quad: quad, lines: lines });
      }
    });
    walls.sort(function (a, b) { return a.k - b.k; });
    walls.forEach(function (w) { P.add(1, 0, [[poly(w.quad), "fo" + c], [w.lines, "sil" + c]]); });
    var top = "";
    L.rings.forEach(function (r) { top += poly(r.map(function (q) { return project(C, q[0], q[1], z1); })); });
    P.add(1, 0, [[top, "sil top" + c]]);
  }

  /* ---- the rooms: dimensions in letter units, props in their own frame (front +y, back to the wall) ---- */

  var WORD = { BH: 3.6, RH: 13, MH: 2.4, CH: 4.4, WT: 0.9, PS: 1.9, PIECE: 2.6, RAIL: 3 };
  // footprint radius and height of each prop, before PS
  var PROPS = {
    desk: { r: 2.3, h: 3.1, big: true }, sofa: { r: 2, h: 1.8, big: true }, shelf: { r: 1.7, h: 3.4, big: true },
    arcade: { r: 1.3, h: 3.5 }, drawers: { r: 1.05, h: 2.5 }, speaker: { r: 1.05, h: 2.8 },
    plant: { r: 1.05, h: 3.4 }, lamp: { r: 0.85, h: 3.7 },
  };
  var PROP_KINDS = Object.keys(PROPS);

  /** One piece of furniture. lit: its lamp and its screens are on. */
  function drawProp(P, kind, x, y, z, yaw, s, lit) {
    var m = new Model(P, xf(x, y, z, yaw, 0, 0, s), ""), C = P.C, front = m.sees(0, 1, 0), glow = lit ? "acc" : "mid";
    function ring(axis, c, r, n) { var q = rCirc(axis, c, r, r, n); return q.concat([q[0]]); }
    if (kind === "desk") {
      var table = function () {
        [[-1.5, -1.25], [1.5, -1.25], [-1.5, -0.15], [1.5, -0.15]].forEach(function (q) { m.line([[q[0], q[1], 0], [q[0], q[1], 1.5]], ""); });
        m.solid(boxR(-1.7, 1.7, -1.4, 0, 1.5, 1.72));
        m.solid(boxR(-0.25, 0.25, -1.15, -0.95, 1.72, 2.05));
        m.solid(boxR(-1.05, 1.05, -1.2, -1.02, 2.05, 3.05));
        if (front) m.flat([[-0.92, -1.01, 2.16], [0.92, -1.01, 2.16], [0.92, -1.01, 2.94], [-0.92, -1.01, 2.94]], glow);
        m.flat([[-0.7, -0.75, 1.73], [0.7, -0.75, 1.73], [0.7, -0.35, 1.73], [-0.7, -0.35, 1.73]], "");
      };
      var chair = function () {
        m.line([[0, 0.95, 0], [0, 0.95, 0.85]], "");
        m.solid(boxR(-0.6, 0.6, 0.4, 1.5, 0.85, 1.05));
        m.solid(boxR(-0.6, 0.6, 1.35, 1.5, 1.05, 2.25));
      };
      if (front) { table(); chair(); } else { chair(); table(); }
    } else if (kind === "sofa") {
      var back = function () { m.solid(boxR(-1.8, 1.8, -0.8, -0.4, 0, 1.8)); };
      var seat = function () {
        m.solid(boxR(-1.5, 1.5, -0.4, 0.8, 0, 0.8));
        [-1, 1].forEach(function (sx) { m.solid(boxR(sx > 0 ? 1.5 : -1.8, sx > 0 ? 1.8 : -1.5, -0.4, 0.8, 0, 1.25)); });
        m.line([[0, -0.4, 0.81], [0, 0.8, 0.81]], "lo");
      };
      if (front) { back(); seat(); } else { seat(); back(); }
    } else if (kind === "shelf") {
      m.solid(boxR(-1.6, 1.6, -0.5, 0.5, 0, 3.4));
      if (front) {
        var d = "";
        [0.05, 1.15, 2.3, 3.35].forEach(function (zz) { var a = m.w([-1.5, 0.51, zz]), b = m.w([1.5, 0.51, zz]); d += seg(project(C, a[0], a[1], a[2]), project(C, b[0], b[1], b[2])); });
        // books: spines of uneven height on the two upper shelves
        [[1.15, 0.9], [2.3, 0.85]].forEach(function (row, ri) {
          for (var k = 0; k < 9; k++) {
            var bx = -1.35 + k * 0.24 + (k > 5 ? 0.5 : 0), bh = row[1] * (0.7 + 0.3 * ((k * 7 + ri * 3) % 5) / 4);
            var a = m.w([bx, 0.51, row[0]]), b = m.w([bx, 0.51, row[0] + bh]);
            d += seg(project(C, a[0], a[1], a[2]), project(C, b[0], b[1], b[2]));
          }
        });
        P.raw(d, "ln lo", 1);
      }
    } else if (kind === "arcade") {
      m.solid(extrudeX([[-0.75, 0], [0.75, 0], [0.75, 1.5], [1, 1.75], [0.75, 3.5], [-0.75, 3.5]], -0.85, 0.85));
      if (front) {
        // the screen on the slanted face, the stick and two buttons on the panel
        var sc = function (u, x) { return [x, 1 - 0.25 * u, 1.75 + 1.75 * u]; };
        m.flat([sc(0.25, -0.6), sc(0.25, 0.6), sc(0.8, 0.6), sc(0.8, -0.6)], glow);
        m.line([[-0.35, 0.88, 1.63], [-0.35, 0.95, 1.95]], "");
        m.light([-0.35, 0.95, 1.98], 0.11 * s, "m");
        [0.2, 0.5].forEach(function (bx) { m.dot([bx, 0.9, 1.66], 0.09 * s, lit ? "acc" : "m"); });
      }
    } else if (kind === "drawers") {
      m.solid(boxR(-0.85, 0.85, -0.6, 0.6, 0, 2.2));
      if (front) [0.75, 1.5].forEach(function (zz) { m.line([[-0.85, 0.61, zz], [0.85, 0.61, zz]], "lo"); });
      if (front) [0.38, 1.12, 1.85].forEach(function (zz) { m.line([[-0.25, 0.61, zz], [0.25, 0.61, zz]], ""); });
      // a record player on top, the record turning
      var tp = m.w([0, 0, 2.2]);
      P.cyl(tp[0], tp[1], tp[2], 0.62 * s, 0.12 * s, {});
      P.dot(tp[0], tp[1], tp[2] + 0.13 * s, 0.18 * s, { cls: lit ? "acc" : "m", layer: 1 });
    } else if (kind === "speaker") {
      m.solid(boxR(-0.75, 0.75, -0.6, 0.6, 0, 2.8));
      if (front) {
        m.line(ring("y", [0, 0.61, 0.95], 0.52, 18), "");
        m.line(ring("y", [0, 0.61, 0.95], 0.2, 12), "lo");
        m.line(ring("y", [0, 0.61, 2.15], 0.26, 12), "");
      }
    } else if (kind === "plant") {
      m.solid([rCirc("z", [0, 0, 0], 0.5, 0.5, 14), rCirc("z", [0, 0, 1.2], 0.72, 0.72, 14)]);
      var balls = [[0, 0, 2.2, 0.85], [-0.45, 0.2, 2.9, 0.6], [0.4, -0.25, 3.0, 0.55]].map(function (q) { var w = m.w(q); return [w[0], w[1], w[2], q[3]]; });
      balls.sort(function (a, b) { return P.key(a[0], a[1], a[2]) - P.key(b[0], b[1], b[2]); });
      balls.forEach(function (q) { P.sphere(q[0], q[1], q[2], q[3] * s, {}); });
    } else {
      // a floor lamp: base, pole, the bulb under its shade
      var bp = m.w([0, 0, 0]);
      P.cyl(bp[0], bp[1], bp[2], 0.55 * s, 0.12 * s, {});
      m.line([[0, 0, 0.12], [0, 0, 3.0]], "");
      m.light([0, 0, 2.95], 0.2 * s, lit ? "acc" : "m");
      m.solid([rCirc("z", [0, 0, 3.0], 0.75, 0.75, 16), rCirc("z", [0, 0, 3.7], 0.38, 0.38, 16)], "", { crease: 0.4 });
    }
  }

  /** A ring's walls, worked out once: edges, outward normals, the inner line mitred WT into the material. */
  function wallRing(r, hole) {
    var n = r.length, E = [], WT = WORD.WT;
    for (var i = 0; i < n; i++) {
      var a = r[i], b = r[(i + 1) % n], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
      E.push({ a: a, b: b, n: [dy / len, -dx / len], len: len });
    }
    // where two inner lines meet: mitred, except at a sharp outside corner, cut square (no spike)
    var ia = [], ib = [];
    r.forEach(function (p, i) {
      var h = (i + n - 1) % n, n0 = E[h].n, n1 = E[i].n, dot = n0[0] * n1[0] + n0[1] * n1[1];
      if (dot < -0.35 && n0[0] * n1[1] - n0[1] * n1[0] > 0) {
        ib[h] = [p[0] - n0[0] * WT, p[1] - n0[1] * WT];
        ia[i] = [p[0] - n1[0] * WT, p[1] - n1[1] * WT];
      } else {
        var f = Math.min(WT / Math.max(1 + dot, 0.05), WT * 3);
        ib[h] = ia[i] = [p[0] - (n0[0] + n1[0]) * f, p[1] - (n0[1] + n1[1]) * f];
      }
    });
    var soft = r.map(function (p, i) { var n0 = E[(i + n - 1) % n].n, n1 = E[i].n; return n0[0] * n1[0] + n0[1] * n1[1] > 0.8; });
    return { E: E, ia: ia, ib: ib, soft: soft, hole: hole };
  }

  /** The walls of one ring, cut in short pieces, at the camera's angle: tall at the back, gone at the front. */
  function wallPieces(C, W, zb, out) {
    var RH = WORD.RH, E = W.E, n = E.length;
    var tall = function (nx, ny) { if (W.hole) return WORD.RAIL; var l = Math.hypot(nx, ny) || 1; return RH * ss(0, 0.35, -(nx * C.s + ny * C.c) / l); };
    for (var i = 0; i < n; i++) {
      var e = E[i], j = (i + 1) % n, pn = E[(i + n - 1) % n].n, nn = E[j].n;
      var hA = W.soft[i] ? tall(pn[0] + e.n[0], pn[1] + e.n[1]) : tall(e.n[0], e.n[1]);
      var hB = W.soft[j] ? tall(e.n[0] + nn[0], e.n[1] + nn[1]) : tall(e.n[0], e.n[1]);
      if (hA < 0.08 && hB < 0.08) continue;
      var m = Math.max(1, Math.ceil(e.len / WORD.PIECE)), ia = W.ia[i], ib = W.ib[i];
      for (var k = 0; k < m; k++) {
        var t0 = k / m, t1 = (k + 1) / m;
        var A = lerp2(e.a, e.b, t0), B = lerp2(e.a, e.b, t1), Ai = lerp2(ia, ib, t0), Bi = lerp2(ia, ib, t1);
        var h0 = hA + (hB - hA) * t0, h1 = hA + (hB - hA) * t1;
        if (h0 < 0.08 && h1 < 0.08) continue;
        var c0 = lerp2(A, Ai, 0.5), c1 = lerp2(B, Bi, 0.5), nv = e.n[0] * C.s + e.n[1] * C.c;
        out.push({ w: 1, A: A, B: B, Ai: Ai, Bi: Bi, h0: h0, h1: h1, c0: c0, c1: c1, n: e.n, eye: Math.abs(nv) < 0.04 ? 0 : nv > 0 ? 1 : -1,
          rail: W.hole, win: !W.hole && m >= 4 && k % 3 === 1 && k < m - 1 && Math.min(h0, h1) > RH * 0.9, end0: k === 0 && !W.soft[i], end1: k === m - 1 && !W.soft[j], zb: zb,
          k: ekey(C, (c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2, 0), pts: [A, B, Ai, Bi], top: Math.max(h0, h1) });
      }
    }
  }
  function lerp2(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]; }

  /** One wall piece: its inner face, its top, its ends where it stops. Around an atrium, a railing instead. */
  function drawWall(P, w, cls) {
    var C = P.C, z = w.zb, c = cls ? " " + cls : "";
    if (w.rail) {
      var p0 = project(C, w.c0[0], w.c0[1], z), p1 = project(C, w.c1[0], w.c1[1], z), q0 = project(C, w.c0[0], w.c0[1], z + w.h0), q1 = project(C, w.c1[0], w.c1[1], z + w.h1);
      P.add(1, 0, [[seg(q0, q1), "sil" + c], [seg(p0, q0), "ln lo"]]);
      return;
    }
    var ai = project(C, w.Ai[0], w.Ai[1], z), bi = project(C, w.Bi[0], w.Bi[1], z);
    var at = project(C, w.Ai[0], w.Ai[1], z + w.h0), bt = project(C, w.Bi[0], w.Bi[1], z + w.h1);
    var ao = project(C, w.A[0], w.A[1], z + w.h0), bo = project(C, w.B[0], w.B[1], z + w.h1);
    var lines = seg(at, bt) + seg(ao, bo), paths = [[poly([ai, bi, bt, at]), "fo"], [poly([at, bt, bo, ao]), "fo"]];
    // where a wall stops, its cut end shows: a narrow face, both edges drawn
    [[w.end0, w.A, ai, at, ao, w.h0], [w.end1, w.B, bi, bt, bo, w.h1]].forEach(function (q) {
      if (!q[0]) return;
      var o0 = project(C, q[1][0], q[1][1], z);
      paths.push([poly([q[2], o0, q[4], q[3]]), "fo"]);
      lines += seg(q[2], q[3]) + seg(q[3], q[4]) + seg(q[4], o0);
    });
    paths.push([lines, "sil" + c], [seg(ai, bi), "ed"]);
    // a window in a long stretch of full-height wall
    if (w.win) {
      var u0 = 0.18, u1 = 0.82, zl = z + WORD.RH * 0.36, zh = z + WORD.RH * 0.78;
      var p0 = lerp2(w.Ai, w.Bi, u0), p1 = lerp2(w.Ai, w.Bi, u1);
      var wq = [project(C, p0[0], p0[1], zl), project(C, p1[0], p1[1], zl), project(C, p1[0], p1[1], zh), project(C, p0[0], p0[1], zh)];
      paths.push([poly(wq), "ed"], [seg(lerp2(wq[0], wq[3], 0.55), lerp2(wq[1], wq[2], 0.55)), "ln lo"]);
    }
    P.add(1, 0, paths);
  }

  /* ---- painting a room: who hides whom, piece by piece ---- */

  /** >0 when p is on the eye's side of wall w's line. */
  function eyeSide(w, p) { return ((p[0] - w.c0[0]) * w.n[0] + (p[1] - w.c0[1]) * w.n[1]) * w.eye; }
  function wallBehindWall(a, b) {
    if (b.eye) { var s0 = eyeSide(b, a.c0), s1 = eyeSide(b, a.c1); if (s0 <= 0.05 && s1 <= 0.05) return true; if (s0 >= -0.05 && s1 >= -0.05) return false; }
    if (a.eye) { var t0 = eyeSide(a, b.c0), t1 = eyeSide(a, b.c1); if (t0 >= -0.05 && t1 >= -0.05) return true; if (t0 <= 0.05 && t1 <= 0.05) return false; }
    return a.k < b.k;
  }
  /** Whether a round thing (a prop, a post) stands behind wall w. */
  function roundBehindWall(C, o, w) {
    if (w.eye) { var s = eyeSide(w, [o.x, o.y]); if (s >= o.r * 0.9) return false; if (s <= -o.r * 0.9) return true; }
    var u = Math.max(0, Math.min(1, ((o.x - w.c0[0]) * (w.c1[0] - w.c0[0]) + (o.y - w.c0[1]) * (w.c1[1] - w.c0[1])) / (Math.pow(w.c1[0] - w.c0[0], 2) + Math.pow(w.c1[1] - w.c0[1], 2) || 1)));
    var q = lerp2(w.c0, w.c1, u);
    return ekey(C, o.x, o.y, 0) < ekey(C, q[0], q[1], 0);
  }
  function behind(C, a, b) {
    if (a.w && b.w) return wallBehindWall(a, b);
    if (b.w) return roundBehindWall(C, a, b);
    if (a.w) return !roundBehindWall(C, b, a);
    return a.k < b.k;
  }
  /** Screen box of an item, for the overlap test. */
  function screenBox(C, it) {
    var pts = it.w ? it.pts : [[it.x - it.r, it.y - it.r], [it.x + it.r, it.y - it.r], [it.x + it.r, it.y + it.r], [it.x - it.r, it.y + it.r]];
    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, h = it.w ? it.top : it.h;
    pts.forEach(function (p) {
      [0, h].forEach(function (dz) { var q = project(C, p[0], p[1], it.zb + dz); x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
    });
    return [x0, y0, x1, y1];
  }
  /** Back to front, as a depth-first walk: before an item, everything behind it that it overlaps on screen. */
  function paintOrder(C, items) {
    items.sort(function (a, b) { return a.k - b.k; });
    var n = items.length, state = new Array(n), out = [], bb = items.map(function (it) { return screenBox(C, it); });
    function visit(i) {
      state[i] = 1;
      for (var j = 0; j < n; j++) {
        if (state[j] || bb[j][2] <= bb[i][0] || bb[j][0] >= bb[i][2] || bb[j][3] <= bb[i][1] || bb[j][1] >= bb[i][3]) continue;
        if (behind(C, items[j], items[i])) visit(j);
      }
      state[i] = 2;
      out.push(items[i]);
    }
    for (var i = 0; i < n; i++) if (!state[i]) visit(i);
    return out;
  }

  /** Furniture for one floor of a letter: spots well inside, the big pieces where there is room, backs to the nearest wall. */
  function furnish(L, R, az) {
    var b = boundsOf(L.rings[0]), placed = [], WT = WORD.WT, PS = WORD.PS, want = Math.max(1, Math.min(7, Math.round(L.area / 120)));
    var vs = Math.sin(rad(az)), vc = Math.cos(rad(az));
    // the nearest outside wall, preferring the walls at the back for the default camera
    function wallNear(p) {
      var best = null;
      L.walls[0].E.forEach(function (e) {
        var t = Math.max(0, Math.min(1, ((p[0] - e.a[0]) * (e.b[0] - e.a[0]) + (p[1] - e.a[1]) * (e.b[1] - e.a[1])) / (e.len * e.len)));
        var q = lerp2(e.a, e.b, t), d = Math.hypot(q[0] - p[0], q[1] - p[1]), front = e.n[0] * vs + e.n[1] * vc > 0, score = d + (front ? 14 : 0);
        if (!best || score < best.s) best = { s: score, q: q, d: d, n: e.n, front: front };
      });
      return best;
    }
    function fits(p, r) {
      return inLetter(p, L) && edgeDist(p, L) >= r + WT + 0.4 && !placed.some(function (o) { return Math.hypot(o.x - p[0], o.y - p[1]) < o.r + r + 0.6; });
    }
    for (var t = 0; t < 260 && placed.length < want; t++) {
      var p = [b[0] + R() * (b[2] - b[0]), b[1] + R() * (b[3] - b[1])];
      if (!inLetter(p, L)) continue;
      var wn = wallNear(p);
      if (!wn) continue;
      // a piece that would show its side to the default camera: only round things go there
      var side = Math.abs(wn.n[0] * vs + wn.n[1] * vc) < 0.3;
      var room = edgeDist(p, L) - WT - 0.4, kinds = PROP_KINDS.filter(function (k) { return PROPS[k].r * PS <= room && (!side || k === "plant" || k === "lamp"); });
      if (!kinds.length) continue;
      var bigs = kinds.filter(function (k) { return PROPS[k].big; }), pool = bigs.length && R() < 0.6 ? bigs : kinds;
      // not twice the same piece in a room while others fit
      var fresh = pool.filter(function (k) { return !placed.some(function (o) { return o.kind === k; }); });
      var kind = (fresh.length ? fresh : pool)[Math.floor(R() * (fresh.length ? fresh : pool).length)], r = PROPS[kind].r * PS;
      if (!fits(p, r)) continue;
      // its back to the wall, square to it; against the open front, it turns round to face out
      var dx = wn.front ? -wn.n[0] : wn.n[0], dy = wn.front ? -wn.n[1] : wn.n[1];
      if (!wn.front) {
        // slide it back against that wall when the way is clear
        var gap = (wn.q[0] - p[0]) * wn.n[0] + (wn.q[1] - p[1]) * wn.n[1] - (r + WT + 0.45);
        var back = [p[0] + wn.n[0] * gap, p[1] + wn.n[1] * gap];
        if (gap > 0 && fits(back, r)) p = back;
      }
      placed.push({ x: p[0], y: p[1], r: r, kind: kind, yaw: Math.atan2(dx, -dy), h: PROPS[kind].h * PS });
    }
    return placed;
  }

  /** Posts at the sharp outside corners: they carry the roof where both walls are cut away (only there, per frame). */
  function postsOf(L) {
    var W = L.walls[0], n = W.E.length, posts = [];
    for (var i = 0; i < n; i++) {
      var n0 = W.E[(i + n - 1) % n].n, n1 = W.E[i].n, convex = n0[0] * n1[1] - n0[1] * n1[0] > 0;
      if (!convex || n0[0] * n1[0] + n0[1] * n1[1] > 0.5) continue;
      var q = W.E[i].a, bx = -(n0[0] + n1[0]), by = -(n0[1] + n1[1]), l = Math.hypot(bx, by) || 1;
      var d = (WORD.WT + 0.8) / Math.max(Math.cos(Math.acos(clamp(n0[0] * n1[0] + n0[1] * n1[1], -1, 1)) / 2), 0.2);
      var pt = [q[0] + (bx / l) * d, q[1] + (by / l) * d];
      if (inLetter(pt, L) && edgeDist(pt, L) >= WORD.WT + 0.6) posts.push({ x: pt[0], y: pt[1], r: 0.75, n0: n0, n1: n1 });
    }
    return posts.length > 6 ? posts.filter(function (p, i) { return i % Math.ceil(posts.length / 6) === 0; }) : posts;
  }

  SCENES.word = {
    init: function (o, R) {
      var raw = (Array.isArray(o.shape) && o.shape.length ? o.shape : DEFAULT_SHAPE).slice(0, 400), all = [];
      raw.forEach(function (r) { if (Array.isArray(r)) all = all.concat(r.slice(0, 4000)); });
      var b0 = boundsOf(all.filter(function (q) { return Array.isArray(q) && isFinite(q[0]) && isFinite(q[1]); }));
      var eps = Math.max(1e-6, Math.hypot(b0[2] - b0[0], b0[3] - b0[1]) * 1e-4);
      var rings = raw.map(function (r) { return cleanRing(r, eps); }).filter(function (r) { return r.length > 2 && Math.abs(ringArea(r)) > eps * eps; });
      var letters = lettersOf(rings);
      if (!letters.length) letters = lettersOf(DEFAULT_SHAPE);
      // one scale for every input: the median letter's widest point gets the same room
      var radii = letters.map(innerRadius).filter(function (v) { return v > 0; }).sort(function (a, b) { return a - b; });
      var med = radii.length ? radii[Math.floor(radii.length / 2)] : 1, k = 6.4 / (med || 1), bb = [1e9, 1e9, -1e9, -1e9];
      letters.forEach(function (L) { boundsOf(L.rings[0], bb); });
      var mx = (bb[0] + bb[2]) / 2, my = (bb[1] + bb[3]) / 2;
      letters = letters.map(function (L) {
        return { rings: L.rings.map(function (r) { return cleanRing(r.map(function (q) { return [(q[0] - mx) * k, (q[1] - my) * k]; }), 0.05); }).filter(function (r) { return r.length > 2; }) };
      }).filter(function (L) {
        L.area = L.rings.reduce(function (s, r) { return s + ringArea(r); }, 0);
        return L.rings.length && L.rings[0].length > 2 && L.area > 6;
      });
      var levels = o.density > 0.5 ? 2 : 1, x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      letters.forEach(function (L) {
        var c = [0, 0];
        L.rings[0].forEach(function (q) { c[0] += q[0] / L.rings[0].length; c[1] += q[1] / L.rings[0].length; x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); });
        L.cx = c[0]; L.cy = c[1];
        L.walls = L.rings.map(function (r, i) { return wallRing(r, i > 0); });
        L.posts = postsOf(L);
        L.rooms = [];
        for (var lv = 0; lv < levels; lv++) L.rooms.push(furnish(L, R, o.azimuth));
      });
      var gap = 1.5 + clamp(+o.explode || 0, 0, 1) * 15, H = WORD.BH + levels * WORD.RH + (levels - 1) * WORD.MH + WORD.CH, top = H + gap * 1.8 * levels + 2;
      var fit = corners([x0, y0, x1, y1], 0).concat(corners([x0, y0, x1, y1], top));
      var plinths = letters.map(function (L) { return { rings: [L.rings[0]] }; });
      return { b: [x0, y0, x1, y1, top], fit: fit, letters: letters, plinths: plinths, levels: levels, gap: gap, c: 0, flat: true };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, Wd = WORD;
      st.c += x.dt;
      var auto = 0.1 + 0.4 * ss(0.15, 0.85, 0.5 - 0.5 * Math.cos(st.c * 0.5));
      var held = o.open >= 0, e = x.ease("e", held ? clamp(+o.open, 0, 1) : on ? 1 : auto, held ? 12 : on ? 3 : 1.4);
      // the letter at hand: walk down the pointer's line of sight from above the roofs;
      // the first letter it enters is the one in view (higher along the ray is nearer the eye)
      var hit = null;
      if (on) {
        for (var zz = Wd.BH + st.levels * (Wd.RH + Wd.MH) + Wd.CH + st.gap * 1.8 * st.levels; zz >= 0 && !hit; zz -= 1.2) {
          var w = ptrAt(x, zz);
          // a letter counts only below its own roof (as drawn last frame), not in the air above it
          st.letters.forEach(function (L) { if (!hit && zz <= (L.top || 0) && inLetter(w, L)) hit = L; });
        }
      }
      st.letters.forEach(function (L, li) {
        var pk = x.ease("pk" + li, L === hit ? 1 : 0, 4), lift = st.gap * (e + 0.8 * pk), lit = L === hit, cls = lit ? "acc" : "";
        P.begin(P.key(L.cx, L.cy, 0));
        drawSlab(P, st.plinths[li], 0, Wd.BH, "");
        var zb = Wd.BH;
        // the counters, marked on the ground floor as rugs
        L.rings.slice(1).forEach(function (h) { P.flat(h.map(function (q) { return [q[0], q[1], zb + 0.02]; }), { layer: 1 }); });
        for (var lv = 0; lv < st.levels; lv++) {
          var items = [];
          L.walls.forEach(function (W) { if (lv || !W.hole) wallPieces(C, W, zb, items); });
          L.posts.forEach(function (p) {
            if (p.n0[0] * C.s + p.n0[1] * C.c < 0.1 || p.n1[0] * C.s + p.n1[1] * C.c < 0.1) return;
            items.push({ x: p.x, y: p.y, r: p.r, h: Wd.RH, zb: zb, post: 1, k: ekey(C, p.x, p.y, 0) });
          });
          L.rooms[lv].forEach(function (p) { items.push({ x: p.x, y: p.y, r: p.r, h: p.h, zb: zb, prop: p, k: ekey(C, p.x, p.y, 0) }); });
          paintOrder(C, items).forEach(function (it) {
            if (it.w) drawWall(P, it, "");
            else if (it.post) P.box(it.x, it.y, it.zb, 1.3, 1.3, Wd.RH, { r: 0.25 });
            else drawProp(P, it.prop.kind, it.x, it.y, it.zb, it.prop.yaw, Wd.PS, lit);
          });
          zb += Wd.RH + lift;
          if (lv < st.levels - 1) { drawSlab(P, L, zb, zb + Wd.MH, cls); zb += Wd.MH; }
        }
        drawSlab(P, L, zb, zb + Wd.CH, cls);
        L.top = zb + Wd.CH;
        P.end();
      });
    },
  };

  /*
   * Keyboard: a 75 % mechanical keyboard, two knobs, a slider, its cable.
   * It types on its own; keys dip under the pointer, the one under it lights.
   * Keys are boxes on a grid of rows, so a row nearer the eye always paints
   * after a row further back, and inside a row the nearer end paints last.
   */
  var KB = { U: 1.9, Z: 2, H: 0.95, TRAVEL: 0.5 };
  // rows of [width in u, name]; a name of "" is a plain key
  var KB_ROWS = [
    [[1, "esc"]].concat(Array.apply(null, Array(15)).map(function () { return [1, ""]; })),
    Array.apply(null, Array(13)).map(function () { return [1, ""]; }).concat([[2, "back"], [1, ""]]),
    [[1.5, "tab"]].concat("QWERTYUIOP[]".split("").map(function (c) { return [1, c]; }), [[1.5, "\\"], [1, ""]]),
    [[1.75, "caps"]].concat("ASDFGHJKL;'".split("").map(function (c) { return [1, c]; }), [[2.25, "enter"], [1, ""]]),
    [[2.25, "shift"]].concat("ZXCVBNM,./".split("").map(function (c) { return [1, c]; }), [[1.75, "shift"], [1, "up"], [1, ""]]),
    [[1.25, ""], [1.25, ""], [1.25, ""], [6.25, " "], [1, ""], [1, ""], [1, ""], [1, "left"], [1, "down"], [1, "right"]],
  ];
  var KB_ACCENT = { esc: 1, up: 1, left: 1, down: 1, right: 1 };

  /** A keycap: a chamfered base, a smaller top set back a little, as one convex solid. */
  function keycap(k, z, cls, P) {
    var ch = 0.22, t = 0.24, x0 = k.x0, x1 = k.x1, y0 = k.y0, y1 = k.y1;
    var ring = function (a0, a1, b0, b1, zz, c) { return [[a0 + c, b0, zz], [a1 - c, b0, zz], [a1, b0 + c, zz], [a1, b1 - c, zz], [a1 - c, b1, zz], [a0 + c, b1, zz], [a0, b1 - c, zz], [a0, b0 + c, zz]]; };
    P.solid([ring(x0, x1, y0, y1, z, ch), ring(x0 + t, x1 - t, y0 + t + 0.06, y1 - t + 0.04, z + KB.H, ch * 0.7)], { cls: cls });
    if (k.home) P.line([[(x0 + x1) / 2 - 0.22, y1 - t - 0.2, z + KB.H + 0.01], [(x0 + x1) / 2 + 0.22, y1 - t - 0.2, z + KB.H + 0.01]], { cls: "lo", layer: 1 });
  }

  SCENES.keyboard = {
    init: function (o, R) {
      var U = KB.U, keys = [];
      KB_ROWS.forEach(function (row, j) {
        var x = 0, y = j * U + (j ? 0.45 : 0);
        row.forEach(function (q) {
          var w = q[0] * U;
          keys.push({ x0: x + 0.14, x1: x + w - 0.14, y0: y + 0.14, y1: y + U - 0.14, row: j, name: q[1], acc: !!KB_ACCENT[q[1]],
            home: q[1] === "F" || q[1] === "J", cx: x + w / 2, cy: y + U / 2, typed: /^[A-Z ]$/.test(q[1]) });
          x += w;
        });
      });
      var KX = 16 * U, KY = 6 * U + 0.45, M = 1.3, EXT = 6.2;
      var box = [-M, -M, KX + EXT, KY + M];
      // the frame holds the keyboard and the start of its cable; the rest runs off
      var fit = corners([box[0], box[1] - 1, box[2] + 4, box[3]], 0).concat(corners([box[0], box[1], box[2], box[3]], 4));
      return { b: [box[0], box[1], box[2] + 4, box[3], 4], fit: fit, keys: keys, KX: KX, KY: KY, box: box, R: R, c: 0, next: 0.4, presses: [], flat: true };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, C = P.C, on = x.ptr.on && o.interactive, Z = KB.Z;
      st.c += x.dt;
      // typing: a key every so often, a space now and then
      if (!x.reduced) {
        st.next -= x.dt;
        if (st.next <= 0) {
          var pool = st.keys.filter(function (k) { return k.typed; }), k = st.R() < 0.16 ? pool.filter(function (q) { return q.name === " "; })[0] : pool[Math.floor(st.R() * pool.length)];
          st.presses.push({ k: k, t: 0 });
          st.next = (0.34 - o.density * 0.24) * (0.6 + st.R() * 0.9);
        }
      }
      st.presses.forEach(function (p) { p.t += x.dt; });
      st.presses = st.presses.filter(function (p) { return p.t < 0.3; });
      st.keys.forEach(function (k) { k.tp = 0; });
      st.presses.forEach(function (p) { p.k.tp = Math.max(p.k.tp, p.t < 0.05 ? p.t / 0.05 : Math.max(0, 1 - (p.t - 0.05) / 0.22)); });
      // the pointer, read on the key tops
      var w = on ? unproject(C, x.ptr.sx, x.ptr.sy, Z + KB.H) : null, hit = null;
      if (w) st.keys.forEach(function (k) { if (w[0] >= k.x0 && w[0] <= k.x1 && w[1] >= k.y0 && w[1] <= k.y1) hit = k; });
      var b = st.box, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2, s = C.s >= 0 ? 1 : -1, cc = C.c >= 0 ? 1 : -1;
      P.begin(P.key(cx, cy, 0));

      // the cable: out of the right end, on the desk, off the frame
      var cable = function () {
        var pts = [];
        for (var i = 0; i <= 24; i++) {
          var t = i / 24;
          pts.push([b[2] + 1.6 + t * 34, 3 - 16 * t * t + Math.sin(t * 4) * 1.6, 0.9 - 0.55 * ss(0, 0.12, t)]);
        }
        // one smooth flat tube: the side that faces the eye in the shade, the top in full colour
        var hw = 0.3, hh = 0.25, side = "", L = [], Rr = [];
        pts.forEach(function (q, i) {
          var a = pts[Math.max(0, i - 1)], c = pts[Math.min(pts.length - 1, i + 1)], tx = c[0] - a[0], ty = c[1] - a[1], l = Math.hypot(tx, ty) || 1;
          L.push([q[0] - (ty / l) * hw, q[1] + (tx / l) * hw, q[2]]);
          Rr.push([q[0] + (ty / l) * hw, q[1] - (tx / l) * hw, q[2]]);
        });
        for (i = 0; i < pts.length - 1; i++) {
          var nx = L[i][0] - Rr[i][0], ny = L[i][1] - Rr[i][1], E = nx * C.s + ny * C.c > 0 ? L : Rr;
          side += poly([project(C, E[i][0], E[i][1], E[i][2] - hh), project(C, E[i + 1][0], E[i + 1][1], E[i + 1][2] - hh), project(C, E[i + 1][0], E[i + 1][1], E[i + 1][2] + hh), project(C, E[i][0], E[i][1], E[i][2] + hh)]);
        }
        P.box(b[2] + 0.7, 3, 0.45, 1.9, 1.1, 0.9, { r: 0.3 });
        var top = L.map(function (q) { return project(C, q[0], q[1], q[2] + hh); }).concat(Rr.slice().reverse().map(function (q) { return project(C, q[0], q[1], q[2] + hh); }));
        P.add(1, 0, [[side, "fo acc"], [poly(top), "sil acc top"]]);
      };
      // the right end: two knobs at the back, a slider at the front
      var side = function () {
        var items = [
          { y: 1.8, x: b[2] - 4.2, f: function () { knob(b[2] - 4.2, 1.8, 1.05, st.c * 0.6); } },
          { y: 1.8, x: b[2] - 1.9, f: function () { knob(b[2] - 1.9, 1.8, 0.9, -st.c * 0.9); } },
          { y: st.KY - 1.4, x: 0, f: function () {
            var x0 = st.KX + 0.9, x1 = b[2] - 1.1, y = st.KY - 1.4, hx = x0 + 1 + (x1 - x0 - 2) * (0.5 + 0.45 * Math.sin(st.c * 0.7));
            P.flat(rOct((x1 - x0) / 2, 0.55, Z + 0.01, 0.35).map(function (q) { return [q[0] + (x0 + x1) / 2, q[1] + y, q[2]]; }), { layer: 1 });
            P.box(hx, y, Z, 1.3, 0.75, 0.35, { r: 0.2 });
            var zz = Z + 0.36;
            P.line([[hx - 0.45, y - 0.22, zz], [hx + 0.45, y - 0.22, zz], [hx + 0.45, y + 0.22, zz], [hx - 0.45, y + 0.22, zz], [hx - 0.45, y - 0.22, zz]], { cls: "acc", layer: 1 });
          } },
        ];
        // back to front; the two knobs share a row, the nearer one last
        items.sort(function (p, q) { return (p.y - q.y) * cc || (p.x - q.x) * s; });
        items.forEach(function (it) { it.f(); });
      };
      function knob(kx, ky, r, a) {
        P.cyl(kx, ky, Z, r, 1.2, {});
        mullions(P, place(circ(r, 24), kx, ky, 0), Z + 0.15, Z + 1.05, 0.32);
        P.dot(kx, ky, Z + 1.21, r * 0.62, { ring: true, cls: "lo", layer: 1 });
        P.line([[kx + Math.cos(a) * r * 0.2, ky + Math.sin(a) * r * 0.2, Z + 1.21], [kx + Math.cos(a) * r * 0.78, ky + Math.sin(a) * r * 0.78, Z + 1.21]], { cls: "hi", layer: 1 });
      }

      if (s < 0) cable();
      // the case: a base, a frame on it, the plate the keys stand on
      P.box(cx, cy, 0, b[2] - b[0], b[3] - b[1], 0.9, { r: 1.8 });
      P.box(cx, cy, 0.9, b[2] - b[0] - 0.5, b[3] - b[1] - 0.5, Z - 0.9, { r: 1.6 });
      P.flat(rOct(st.KX / 2 + 0.35, st.KY / 2 + 0.35, Z + 0.01, 0.5).map(function (q) { return [q[0] + st.KX / 2, q[1] + st.KY / 2, q[2]]; }), { layer: 1 });
      if (s < 0) side();
      // keys: far rows first, and in a row, the far end first
      var order = st.keys.slice().sort(function (p, q) { return (p.row - q.row) * cc || (p.cx - q.cx) * s; });
      order.forEach(function (k) {
        var d = w ? Math.hypot(k.cx - w[0], k.cy - w[1]) : 1e9, dip = on ? 0.6 * falloff(d / 7) : 0;
        var press = x.ease("k" + k.cx.toFixed(1) + "," + k.row, Math.max(dip, k === hit ? 1 : 0, k.tp), 14);
        keycap(k, Z - KB.TRAVEL * press, k.acc || k === hit ? "acc" : k.tp ? "hi" : "", P);
      });
      if (s >= 0) { side(); cable(); }
      P.end();
    },
  };

  /* Relief: a word or a logo as a field of pillars. They breathe, and rise around the pointer. */
  SCENES.relief = {
    init: function (o) {
      var rows = (Array.isArray(o.grid) && o.grid.length ? o.grid : DEFAULTS.grid).map(String), w = 0;
      rows.forEach(function (r) { w = Math.max(w, r.length); });
      var CELL = 10, cells = [];
      for (var j = 0; j < rows.length; j++) for (var i = 0; i < w; i++) {
        var ch = rows[j].charAt(i), lvl = ch >= "1" && ch <= "9" ? +ch : 0;
        cells.push({ i: i, j: j, lvl: lvl, cx: (i + 0.5) * CELL, cy: (j + 0.5) * CELL, h0: (10 * lvl) / 9 });
      }
      return { b: [0, 0, w * CELL, rows.length * CELL, 10 + 24 + 4], cells: cells, CELL: CELL, c: 0 };
    },
    frame: function (x) {
      var st = x.st, P = x.pen, o = x.o, on = x.ptr.on && o.interactive, foot = st.CELL * 0.8;
      st.c += x.dt;
      plinth(P, st.b);
      var hiCell = null, bd = st.CELL * 0.7, hs = [], lit = [];
      st.cells.forEach(function (c, n) {
        if (!c.lvl) return;
        var rise = o.open >= 0 ? clamp(+o.open, 0, 1) : 1;
        var t = c.h0 * rise + 3 * rise * (0.5 + 0.5 * Math.sin(st.c * 1.6 - (c.i + c.j) * 0.35)) * (x.reduced ? 0 : 1);
        if (on) {
          var d = ptrDist(x, c.cx, c.cy, c.hc || c.h0);
          var up = 24 * falloff(d / 36);
          t += up;
          lit[n] = up > 12;
          if (d < bd) { bd = d; hiCell = c; }
        }
        hs[n] = c.hc = x.ease("p" + n, t, 9);
      });
      st.cells.forEach(function (c, n) {
        if (!c.lvl) { P.rect(c.cx, c.cy, 0.1, foot, foot, { key: -1e8 }); return; }
        var h = hs[n];
        P.begin(P.key(c.cx, c.cy, 0));
        P.box(c.cx, c.cy, 0, foot, foot, h, { r: 1.2, cls: lit[n] ? "acc" : "" });
        if (c === hiCell) for (var k = 0; k < 9; k++) {
          P.dot(c.cx + ((k % 3) - 1) * 1.8, c.cy + (Math.floor(k / 3) - 1) * 1.8, h + 0.05, 0.45, { cls: k === 4 ? "acc" : "m" });
        }
        P.end();
      });
    },
  };

  var DESCRIBE = {
    city: "a city of towers with traffic in its streets", supply: "a supply chain, from factory to warehouse to store",
    flight: "an airliner flying between two airports", delivery: "a drone delivering parcels to houses",
    port: "cranes unloading a container ship", line: "a production line with robots",
    product: "an exploded view of a product", steamer: "a dim sum steamer, its baskets lifting",
    cabinet: "a filing cabinet, a drawer open on its folders", lockers: "a bank of lockers, one door open",
    interface: "an app interface in layers", relief: "a word or a logo in relief", word: "a word cut open like a dollhouse, its rooms furnished", keyboard: "a mechanical keyboard typing on its own",
  };

  /* ================================================================
   * The figure
   * ============================================================== */

  function Isoline(root, opts) {
    if (!(this instanceof Isoline)) return new Isoline(root, opts);
    injectCss();
    this.root = root;
    this.o = {};
    for (var k in DEFAULTS) this.o[k] = DEFAULTS[k];
    this.onFps = opts && opts.onFps;
    if (opts) for (var j in opts) if (j !== "onFps" && opts[j] !== undefined && j in DEFAULTS) this.o[j] = opts[j];
    this.playing = true;
    this.t = 0;
    this.ptr = { on: false, x: 0, y: 0, nx: 0, ny: 0, sx: 0, sy: 0 };
    this.click = null;
    this.pool = [];
    this.tpool = [];
    this.fs = 3;
    this._raf = 0;
    this._vis = true;
    this._frames = 0;
    this._fpsT = 0;

    root.classList.add("il-root");
    root.setAttribute("role", "img");
    this._autoLabel = !root.getAttribute("aria-label");
    this.svg = mk("svg", { "aria-hidden": "true", preserveAspectRatio: "xMidYMid meet" }, root);
    // the floor: one path under everything, painted with a radial fade laid flat on the ground
    this.fid = "il-fade-" + ++UID;
    var defs = mk("defs", {}, this.svg);
    this.fgrad = mk("radialGradient", { id: this.fid, gradientUnits: "userSpaceOnUse" }, defs);
    this.fstops = FADE.map(function (f) { return mk("stop", { offset: f[0], style: "stop-color:var(--il-floor)" }, this.fgrad); }, this);
    // the floor runs wide: it is cut to the view box, so it never spills over the page around the scene
    var clip = mk("clipPath", { id: this.fid + "-clip" }, defs);
    this.fclip = mk("rect", {}, clip);
    this.flp = mk("path", { class: "gd", "clip-path": "url(#" + this.fid + "-clip)" }, this.svg);
    this.g = mk("g", {}, this.svg);
    this.tg = mk("g", {}, this.svg);
    this._rm = global.matchMedia ? global.matchMedia("(prefers-reduced-motion: reduce)") : null;
    this._bind();
    this._theme();
    this._init();
  }

  var UID = 0;
  // the floor's fade: offset along the radius, opacity
  var FADE = [[0, 0.95], [0.45, 0.55], [0.8, 0.15], [1, 0]];
  /** The fade's opacities for a floor strength (0.6 gives FADE as written). */
  function fadeAt(strength) { var k = clamp(+strength, 0, 1) / 0.6; return FADE.map(function (f) { return [f[0], r2(Math.min(1, f[1] * k))]; }); }
  /** A round step for the floor grid: 1, 2.5, 5 or 10 times a power of ten. */
  function niceStep(v) {
    var p = Math.pow(10, Math.floor(Math.log(v) / Math.LN10)), m = v / p;
    return (m < 1.6 ? 1 : m < 3.6 ? 2.5 : m < 7.5 ? 5 : 10) * p;
  }

  /**
   * The floor under the scene: grid lines or dots on the ground, wide enough
   * to run past the scene, with a radial fade that lies flat on the ground
   * (a circle seen at the camera's angle), so the floor melts into the page.
   */
  Isoline.prototype._floor = function (C) {
    var o = this.o, st = this.st, kind = o.floor === "grid" || o.floor === "dots" ? o.floor : "";
    if (!kind) { if (this.flp.getAttribute("d")) this.flp.removeAttribute("d"); this.fl = null; return; }
    var pts = st.fit || corners(st.b, 0), x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9, z = 1e9;
    pts.forEach(function (q) { x0 = Math.min(x0, q[0]); x1 = Math.max(x1, q[0]); y0 = Math.min(y0, q[1]); y1 = Math.max(y1, q[1]); z = Math.min(z, q[2] || 0); });
    var cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, span = Math.max(x1 - x0, y1 - y0), d = "";
    var base = niceStep(span / 14), mult = Math.pow(2, (clamp(+o.floorSpacing, 0, 1) - 0.5) * 2.6), H = span * (0.4 + 0.9 * clamp(+o.floorReach, 0, 1)), step = base * mult;
    var i0 = Math.ceil((cx - H) / step), i1 = Math.floor((cx + H) / step), j0 = Math.ceil((cy - H) / step), j1 = Math.floor((cy + H) / step), i, j;
    if (kind === "grid") {
      for (i = i0; i <= i1; i++) d += seg(project(C, i * step, cy - H, z), project(C, i * step, cy + H, z));
      for (j = j0; j <= j1; j++) d += seg(project(C, cx - H, j * step, z), project(C, cx + H, j * step, z));
    } else {
      // dots grow a little with the spacing, not as much: a wide grid of small dots, not of discs
      var r = base * 0.1 * Math.pow(mult, 0.3);
      for (i = i0; i <= i1; i++) for (j = j0; j <= j1; j++) {
        if (Math.hypot(i * step - cx, j * step - cy) < H) d += ellipse(project(C, i * step, j * step, z), r, r * C.k);
      }
    }
    var c = project(C, cx, cy, z);
    this.fl = { d: d, kind: kind, c: c, r: H, k: C.k };
    if (this.fstr !== o.floorStrength) {
      this.fstr = o.floorStrength;
      fadeAt(o.floorStrength).forEach(function (f, n) { this.fstops[n].setAttribute("stop-opacity", f[1]); }, this);
    }
    this.fgrad.setAttribute("cx", r2(c[0]));
    this.fgrad.setAttribute("cy", r2(c[1]));
    this.fgrad.setAttribute("r", r2(H));
    this.fgrad.setAttribute("gradientTransform", "translate(" + r2(c[0]) + " " + r2(c[1]) + ") scale(1 " + r2(C.k) + ") translate(" + r2(-c[0]) + " " + r2(-c[1]) + ")");
    this.flp.setAttribute("d", d);
    this.flp.setAttribute("style", kind === "grid" ? "fill:none;stroke:url(#" + this.fid + ")" : "stroke:none;fill:url(#" + this.fid + ")");
  };

  function mk(tag, attrs, parent) {
    var e = document.createElementNS(NS, tag);
    if (attrs) for (var k in attrs) e.setAttribute(k, String(attrs[k]));
    if (parent) parent.appendChild(e);
    return e;
  }

  Isoline.prototype._reduced = function () {
    return !!(this.o.respectReducedMotion && this._rm && this._rm.matches);
  };

  Isoline.prototype._theme = function () {
    var o = this.o, st = this.root.style;
    st.setProperty("--il-plate", o.plate);
    st.setProperty("--il-hi", o.hi);
    st.setProperty("--il-edge", o.edge);
    st.setProperty("--il-mid", o.mid);
    st.setProperty("--il-lo", o.lo);
    st.setProperty("--il-acc", o.accent);
    st.setProperty("--il-acc2", accShade(o));
    st.setProperty("--il-floor", o.floorColor || o.mid);
    st.setProperty("--il-sw", String(o.stroke));
    st.background = o.plate;
    this.root.classList.toggle("il-solid", o.solidAccent !== false);
  };

  /** A new scene state (scene, seed, density, product changed), then the frame. */
  Isoline.prototype._init = function () {
    var sc = SCENES[this.o.scene] || SCENES.city;
    this.scene = sc;
    if (this._autoLabel) this.root.setAttribute("aria-label", "Animated isometric illustration: " + (DESCRIBE[this.o.scene] || DESCRIBE.city));
    this.st = sc.init(this.o, rng(this.o.seed * 9973 + 1));
    this.eases = {};
    this._frameBox();
    // reduced motion shows a moment that reads well rather than the very first frame
    if (this._reduced()) this._advance(6, 0.05);
    this._wake(true);
  };

  /** The viewBox: the scene seen from every camera it can take, so nothing jumps. */
  Isoline.prototype._frameBox = function () {
    var o = this.o, b = this.st.b, a = 1e9, bb = -1e9, c = 1e9, d = -1e9;
    var azs = [], els = [o.elevation];
    if (o.spin) for (var s = 0; s < 360; s += 15) azs.push(o.azimuth + s);
    else azs.push(o.azimuth);
    if (o.parallax && o.interactive) { azs.push(o.azimuth - 8, o.azimuth + 8); els.push(o.elevation - 6, o.elevation + 6); }
    var pts = this.st.fit;
    if (!pts) {
      pts = [];
      var zs = [this.st.flat ? 0 : -3, b[4]];
      [[b[0] - 4, b[1] - 4], [b[2] + 4, b[1] - 4], [b[2] + 4, b[3] + 4], [b[0] - 4, b[3] + 4]].forEach(function (p) {
        zs.forEach(function (z) { pts.push([p[0], p[1], z]); });
      });
    }
    azs.forEach(function (az) {
      els.forEach(function (el) {
        var C = camera(az, el);
        pts.forEach(function (p) {
          var q = project(C, p[0], p[1], p[2]);
          a = Math.min(a, q[0]); bb = Math.max(bb, q[0]); c = Math.min(c, q[1]); d = Math.max(d, q[1]);
        });
      });
    });
    // the product's labels hang to the right of the stack
    var px = (bb - a) * 0.05, py = (d - c) * 0.05, extra = this.st.cols && o.labels ? (bb - a) * 0.55 : 0;
    this.vb = [a - px, c - py, bb - a + px * 2 + extra, d - c + py * 2];
    this.svg.setAttribute("viewBox", this.vb.map(r2).join(" "));
    ["x", "y", "width", "height"].forEach(function (k, i) { this.fclip.setAttribute(k, r2(this.vb[i])); }, this);
    // labels keep one size on screen, whatever the scene's extent
    this.fs = r2(Math.max(this.vb[2], this.vb[3] * 1.25) * 0.0125);
    this.tg.setAttribute("font-size", this.fs);
  };

  Isoline.prototype._ease = function (dt) {
    var self = this, snap = this._reduced();
    return function (key, target, rate) {
      var v = self.eases[key];
      v = v === undefined || snap ? target : v + (target - v) * (1 - Math.exp(-rate * dt));
      self.eases[key] = v;
      return v;
    };
  };

  /** Runs the scene forward without drawing (for the reduced-motion pose). */
  Isoline.prototype._advance = function (secs, step) {
    var C = camera(this.o.azimuth, this.o.elevation);
    for (var t = 0; t < secs; t += step) {
      this.scene.frame({ pen: new Pen(C), st: this.st, dt: step, ptr: this.ptr, o: this.o, ease: this._ease(step), click: null, reduced: true, fs: this.fs });
    }
  };

  Isoline.prototype._render = function (dt) {
    var o = this.o, reduced = this._reduced();
    var lx = o.parallax && o.interactive && !reduced ? this.ptr.nx : 0, ly = o.parallax && o.interactive && !reduced ? this.ptr.ny : 0;
    var ease = this._ease(dt);
    var az = o.azimuth + ease("_az", lx * 7, 3) + (o.spin && !reduced ? (this.t * 14) % 360 : 0);
    var el = o.elevation - ease("_el", ly * 5, 3);
    var C = (this.C = camera(az, el));
    if (this.ptr.on) {
      var w = unproject(C, this.ptr.sx, this.ptr.sy, 0);
      this.ptr.x = w[0]; this.ptr.y = w[1];
    }
    var pen = new Pen(C);
    this._floor(C);
    this.scene.frame({ pen: pen, st: this.st, dt: dt, ptr: this.ptr, o: o, ease: ease, click: this.click, reduced: reduced, fs: this.fs });
    this.click = null;

    pen.items.sort(function (p, q) { return p.l - q.l || p.g - q.g || p.k - q.k || p.n - q.n; });
    var idx = 0;
    for (var i = 0; i < pen.items.length; i++) {
      var ps = pen.items[i].p;
      for (var j = 0; j < ps.length; j++) if (ps[j][0]) this._path(idx++, ps[j][0], ps[j][1]);
    }
    for (var k = idx; k < this.pool.length; k++) this._path(k, "", "");
    for (i = 0; i < pen.texts.length || i < this.tpool.length; i++) this._text(i, pen.texts[i]);
  };

  Isoline.prototype._path = function (i, d, cls) {
    var p = this.pool[i];
    if (!p) { p = this.pool[i] = { el: mk("path", {}, this.g), d: null, c: null }; }
    if (p.d !== d) { p.d = d; if (d) p.el.setAttribute("d", d); else p.el.removeAttribute("d"); }
    if (p.c !== cls) { p.c = cls; p.el.setAttribute("class", cls); }
  };

  Isoline.prototype._text = function (i, t) {
    var p = this.tpool[i];
    if (!p) { p = this.tpool[i] = { el: mk("text", {}, this.tg), k: "" }; }
    var key = t ? r2(t.x) + "," + r2(t.y) + "," + t.s + "," + t.c + "," + t.a : "";
    if (p.k === key) return;
    p.k = key;
    if (!t) { p.el.textContent = ""; return; }
    p.el.setAttribute("x", r2(t.x));
    p.el.setAttribute("y", r2(t.y));
    p.el.setAttribute("text-anchor", t.a);
    p.el.setAttribute("class", t.c);
    p.el.textContent = t.s;
  };

  /** The loop runs while the figure is on screen and moving; reduced motion draws only on input. */
  Isoline.prototype._wake = function (force) {
    var self = this;
    if (this._dead) return;
    if (this._reduced() || !this.playing) { this._render(force ? 0 : 1 / 60); return; }
    if (this._raf || !this._vis) return;
    var last = performance.now();
    var frame = function (now) {
      var dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
      last = now;
      if (!self.playing || self._reduced() || !self._vis) { self._raf = 0; return; }
      self.t += dt * self.o.speed;
      self._render(dt * self.o.speed);
      self._fps(now);
      self._raf = requestAnimationFrame(frame);
    };
    this._raf = requestAnimationFrame(frame);
  };

  Isoline.prototype._fps = function (now) {
    if (!this.onFps) return;
    this._frames++;
    if (now - this._fpsT >= 500) {
      this.onFps(Math.round((this._frames * 1000) / (now - this._fpsT)));
      this._frames = 0; this._fpsT = now;
    }
  };

  Isoline.prototype._bind = function () {
    var self = this, root = this.root, tm = 0;
    var read = function (e) {
      var ctm = self.svg.getScreenCTM(), r = root.getBoundingClientRect();
      if (!ctm) return false;
      var pt = self.svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      var q = pt.matrixTransform(ctm.inverse());
      self.ptr.sx = q.x; self.ptr.sy = q.y;
      self.ptr.nx = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      self.ptr.ny = clamp(((e.clientY - r.top) / r.height) * 2 - 1, -1, 1);
      self.ptr.on = true;
      return true;
    };
    var still = function () { return self._reduced() || !self.playing; };
    this._move = function (e) { clearTimeout(tm); if (read(e) && still()) self._render(1 / 60); };
    this._down = function (e) {
      clearTimeout(tm);
      if (e.pointerType !== "mouse" && root.releasePointerCapture) root.releasePointerCapture(e.pointerId);
      if (!read(e)) return;
      // the ground point, and the screen point after it for scenes that test at a height
      self.click = unproject(self.C, self.ptr.sx, self.ptr.sy, 0).concat([self.ptr.sx, self.ptr.sy]);
      if (still()) self._render(1 / 60);
    };
    // a finger lifting holds the pose a moment, so a tap reads as a look rather than a flash
    this._leave = function (e) {
      clearTimeout(tm);
      tm = setTimeout(function () {
        self.ptr.on = false; self.ptr.nx = 0; self.ptr.ny = 0;
        if (still()) self._render(1 / 60);
      }, e.pointerType === "mouse" ? 0 : 1400);
    };
    this._clear = function () { clearTimeout(tm); };
    root.addEventListener("pointermove", this._move);
    root.addEventListener("pointerdown", this._down);
    root.addEventListener("pointerleave", this._leave);
    if ("IntersectionObserver" in global) {
      this._io = new IntersectionObserver(function (es) {
        self._vis = es[es.length - 1].isIntersecting;
        if (self._vis) self._wake();
      }, { rootMargin: "80px" });
      this._io.observe(root);
    }
    if (this._rm) {
      this._onRm = function () { self._wake(true); };
      this._rm.addEventListener("change", this._onRm);
    }
  };

  /* ---------- public ---------- */

  var REINIT = ["scene", "seed", "density", "product", "grid", "shape", "explode"];
  var REFRAME = ["azimuth", "elevation", "spin", "parallax", "interactive", "labels"];
  var THEME = ["plate", "hi", "edge", "mid", "lo", "accent", "stroke", "solidAccent", "floorColor"];

  Isoline.prototype.set = function (patch) {
    var re = false, fr = false, th = false;
    for (var k in patch) {
      if (!(k in DEFAULTS) || patch[k] === undefined) continue;
      if (this.o[k] === patch[k] || ((k === "grid" || k === "shape") && JSON.stringify(this.o[k]) === JSON.stringify(patch[k]))) continue;
      this.o[k] = patch[k];
      if (REINIT.indexOf(k) >= 0) re = true;
      if (REFRAME.indexOf(k) >= 0) fr = true;
      if (THEME.indexOf(k) >= 0) th = true;
    }
    if (th) this._theme();
    if (re) this._init();
    else { if (fr) this._frameBox(); this._wake(true); }
  };

  Isoline.prototype.play = function () { this.playing = true; this._wake(); };
  Isoline.prototype.pause = function () { this.playing = false; };

  /** The current frame as a standalone SVG, colours written on each element: it pastes into Figma as vectors. */
  Isoline.prototype.toSVG = function (width, opts) {
    var self = this, o = this.o, vb = this.vb, W = width || 1600, H = Math.round((W * vb[3]) / vb[2]), transparent = !!(opts && opts.transparent);
    var sw = r2(((o.stroke * vb[2]) / W) * 1.6);
    var has = function (c, n) { return (" " + c + " ").indexOf(" " + n + " ") >= 0; }, shade = accShade(o), solid = o.solidAccent !== false;
    var out = ['<svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="' + vb.map(r2).join(" ") + '">'];
    if (!transparent) out.push('<rect x="' + r2(vb[0]) + '" y="' + r2(vb[1]) + '" width="' + r2(vb[2]) + '" height="' + r2(vb[3]) + '" fill="' + o.plate + '"/>');
    var fl = this.fl;
    if (fl && fl.d) {
      var c = fl.c, gt = "translate(" + r2(c[0]) + " " + r2(c[1]) + ") scale(1 " + r2(fl.k) + ") translate(" + r2(-c[0]) + " " + r2(-c[1]) + ")";
      out.push('<defs><radialGradient id="fade" gradientUnits="userSpaceOnUse" cx="' + r2(c[0]) + '" cy="' + r2(c[1]) + '" r="' + r2(fl.r) + '" gradientTransform="' + gt + '">' +
        fadeAt(o.floorStrength).map(function (f) { return '<stop offset="' + f[0] + '" stop-color="' + (o.floorColor || o.mid) + '" stop-opacity="' + f[1] + '"/>'; }).join("") + "</radialGradient></defs>");
      out.push('<path d="' + fl.d + '" ' + (fl.kind === "grid" ? 'fill="none" stroke="url(#fade)" stroke-width="' + sw + '"' : 'fill="url(#fade)"') + "/>");
    }
    this.pool.forEach(function (p) {
      if (!p.d) return;
      var c = p.c, fill = o.plate, stroke = o.mid, extra = "";
      if (has(c, "sil") && has(c, "acc") && solid) { fill = has(c, "top") ? o.accent : shade; stroke = has(c, "tf") ? "none" : o.plate; }
      else if (has(c, "sil")) stroke = has(c, "tf") ? "none" : has(c, "acc") ? o.accent : has(c, "hi") ? o.hi : o.edge;
      else if (has(c, "ed")) { fill = "none"; stroke = has(c, "acc") ? (solid ? o.plate : o.accent) : has(c, "hi") ? o.edge : o.mid; if (has(c, "acc")) extra = ' stroke-opacity="' + (solid ? ".7" : ".55") + '"'; }
      else if (has(c, "fl")) { if (has(c, "acc") && solid) { fill = o.accent; stroke = o.plate; } else stroke = has(c, "acc") ? o.accent : has(c, "mid") ? o.mid : o.lo; }
      else if (has(c, "ln")) { fill = "none"; stroke = has(c, "acc") ? o.accent : has(c, "hi") || has(c, "win") ? o.hi : has(c, "lo") ? o.lo : o.mid; }
      else if (has(c, "dt")) { fill = has(c, "acc") ? o.accent : has(c, "lo") ? o.lo : has(c, "m") ? o.edge : o.hi; stroke = "none"; }
      else if (has(c, "rg")) { fill = "none"; stroke = has(c, "acc") ? o.accent : has(c, "lo") ? o.lo : o.edge; }
      else if (has(c, "sh")) { fill = o.lo; stroke = "none"; }
      else if (has(c, "pf")) { fill = "none"; stroke = o.lo; }
      else if (has(c, "fo")) { stroke = "none"; if (has(c, "acc") && solid) fill = shade; }
      if (has(c, "dash") || has(c, "flow")) extra = ' stroke-dasharray="' + r2(sw * 1.2) + " " + r2(sw * 3.6) + '"';
      if (has(c, "win")) extra = ' stroke-dasharray="' + r2(sw * 1.4) + " " + r2(sw * 2.6) + '"';
      var fade = /(?:^| )a([1-7])(?: |$)/.exec(c);
      if (fade) extra += ' opacity="' + +fade[1] / 8 + '"';
      out.push('<path d="' + p.d + '" fill="' + fill + '"' + (stroke === "none" ? "" : ' stroke="' + stroke + '" stroke-width="' + sw + '" stroke-linejoin="round" stroke-linecap="round"') + extra + "/>");
    });
    this.tpool.forEach(function (t) {
      if (!t.k) return;
      var el = t.el, c = el.getAttribute("class") || "";
      var fill = has(c, "acc") ? o.accent : has(c, "hi") ? o.hi : o.edge;
      out.push('<text x="' + el.getAttribute("x") + '" y="' + el.getAttribute("y") + '" text-anchor="' + el.getAttribute("text-anchor") + '" fill="' + fill + '" font-family="ui-monospace,Menlo,monospace" font-size="' + self.fs + '" letter-spacing=".2">' + String(el.textContent).toUpperCase().replace(/&/g, "&amp;").replace(/</g, "&lt;") + "</text>");
    });
    out.push("</svg>");
    return out.join("");
  };

  Isoline.prototype.destroy = function () {
    this._dead = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
    this._clear();
    this.root.removeEventListener("pointermove", this._move);
    this.root.removeEventListener("pointerdown", this._down);
    this.root.removeEventListener("pointerleave", this._leave);
    if (this._io) this._io.disconnect();
    if (this._rm && this._onRm) this._rm.removeEventListener("change", this._onRm);
    this.svg.remove();
    this.root.classList.remove("il-root");
  };

  /** The labels a scene shows, in the order `names` overrides them. */
  Isoline.labels = function (scene, product) {
    var name = function (l) { return l.n; };
    switch (scene) {
      case "supply": return ["Factory", "Warehouse", "Store"];
      case "flight": return ["CDG", "JFK"];
      case "delivery": return ["Depot"];
      case "port": return ["MV Isoline", "Yard"];
      case "line": return STATIONS.map(name);
      case "product": return (PRODUCTS[product] || PRODUCTS.phone).map(name);
      case "steamer": return STEAMER.map(name);
      case "cabinet": return DRAWERS.slice();
      case "lockers": return ["Locker"];
      case "interface": return ["Surface", "Navigation", "Content", "Cursor"];
      default: return (CUSTOM_LABELS[scene] || []).slice();
    }
  };
  Isoline.DEFAULTS = DEFAULTS;
  Isoline.SCENES = Object.keys(SCENES);

  /* ---------- your own scenes ---------- */

  var CUSTOM_LABELS = {};
  /**
   * Adds a scene, usable as { scene: name } like the built-in ones.
   * def.init(o, random) returns the scene's state, with at least
   * b: [x0, y0, x1, y1, top] (its extent, for framing) or fit: [[x, y, z], ...].
   * def.frame(x) draws one frame with x.pen. Optional: def.describe (for the
   * aria-label), def.labels (the texts `names` can override).
   */
  Isoline.defineScene = function (name, def) {
    if (!name || !def || typeof def.init !== "function" || typeof def.frame !== "function") {
      throw new Error("Isoline.defineScene(name, { init: function (o, random) {...}, frame: function (x) {...} })");
    }
    SCENES[name] = def;
    if (def.describe) DESCRIBE[name] = String(def.describe);
    if (Array.isArray(def.labels)) CUSTOM_LABELS[name] = def.labels.map(String);
    Isoline.SCENES = Object.keys(SCENES);
    return Isoline;
  };
  /** The engine's own pieces, for custom scenes: maths, solids, ready-made models. */
  Isoline.kit = {
    // maths
    project: project, unproject: unproject, key: ekey, falloff: falloff, clamp: clamp, lerp: lerp,
    smoothstep: ss, rad: rad, dist: dist, random: rng,
    // the pointer, tested at a height: where its line of sight crosses z, and how far it passes from something standing
    ptrAt: ptrAt, ptrDist: ptrDist,
    // solids as rings of points, and a local frame to draw a model in
    rect: rRect, box: boxR, octagon: rOct, ring: rCirc, extrudeX: extrudeX, extrudeY: extrudeY, extrudeZ: extrudeZ,
    beam: beamR, bar: bar3, cone: coneR, dome: domeR, cylinder: cylAx, frame: xf, Model: Model,
    // ready-made models and scenery
    car: drawCar, plane: drawPlane, drone: drawDrone, house: drawHouse, tree: drawTree, crate: drawCrate,
    container: drawContainer, furniture: drawProp, plinth: plinth, corners: corners,
  };
  // a <script> tag gives window.Isoline; a bundler or Node gets it as the module itself
  if (typeof module === "object" && module && module.exports) module.exports = Isoline;
  if (global) global.Isoline = Isoline;
})(typeof window !== "undefined" ? window : typeof globalThis !== "undefined" ? globalThis : this);
