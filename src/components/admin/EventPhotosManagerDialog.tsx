import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { callRpc } from "@/lib/rpc";
import { getAdminToken } from "@/lib/admin-auth";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

interface PhotoRow {
  id: string;
  filename: string;
  storage_path: string;
}

interface EventPhotosManagerDialogProps {
  eventId: string | null;
  eventTitle?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
}

export default function EventPhotosManagerDialog({
  eventId,
  eventTitle,
  open,
  onOpenChange,
  onChanged,
}: EventPhotosManagerDialogProps) {
  const [photos, setPhotos] = useState<PhotoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !eventId) return;

    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("photos")
        .select("id, filename, storage_path")
        .eq("event_id", eventId)
        .order("sort_order");

      if (error) {
        toast.error("Ошибка загрузки фото");
      }

      setPhotos(data || []);
      setSelectedIds([]);
      setLoading(false);
    };

    load();
  }, [eventId, open]);

  const allSelected = useMemo(
    () => photos.length > 0 && selectedIds.length === photos.length,
    [photos.length, selectedIds.length],
  );

  const toggleSelected = (photoId: string, checked: boolean) => {
    setSelectedIds((prev) =>
      checked ? [...prev, photoId] : prev.filter((id) => id !== photoId),
    );
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(photos.map((p) => p.id));
      return;
    }
    setSelectedIds([]);
  };

  const getThumb = (path: string) => {
    const { data } = supabase.storage.from("event-photos").getPublicUrl(path, {
      transform: { width: 320, quality: 60 },
    });
    return data.publicUrl;
  };

  const handleDeleteSelected = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`Удалить выбранные фото (${selectedIds.length})?`)) return;

    setDeleting(true);
    const results = await Promise.allSettled(
      selectedIds.map((photoId) => callRpc("admin_delete_photo", { p_admin_token: getAdminToken(), p_photo_id: photoId })),
    );

    const failed = results.filter(
      (result) => result.status === "rejected" || (result.status === "fulfilled" && result.value.error),
    ).length;

    if (failed > 0) {
      toast.error(`Удалено ${selectedIds.length - failed}, ошибок: ${failed}`);
    } else {
      toast.success("Выбранные фото удалены");
    }

    const remaining = photos.filter((p) => !selectedIds.includes(p.id));
    setPhotos(remaining);
    setSelectedIds([]);
    setDeleting(false);
    onChanged();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Фото мероприятия {eventTitle ? `«${eventTitle}»` : ""}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-muted-foreground py-10 text-center">Загрузка...</p>
        ) : photos.length === 0 ? (
          <p className="text-muted-foreground py-10 text-center">Фото пока нет</p>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={(checked) => toggleSelectAll(Boolean(checked))}
                />
                Выбрать все
              </label>
              <Button
                variant="destructive"
                size="sm"
                disabled={deleting || selectedIds.length === 0}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-1" />
                {deleting ? "Удаление..." : `Удалить выбранные (${selectedIds.length})`}
              </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {photos.map((photo) => (
                <div key={photo.id} className="rounded-lg border bg-card p-2 space-y-2">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-md bg-secondary/60">
                    <img
                      src={getThumb(photo.storage_path)}
                      alt={photo.filename}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      draggable={false}
                    />
                  </div>
                  <label className="inline-flex items-start gap-2 text-xs text-muted-foreground cursor-pointer">
                    <Checkbox
                      checked={selectedIds.includes(photo.id)}
                      onCheckedChange={(checked) => toggleSelected(photo.id, Boolean(checked))}
                    />
                    <span className="line-clamp-2 break-all">{photo.filename}</span>
                  </label>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
