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
  price: number;
}

interface PhotoCardProps {
  photoUrl: string;
  filename: string;
  photoId: string;
  printSizes: PrintSize[];
  onAddToCart: (photoId: string, printSizeId: string, printSizeName: string, printSizePrice: number, quantity: number) => void;
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

  const selectedPrintSize = printSizes.find((s) => s.id === selectedSize);

  const handleAdd = () => {
    if (!selectedSize || !selectedPrintSize) return;
    onAddToCart(photoId, selectedSize, selectedPrintSize.name, selectedPrintSize.price, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const formatPrice = (price: number) => {
    if (price <= 0) return "";
    return `${price} MDL`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="group rounded-lg overflow-hidden bg-card shadow-card hover:shadow-elevated transition-shadow"
    >
      <div
        className="relative cursor-pointer bg-muted/30 flex items-center justify-center min-h-[320px]"
        onClick={onPhotoClick}
      >
        <img
          src={photoUrl}
          alt={filename}
          className="max-w-full max-h-[70vh] object-contain"
          loading="lazy"
          onContextMenu={(e) => e.preventDefault()}
          draggable={false}
        />
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
                  {size.name}{size.price > 0 ? ` — ${size.price} MDL` : ""}
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
        {selectedPrintSize && selectedPrintSize.price > 0 && (
          <p className="text-xs text-muted-foreground text-right">
            {formatPrice(selectedPrintSize.price * quantity)}
          </p>
        )}
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
