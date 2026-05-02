import React, { createContext, useContext, useEffect, useState } from "react";

export type Lang = "en" | "es" | "ar";
export type Dir = "ltr" | "rtl";

export const LANGUAGES: { code: Lang; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "es", label: "Spanish", nativeLabel: "Español" },
  { code: "ar", label: "Arabic", nativeLabel: "العربية" },
];

const translations = {
  en: {
    nav: {
      dashboard: "Dashboard",
      catalog: "Catalog",
      myLoans: "My Loans",
      catalogManagement: "Catalog Management",
      allLoans: "All Loans",
      userManagement: "User Management",
      myProfile: "My Profile",
      signOut: "Sign out",
      language: "Language",
    },
    notifications: {
      title: "Notifications",
      noNotifications: "No notifications",
      markAllRead: "Mark all read",
      justNow: "Just now",
      minutesAgo: (n: number) => `${n}m ago`,
      hoursAgo: (n: number) => `${n}h ago`,
      daysAgo: (n: number) => `${n}d ago`,
    },
    myLoans: {
      title: "My Loans",
      subtitle: "Track your borrowed books and renewal history",
      activeLoans: "Active Loans",
      history: "Borrowing History",
      finesBilling: "Fines & Billing",
      noActiveLoans: "No active loans",
      noHistory: "No borrowing history yet.",
      browseCatalog: "Browse the catalog",
      overdueAlert: (n: number) => `${n} overdue ${n === 1 ? "loan" : "loans"}`,
      overdueMessage: "Please return overdue books as soon as possible to avoid penalties.",
      renewals: (n: number) => `${n} renewal${n > 1 ? "s" : ""} used`,
      maxRenewals: "Max renewals",
      borrowed: "Borrowed",
      returned: "Returned",
    },
    fines: {
      outstandingBalance: "Outstanding Balance",
      noFines: "No outstanding fines",
      noFinesDesc: "All your loans are in good standing.",
      payNow: "Pay Now",
      clearFines: "Clear Fines",
      daysOverdue: (n: number) => `${n} day${n !== 1 ? "s" : ""} overdue`,
      fineRate: "$0.50 per day overdue",
      total: "Total",
      paymentModal: {
        title: "Pay Outstanding Fines",
        subtitle: "Enter your card details to clear the balance",
        amount: "Amount Due",
        cardNumber: "Card Number",
        cardholderName: "Cardholder Name",
        expiry: "Expiry",
        cvc: "CVC",
        payButton: "Pay",
        cancel: "Cancel",
        processing: "Processing...",
        success: "Payment successful! Fines cleared.",
        testCard: "Use test card: 4242 4242 4242 4242",
      },
    },
    common: {
      loading: "Loading...",
      error: "Something went wrong",
      retry: "Retry",
      close: "Close",
      save: "Save",
      cancel: "Cancel",
    },
  },
  es: {
    nav: {
      dashboard: "Panel",
      catalog: "Catálogo",
      myLoans: "Mis Préstamos",
      catalogManagement: "Gestión de Catálogo",
      allLoans: "Todos los Préstamos",
      userManagement: "Gestión de Usuarios",
      myProfile: "Mi Perfil",
      signOut: "Cerrar sesión",
      language: "Idioma",
    },
    notifications: {
      title: "Notificaciones",
      noNotifications: "Sin notificaciones",
      markAllRead: "Marcar todo como leído",
      justNow: "Ahora mismo",
      minutesAgo: (n: number) => `Hace ${n}m`,
      hoursAgo: (n: number) => `Hace ${n}h`,
      daysAgo: (n: number) => `Hace ${n}d`,
    },
    myLoans: {
      title: "Mis Préstamos",
      subtitle: "Rastrea tus libros prestados e historial de renovaciones",
      activeLoans: "Préstamos Activos",
      history: "Historial de Préstamos",
      finesBilling: "Multas y Pagos",
      noActiveLoans: "Sin préstamos activos",
      noHistory: "Sin historial de préstamos.",
      browseCatalog: "Explorar el catálogo",
      overdueAlert: (n: number) => `${n} préstamo${n !== 1 ? "s" : ""} vencido${n !== 1 ? "s" : ""}`,
      overdueMessage: "Por favor devuelva los libros vencidos lo antes posible para evitar penalizaciones.",
      renewals: (n: number) => `${n} renovación${n > 1 ? "es" : ""} usada${n > 1 ? "s" : ""}`,
      maxRenewals: "Máx. renovaciones",
      borrowed: "Prestado",
      returned: "Devuelto",
    },
    fines: {
      outstandingBalance: "Saldo Pendiente",
      noFines: "Sin multas pendientes",
      noFinesDesc: "Todos sus préstamos están al corriente.",
      payNow: "Pagar Ahora",
      clearFines: "Liquidar Multas",
      daysOverdue: (n: number) => `${n} día${n !== 1 ? "s" : ""} de retraso`,
      fineRate: "$0.50 por día de retraso",
      total: "Total",
      paymentModal: {
        title: "Pagar Multas Pendientes",
        subtitle: "Ingrese los datos de su tarjeta para liquidar el saldo",
        amount: "Monto a Pagar",
        cardNumber: "Número de Tarjeta",
        cardholderName: "Nombre del Titular",
        expiry: "Vencimiento",
        cvc: "CVC",
        payButton: "Pagar",
        cancel: "Cancelar",
        processing: "Procesando...",
        success: "¡Pago exitoso! Multas liquidadas.",
        testCard: "Tarjeta de prueba: 4242 4242 4242 4242",
      },
    },
    common: {
      loading: "Cargando...",
      error: "Algo salió mal",
      retry: "Reintentar",
      close: "Cerrar",
      save: "Guardar",
      cancel: "Cancelar",
    },
  },
  ar: {
    nav: {
      dashboard: "لوحة التحكم",
      catalog: "الفهرس",
      myLoans: "إعاراتي",
      catalogManagement: "إدارة الفهرس",
      allLoans: "جميع الإعارات",
      userManagement: "إدارة المستخدمين",
      myProfile: "ملفي الشخصي",
      signOut: "تسجيل الخروج",
      language: "اللغة",
    },
    notifications: {
      title: "الإشعارات",
      noNotifications: "لا توجد إشعارات",
      markAllRead: "تعليم الكل كمقروء",
      justNow: "الآن",
      minutesAgo: (n: number) => `منذ ${n} د`,
      hoursAgo: (n: number) => `منذ ${n} س`,
      daysAgo: (n: number) => `منذ ${n} ي`,
    },
    myLoans: {
      title: "إعاراتي",
      subtitle: "تتبع الكتب المستعارة وسجل التجديدات",
      activeLoans: "الإعارات النشطة",
      history: "سجل الاستعارة",
      finesBilling: "الغرامات والفواتير",
      noActiveLoans: "لا توجد إعارات نشطة",
      noHistory: "لا يوجد سجل استعارة بعد.",
      browseCatalog: "تصفح الفهرس",
      overdueAlert: (n: number) => `${n} إعارة${n > 1 ? "" : ""} متأخرة`,
      overdueMessage: "يرجى إعادة الكتب المتأخرة في أقرب وقت ممكن لتجنب الغرامات.",
      renewals: (n: number) => `${n} تجديد مستخدم`,
      maxRenewals: "الحد الأقصى للتجديدات",
      borrowed: "تاريخ الاستعارة",
      returned: "تاريخ الإعادة",
    },
    fines: {
      outstandingBalance: "الرصيد المستحق",
      noFines: "لا توجد غرامات مستحقة",
      noFinesDesc: "جميع إعاراتك في وضع جيد.",
      payNow: "ادفع الآن",
      clearFines: "تسوية الغرامات",
      daysOverdue: (n: number) => `${n} يوم تأخير`,
      fineRate: "٠٫٥٠ دولار في اليوم",
      total: "الإجمالي",
      paymentModal: {
        title: "دفع الغرامات المستحقة",
        subtitle: "أدخل بيانات بطاقتك لتسوية الرصيد",
        amount: "المبلغ المستحق",
        cardNumber: "رقم البطاقة",
        cardholderName: "اسم حامل البطاقة",
        expiry: "تاريخ الانتهاء",
        cvc: "الرمز السري",
        payButton: "ادفع",
        cancel: "إلغاء",
        processing: "جارٍ المعالجة...",
        success: "تمت عملية الدفع بنجاح! تم مسح الغرامات.",
        testCard: "بطاقة اختبارية: 4242 4242 4242 4242",
      },
    },
    common: {
      loading: "جارٍ التحميل...",
      error: "حدث خطأ ما",
      retry: "إعادة المحاولة",
      close: "إغلاق",
      save: "حفظ",
      cancel: "إلغاء",
    },
  },
};

export type Translations = typeof translations.en;

interface I18nContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: Translations;
  dir: Dir;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("flms_lang") as Lang | null;
    return saved && ["en", "es", "ar"].includes(saved) ? saved : "en";
  });

  const dir: Dir = lang === "ar" ? "rtl" : "ltr";

  const setLang = (newLang: Lang) => {
    localStorage.setItem("flms_lang", newLang);
    setLangState(newLang);
  };

  useEffect(() => {
    document.documentElement.setAttribute("dir", dir);
    document.documentElement.setAttribute("lang", lang);
  }, [lang, dir]);

  return (
    <I18nContext.Provider value={{ lang, setLang, t: translations[lang] as Translations, dir }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}

export function formatLocalDate(dateStr: string, options?: Intl.DateTimeFormatOptions): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      ...options,
    }).format(date);
  } catch {
    return dateStr;
  }
}

export function formatLocalDateTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    }).format(date);
  } catch {
    return dateStr;
  }
}
