import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Camera, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/contexts/LocaleContext";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
}

export default function Index() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useLocale();

  useEffect(() => {
    supabase
      .from("events")
      .select("id, title, slug, description")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setEvents(data || []);
        setLoading(false);
      });
  }, []);

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-display font-semibold">{t.index.appName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/admin/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.index.admin}
            </Link>
          </div>
        </div>
      </header>

      <main className="container py-12">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-display font-semibold mb-3">{t.index.chooseEvent}</h2>
          <p className="text-muted-foreground max-w-md mx-auto">{t.index.chooseEventDescription}</p>
        </div>

        {loading ? (
          <div className="text-center py-16 text-muted-foreground">{t.common.loading}</div>
        ) : events.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t.index.noEvents}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {events.map((event, i) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.3 }}
              >
                <Link
                  to={`/event/${event.slug}`}
                  className="block p-6 rounded-lg bg-card shadow-card hover:shadow-elevated transition-all group"
                >
                  <h3 className="font-display text-lg font-semibold group-hover:text-primary transition-colors">
                    {event.title}
                  </h3>
                  {event.description && <p className="text-sm text-muted-foreground mt-1">{event.description}</p>}
                  <div className="flex items-center gap-1 mt-3 text-sm text-primary font-medium">
                    {t.index.viewPhotos} <ArrowRight className="w-4 h-4" />
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
