"use client";

import { useEffect, useState, type ComponentType } from "react";
import { createPortal } from "react-dom";

export type ContextMenuAction = {
  id: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  onSelect: () => void;
  danger?: boolean;
};

/**
 * Contextual message menu. Opens at a viewport coordinate (right-click or the
 * hover "⋯" button) over a dimmed backdrop, with a quick-reaction row above the
 * action list. Web analog of the mobile contextual long-press menu. Rendered in
 * a portal and clamped to the viewport.
 */
export function MessageContextMenu({
  x,
  y,
  emojis,
  onReact,
  actions,
  onClose,
}: {
  x: number;
  y: number;
  emojis: readonly string[];
  onReact: (emoji: string) => void;
  actions: ContextMenuAction[];
  onClose: () => void;
}) {
  const [position, setPosition] = useState({ left: x, top: y });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    // Clamp into the viewport once mounted so the card never overflows an edge.
    const margin = 12;
    const width = 220;
    const height = 80 + actions.length * 40;
    setPosition({
      left: Math.min(x, window.innerWidth - width - margin),
      top: Math.min(y, window.innerHeight - height - margin),
    });
  }, [x, y, actions.length]);

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div
      onClick={onClose}
      onContextMenu={(event) => {
        event.preventDefault();
        onClose();
      }}
      style={{ position: "fixed", inset: 0, zIndex: 90 }}
    >
      <div
        className="ec-fade-in"
        onClick={(event) => event.stopPropagation()}
        role="menu"
        style={{
          position: "fixed",
          left: position.left,
          top: position.top,
          minWidth: "13rem",
          borderRadius: "var(--radius-xl)",
          border: "1px solid var(--border)",
          background: "var(--bg-elevated)",
          boxShadow: "var(--shadow-soft)",
          backdropFilter: "blur(var(--blur-md))",
          overflow: "hidden",
        }}
      >
        {emojis.length > 0 ? (
        <div
          style={{
            display: "flex",
            gap: "0.25rem",
            padding: "0.5rem",
            borderBottom: "1px solid var(--border)",
          }}
        >
          {emojis.map((emoji) => (
            <button
              key={emoji}
              type="button"
              onClick={() => {
                onReact(emoji);
                onClose();
              }}
              aria-label={`React with ${emoji}`}
              style={{
                flex: 1,
                borderRadius: "var(--radius-md)",
                border: "none",
                background: "transparent",
                padding: "0.3rem 0",
                fontSize: "1.05rem",
                cursor: "pointer",
              }}
            >
              {emoji}
            </button>
          ))}
        </div>
        ) : null}
        <div style={{ padding: "0.35rem" }}>
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  action.onSelect();
                  onClose();
                }}
                style={{
                  display: "flex",
                  width: "100%",
                  alignItems: "center",
                  gap: "0.6rem",
                  borderRadius: "var(--radius-md)",
                  border: "none",
                  background: "transparent",
                  padding: "0.5rem 0.6rem",
                  textAlign: "left",
                  fontSize: "0.85rem",
                  color: action.danger
                    ? "var(--error-text)"
                    : "var(--text-primary)",
                  cursor: "pointer",
                }}
                onMouseEnter={(event) => {
                  event.currentTarget.style.background = "var(--surface-strong)";
                }}
                onMouseLeave={(event) => {
                  event.currentTarget.style.background = "transparent";
                }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {action.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}
