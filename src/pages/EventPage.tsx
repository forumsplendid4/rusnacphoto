import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PhotoCard from "@/components/PhotoCard";
import CartDrawer from "@/components/CartDrawer";
import { CartItem, getCart, addToCart, clearCart } from "@/lib/cart";
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

export default function EventPage() {
  const { slug } = useParams<{ slug: string }>();
  const [event, setEvent] = useState<EventData | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [printSizes, setPrintSizes] = useState<PrintSize[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    loadEvent();
  }, [slug]);

  const loadEvent = async () => {
    const { data: eventData, error } = await supabase
      .from("events")
      .select("id, title, description, watermark_text")
      .eq("slug", slug!)
      .eq("is_active", true)
      .single();

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

    setPhotos(photosRes.data || []);
    setPrintSizes(sizesRes.data || []);
    setCart(getCart(eventData.id));
    setLoading(false);
  };

  const getPhotoUrl = (storagePath: string) => {
    const { data } = supabase.storage.from("event-photos").getPublicUrl(storagePath);
    return data.publicUrl;
  };

  const handleAddToCart = (photoId: string, printSizeId: string, printSizeName: string, quantity: number) => {
    if (!event) return;
    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;
    const updated = addToCart(event.id, {
      photoId,
      photoUrl: getPhotoUrl(photo.storage_path),
      filename: photo.filename,
      printSizeId,
      printSizeName,
    }, quantity);
    setCart(updated);
  };

  const handleOrderPlaced = () => {
    if (!event) return;
    clearCart(event.id);
    setCart([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  if (notFound || !event) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Camera className="w-16 h-16 text-muted-foreground" />
        <h1 className="text-2xl font-display font-semibold">Мероприятие не найдено</h1>
        <Link to="/" className="text-primary hover:underline">На главную</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-2">
            <ArrowLeft className="w-4 h-4" /> Назад
          </Link>
          <h1 className="text-2xl md:text-3xl font-display font-semibold">{event.title}</h1>
          {event.description && (
            <p className="text-muted-foreground mt-1">{event.description}</p>
          )}
        </div>
      </header>

      <main className="container py-6">
        {photos.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">Фотографии пока не загружены</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {photos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photoId={photo.id}
                photoUrl={getPhotoUrl(photo.storage_path)}
                filename={photo.filename}
                watermarkText={event.watermark_text}
                printSizes={printSizes}
                onAddToCart={handleAddToCart}
              />
            ))}
          </div>
        )}
      </main>

      <CartDrawer
        eventId={event.id}
        items={cart}
        onCartUpdate={setCart}
        onOrderPlaced={handleOrderPlaced}
      />
    </div>
  );
}
