import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

export type Locale = "ro" | "ru";

type Dictionary = {
  language: {
    ru: string;
    ro: string;
  };
  common: {
    loading: string;
    back: string;
    home: string;
  };
  index: {
    appName: string;
    admin: string;
    chooseEvent: string;
    chooseEventDescription: string;
    noEvents: string;
    viewPhotos: string;
  };
  event: {
    notFound: string;
    notUploaded: string;
  };
  photoCard: {
    sizePlaceholder: string;
    addToCart: string;
    added: string;
  };
  cart: {
    title: string;
    yourOrder: string;
    empty: string;
    fillNameAndPhone: string;
    nameLabel: string;
    namePlaceholder: string;
    phoneLabel: string;
    phonePlaceholder: string;
    submit: string;
    submitting: string;
    success: string;
    error: string;
  };
};

const dictionaries: Record<Locale, Dictionary> = {
  ro: {
    language: {
      ru: "RU",
      ro: "RO",
    },
    common: {
      loading: "Se încarcă...",
      back: "Înapoi",
      home: "Acasă",
    },
    index: {
      appName: "Studio Foto",
      admin: "Admin",
      chooseEvent: "Alege evenimentul tău",
      chooseEventDescription:
        "Găsește evenimentul, selectează fotografiile preferate și trimite comanda pentru print",
      noEvents: "Nu există încă evenimente active",
      viewPhotos: "Vezi fotografii",
    },
    event: {
      notFound: "Evenimentul nu a fost găsit",
      notUploaded: "Fotografiile nu au fost încă încărcate",
    },
    photoCard: {
      sizePlaceholder: "Mărime",
      addToCart: "În coș",
      added: "Adăugat",
    },
    cart: {
      title: "Coș",
      yourOrder: "Comanda ta",
      empty: "Coșul este gol",
      fillNameAndPhone: "Completează numele și telefonul",
      nameLabel: "Nume și Prenume",
      namePlaceholder: "Popescu Ion",
      phoneLabel: "Telefon",
      phonePlaceholder: "+37378431345",
      submit: "Trimite comanda",
      submitting: "Se trimite...",
      success: "Comanda a fost trimisă! Mulțumim!",
      error: "Eroare la trimiterea comenzii",
    },
  },
  ru: {
    language: {
      ru: "RU",
      ro: "RO",
    },
    common: {
      loading: "Загрузка...",
      back: "Назад",
      home: "На главную",
    },
    index: {
      appName: "Фотостудия",
      admin: "Админ",
      chooseEvent: "Выберите ваше мероприятие",
      chooseEventDescription:
        "Найдите своё мероприятие, выберите понравившиеся фотографии и закажите печать",
      noEvents: "Пока нет активных мероприятий",
      viewPhotos: "Смотреть фото",
    },
    event: {
      notFound: "Мероприятие не найдено",
      notUploaded: "Фотографии пока не загружены",
    },
    photoCard: {
      sizePlaceholder: "Размер",
      addToCart: "В корзину",
      added: "Добавлено",
    },
    cart: {
      title: "Корзина",
      yourOrder: "Ваш заказ",
      empty: "Корзина пуста",
      fillNameAndPhone: "Заполните имя и телефон",
      nameLabel: "Фамилия и Имя",
      namePlaceholder: "Иванов Иван",
      phoneLabel: "Телефон",
      phonePlaceholder: "+7 (999) 123-45-67",
      submit: "Отправить заказ",
      submitting: "Отправка...",
      success: "Заказ отправлен! Спасибо!",
      error: "Ошибка при отправке заказа",
    },
  },
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (next: Locale) => void;
  t: Dictionary;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function readInitialLocale(): Locale {
  if (typeof window === "undefined") return "ro";
  const stored = window.localStorage.getItem("site_locale");
  return stored === "ru" ? "ru" : "ro";
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readInitialLocale);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem("site_locale", next);
  };

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: dictionaries[locale],
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error("useLocale must be used inside LocaleProvider");
  }
  return context;
}
