import { isAdmin } from "@/lib/auth";
import { hasSupabaseDatabase } from "@/lib/supabase-data";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";
import "./admin.css";

export const metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdmin();
  const dbReady = hasSupabaseDatabase();
  const passwordSet = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <div className="admin-root">
      {authed ? <AdminDashboard dbReady={dbReady} /> : <div className="admin-login-page"><AdminLogin passwordSet={passwordSet} /></div>}
    </div>
  );
}
