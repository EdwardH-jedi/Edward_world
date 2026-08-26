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
      <AccessibleDialog title={project.displayName} onClose={onClose}>
        <p className="eyebrow">{project.category}</p>
        <p>{project.shortDescriptor}</p>
        <div className="dialog__links">
          <Link href={project.caseStudyUrl}>Case study placeholder</Link>
          {project.githubUrl ? (
            <a href={project.githubUrl} rel="noreferrer" target="_blank">
              GitHub
            </a>
          ) : null}
        </div>
      </AccessibleDialog>
    );
  }

  if (action.type === "TALK") {
    return (
      <AccessibleDialog title={action.speaker} onClose={onClose}>
        {action.lines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </AccessibleDialog>
    );
  }

  const title = action.type === "READ" ? action.heading : action.heading;
  const body = action.type === "READ" ? action.text : action.body;

  return (
    <AccessibleDialog title={title} onClose={onClose}>
      <p>{body}</p>
    </AccessibleDialog>
  );
}
