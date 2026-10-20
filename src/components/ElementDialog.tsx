import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toInputValue, type CategoryRow, type ElementRow } from "@/lib/programio";

export type ElementValues = {
  title: string;
  start: string;
  end: string;
  category_id: string;
  location: string;
  subtitle: string;
  notes: string;
};

const NONE = "__none__";

export function ElementDialog({
  open,
  onOpenChange,
  initial,
  categories,
  defaultDay,
  onSubmit,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: ElementRow | null | undefined;
  categories: CategoryRow[];
  defaultDay: string;
  onSubmit: (values: ElementValues) => void;
  busy?: boolean | undefined;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Edit program element" : "New program element"}</DialogTitle>
        </DialogHeader>
        <Fields
          key={initial?.id ?? `new-${defaultDay}`}
          initial={initial}
          categories={categories}
          defaultDay={defaultDay}
          onSubmit={onSubmit}
          busy={busy}
        />
      </DialogContent>
    </Dialog>
  );
}

function Fields({
  initial,
  categories,
  defaultDay,
  onSubmit,
  busy,
}: {
  initial?: ElementRow | null | undefined;
  categories: CategoryRow[];
  defaultDay: string;
  onSubmit: (values: ElementValues) => void;
  busy?: boolean | undefined;
}) {
  const [values, setValues] = useState<ElementValues>({
    title: initial?.title ?? "",
    start: initial ? toInputValue(initial.start_datetime) : `${defaultDay}T09:00`,
    end: initial ? toInputValue(initial.end_datetime) : `${defaultDay}T10:00`,
    category_id: initial?.category_id ?? NONE,
    location: initial?.location ?? "",
    subtitle: initial?.subtitle ?? "",
    notes: initial?.notes ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (new Date(values.end) < new Date(values.start)) {
          setError("End time must be after the start time.");
          return;
        }
        setError(null);
        onSubmit({ ...values, category_id: values.category_id === NONE ? "" : values.category_id });
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="el-title">Title *</Label>
        <Input
          id="el-title"
          required
          value={values.title}
          onChange={(e) => setValues((v) => ({ ...v, title: e.target.value }))}
          placeholder="Frokost"
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="el-start">Starts *</Label>
          <Input
            id="el-start"
            type="datetime-local"
            required
            value={values.start}
            onChange={(e) => setValues((v) => ({ ...v, start: e.target.value }))}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="el-end">Ends *</Label>
          <Input
            id="el-end"
            type="datetime-local"
            required
            value={values.end}
            onChange={(e) => setValues((v) => ({ ...v, end: e.target.value }))}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="el-cat">Category</Label>
        <Select
          value={values.category_id}
          onValueChange={(val) => setValues((v) => ({ ...v, category_id: val }))}
        >
          <SelectTrigger id="el-cat">
            <SelectValue placeholder="No category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No category</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.icon ? `${c.icon} ` : ""}
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
        <Label htmlFor="el-sub">Subtitle</Label>
        <Input
          id="el-sub"
          value={values.subtitle}
          onChange={(e) => setValues((v) => ({ ...v, subtitle: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="el-loc">Location</Label>
        <Input
          id="el-loc"
          value={values.location}
          onChange={(e) => setValues((v) => ({ ...v, location: e.target.value }))}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="el-notes">Internal notes</Label>
        <Textarea
          id="el-notes"
          value={values.notes}
          onChange={(e) => setValues((v) => ({ ...v, notes: e.target.value }))}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="sticky bottom-0 -mx-1 bg-background/95 px-1 pb-1 pt-3 backdrop-blur">
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Save element"}
        </Button>
      </div>
    </form>
  );
}
