import { useEffect, useState, useCallback, useRef } from "react";
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
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const panStart = useRef({ x: 0, y: 0 });

  const resetZoom = useCallback(() => {
    setZoomed(false);
    setPan({ x: 0, y: 0 });
  }, []);

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
    if (isDragging.current) return;

    if (zoomed) {
      resetZoom();
    } else {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      setOrigin({ x, y });
      setPan({ x: 0, y: 0 });
      setZoomed(true);
    }
  };

  // Pan support when zoomed
  const handlePointerDown = (e: React.PointerEvent) => {
    if (!zoomed) return;
    isDragging.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY };
    panStart.current = { ...pan };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!zoomed) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      isDragging.current = true;
      setPan({ x: panStart.current.x + dx, y: panStart.current.y + dy });
    }
  };

  const handlePointerUp = () => {
    // isDragging stays true so click handler can check it, reset on next tick
    setTimeout(() => { isDragging.current = false; }, 0);
  };

  const handlePrev = (e: React.MouseEvent) => { e.stopPropagation(); resetZoom(); onPrev?.(); };
  const handleNext = (e: React.MouseEvent) => { e.stopPropagation(); resetZoom(); onNext?.(); };

  const SCALE = 2.5;

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

          <div
            className="relative"
            style={{
              maxWidth: "90vw",
              maxHeight: "90vh",
              overflow: zoomed ? "visible" : "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <motion.div
              key={photoUrl}
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              transition={{ duration: 0.2 }}
            >
              <img
                src={photoUrl}
                alt=""
                className={`max-w-[90vw] max-h-[90vh] object-contain rounded-lg select-none ${zoomed ? "cursor-grab active:cursor-grabbing" : "cursor-zoom-in"}`}
                draggable={false}
                onContextMenu={(e) => e.preventDefault()}
                onClick={handleImageClick}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                style={{
                  transform: zoomed
                    ? `scale(${SCALE}) translate(${pan.x / SCALE}px, ${pan.y / SCALE}px)`
                    : "scale(1)",
                  transformOrigin: `${origin.x}% ${origin.y}%`,
                  transition: isDragging.current ? "none" : "transform 0.3s ease",
                }}
              />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
