/**
 * The approved Edward's World palette.
 *
 * Restrained, aged, tactile: cream and paper for surfaces, dusty greens for
 * land, browns for structure, charcoal for signage, and a single warm orange
 * used sparingly as the only accent. Sourced from the concept board's design
 * system swatches — do not add saturated colours here without a design pass.
 */
export const palette = {
  cream: "#EFE7D3",
  paper: "#E6DCC4",
  sky: "#E9E0C8",
  sky2: "#DFD4B6",
  stone: "#C4BAA3",
  stone2: "#A29A83",
  stone3: "#7E7763",
  green: "#9AA478",
  green2: "#75825A",
  green3: "#5E6B4B",
  green4: "#3E4832",
  brown: "#A08466",
  brown2: "#7C6450",
  brown3: "#57473A",
  soil: "#6B5646",
  soilDark: "#5A4839",
  char: "#2B2823",
  ink: "#1E1B17",
  blue: "#93A8B0",
  blue2: "#6F8892",
  blue3: "#54707C",
  orange: "#C98A52",
  orange2: "#A96E3D",
  warm: "#F3E3B2",
  glow: "#F7F1E2",
  skin: "#D8B28A",
  smoke: "#CFC8B4",
  hair: "#26221D",
  hoodie: "#7B7669",
  denim: "#3A362F",
  dirt: "#8B7358",
  turf: "#8FA06B",
  farHill: "#BEB69C",
  midHill: "#A9A188",
  treeline: "#5A664C",
  crtShell: "#C9BC9C",
  // Edward's own colours. Kept as desaturated as the rest of the board: the
  // "navy" outerwear is a slate that reads cool against the cream sky and
  // dark against the grass, without introducing a saturated hue.
  navy: "#3B4756",
  navy2: "#2A323D",
  shirt: "#DCD5C0",
  hairLift: "#453D34",
  skinShade: "#BC946E",
} as const;

export type PaletteColor = (typeof palette)[keyof typeof palette];
