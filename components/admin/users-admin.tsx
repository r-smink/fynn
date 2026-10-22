"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Pencil, Plus, Trash2, User as UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "sonner";
import { isAdminRole, isSuperadmin } from "@/lib/roles";

type U = {
  id: string; email: string; name: string; role: string;
  createdAt: string | Date;
  brandId?: string | null;
  brand?: { id: string; name: string } | null;
};
type BrandLite = { id: string; name: string };

export function UsersAdmin({
  users, brands, canCreateSuperadmin,
}: { users: U[]; brands: BrandLite[]; canCreateSuperadmin: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editUser, setEditUser] = useState<U | null>(null);
  const [f, setF] = useState({ email: "", name: "", password: "", role: "member", brandId: "" });
  const [e, setE] = useState({ name: "", role: "member", password: "", brandId: "" });

  async function save() {
    const res = await fetch("/api/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...f, brandId: f.brandId || null }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    setOpen(false);
    setF({ email: "", name: "", password: "", role: "member", brandId: "" });
    toast.success("Gebruiker aangemaakt");
    router.refresh();
  }

  function openEdit(u: U) {
    setEditUser(u);
    setE({ name: u.name, role: u.role, password: "", brandId: u.brandId ?? "" });
  }

  async function saveEdit() {
    if (!editUser) return;
    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: e.name,
        role: e.role,
        ...(e.password ? { password: e.password } : {}),
        ...(canCreateSuperadmin ? { brandId: e.brandId || null } : {}),
      }),
    });
    const data = await res.json();
    if (!res.ok) { toast.error(data.error); return; }
    setEditUser(null);
    toast.success("Gebruiker bijgewerkt");
    router.refresh();
  }

  async function resetPassword(u: U) {
    const pw = window.prompt(`Nieuw wachtwoord voor ${u.name} (minimaal 8 tekens):`);
    if (!pw) return;
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: pw }),
    });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Wachtwoord resetten is mislukt");
    else toast.success(`Wachtwoord van ${u.name} is aangepast`);
  }

  async function removeUser(u: U) {
    if (!window.confirm(`Gebruiker ${u.name} (${u.email}) echt verwijderen? Al zijn chats gaan mee weg.`)) return;
    const res = await fetch(`/api/users/${u.id}`, { method: "DELETE" });
    const data = await res.json();
    if (!res.ok) toast.error(data.error ?? "Verwijderen is mislukt");
    else { toast.success(`${u.name} verwijderd`); router.refresh(); }
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
            <TableHead>E-mail</TableHead><TableHead>Rol</TableHead><TableHead>Brand</TableHead>
            <TableHead>Aangemaakt</TableHead><TableHead className="w-28"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((u) => (
            <TableRow key={u.id}>
              <TableCell><UserIcon className="h-4 w-4 text-muted-foreground" /></TableCell>
              <TableCell>{u.name}</TableCell>
              <TableCell>{u.email}</TableCell>
              <TableCell><Badge variant={isAdminRole(u.role) ? "default" : "secondary"}>{u.role}</Badge></TableCell>
              <TableCell className="text-xs">{u.brand?.name ?? "—"}</TableCell>
              <TableCell className="text-xs">{new Date(u.createdAt).toLocaleDateString("nl-NL")}</TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Button variant="ghost" size="icon" title="Bewerken" onClick={() => openEdit(u)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Wachtwoord resetten" onClick={() => void resetPassword(u)}>
                    <KeyRound className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost" size="icon" title="Verwijderen"
                    disabled={isSuperadmin(u.role) && !canCreateSuperadmin}
                    onClick={() => void removeUser(u)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </TableCell>
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
                  {canCreateSuperadmin && <SelectItem value="superadmin">superadmin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {canCreateSuperadmin && (
              <div className="space-y-1">
                <Label>Brand (company)</Label>
                <Select value={f.brandId} onValueChange={(v) => setF({ ...f, brandId: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Geen koppeling" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Members aan een brand zien alleen agents, kennisbank, templates en usage van die brand.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>Annuleren</Button>
              <Button onClick={save} disabled={!f.email || !f.name || !f.password}>Aanmaken</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editUser} onOpenChange={(o) => !o && setEditUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editUser?.name} bewerken</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-1">
              <Label>Naam</Label>
              <Input value={e.name} onChange={(ev) => setE({ ...e, name: ev.target.value })} />
            </div>
            <div className="space-y-1">
              <Label>Rol</Label>
              <Select value={e.role} onValueChange={(v) => setE({ ...e, role: v ?? "member" })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">member</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  {canCreateSuperadmin && <SelectItem value="superadmin">superadmin</SelectItem>}
                </SelectContent>
              </Select>
            </div>
            {canCreateSuperadmin && (
              <div className="space-y-1">
                <Label>Brand (company)</Label>
                <Select value={e.brandId} onValueChange={(v) => setE({ ...e, brandId: v ?? "" })}>
                  <SelectTrigger><SelectValue placeholder="Geen koppeling" /></SelectTrigger>
                  <SelectContent>
                    {brands.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost" size="sm" className="px-0"
                  onClick={() => setE({ ...e, brandId: "" })}
                >
                  Koppeling verwijderen
                </Button>
              </div>
            )}
            <div className="space-y-1">
              <Label>Nieuw wachtwoord (leeg = ongewijzigd)</Label>
              <Input type="password" value={e.password} onChange={(ev) => setE({ ...e, password: ev.target.value })} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditUser(null)}>Annuleren</Button>
              <Button onClick={saveEdit} disabled={!e.name}>Opslaan</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
