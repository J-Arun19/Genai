import React from "react";
import type { Kind } from "@/game/logic";

interface PromotionModalProps {
  isOpen: boolean;
  isWhite: boolean;
  onSelect: (piece: "q" | "r" | "b" | "n") => void;
  onCancel?: () => void;
}

const PIECE_GLYPHS: Record<string, { name: string; whiteGlyph: string; blackGlyph: string }> = {
  q: { name: "Queen", whiteGlyph: "♕", blackGlyph: "♛" },
  r: { name: "Rook", whiteGlyph: "♖", blackGlyph: "♜" },
  b: { name: "Bishop", whiteGlyph: "♗", blackGlyph: "♝" },
  n: { name: "Knight", whiteGlyph: "♘", blackGlyph: "♞" },
};

export const PromotionModal: React.FC<PromotionModalProps> = ({
  isOpen,
  isWhite,
  onSelect,
  onCancel,
}) => {
  if (!isOpen) return null;

  const choices: ("q" | "r" | "b" | "n")[] = ["q", "r", "b", "n"];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={onCancel}
    >
      <div
        className="relative max-w-sm w-full rounded-2xl border-2 border-primary/40 bg-card/95 p-6 shadow-2xl text-center space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-display text-2xl font-bold text-foreground">
          Pawn Promotion
        </h3>
        <p className="text-sm text-muted-foreground">
          Choose a piece to promote your pawn:
        </p>

        <div className="grid grid-cols-4 gap-3 pt-2">
          {choices.map((code) => {
            const item = PIECE_GLYPHS[code]!;
            const glyph = isWhite ? item.whiteGlyph : item.blackGlyph;
            return (
              <button
                key={code}
                onClick={() => onSelect(code)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border-2 border-border bg-secondary hover:border-primary hover:bg-primary/10 transition-all hover:scale-105 group"
              >
                <span className="text-4xl text-accent group-hover:scale-110 transition-transform">
                  {glyph}
                </span>
                <span className="mt-1 text-xs font-semibold text-muted-foreground group-hover:text-foreground">
                  {item.name}
                </span>
              </button>
            );
          })}
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancel move
          </button>
        )}
      </div>
    </div>
  );
};
