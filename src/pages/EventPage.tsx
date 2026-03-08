import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PhotoCard from "@/components/PhotoCard";
import PhotoLightbox from "@/components/PhotoLightbox";
import CartDrawer from "@/components/CartDrawer";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { CartItem, getCart, addToCart, clearCart, saveCart } from "@/lib/cart";
import { useLocale } from "@/contexts/LocaleContext";
import { Camera, ArrowLeft } from "lucide-react";

interface EventData {
  id: string;
  title: string;
  description: string | null;
  watermark_text: string;
}

interface Photo {
  id: string;
  storage_path: string;
  filename: string;
}

interface PrintSize {
  id: string;
  name: string;
}

type PhotoUrlMode = "thumb" | "full" | "cart";

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [printSizes, setPrintSizes] = useState<PrintSize[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const { t } = useLocale();

  useEffect(() => {
    if (!slug) return;
    loadEvent();
  }, [slug]);

  const buildPhotoUrl = (storagePath: string, mode: PhotoUrlMode = "thumb") => {
    const transform =
      mode === "full"
        ? { width: 1800, quality: 84 }
        : mode === "cart"
          ? { width: 320, quality: 60 }
          : { width: 600, quality: 65 };

    const { data } = supabase.storage.from("event-photos").getPublicUrl(storagePath, { transform });
    return data.publicUrl;
  };

  const loadEvent = async () => {
    setLoading(true);
    setNotFound(false);

    const { data: eventData, error } = await supabase
      .from("events")
      .select("id, title, description, watermark_text")
      .eq("slug", slug!)
      .eq("is_active", true)
      .maybeSingle();

    if (error || !eventData) {
      setNotFound(true);
      setLoading(false);
      return;
    }

    setEvent(eventData);

    const [photosRes, sizesRes] = await Promise.all([
      supabase
        .from("photos")
        .select("id, storage_path, filename")
        .eq("event_id", eventData.id)
        .order("sort_order"),
      supabase
        .from("print_sizes")
        .select("id, name")
        .eq("is_active", true)
        .order("sort_order"),
    ]);

    const loadedPhotos = photosRes.data || [];
    const loadedSizes = sizesRes.data || [];

    setPhotos(loadedPhotos);
    setPrintSizes(loadedSizes);

    const validPhotoIds = new Set(loadedPhotos.map((photo) => photo.id));
    const validSizeIds = new Set(loadedSizes.map((size) => size.id));
    const storedCart = getCart(eventData.id);
    const sanitizedCart = storedCart.filter(
      (item) => validPhotoIds.has(item.photoId) && validSizeIds.has(item.printSizeId),
    );

    if (sanitizedCart.length !== storedCart.length) {
      saveCart(eventData.id, sanitizedCart);
    }

    setCart(sanitizedCart);
    setLoading(false);
  };

  const thumbPhotoUrls = useMemo(() => {
    const map: Record<string, string> = {};
    photos.forEach((photo) => {
      map[photo.id] = buildPhotoUrl(photo.storage_path, "thumb");
    });
    return map;
  }, [photos]);

  const fullPhotoUrls = useMemo(() => {
    const map: Record<string, string> = {};
    photos.forEach((photo) => {
      map[photo.id] = buildPhotoUrl(photo.storage_path, "full");
    });
    return map;
  }, [photos]);

  const handleAddToCart = (photoId: string, printSizeId: string, printSizeName: string, quantity: number) => {
    if (!event) return;
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    const updated = addToCart(
      event.id,
      {
        photoId,
        photoUrl: buildPhotoUrl(photo.storage_path, "cart"),
        filename: photo.filename,
        printSizeId,
        printSizeName,
      },
      quantity,
    );

    setCart(updated);
  };

  const handleOrderPlaced = () => {
    if (!event) return;
    clearCart(event.id);
    setCart([]);
  };

  const activeLightboxPhoto = lightboxIndex !== null ? photos[lightboxIndex] : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">{t.common.loading}</div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Camera className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-display font-semibold">{t.event.notFound}</h1>
        <Link to="/" className="text-primary hover:underline">
          {t.common.home}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4">
          <div className="flex items-center justify-between gap-3 mb-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> {t.common.back}
            </Link>
            <LanguageSwitcher />
          </div>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">{event.title}</h1>
          {event.description && <p className="text-muted-foreground mt-1">{event.description}</p>}
        </div>
      </header>

      <main className="container py-6">
        {photos.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{t.event.notUploaded}</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo, index) => (
              <PhotoCard
                key={photo.id}
                photoId={photo.id}
                photoUrl={thumbPhotoUrls[photo.id] || buildPhotoUrl(photo.storage_path, "thumb")}
                filename={photo.filename}
                printSizes={printSizes}
                onAddToCart={handleAddToCart}
                onPhotoClick={() => setLightboxIndex(index)}
              />
            ))}
          </div>
        )}
      </main>

      <CartDrawer eventId={event.id} items={cart} onCartUpdate={setCart} onOrderPlaced={handleOrderPlaced} />

      <PhotoLightbox
        isOpen={lightboxIndex !== null}
        photoUrl={
          activeLightboxPhoto
            ? fullPhotoUrls[activeLightboxPhoto.id] || buildPhotoUrl(activeLightboxPhoto.storage_path, "full")
            : ""
        }
        onClose={() => setLightboxIndex(null)}
        onPrev={() => setLightboxIndex((i) => (i !== null && i > 0 ? i - 1 : i))}
        onNext={() => setLightboxIndex((i) => (i !== null && i < photos.length - 1 ? i + 1 : i))}
        hasPrev={lightboxIndex !== null && lightboxIndex > 0}
        hasNext={lightboxIndex !== null && lightboxIndex < photos.length - 1}
      />
    </div>
  );
}
