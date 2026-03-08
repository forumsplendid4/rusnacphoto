import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ArrowRight, Key } from "lucide-react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLocale } from "@/contexts/LocaleContext";
import { callRpc } from "@/lib/rpc";
import { toast } from "sonner";

export default function Index() {
  const [accessKey, setAccessKey] = useState("");
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();
  const { t, locale } = useLocale();

  const handleSearch = async () => {
    const key = accessKey.trim();
    if (!key) {
      toast.error(locale === "ro" ? "Introduceți codul de acces" : "Введите код доступа");
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await callRpc<{ slug: string }[]>("find_event_by_key", { p_key: key });
      if (error) throw error;

      const results = data as any[];
      if (!results || results.length === 0) {
        toast.error(locale === "ro" ? "Evenimentul nu a fost găsit" : "Мероприятие не найдено");
        return;
      }

      navigate(`/event/${results[0].slug}`);
    } catch {
      toast.error(locale === "ro" ? "Eroare la căutare" : "Ошибка поиска");
    } finally {
      setSearching(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b bg-card/80 backdrop-blur-sm">
        <div className="container py-6 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Camera className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-display font-semibold">{t.index.appName}</h1>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <a
              href="/admin/login"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {t.index.admin}
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md text-center space-y-6"
        >
          <div>
            <Key className="w-12 h-12 mx-auto text-primary mb-4" />
            <h2 className="text-3xl font-display font-semibold mb-2">
              {locale === "ro" ? "Accesează fotografiile" : "Доступ к фотографиям"}
            </h2>
            <p className="text-muted-foreground">
              {locale === "ro"
                ? "Introduceți codul primit de la fotograf pentru a vedea fotografiile evenimentului"
                : "Введите код, полученный от фотографа, чтобы увидеть фотографии мероприятия"}
            </p>
          </div>

          <div className="flex gap-2">
            <Input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value.toUpperCase())}
              onKeyDown={handleKeyDown}
              placeholder={locale === "ro" ? "Codul de acces" : "Код доступа"}
              className="text-center text-lg tracking-widest uppercase font-mono"
              maxLength={20}
              autoFocus
            />
            <Button onClick={handleSearch} disabled={searching} size="lg">
              {searching ? (
                <span className="animate-pulse">...</span>
              ) : (
                <ArrowRight className="w-5 h-5" />
              )}
            </Button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
