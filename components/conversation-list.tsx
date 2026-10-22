"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ChevronRight, Pin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type Convo = {
  id: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  updatedAt: string;
  agent?: { name: string } | null;
};

const DAY_MS = 24 * 60 * 60 * 1000;
/** Pas vanaf zoveel resterende dagen een "verloopt"-label tonen, anders wordt de lijst druk. */
const WARN_DAYS = 7;

export function ConversationList({ activeId }: { activeId?: string }) {
  const [items, setItems] = useState<Convo[]>([]);
  const [retentionDays, setRetentionDays] = useState(30);
  const [showArchived, setShowArchived] = useState(false);
  const [now, setNow] = useState(0); // gezet bij elke load (Date.now() mag niet tijdens render)
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setItems(data.conversations);
      setNow(Date.now());
      if (data.retentionDays) setRetentionDays(data.retentionDays);
    }
  }

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 15000); // titles update async
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);

  async function remove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm("Gesprek verwijderen?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setItems((i) => i.filter((c) => c.id !== id));
    if (id === activeId) router.push("/chat");
  }

  async function patch(c: Convo, data: Partial<Pick<Convo, "pinned" | "archived">>, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation(); // mobiele nav-sheet sluit anders bij elke klik
    setItems((i) => i.map((x) => (x.id === c.id ? { ...x, ...data } : x)));
    await fetch(`/api/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    load();
  }

  function daysLeft(c: Convo): number | null {
    if (c.pinned || c.archived || !now) return null;
    const left = Math.ceil((new Date(c.updatedAt).getTime() + retentionDays * DAY_MS - now) / DAY_MS);
    return Math.max(0, left);
  }

  // API sorteert al op pinned desc, updatedAt desc → vastgepinde chats staan bovenaan
  const active = items.filter((c) => !c.archived);
  const archived = items.filter((c) => c.archived);

  function row(c: Convo) {
    const left = daysLeft(c);
    // op touch-apparaten is er geen hover → acties op mobiel altijd tonen
    const action = "text-muted-foreground md:invisible md:group-hover:visible";
    return (
      <Link
        key={c.id}
        href={`/chat/${c.id}`}
        className={cn(
          "group flex items-center gap-1 rounded-md px-3 py-1.5 text-sm hover:bg-accent",
          c.id === activeId && "bg-accent font-medium"
        )}
      >
        {c.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
        <span className="flex-1 truncate">{c.title}</span>
        {left !== null && left <= WARN_DAYS && (
          <span
            className="shrink-0 text-[10px] text-muted-foreground group-hover:hidden"
            title={`Wordt over ${left} dag(en) verwijderd. Pin of archiveer om te bewaren.`}
          >
            {left}d
          </span>
        )}
        <button
          onClick={(e) => patch(c, { pinned: !c.pinned }, e)}
          className={cn(action, "hover:text-foreground")}
          title={c.pinned ? "Losmaken" : "Vastpinnen (blijft bovenaan en verloopt niet)"}
        >
          <Pin className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={(e) => patch(c, { archived: !c.archived }, e)}
          className={cn(action, "hover:text-foreground")}
          title={c.archived ? "Terugzetten" : "Archiveren (blijft altijd bewaard)"}
        >
          {c.archived ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Archive className="h-3.5 w-3.5" />}
        </button>
        <button
          onClick={(e) => remove(c.id, e)}
          className={cn(action, "hover:text-destructive")}
          title="Verwijderen"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </Link>
    );
  }

  return (
    <ScrollArea className="flex-1 px-3 py-2">
      <div className="space-y-0.5">
        {active.map(row)}
        {!active.length && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Nog geen gesprekken</p>
        )}
        <p className="px-3 pt-2 text-[10px] leading-snug text-muted-foreground">
          Chats worden na {retentionDays} dagen zonder activiteit verwijderd, behalve vastgepinde en gearchiveerde.
        </p>

        {archived.length > 0 && (
          <div className="pt-3">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex w-full items-center gap-1 px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className={cn("h-3 w-3 transition-transform", showArchived && "rotate-90")} />
              Gearchiveerd ({archived.length})
            </button>
            {showArchived && archived.map(row)}
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
