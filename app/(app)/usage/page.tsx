import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card } from "@/components/ui/card";

export default async function UsagePage() {
  await requireUser();
  const [events, totals, byModel] = await Promise.all([
    db.usageEvent.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { user: { select: { name: true } } },
    }),
    db.usageEvent.aggregate({
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: true,
    }),
    db.usageEvent.groupBy({
      by: ["model"],
      _sum: { promptTokens: true, completionTokens: true, cost: true },
      _count: true,
      orderBy: { _sum: { cost: "desc" } },
    }),
  ]);

  const usd = (n: number) => `$${n.toFixed(4)}`;

  return (
    <div className="h-full overflow-auto p-6">
      <h1 className="mb-1 text-2xl font-bold">Usage & kosten</h1>
      <p className="mb-6 text-sm text-muted-foreground">Geschatte OpenRouter-kosten op basis van catalogusprijzen.</p>

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Requests</div>
          <div className="text-2xl font-bold">{totals._count}</div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Tokens</div>
          <div className="text-2xl font-bold">
            {((totals._sum.promptTokens ?? 0) + (totals._sum.completionTokens ?? 0)).toLocaleString("nl-NL")}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-sm text-muted-foreground">Geschatte kosten</div>
          <div className="text-2xl font-bold">{usd(totals._sum.cost ?? 0)}</div>
        </Card>
      </div>

      <h2 className="mb-2 font-semibold">Per model</h2>
      <Table className="mb-8">
        <TableHeader>
          <TableRow>
            <TableHead>Model</TableHead><TableHead>Calls</TableHead>
            <TableHead>In tokens</TableHead><TableHead>Uit tokens</TableHead><TableHead>Kosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {byModel.map((m) => (
            <TableRow key={m.model}>
              <TableCell className="font-mono text-xs">{m.model}</TableCell>
              <TableCell>{m._count}</TableCell>
              <TableCell>{(m._sum.promptTokens ?? 0).toLocaleString("nl-NL")}</TableCell>
              <TableCell>{(m._sum.completionTokens ?? 0).toLocaleString("nl-NL")}</TableCell>
              <TableCell>{usd(m._sum.cost ?? 0)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <h2 className="mb-2 font-semibold">Recente events</h2>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tijd</TableHead><TableHead>Gebruiker</TableHead>
            <TableHead>Model</TableHead><TableHead>Tokens</TableHead><TableHead>Kosten</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
              <TableCell className="text-xs">{new Date(e.createdAt).toLocaleString("nl-NL")}</TableCell>
              <TableCell>{e.user?.name ?? "—"}</TableCell>
              <TableCell className="font-mono text-xs">{e.model}</TableCell>
              <TableCell>{e.promptTokens + e.completionTokens}</TableCell>
              <TableCell>{usd(e.cost)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
