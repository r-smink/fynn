"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";

type U = { id: string; email: string; name: string; role: string; createdAt: string | Date };

export function UsersAdmin({ users }: { users: U[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ email: "", name: "", password: "", role: "member" });

  async function save() {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    setOpen(false);
    setF({ email: "", name: "", password: "", role: "member" });
    toast.success("Gebruiker aangemaakt");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}><Plus className="mr-1 h-4 w-4" /> Nieuwe gebruiker</Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead></TableHead><TableHead>Naam</TableHead>
            <TableHead>E-mail</TableHead><TableHead>Rol</TableHead><TableHead>Aangemaakt</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell><UserIcon className="h-4 w-4 text-muted-foreground" /></TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><Badge variant={u.role === "admin" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
              <TableCell className="text-xs">{new Date(u.createdAt).toLocaleDateString("nl-NL")}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Nieuwe gebruiker</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label>Naam</Label>
              <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>E-mail</Label>
              <Input type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Wachtwoord</Label>
              <Input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={f.role} onValueChange={(v) => setF({ ...f, role: v ?? "member" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">member</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.email || !f.name || !f.password}>Aanmaken</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
