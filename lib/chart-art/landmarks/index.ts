import type { Pen } from "@/lib/chart-art/ink";
import { drawAfl } from "@/lib/chart-art/landmarks/afl";
import { drawArcade } from "@/lib/chart-art/landmarks/arcade";
import { drawField } from "@/lib/chart-art/landmarks/field";
import { drawIncheon } from "@/lib/chart-art/landmarks/incheon";
import { drawJeju } from "@/lib/chart-art/landmarks/jeju";
import { drawShipyard } from "@/lib/chart-art/landmarks/shipyard";
import { drawSportsgang } from "@/lib/chart-art/landmarks/sportsgang";
import { drawSydney } from "@/lib/chart-art/landmarks/sydney";
import type { LandingId } from "@/types/chart";

/**
 * Each island's landmark, drawn about the island's centre with the context
 * already translated there. One routine per file, so replacing a drawing with
 * Edward's own art or a photograph is a one-file swap.
 */
export type Landmark = (g: Pen, t: number) => void;

export const LANDMARKS: Readonly<Record<LandingId, Landmark>> = {
  incheon: drawIncheon,
  jeju: drawJeju,
  field: drawField,
  shipyard: drawShipyard,
  sydney: drawSydney,
  sportsgang: drawSportsgang,
  afl: drawAfl,
  arcade: drawArcade,
};
