import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { CategoryRow } from "@/lib/calendarbetter";

export type CategoryValues = { name: string; color: string; icon: string; text_color: string };

export function CategoryDialog({
  open,
  onOpenChange,
  initial,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CategoryRow | null | undefined;
  onSubmit: (values: CategoryValues) => void;
  busy?: boolean | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit category" : "New category"}</DialogTitle>
        </DialogHeader>
        <CategoryFields
          key={initial?.id ?? "new"}
          initial={initial}
          onSubmit={onSubmit}
          busy={busy}
        />
      </DialogContent>
    </Dialog>
  );
}

function CategoryFields({
  initial,
  onSubmit,
  busy,
}: {
  initial?: CategoryRow | null | undefined;
  onSubmit: (values: CategoryValues) => void;
  busy?: boolean | undefined;
}) {
  const [values, setValues] = useState<CategoryValues>({
    name: initial?.name ?? "",
    color: initial?.color ?? "#C9A227",
    icon: initial?.icon ?? "",
    text_color: initial?.text_color ?? "",
  });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(values);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="cat-name">Name *</Label>
        <Input
          id="cat-name"
          required
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          placeholder="Meal"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="cat-color">Color</Label>
          <Input
            id="cat-color"
            type="color"
            className="h-10 w-full p-1"
            value={values.color}
            onChange={(e) => setValues((v) => ({ ...v, color: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cat-icon">Emoji</Label>
          <Input
            id="cat-icon"
            value={values.icon}
            onChange={(e) => setValues((v) => ({ ...v, icon: e.target.value }))}
            placeholder="🍽️"
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="cat-text">Text color override</Label>
        <Input
          id="cat-text"
          value={values.text_color}
          onChange={(e) => setValues((v) => ({ ...v, text_color: e.target.value }))}
          placeholder="Automatic"
        />
      </div>
      <div className="sticky bottom-0 -mx-1 bg-background/95 px-1 pb-1 pt-3 backdrop-blur">
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Save category"}
        </Button>
      </div>
    </form>
  );
}
