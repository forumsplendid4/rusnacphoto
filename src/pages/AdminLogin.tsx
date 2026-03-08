import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { setAdminAuthenticated } from "@/lib/admin-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Camera, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // We need to verify password server-side ideally, but for simple password approach
      // we'll use a Supabase RPC or direct check. Since app_settings has RLS blocking reads,
      // we use an edge function or RPC. For now, let's create a simple check via RPC.
      const { data, error } = await (supabase.rpc as any)("verify_admin_password", {
        input_password: password,
      });

      if (error) throw error;

      if (data) {
        setAdminAuthenticated(true);
        navigate("/admin");
      } else {
        toast.error("Неверный пароль");
      }
    } catch (err) {
      console.error(err);
      toast.error("Ошибка при проверке пароля");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <Camera className="w-12 h-12 mx-auto text-primary mb-4" />
          <h1 className="text-2xl font-display font-semibold">Админ-панель</h1>
          <p className="text-muted-foreground mt-1">Введите пароль для входа</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            <Lock className="w-4 h-4 mr-2" />
            {loading ? "Проверка..." : "Войти"}
          </Button>
        </form>
      </div>
    </div>
  );
}
