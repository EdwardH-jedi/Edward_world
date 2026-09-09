"use client";

import Link from "next/link";
import { getProjectById } from "@/data/projects";
import type { InteractionAction } from "@/types/world";
import { AccessibleDialog } from "@/components/ui/accessible-dialog";

interface InteractionDialogProps {
  action: InteractionAction;
  onClose: () => void;
}

export function InteractionDialog({ action, onClose }: InteractionDialogProps) {
  if (action.type === "OPEN_PROJECT") {
    const project = getProjectById(action.projectId);
    if (!project) return null;

    return (
      <AccessibleDialog className="world-dialog" title={project.displayName} onClose={onClose}>
        <p className="eyebrow">{project.category}</p>
        <p>{project.shortDescriptor}</p>
        <div className="dialog__links">
          <Link href={project.caseStudyUrl}>Project details</Link>
          {project.githubUrl ? (
            <a href={project.githubUrl} rel="noreferrer" target="_blank">
              GitHub
            </a>
          ) : null}
        </div>
      </AccessibleDialog>
    );
  }

  // Locations are opened as full experiences by the router, never as a dialog.
  if (action.type === "OPEN_LOCATION") return null;

  const title = action.heading;
  const body = action.type === "READ" ? action.text : action.body;

  return (
    <AccessibleDialog className="world-dialog" title={title} onClose={onClose}>
      <p>{body}</p>
    </AccessibleDialog>
  );
}
