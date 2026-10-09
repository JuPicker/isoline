/**
 * Isoline: small animated isometric scenes drawn in hairlines.
 * Type declarations for isoline.js (vanilla JS, no dependency).
 */

export type IsoScene =
  | "city"
  | "supply"
  | "flight"
  | "delivery"
  | "port"
  | "line"
  | "product"
  | "steamer"
  | "cabinet"
  | "lockers"
  | "keyboard"
  | "interface"
  | "relief"
  | "word";

export type IsoProduct = "phone" | "speaker" | "floppy" | "ps1";
export type IsoFloor = "none" | "grid" | "dots";

export interface IsoOptions {
  /** One of the built-in scenes, or the name you gave to Isoline.defineScene. */
  scene: IsoScene | (string & {});
  /** Exploded view: which object. */
  product: IsoProduct;
  /** Layout of the scenes drawn at random (city, supply, port, word furniture...). */
  seed: number;
  /** 0 to 1, read by each scene its own way (traffic, stacks, floors, typing speed...). */
  density: number;
  /** 0 to 1: how far exploded views, the steamer, the interface and cut words open. */
  explode: number;
  speed: number;

  /** Camera turn, -90 to 90 degrees. */
  azimuth: number;
  /** Camera tilt, 12 to 70 degrees. */
  elevation: number;
  /** Turntable: the camera turns around the scene. */
  spin: boolean;
  /** The camera leans a little towards the pointer. */
  parallax: boolean;
  /** The scene answers the pointer (hover, click). */
  interactive: boolean;
  labels: boolean;
  /** Your own label texts, in the order Isoline.labels(scene, product) lists them. */
  names: string[];

  /** Line width in px. */
  stroke: number;
  /** Ground colour (the background). */
  plate: string;
  /** Lit lines. */
  hi: string;
  /** Silhouettes. */
  edge: string;
  /** Creases. */
  mid: string;
  /** Back lines and details. */
  lo: string;
  /** What moves or answers the pointer. */
  accent: string;
  /** Accents as solid fills (shaded sides, full top); false draws them as lines. */
  solidAccent: boolean;

  /** A floor under the scene that fades out towards the edges. */
  floor: IsoFloor;
  /** 0 dense to 1 wide. */
  floorSpacing: number;
  /** How far it runs before it fades, 0 to 1. */
  floorReach: number;
  /** 0 faint to 1 strong. */
  floorStrength: number;
  /** Floor colour; empty uses `mid`. */
  floorColor: string;

  /** relief scene: one string per row, one digit per cell (0 empty, 1 to 9 the height). */
  grid: string[];
  /** word scene: letter outlines as rings of [x, y] points (y down), holes included; empty draws "OK". */
  shape: number[][][];

  /** Holds still on a readable pose when the visitor asks for reduced motion. */
  respectReducedMotion: boolean;
}

export interface IsoInstance {
  readonly o: IsoOptions;
  playing: boolean;
  /** Changes any options; the scene restarts only when its layout changes. */
  set(patch: Partial<IsoOptions>): void;
  play(): void;
  pause(): void;
  /** The current frame as a standalone SVG, colours written on each element (pastes into Figma as vectors). */
  toSVG(width?: number, opts?: { transparent?: boolean }): string;
  destroy(): void;
}

/* ---------- custom scenes ---------- */

export type Vec3 = [number, number, number];
export type Ring = Vec3[];

/** What a scene's frame draws with. Coordinates are world units: x, y on the ground, z up. */
export interface IsoPen {
  /** The camera: c, s (azimuth cosine and sine), k and zf (elevation). */
  readonly C: { c: number; s: number; k: number; zf: number };
  /** Opens a group: its parts paint in the order drawn, the group sorts by key. */
  begin(key: number, layer?: number): void;
  end(): void;
  /** Paint key of a point: larger is nearer the eye. Key things standing on the ground at their base. */
  key(x: number, y: number, z?: number): number;
  /** Forces the following loose items onto one key (paint in the order drawn); null releases it. */
  seq(key: number | null): void;
  box(cx: number, cy: number, z: number, w: number, d: number, h: number, o?: { r?: number; rot?: number; cls?: string; layer?: number; key?: number }): void;
  cyl(cx: number, cy: number, z: number, r: number, h: number, o?: { cls?: string; layer?: number; key?: number }): void;
  /** A convex solid from rings of points (see Isoline.kit for ring makers). */
  solid(rings: Ring[], o?: { cls?: string; layer?: number; key?: number; crease?: number }): void;
  flat(pts: Vec3[], o?: { cls?: string; layer?: number; key?: number }): void;
  rect(cx: number, cy: number, z: number, w: number, d: number, o?: { cls?: string; layer?: number; key?: number }): void;
  line(pts: Vec3[], o?: { cls?: string; layer?: number; key?: number }): void;
  dot(x: number, y: number, z: number, r: number, o?: { cls?: string; ring?: boolean; layer?: number; key?: number }): void;
  sphere(x: number, y: number, z: number, r: number, o?: { cls?: string; layer?: number; key?: number }): void;
  /** A small filled light, round from every side. */
  light(x: number, y: number, z: number, r: number, o?: { cls?: string; layer?: number; key?: number }): void;
  shadow(pts: Vec3[], o?: { key?: number }): void;
  text(x: number, y: number, z: number, str: string, o?: { cls?: string; anchor?: "start" | "middle" | "end"; dx?: number; dy?: number }): void;
  /** A label on a pin. */
  callout(x: number, y: number, z: number, str: string, o?: { cls?: string; h?: number }): void;
}

export interface IsoFrame<S = Record<string, unknown>> {
  pen: IsoPen;
  /** Your scene's state, as init returned it. */
  st: S;
  /** Seconds since the last frame, already scaled by `speed`. */
  dt: number;
  /** sx, sy: the pointer on screen; x, y: where it meets the ground; nx, ny: -1 to 1 across the view. */
  ptr: { on: boolean; sx: number; sy: number; x: number; y: number; nx: number; ny: number };
  o: IsoOptions;
  /** A value that eases towards target, remembered under key between frames. */
  ease(key: string, target: number, rate: number): number;
  /** The last click on the ground, [x, y, screenX, screenY], or null. */
  click: number[] | null;
  /** The visitor asked for reduced motion. */
  reduced: boolean;
  /** Label font size, in view units. */
  fs: number;
}

export interface IsoSceneDef<S = Record<string, unknown>> {
  /** Returns the scene's state, with b: [x0, y0, x1, y1, top] (its extent) or fit: [[x, y, z], ...] to frame the view. */
  init(o: IsoOptions, random: () => number): S & ({ b: number[] } | { fit: Vec3[] });
  frame(x: IsoFrame<S>): void;
  /** For the aria-label: "Animated isometric illustration: <describe>". */
  describe?: string;
  /** The texts `names` can override. */
  labels?: string[];
}

export interface IsolineStatic {
  new (root: HTMLElement, opts?: Partial<IsoOptions> & { onFps?: (fps: number) => void }): IsoInstance;
  (root: HTMLElement, opts?: Partial<IsoOptions> & { onFps?: (fps: number) => void }): IsoInstance;
  readonly DEFAULTS: IsoOptions;
  /** Every scene name, yours included. */
  readonly SCENES: string[];
  /** A scene's labels, in the order `names` replaces them. */
  labels(scene: string, product?: IsoProduct): string[];
  defineScene<S>(name: string, def: IsoSceneDef<S>): IsolineStatic;
  /** The engine's own pieces for custom scenes: maths, ring makers, ready-made models. See the README. */
  readonly kit: Record<string, (...args: never[]) => unknown>;
}

declare const Isoline: IsolineStatic;
export default Isoline;

declare global {
  interface Window {
    Isoline: IsolineStatic;
  }
}
