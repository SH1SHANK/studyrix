"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useRef } from "react";

interface DotPatternBackgroundProps {
  className?: string;
  dotColor?: string;
  dotSize?: number;
  dotSpacing?: number;
  opacity?: number;
}

export default function DotPatternBackground({
  className,
  dotColor = "#000",
  dotSize = 1.5,
  dotSpacing = 24,
  opacity = 0.15,
}: DotPatternBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;

    // Setup canvas
    const parent = canvas.parentElement;
    if (!parent) return;

    const rect = parent.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.scale(dpr, dpr);

    // Draw simple dot grid
    ctx.fillStyle = dotColor;
    ctx.globalAlpha = opacity;

    const padding = dotSpacing * 2;

    for (let x = -padding; x < width + padding; x += dotSpacing) {
      for (let y = -padding; y < height + padding; y += dotSpacing) {
        ctx.beginPath();
        ctx.arc(x, y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.globalAlpha = 1;

    // Handle resize
    const handleResize = () => {
      const newRect = parent.getBoundingClientRect();
      const newWidth = newRect.width;
      const newHeight = newRect.height;

      canvas.width = newWidth * dpr;
      canvas.height = newHeight * dpr;
      canvas.style.width = `${newWidth}px`;
      canvas.style.height = `${newHeight}px`;

      ctx.scale(dpr, dpr);
      ctx.fillStyle = dotColor;
      ctx.globalAlpha = opacity;

      for (let x = -padding; x < newWidth + padding; x += dotSpacing) {
        for (let y = -padding; y < newHeight + padding; y += dotSpacing) {
          ctx.beginPath();
          ctx.arc(x, y, dotSize, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      ctx.globalAlpha = 1;
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(parent);

    return () => {
      resizeObserver.disconnect();
    };
  }, [dotColor, dotSize, dotSpacing, opacity]);

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        "absolute inset-0 -z-10 h-full w-full pointer-events-none",
        className,
      )}
      aria-hidden="true"
    />
  );
}
