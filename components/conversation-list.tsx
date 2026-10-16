"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pin, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

type Convo = {
  id: string;
  title: string;
  pinned: boolean;
  updatedAt: string;
  agent?: { name: string } | null;
};

export function ConversationList({ activeId }: { activeId?: string }) {
  const [items, setItems] = useState<Convo[]>([]);
  const router = useRouter();

  async function load() {
    const res = await fetch("/api/conversations");
    if (res.ok) {
      const data = await res.json();
      setItems(data.conversations);
    }
  }

  useEffect(() => {
    const t0 = setTimeout(load, 0);
    const t = setInterval(load, 15000); // titles update async
    return () => { clearTimeout(t0); clearInterval(t); };
  }, []);

  async function remove(id: string, e: React.MouseEvent) {
    e.preventDefault();
    if (!confirm("Gesprek verwijderen?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setItems((i) => i.filter((c) => c.id !== id));
    if (id === activeId) router.push("/chat");
  }

  async function togglePin(c: Convo, e: React.MouseEvent) {
    e.preventDefault();
    await fetch(`/api/conversations/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !c.pinned }),
    });
    load();
  }

  return (
    <ScrollArea className="flex-1 px-3 py-2">
      <div className="space-y-0.5">
        {items.map((c) => (
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
            <button
              onClick={(e) => togglePin(c, e)}
              className="invisible text-muted-foreground hover:text-foreground group-hover:visible"
              title="Pin"
            >
              <Pin className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={(e) => remove(c.id, e)}
              className="invisible text-muted-foreground hover:text-destructive group-hover:visible"
              title="Verwijderen"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </Link>
        ))}
        {!items.length && (
          <p className="px-3 py-2 text-xs text-muted-foreground">Nog geen gesprekken</p>
        )}
      </div>
    </ScrollArea>
  );
}
