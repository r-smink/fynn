import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSuperadmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

export default async function AllChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ user?: string }>;
}) {
  const admin = await requireSuperadmin();
  if (!admin) redirect("/chat");
  const { user: userId } = await searchParams;

  const [users, conversations] = await Promise.all([
    db.user.findMany({
      select: { id: true, name: true, email: true, _count: { select: { conversations: true } } },
      orderBy: { name: "asc" },
    }),
    db.conversation.findMany({
      where: userId ? { userId } : {},
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        user: { select: { name: true, email: true } },
        agent: { select: { name: true } },
        _count: { select: { messages: true } },
      },
    }),
  ]);

  const chip = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1 text-xs hover:bg-accent",
      active && "bg-primary text-primary-foreground hover:bg-primary/90",
    );

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Alle chats</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Alleen zichtbaar voor superadmins · alleen lezen.
      </p>

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/all-chats" className={chip(!userId)}>Iedereen</Link>
        {users.map((u) => (
          <Link key={u.id} href={`/all-chats?user=${u.id}`} className={chip(userId === u.id)}>
            {u.name || u.email} ({u._count.conversations})
          </Link>
        ))}
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Titel</TableHead><TableHead>Gebruiker</TableHead><TableHead>Agent</TableHead>
            <TableHead>Berichten</TableHead><TableHead>Bijgewerkt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {conversations.map((c) => (
            <TableRow key={c.id}>
              <TableCell>
                <Link href={`/all-chats/${c.id}`} className="font-medium hover:underline">
                  {c.title || "Nieuw gesprek"}
                </Link>
              </TableCell>
              <TableCell>{c.user.name || c.user.email}</TableCell>
              <TableCell>{c.agent?.name ?? "—"}</TableCell>
              <TableCell>{c._count.messages}</TableCell>
              <TableCell className="text-xs">{new Date(c.updatedAt).toLocaleString("nl-NL")}</TableCell>
            </TableRow>
          ))}
          {conversations.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                Geen gesprekken gevonden.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
