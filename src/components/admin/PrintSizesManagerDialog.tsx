import { useEffect, useState } from "react";
import { callRpc } from "@/lib/rpc";
import { getAdminToken } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";

interface PrintSizeRow {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
  sort_order: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PrintSizesManagerDialog({ open, onOpenChange }: Props) {
  const [sizes, setSizes] = useState<PrintSizeRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (open) loadSizes();
  }, [open]);

  const loadSizes = async () => {
    setLoading(true);
    const { data, error } = await callRpc("admin_get_print_sizes", {
      p_admin_token: getAdminToken(),
    });
    if (error) {
      toast.error("Ошибка загрузки размеров");
    }
    setSizes((data as PrintSizeRow[]) || []);
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const price = parseFloat(newPrice) || 0;
    const { error } = await callRpc("admin_create_print_size", {
      p_admin_token: getAdminToken(),
      p_name: newName.trim(),
      p_price: price,
    });
    if (error) {
      toast.error("Ошибка создания");
      return;
    }
    toast.success("Размер добавлен");
    setNewName("");
    setNewPrice("");
    loadSizes();
  };

  const handleUpdate = async (size: PrintSizeRow) => {
    setSaving(size.id);
    const { error } = await callRpc("admin_update_print_size", {
      p_admin_token: getAdminToken(),
      p_id: size.id,
      p_name: size.name,
      p_price: size.price,
      p_is_active: size.is_active,
    });
    if (error) {
      toast.error("Ошибка сохранения");
    } else {
      toast.success("Сохранено");
    }
    setSaving(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить этот размер?")) return;
    const { error } = await callRpc("admin_delete_print_size", {
      p_admin_token: getAdminToken(),
      p_id: id,
    });
    if (error) {
      toast.error("Ошибка удаления");
      return;
    }
    toast.success("Удалено");
    loadSizes();
  };

  const updateField = (id: string, field: keyof PrintSizeRow, value: any) => {
    setSizes((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Размеры печати и цены</DialogTitle>
        </DialogHeader>

        {loading ? (
          <p className="text-center py-8 text-muted-foreground">Загрузка...</p>
        ) : (
          <div className="space-y-4">
            {/* Existing sizes */}
            {sizes.map((size) => (
              <div key={size.id} className="flex items-center gap-2 p-3 rounded-lg bg-secondary/50">
                <div className="flex-1 space-y-2">
                  <Input
                    value={size.name}
                    onChange={(e) => updateField(size.id, "name", e.target.value)}
                    placeholder="Название"
                    className="h-8 text-sm"
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={size.price}
                      onChange={(e) => updateField(size.id, "price", parseFloat(e.target.value) || 0)}
                      placeholder="Цена"
                      className="h-8 text-sm w-24"
                      min={0}
                      step={0.01}
                    />
                    <span className="text-xs text-muted-foreground">MDL</span>
                    <div className="flex items-center gap-1 ml-auto">
                      <Label className="text-xs text-muted-foreground">Активен</Label>
                      <Switch
                        checked={size.is_active}
                        onCheckedChange={(v) => updateField(size.id, "is_active", v)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdate(size)}
                    disabled={saving === size.id}
                  >
                    <Save className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDelete(size.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add new */}
            <div className="border-t pt-4 space-y-2">
              <Label className="text-sm font-medium">Добавить новый размер</Label>
              <div className="flex gap-2">
                <Input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Напр. 10x15"
                  className="flex-1 h-9"
                />
                <Input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="Цена"
                  className="w-24 h-9"
                  min={0}
                  step={0.01}
                />
                <Button size="sm" onClick={handleCreate} disabled={!newName.trim()}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
