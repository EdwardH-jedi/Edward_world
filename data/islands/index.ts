import { afl } from "@/data/islands/afl";
import { arcadePier } from "@/data/islands/arcade";
import { field } from "@/data/islands/field";
import { incheon } from "@/data/islands/incheon";
import { jeju } from "@/data/islands/jeju";
import { shipyard } from "@/data/islands/shipyard";
import { sportsgang } from "@/data/islands/sportsgang";
import { sydney } from "@/data/islands/sydney";
import type { IslandPlan, LandingId } from "@/types/chart";

/** One harbour plan per landing. Adding a place is an edit to one of these files. */
export const ISLAND_PLANS: Readonly<Record<LandingId, IslandPlan>> = {
  incheon,
  jeju,
  field,
  shipyard,
  sydney,
  sportsgang,
  afl,
  arcade: arcadePier,
};
