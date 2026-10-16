"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, Building2, Database, FileText, BarChart3, Users,
  MessageSquarePlus, Settings, LogOut,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConversationList } from "@/components/conversation-list";
import { Separator } from "@/components/ui/separator";

const NAV = [
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/knowledge", label: "Kennisbank", icon: Database },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/users", label: "Gebruikers", icon: Users, admin: true },
  { href: "/settings", label: "Instellingen", icon: Settings, admin: true },
];

export function AppSidebar({ userName, userRole }: { userName: string; userRole: string }) {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r bg-sidebar">
      <div className="flex items-center gap-2 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary font-bold text-primary-foreground">
          F
        </div>
        <span className="text-lg font-bold">FYNN</span>
      </div>

      <div className="px-3">
        <Link
          href="/chat"
          className={cn(buttonVariants({ variant: "default" }), "w-full justify-start gap-2")}
        >
          <MessageSquarePlus className="h-4 w-4" /> Nieuw gesprek
        </Link>
      </div>

      <ConversationList activeId={pathname.startsWith("/chat/") ? pathname.split("/")[2] : undefined} />

      <Separator />

      <nav className="space-y-0.5 px-3 py-2">
        {NAV.filter((n) => !n.admin || userRole === "admin").map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground",
              pathname.startsWith(href) && "bg-accent text-accent-foreground font-medium"
            )}
          >
            <Icon className="h-4 w-4" /> {label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto border-t p-3">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm text-muted-foreground">{userName}</span>
          <Button
            variant="ghost"
            size="icon"
            title="Uitloggen"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
