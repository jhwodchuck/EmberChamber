"use client";

import NextImage from "next/image";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Full-screen image viewer. Web analog of the mobile pinch-zoom +
 * swipe-to-dismiss ImageViewerModal: wheel or click toggles/adjusts zoom, and
 * Esc / backdrop click dismisses. Rendered into a portal so it escapes the
 * scroll container.
 */
export function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      onClick={onClose}
      onWheel={(event) => {
        const next = zoom - Math.sign(event.deltaY) * 0.25;
        setZoom(Math.min(4, Math.max(1, Number(next.toFixed(2)))));
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0, 0, 0, 0.88)",
        backdropFilter: "blur(6px)",
        cursor: "zoom-out",
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close image viewer"
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          display: "inline-flex",
          height: "2.5rem",
          width: "2.5rem",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "var(--radius-full)",
          border: "1px solid rgba(255,255,255,0.18)",
          background: "rgba(0,0,0,0.4)",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
      <NextImage
        src={src}
        alt={alt}
        width={1600}
        height={1200}
        unoptimized
        onClick={(event) => {
          event.stopPropagation();
          setZoom((current) => (current > 1 ? 1 : 2));
        }}
        style={{
          width: "auto",
          height: "auto",
          maxWidth: "92vw",
          maxHeight: "88vh",
          objectFit: "contain",
          transform: `scale(${zoom})`,
          transition: "transform var(--dur-base) var(--ease-out)",
          cursor: zoom > 1 ? "zoom-out" : "zoom-in",
        }}
      />
    </div>,
    document.body,
  );
}
