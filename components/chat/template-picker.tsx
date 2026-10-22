"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ChatTemplate = {
  id: string;
  title: string;
  category: string;
  prompt: string;
};

export function TemplatePicker({
  agentId,
  onSelect,
}: {
  agentId: string | null;
  onSelect: (template: ChatTemplate) => void;
}) {
  const [templates, setTemplates] = useState<ChatTemplate[]>([]);

  useEffect(() => {
    const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : "";
    fetch(`/api/templates${query}`)
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates ?? []))
      .catch(() => setTemplates([]));
  }, [agentId]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <FileText className="h-4 w-4" />
            Template
            <ChevronDown className="h-3 w-3 opacity-50" />
          </Button>
        }
      />
      <DropdownMenuContent align="end" className="w-80">
        {templates.map((template) => (
          <DropdownMenuItem
            key={template.id}
            onClick={() => onSelect(template)}
            className="items-start gap-2"
          >
            <FileText className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 text-sm font-medium">
                {template.title}
                <Check className="ml-auto hidden h-3.5 w-3.5 text-primary" />
              </div>
              <div className="text-xs text-muted-foreground">{template.category}</div>
              <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{template.prompt}</div>
            </div>
          </DropdownMenuItem>
        ))}
        {!templates.length && (
          <div className="px-2 py-3 text-xs text-muted-foreground">
            Geen templates aan deze agent gekoppeld.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
