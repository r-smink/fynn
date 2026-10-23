"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { SidebarContent } from "@/components/app-sidebar";
import { Logo } from "@/components/logo";

/** Mobiele topbalk + uitklapbare navigatie (alleen zichtbaar < md). */
export function MobileNav(props: {
  userName: string;
  userRole: string;
  logoLight: string;
  logoDark: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="box-content flex h-14 shrink-0 items-center gap-2 border-b px-3 pt-[calc(env(safe-area-inset-top)*2)] md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Menu">
          <Menu className="h-5 w-5" />
        </Button>
        <SheetContent side="left" className="w-72 gap-0 bg-sidebar p-0 pt-[calc(env(safe-area-inset-top)*2)] pb-[env(safe-area-inset-bottom)] [&>button]:top-[calc(1.25rem+env(safe-area-inset-top)*2)]">
          <SheetTitle className="sr-only">Navigatie</SheetTitle>
          <div onClick={() => setOpen(false)} className="flex h-full flex-col">
            <SidebarContent {...props} />
          </div>
        </SheetContent>
      </Sheet>
      <Logo logoLight={props.logoLight} logoDark={props.logoDark} className="h-7 object-contain" />
    </div>
  );
}
