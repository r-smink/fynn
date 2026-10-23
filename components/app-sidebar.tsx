"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bot, Building2, CalendarClock, Image as ImageIcon, Database, FileText, BarChart3, Users, Waypoints,
  MessageSquarePlus, MessagesSquare, Settings, LogOut, Sun, Moon, Monitor,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { ConversationList } from "@/components/conversation-list";
import { Separator } from "@/components/ui/separator";
import { isAdminRole, isSuperadmin } from "@/lib/roles";
import { Logo } from "@/components/logo";

const NAV = [
  { href: "/images", label: "Beeldstudio", icon: ImageIcon },
  { href: "/agents", label: "Agents", icon: Bot },
  { href: "/brands", label: "Brands", icon: Building2 },
  { href: "/knowledge", label: "Kennisbank", icon: Database },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/fusions", label: "Fusion", icon: Waypoints },
  { href: "/tasks", label: "Taken", icon: CalendarClock },
  { href: "/usage", label: "Usage", icon: BarChart3 },
  { href: "/users", label: "Gebruikers", icon: Users, admin: true },
  { href: "/settings", label: "Instellingen", icon: Settings, admin: true },
  { href: "/all-chats", label: "Alle chats", icon: MessagesSquare, superadmin: true },
];

const subscribeToMount = () => () => {};

export function SidebarContent({
  userName,
  userRole,
  logoLight,
  logoDark,
}: {
  userName: string;
  userRole: string;
  logoLight: string;
  logoDark: string;
}) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribeToMount, () => true, () => false);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center px-4 py-4">
        <Logo logoLight={logoLight} logoDark={logoDark} className="h-8 max-w-full object-contain" />
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
        {NAV.filter((n) => (!n.admin || isAdminRole(userRole)) && (!n.superadmin || isSuperadmin(userRole))).map(({ href, label, icon: Icon }) => (
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
          <div className="flex shrink-0 items-center">
            {mounted ? (
              <>
                {[
                  { value: "light", label: "Licht", Icon: Sun },
                  { value: "dark", label: "Donker", Icon: Moon },
                  { value: "system", label: "Systeem", Icon: Monitor },
                ].map(({ value, label, Icon }) => (
                  <Button
                    key={value}
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title={label}
                    aria-label={label}
                    aria-pressed={theme === value}
                    onClick={() => setTheme(value)}
                  >
                    <Icon className="h-4 w-4" />
                  </Button>
                ))}
              </>
            ) : (
              <div className="h-8 w-24" aria-hidden="true" />
            )}
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
      </div>
    </div>
  );
}

export function AppSidebar(props: {
  userName: string;
  userRole: string;
  logoLight: string;
  logoDark: string;
}) {
  return (
    <aside className="hidden h-dvh w-64 shrink-0 flex-col border-r bg-sidebar pt-[calc(env(safe-area-inset-top)*2)] md:flex">
      <SidebarContent {...props} />
    </aside>
  );
}
