import { deserializeOutfit } from "@/lib/storage/saved-look";

export type WardrobePersistenceOutcome =
  | "idle"
  | "saved"
  | "forgotten"
  | "save-error"
  | "forget-error";

export type WardrobePersistenceStatus = WardrobePersistenceOutcome | "unavailable";

/** Storage is authoritative, including reloads and changes from another tab. */
export function wardrobePersistence(
  raw: string | null | undefined,
  outcome: WardrobePersistenceOutcome = "idle",
) {
  const look = deserializeOutfit(raw ?? null);
  let status: WardrobePersistenceStatus;

  if (raw === undefined) status = "unavailable";
  else if (outcome === "save-error" || outcome === "forget-error") status = outcome;
  else if (look) status = "saved";
  else status = outcome === "idle" ? "idle" : "forgotten";

  return { look, status, copy: WARDROBE_PERSISTENCE_COPY[status] };
}

interface PersistenceCopy {
  caption: string;
  summary: string;
  announcement: string;
  frameNote: string;
  emptyFrame: string;
}

/** All persistence claims share the same current state, including the announcer. */
const WARDROBE_PERSISTENCE_COPY: Record<WardrobePersistenceStatus, PersistenceCopy> = {
  idle: {
    caption: "NO LOOK STORED",
    summary: "Nothing is stored in this browser.",
    announcement: "Nothing is stored in this browser.",
    frameNote: "SAVE A LOOK TO HANG IT HERE",
    emptyFrame: "NOTHING SAVED",
  },
  saved: {
    caption: "LOOK SAVED TO THIS BROWSER",
    summary: "A look is saved in this browser.",
    announcement: "Look saved to this browser.",
    frameNote: "ON THIS DEVICE ONLY",
    emptyFrame: "NOTHING SAVED",
  },
  forgotten: {
    caption: "LOOK FORGOTTEN",
    summary: "Nothing is stored in this browser.",
    announcement: "Look forgotten. Nothing is stored in this browser.",
    frameNote: "NOTHING STORED ON THIS DEVICE",
    emptyFrame: "NOTHING SAVED",
  },
  unavailable: {
    caption: "BROWSER STORAGE UNAVAILABLE",
    summary: "This browser cannot confirm a stored look.",
    announcement: "Browser storage is unavailable. Persistence cannot be confirmed.",
    frameNote: "STORAGE CANNOT BE READ",
    emptyFrame: "UNAVAILABLE",
  },
  "save-error": {
    caption: "THIS LOOK COULD NOT BE SAVED",
    summary: "This look could not be saved in this browser.",
    announcement: "This look could not be saved in this browser.",
    frameNote: "SAVE FAILED; FRAME UNCHANGED",
    emptyFrame: "NOTHING SAVED",
  },
  "forget-error": {
    caption: "THE LOOK COULD NOT BE FORGOTTEN",
    summary: "Browser storage could not be cleared.",
    announcement: "The look could not be forgotten. Browser storage could not be cleared.",
    frameNote: "REMOVAL FAILED; FRAME UNCHANGED",
    emptyFrame: "NOTHING SAVED",
  },
};
