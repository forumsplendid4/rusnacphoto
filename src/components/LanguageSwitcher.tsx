import { Button } from "@/components/ui/button";
import { useLocale } from "@/contexts/LocaleContext";

export default function LanguageSwitcher() {
  const { locale, setLocale, t } = useLocale();

  return (
    <div className="flex items-center gap-1 rounded-md border bg-card p-1">
      <Button
        size="sm"
        variant={locale === "ro" ? "default" : "ghost"}
        className="h-7 px-2"
        onClick={() => setLocale("ro")}
      >
        {t.language.ro}
      </Button>
      <Button
        size="sm"
        variant={locale === "ru" ? "default" : "ghost"}
        className="h-7 px-2"
        onClick={() => setLocale("ru")}
      >
        {t.language.ru}
      </Button>
    </div>
  );
}
