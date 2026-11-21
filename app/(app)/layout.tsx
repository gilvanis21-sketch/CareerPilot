import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { logoutAction } from "../(auth)/actions";
import { Button } from "@/components/ui";

const NAV = [
  ["/dashboard", "Tableau de bord"], ["/profile", "Mon profil"], ["/cv", "Mon CV"],
  ["/offers", "Offres"], ["/applications", "Candidatures"], ["/spontaneous", "Spontanées"],
  ["/stats", "Statistiques"], ["/settings", "Paramètres"],
];

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <aside className="border-b border-slate-200 bg-teal-950 p-4 text-teal-50 md:min-h-screen md:w-60 md:border-b-0">
        <p className="mb-4 text-lg font-semibold">CareerPilot</p>
        <nav className="flex flex-wrap gap-1 md:flex-col" aria-label="Navigation principale">
          {NAV.map(([href, label]) => (
            <Link key={href} href={href} className="rounded-lg px-3 py-2 text-sm hover:bg-teal-900">{label}</Link>
          ))}
        </nav>
        <form action={logoutAction} className="mt-4">
          <p className="mb-2 truncate text-xs text-teal-200">{user.email}</p>
          <Button variant="ghost" type="submit" className="w-full">Déconnexion</Button>
        </form>
      </aside>
      <main className="flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
