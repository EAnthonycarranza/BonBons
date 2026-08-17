import { isAdmin } from "@/lib/auth";
import { hasDatabase } from "@/lib/mongodb";
import AdminLogin from "@/components/AdminLogin";
import AdminDashboard from "@/components/AdminDashboard";

export const metadata = { title: "Staff dashboard", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const authed = await isAdmin();
  const dbReady = hasDatabase();
  const passwordSet = Boolean(process.env.ADMIN_PASSWORD);

  return (
    <section className="sec">
      <div className="wrap" style={{ maxWidth: authed ? undefined : 520 }}>
        {authed ? <AdminDashboard dbReady={dbReady} /> : <AdminLogin passwordSet={passwordSet} />}
      </div>
    </section>
  );
}
