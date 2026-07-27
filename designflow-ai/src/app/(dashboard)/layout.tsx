import Link from "next/link";
import {
  LayoutGrid,
  FolderKanban,
  Palette,
  LayoutTemplate,
  Image as ImageIcon,
  Settings,
} from "lucide-react";
import { bootstrapMembership, signOut } from "@/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
  { href: "/projects", label: "Requests", icon: FolderKanban },
  { href: "/brands", label: "Brands", icon: Palette },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/assets", label: "Assets", icon: ImageIcon },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const member = await bootstrapMembership();

  return (
    <div className="flex min-h-screen">
      <aside className="glass sticky top-0 h-screen w-56 shrink-0 border-r p-4">
        <div className="mb-6 px-2 text-sm font-medium">DesignFlow AI</div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1">
        <header className="glass sticky top-0 z-10 flex h-14 items-center justify-end gap-3 border-b px-6">
          <span className="text-sm text-muted-foreground">{member?.name}</span>
          <form action={signOut}>
            <button className="text-sm text-muted-foreground hover:text-foreground">
              Sign out
            </button>
          </form>
        </header>
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
