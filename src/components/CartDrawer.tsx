import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ShoppingCart, Trash2, Minus, Plus, Send } from "lucide-react";
import { CartItem, updateCartQuantity, removeFromCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { useLocale } from "@/contexts/LocaleContext";
import { toast } from "sonner";

interface CartDrawerProps {
  eventId: string;
  items: CartItem[];
  onCartUpdate: (items: CartItem[]) => void;
  onOrderPlaced: () => void;
}

export default function CartDrawer({ eventId, items, onCartUpdate, onOrderPlaced }: CartDrawerProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { locale, t } = useLocale();

  const handleQuantityChange = (photoId: string, printSizeId: string, delta: number) => {
    const item = items.find((i) => i.photoId === photoId && i.printSizeId === printSizeId);
    if (!item) return;

    const newQty = item.quantity + delta;
    if (newQty < 1) {
      const updated = removeFromCart(eventId, photoId, printSizeId);
      onCartUpdate(updated);
      return;
    }

    const updated = updateCartQuantity(eventId, photoId, printSizeId, newQty);
    onCartUpdate(updated);
  };

  const handleRemove = (photoId: string, printSizeId: string) => {
    const updated = removeFromCart(eventId, photoId, printSizeId);
    onCartUpdate(updated);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !phone.trim()) {
      toast.error(t.cart.fillNameAndPhone);
      return;
    }

    if (items.length === 0) {
      toast.error(t.cart.empty);
      return;
    }

    setSubmitting(true);
    try {
      const payload = items.map((item) => ({
        photo_id: item.photoId,
        print_size_id: item.printSizeId,
        quantity: item.quantity,
      }));

      const { error } = await (supabase.rpc as any)("create_order_with_items", {
        p_event_id: eventId,
        p_customer_name: name.trim(),
        p_customer_phone: phone.trim(),
        p_items: payload,
      });

      if (error) throw error;

      toast.success(t.cart.success);
      onOrderPlaced();
      setName("");
      setPhone("");
      setOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes("invalid_order_items")) {
        toast.error(
          locale === "ro"
            ? "Unele poze/mărimi nu mai sunt disponibile. Reîncarcă pagina și încearcă din nou."
            : "Некоторые фото/размеры больше недоступны. Обновите страницу и попробуйте снова.",
        );
      } else {
        toast.error(t.cart.error);
      }
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="fixed bottom-6 right-6 h-14 px-6 rounded-full shadow-elevated z-50" size="lg">
          <ShoppingCart className="w-5 h-5 mr-2" />
          {t.cart.title} ({items.reduce((s, i) => s + i.quantity, 0)})
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col">
        <SheetHeader>
          <SheetTitle className="font-display text-xl">{t.cart.yourOrder}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {items.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">{t.cart.empty}</p>
          ) : (
            items.map((item) => (
              <div key={`${item.photoId}-${item.printSizeId}`} className="flex gap-3 p-3 rounded-lg bg-secondary/50">
                <img src={item.photoUrl} alt={item.filename} className="w-16 h-16 rounded object-cover" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.filename}</p>
                  <p className="text-xs text-muted-foreground">{item.printSizeName}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <button
                      onClick={() => handleQuantityChange(item.photoId, item.printSizeId, -1)}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors"
                      aria-label="decrease"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleQuantityChange(item.photoId, item.printSizeId, 1)}
                      className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-border transition-colors"
                      aria-label="increase"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(item.photoId, item.printSizeId)}
                  className="text-muted-foreground hover:text-destructive transition-colors self-start"
                  aria-label="remove"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t pt-4 space-y-3">
            <div className="space-y-2">
              <Label htmlFor="name">{t.cart.nameLabel}</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.cart.namePlaceholder} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">{t.cart.phoneLabel}</Label>
              <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.cart.phonePlaceholder} />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              <Send className="w-4 h-4 mr-2" />
              {submitting ? t.cart.submitting : t.cart.submit}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
