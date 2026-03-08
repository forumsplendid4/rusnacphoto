import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { isAdminAuthenticated, setAdminAuthenticated } from "@/lib/admin-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Camera,
  Plus,
  LogOut,
  Upload,
  Trash2,
  FileSpreadsheet,
  Eye,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { applyWatermark } from "@/lib/watermark";

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
  const [uploadEventId, setUploadEventId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Orders view
  const [viewOrdersEventId, setViewOrdersEventId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  useEffect(() => {
    if (!isAdminAuthenticated()) {
      navigate("/admin/login");
      return;
    }
    loadEvents();
  }, []);

  const loadEvents = async () => {
    // Use RPC to bypass RLS for admin
    const { data, error } = await (supabase.rpc as any)("admin_get_events");
    if (error) {
      console.error(error);
      toast.error("Ошибка загрузки мероприятий");
    }
    setEvents(data || []);
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
      const { error } = await (supabase.rpc as any)("admin_create_event", {
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
    const { error } = await (supabase.rpc as any)("admin_toggle_event", {
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
    setUploading(true);
    let count = 0;
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const path = `${eventId}/${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("event-photos")
        .upload(path, file);

      if (uploadError) {
        console.error(uploadError);
        continue;
      }

      const { error: dbError } = await (supabase.rpc as any)("admin_add_photo", {
        p_event_id: eventId,
        p_storage_path: path,
        p_filename: file.name,
      });

      if (dbError) console.error(dbError);
      else count++;
    }
    toast.success(`Загружено ${count} фото`);
    setUploading(false);
    setUploadEventId(null);
    loadEvents();
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (!confirm("Удалить мероприятие и все его фото?")) return;
    const { error } = await (supabase.rpc as any)("admin_delete_event", {
      p_event_id: eventId,
    });
    if (error) {
      toast.error("Ошибка удаления");
      return;
    }
    toast.success("Мероприятие удалено");
    loadEvents();
  };

  const handleViewOrders = async (eventId: string) => {
    setViewOrdersEventId(eventId);
    setOrdersLoading(true);
    const { data, error } = await (supabase.rpc as any)("admin_get_orders", {
      p_event_id: eventId,
    });
    if (error) {
      console.error(error);
      toast.error("Ошибка загрузки заказов");
    }
    setOrders(data || []);
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

                  <Button
                    variant="outline"
                    size="sm"
                    asChild
                  >
                    <a
                      href={`/event/${event.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" /> Открыть
                    </a>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setUploadEventId(event.id);
                      document.getElementById(`file-${event.id}`)?.click();
                    }}
                    disabled={uploading}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    {uploading && uploadEventId === event.id ? "Загрузка..." : "Фото"}
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
                    }}
                  />

                  <Button variant="outline" size="sm" onClick={() => handleViewOrders(event.id)}>
                    <Eye className="w-4 h-4 mr-1" /> Заказы
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
                {orders.map((o: any, i: number) => (
                  <div key={i} className="p-3 rounded-lg bg-secondary/50 text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{o.customer_name}</span>
                      <span className="text-muted-foreground">{o.customer_phone}</span>
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {o.filename} · {o.print_size_name} · x{o.quantity}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(o.created_at).toLocaleString("ru-RU")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
