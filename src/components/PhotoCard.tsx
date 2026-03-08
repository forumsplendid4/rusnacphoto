import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PrintSize {
  id: string;
  name: string;
}

interface PhotoCardProps {
  photoUrl: string;
  filename: string;
  photoId: string;
  printSizes: PrintSize[];
  onAddToCart: (photoId: string, printSizeId: string, printSizeName: string, quantity: number) => void;
  onPhotoClick: () => void;
}

export default function PhotoCard({
  photoUrl,
  filename,
  photoId,
  printSizes,
  onAddToCart,
  onPhotoClick,
}: PhotoCardProps) {
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { t } = useLocale();

  const handleAdd = () => {
    if (!selectedSize) return;
    const size = printSizes.find((s) => s.id === selectedSize);
    if (!size) return;
    onAddToCart(photoId, selectedSize, size.name, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group rounded-lg overflow-hidden bg-card shadow-card hover:shadow-elevated transition-shadow"
    >
      <div
        className="relative aspect-square overflow-hidden cursor-pointer bg-secondary/20"
        onClick={onPhotoClick}
      >
        <img
          src={photoUrl}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-40 pointer-events-none"
          loading="lazy"
          draggable={false}
        />
        <img
          src={photoUrl}
          alt={filename}
          className="relative z-10 w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.02] pointer-events-none"
          loading="lazy"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
        <div className="absolute inset-0 z-20" onContextMenu={(e) => e.preventDefault()} />
      </div>
      <div className="p-3 space-y-2">
        <div className="flex gap-2">
          <Select value={selectedSize} onValueChange={setSelectedSize}>
            <SelectTrigger className="flex-1 h-9 text-sm">
              <SelectValue placeholder={t.photoCard.sizePlaceholder} />
            </SelectTrigger>
            <SelectContent>
              {printSizes.map((size) => (
                <SelectItem key={size.id} value={size.id}>
                  {size.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={String(quantity)} onValueChange={(v) => setQuantity(Number(v))}>
            <SelectTrigger className="w-16 h-9 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleAdd} disabled={!selectedSize} className="w-full h-9 text-sm" variant={added ? "secondary" : "default"}>
          {added ? (
            <>
              <Check className="w-4 h-4 mr-1" /> {t.photoCard.added}
            </>
          ) : (
            <>
              <Plus className="w-4 h-4 mr-1" /> {t.photoCard.addToCart}
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
}
