import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

interface PhotoLightboxProps {
  isOpen: boolean;
  photoUrl: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  hasPrev?: boolean;
  hasNext?: boolean;
}

export default function PhotoLightbox({
  isOpen,
  photoUrl,
  onClose,
  onPrev,
  onNext,
  hasPrev,
  hasNext,
}: PhotoLightboxProps) {
  const [zoomed, setZoomed] = useState(false);
  const [transformOrigin, setTransformOrigin] = useState("50% 50%");

  const resetZoom = useCallback(() => setZoomed(false), []);

  useEffect(() => { resetZoom(); }, [photoUrl, resetZoom]);
  useEffect(() => { if (!isOpen) resetZoom(); }, [isOpen, resetZoom]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (zoomed) resetZoom(); else onClose();
      }
      if (e.key === "ArrowLeft" && onPrev && hasPrev) { resetZoom(); onPrev(); }
      if (e.key === "ArrowRight" && onNext && hasNext) { resetZoom(); onNext(); }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, zoomed, onClose, onPrev, onNext, hasPrev, hasNext, resetZoom]);

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    if (zoomed) {
      setZoomed(false);
    } else {
      setTransformOrigin(`${x}% ${y}%`);
      setZoomed(true);
    }
  };

  const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); resetZoom(); onPrev?.(); };
  const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); resetZoom(); onNext?.(); };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90"
          onClick={() => { if (zoomed) resetZoom(); else onClose(); }}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {hasPrev && onPrev && (
            <button onClick={handlePrev} className="absolute left-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {hasNext && onNext && (
            <button onClick={handleNext} className="absolute right-4 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors">
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          {/* Wrapper for enter/exit animation — does NOT use scale */}
          <motion.div
            key={photoUrl}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="relative overflow-hidden"
            style={{ maxWidth: "90vw", maxHeight: "90vh" }}
          >
            {/* Inner img handles zoom via its own transform — no conflict */}
            <img
              src={photoUrl}
              alt=""
              className={`max-w-[90vw] max-h-[90vh] object-contain rounded-lg select-none ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
              draggable={false}
              onContextMenu={(e) => e.preventDefault()}
              onClick={handleImageClick}
              style={{
                transform: zoomed ? "scale(2.5)" : "scale(1)",
                transformOrigin,
                transition: "transform 0.3s ease",
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
