import { useEffect, useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { isAdminAuthenticated, setAdminAuthenticated } from "@/lib/admin-auth";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/rpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Camera,
  Plus,
  LogOut,
  Upload,
  Trash2,
  FileSpreadsheet,
  Eye,
  ExternalLink,
  Images,
  X,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { applyWatermark } from "@/lib/watermark";
import EventPhotosManagerDialog from "@/components/admin/EventPhotosManagerDialog";

interface Event {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  watermark_text: string;
  created_at: string;
  photo_count?: number;
  order_count?: number;
}

interface UploadProgress {
  total: number;
  processed: number;
  success: number;
  failed: number;
  startedAt: number;
  eventId: string;
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newWatermark, setNewWatermark] = useState("PREVIEW");
  const [creating, setCreating] = useState(false);

  // Photo upload state
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const cancelRef = useRef(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [managePhotosEvent, setManagePhotosEvent] = useState<Event | null>(null);

  // Orders view
  const [viewOrdersEventId, setViewOrdersEventId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  const groupedOrders = useMemo(() => {
    const map = new Map<string, { customer_name: string; customer_phone: string; created_at: string; items: { filename: string; print_size_name: string; quantity: number }[] }>();
    for (const o of orders) {
      const key = `${o.customer_name}|${o.customer_phone}|${o.created_at}`;
      if (!map.has(key)) {
        map.set(key, { customer_name: o.customer_name, customer_phone: o.customer_phone, created_at: o.created_at, items: [] });
      }
      map.get(key)!.items.push({ filename: o.filename, print_size_name: o.print_size_name, quantity: o.quantity });
    }
    return Array.from(map.values());
  }, [orders]);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
      return;
    }
    loadEvents();
  }, []);

  const loadEvents = async () => {
    const { data, error } = await callRpc("admin_get_events", {});
    if (error) {
      console.error(error);
      toast.error("Ошибка загрузки мероприятий");
    }
    setEvents((data as Event[]) || []);
    setLoading(false);
  };

  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-zа-яё0-9\s-]/gi, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .substring(0, 60)
      + "-" + Date.now().toString(36);
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const { error } = await callRpc("admin_create_event", {
        p_title: newTitle.trim(),
        p_slug: generateSlug(newTitle.trim()),
        p_description: newDescription.trim() || null,
        p_watermark_text: newWatermark.trim() || "PREVIEW",
      });
      if (error) throw error;
      toast.success("Мероприятие создано");
      setNewTitle("");
      setNewDescription("");
      setNewWatermark("PREVIEW");
      setCreateOpen(false);
      loadEvents();
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при создании");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (eventId: string, active: boolean) => {
    const { error } = await callRpc("admin_toggle_event", {
      p_event_id: eventId,
      p_active: active,
    });
    if (error) {
      toast.error("Ошибка обновления");
      return;
    }
    setEvents((prev) =>
      prev.map((e) => (e.id === eventId ? { ...e, is_active: active } : e))
    );
  };

  const handleUploadPhotos = async (eventId: string, files: FileList) => {
    const event = events.find((e) => e.id === eventId);
    const watermarkText = event?.watermark_text || "PREVIEW";
    const fileArray = Array.from(files);

    cancelRef.current = false;
    setUploadProgress({
      total: fileArray.length,
      processed: 0,
      success: 0,
      failed: 0,
      startedAt: Date.now(),
      eventId,
    });

    const workersCount = Math.min(4, fileArray.length);
    let pointer = 0;
    let successCount = 0;
    let failedCount = 0;

    const worker = async () => {
      while (pointer < fileArray.length) {
        if (cancelRef.current) break;
        const currentIndex = pointer;
        pointer += 1;
        const file = fileArray[currentIndex];

        try {
          const watermarkedBlob = await applyWatermark(file, watermarkText);
          if (cancelRef.current) break;

          const path = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(2)}.jpeg`;
          const { error: uploadError } = await supabase.storage
            .from("event-photos")
            .upload(path, watermarkedBlob, { contentType: "image/jpeg" });

          if (cancelRef.current) break;

          if (uploadError) {
            failedCount++;
          } else {
            const { error: dbError } = await callRpc("admin_add_photo", {
              p_event_id: eventId,
              p_storage_path: path,
              p_filename: file.name,
            });
            if (dbError) failedCount++;
            else successCount++;
          }
        } catch (err) {
          console.error("Upload/Watermark error:", err);
          failedCount++;
        }

        setUploadProgress((prev) =>
          prev
            ? { ...prev, processed: successCount + failedCount, success: successCount, failed: failedCount }
            : null
        );
      }
    };

    await Promise.all(Array.from({ length: workersCount }, worker));

    if (cancelRef.current) {
      toast.info(`Загрузка отменена. Загружено ${successCount} из ${fileArray.length}`);
    } else {
      toast.success(`Загружено ${successCount} из ${fileArray.length} фото`);
    }

    setUploadProgress(null);
    loadEvents();
  };

  const handleCancelUpload = () => {
    setShowCancelConfirm(true);
  };

  const confirmCancelUpload = () => {
    cancelRef.current = true;
    setShowCancelConfirm(false);
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Удалить мероприятие и все его фото?")) return;
    const { error } = await callRpc("admin_delete_event", { p_event_id: eventId });
    if (error) {
      console.error(error);
      toast.error(`Ошибка удаления: ${error.message || "неизвестно"}`);
      return;
    }
    toast.success("Мероприятие удалено");
    loadEvents();
  };

  const handleViewOrders = async (eventId: string) => {
    setViewOrdersEventId(eventId);
    setOrdersLoading(true);
    const { data, error } = await callRpc("admin_get_orders", { p_event_id: eventId });
    if (error) {
      console.error(error);
      toast.error("Ошибка загрузки заказов");
    }
    setOrders((data as any[]) || []);
    setOrdersLoading(false);
  };

  const handleExportExcel = (eventTitle: string) => {
    if (orders.length === 0) {
      toast.error("Нет заказов для экспорта");
      return;
    }

    const rows = orders.map((o: any) => ({
      "Имя клиента": o.customer_name,
      "Телефон": o.customer_phone,
      "Фото": o.filename,
      "Размер": o.print_size_name,
      "Количество": o.quantity,
      "Дата заказа": new Date(o.created_at).toLocaleString("ru-RU"),
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, "Заказы");
    XLSX.writeFile(wb, `${eventTitle}_заказы.xlsx`);
  };

  const handleLogout = () => {
    setAdminAuthenticated(false);
    navigate("/admin/login");
  };

  // ETA helper
  const formatEta = (progress: UploadProgress): string => {
    if (progress.processed === 0) return "расчёт...";
    const elapsed = Date.now() - progress.startedAt;
    const avg = elapsed / progress.processed;
    const remaining = avg * (progress.total - progress.processed);
    const secs = Math.ceil(remaining / 1000);
    if (secs < 60) return `~${secs} сек`;
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `~${mins} мин ${remSecs} сек`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="container py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Camera className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-display font-semibold">Админ-панель</h1>
          </div>
          <div className="flex gap-2">
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-1" /> Новое мероприятие
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle className="font-display">Создать мероприятие</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label>Название</Label>
                    <Input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="УТРЕННИК ГРУППА 1005"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Описание (необязательно)</Label>
                    <Textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      placeholder="Дополнительная информация..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Текст водяного знака</Label>
                    <Input
                      value={newWatermark}
                      onChange={(e) => setNewWatermark(e.target.value)}
                      placeholder="PREVIEW"
                    />
                  </div>
                  <Button onClick={handleCreate} disabled={creating || !newTitle.trim()} className="w-full">
                    {creating ? "Создание..." : "Создать"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" /> Выйти
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        {/* Upload progress bar */}
        {uploadProgress && (
          <div className="mb-6 p-4 rounded-lg bg-card shadow-card space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                Загрузка фото: {uploadProgress.processed} / {uploadProgress.total}
                {uploadProgress.failed > 0 && (
                  <span className="text-destructive ml-1">(ошибок: {uploadProgress.failed})</span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">{formatEta(uploadProgress)}</span>
                <button
                  onClick={handleCancelUpload}
                  className="w-6 h-6 rounded-full bg-muted hover:bg-destructive/20 flex items-center justify-center transition-colors"
                  aria-label="Отменить загрузку"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <Progress value={uploadProgress.total > 0 ? (uploadProgress.processed / uploadProgress.total) * 100 : 0} />
          </div>
        )}

        {events.length === 0 ? (
          <div className="text-center py-16">
            <Camera className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Пока нет мероприятий. Создайте первое!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {events.map((event) => (
              <div
                key={event.id}
                className="p-4 rounded-lg bg-card shadow-card flex flex-col sm:flex-row sm:items-center gap-4"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-display text-lg font-semibold truncate">{event.title}</h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        event.is_active
                          ? "bg-green-100 text-green-700"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {event.is_active ? "Активно" : "Скрыто"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Фото: {event.photo_count || 0} · Заказов: {event.order_count || 0}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Активно</Label>
                    <Switch
                      checked={event.is_active}
                      onCheckedChange={(v) => handleToggleActive(event.id, v)}
                    />
                  </div>

                  <Button variant="outline" size="sm" asChild>
                    <a href={`/event/${event.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-4 h-4 mr-1" /> Открыть
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      document.getElementById(`file-${event.id}`)?.click();
                    }}
                    disabled={!!uploadProgress}
                  >
                    <Upload className="w-4 h-4 mr-1" /> Фото
                  </Button>
                  <input
                    id={`file-${event.id}`}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        handleUploadPhotos(event.id, e.target.files);
                      }
                      e.target.value = "";
                    }}
                  />

                  <Button variant="outline" size="sm" onClick={() => handleViewOrders(event.id)}>
                    <Eye className="w-4 h-4 mr-1" /> Заказы
                  </Button>

                  <Button variant="outline" size="sm" onClick={() => setManagePhotosEvent(event)}>
                    <Images className="w-4 h-4 mr-1" /> Редактировать фото
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Orders dialog */}
        <Dialog open={!!viewOrdersEventId} onOpenChange={() => setViewOrdersEventId(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                Заказы
                {orders.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const ev = events.find((e) => e.id === viewOrdersEventId);
                      handleExportExcel(ev?.title || "export");
                    }}
                  >
                    <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {ordersLoading ? (
              <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
            ) : orders.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">Заказов пока нет</p>
            ) : (
              <div className="space-y-3">
                {groupedOrders.map((group, i) => (
                  <div key={i} className="p-4 rounded-lg bg-secondary/50 text-sm">
                    <div className="flex justify-between mb-2">
                      <span className="font-semibold">{group.customer_name}</span>
                      <span className="text-muted-foreground">{group.customer_phone}</span>
                    </div>
                    <div className="space-y-1 ml-2 border-l-2 border-border pl-3">
                      {group.items.map((item, j) => (
                        <p key={j} className="text-muted-foreground">
                          {item.filename} · {item.print_size_name} · x{item.quantity}
                        </p>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                      {new Date(group.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>

        <EventPhotosManagerDialog
          open={!!managePhotosEvent}
          eventId={managePhotosEvent?.id || null}
          eventTitle={managePhotosEvent?.title}
          onOpenChange={(open) => {
            if (!open) setManagePhotosEvent(null);
          }}
          onChanged={loadEvents}
        />

        {/* Cancel upload confirmation */}
        <AlertDialog open={showCancelConfirm} onOpenChange={setShowCancelConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>ТОЧНО ХОТИТЕ ОТМЕНИТЬ ЗАГРУЗКУ?</AlertDialogTitle>
              <AlertDialogDescription>
                Уже загруженные фото останутся. Отменены будут только оставшиеся в очереди.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Нет, продолжить</AlertDialogCancel>
              <AlertDialogAction onClick={confirmCancelUpload} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Да, отменить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
}
