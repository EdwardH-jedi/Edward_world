"use client";

import { useEffect, useRef } from "react";
import type { ArtRoutine } from "@/lib/pixel/raster";
import { createRaster } from "@/lib/pixel/raster";

interface PixelCanvasProps {
  /** Size of the art in art pixels, before scaling. */
  artWidth: number;
  artHeight: number;
  /** CSS pixels per art pixel. */
  unit: number;
  /** Ambient frame counter, or a walk frame for characters. */
  frame: number;
  draw: ArtRoutine;
  /** Mirrors the art horizontally, used for a left-facing player. */
  flipX?: boolean;
  /**
   * Drop the inline pixel sizing and let CSS size the element instead. The
   * backing store still matches the art grid exactly; only presentation
   * changes, so scenes can cover a viewport without re-authoring the art.
   */
  fill?: boolean;
  className?: string;
}

/**
 * Renders one art routine onto a canvas sized to an exact multiple of the art
 * grid. Decorative by definition — the accessible names live on the DOM label
 * chips beside it, so every canvas here is hidden from assistive technology.
 */
export function PixelCanvas({
  artWidth,
  artHeight,
  unit,
  frame,
  draw,
  flipX = false,
  fill = false,
  className,
}: PixelCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const width = artWidth * unit;
  const height = artHeight * unit;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Assigning width or height resets the whole 2D context state, so the
    // smoothing flag has to be re-applied after any resize, every time.
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.imageSmoothingEnabled = false;
    context.clearRect(0, 0, width, height);
    context.save();
    if (flipX) {
      context.translate(width, 0);
      context.scale(-1, 1);
    }
    draw(createRaster(context, unit), frame);
    context.restore();
  }, [draw, flipX, frame, height, unit, width]);

  return (
    <canvas
      aria-hidden="true"
      className={className}
      ref={canvasRef}
      style={fill ? undefined : { height, width }}
    />
  );
}
