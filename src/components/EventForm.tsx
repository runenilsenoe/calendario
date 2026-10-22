import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EventRow } from "@/lib/calendarbetter";

export type EventFormValues = {
  name: string;
  subtitle: string;
  start_date: string;
  end_date: string;
  location: string;
  logo_url: string;
  accent_color: string;
};

const MAX_LOGO_DIMENSION = 1200;
const MAX_LOGO_BASE64_LENGTH = 750_000; // ~560 KB raw

function resizeImageToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_LOGO_DIMENSION || height > MAX_LOGO_DIMENSION) {
          const scale = MAX_LOGO_DIMENSION / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not prepare image canvas"));
          return;
        }
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        const jpeg = canvas.toDataURL("image/jpeg", 0.85);
        if (jpeg.length <= MAX_LOGO_BASE64_LENGTH) {
          resolve(jpeg);
          return;
        }
        // Try a lower quality JPEG if the first attempt is too large.
        const lowQuality = canvas.toDataURL("image/jpeg", 0.6);
        if (lowQuality.length <= MAX_LOGO_BASE64_LENGTH) {
          resolve(lowQuality);
          return;
        }
        reject(new Error("Logo is too large after resizing. Try a smaller image."));
      };
      img.onerror = () => reject(new Error("Could not load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export function EventForm({
  initial,
  submitLabel,
  onSubmit,
  busy,
}: {
  initial?: EventRow;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void | Promise<void>;
  busy?: boolean;
}) {
  const [values, setValues] = useState<EventFormValues>({
    name: initial?.name ?? "",
    subtitle: initial?.subtitle ?? "",
    start_date: initial?.start_date ?? "",
    end_date: initial?.end_date ?? "",
    location: initial?.location ?? "",
    logo_url: initial?.logo_url ?? "",
    accent_color: initial?.accent_color ?? "#C9A227",
  });
  const [error, setError] = useState<string | null>(null);
  const [logoBusy, setLogoBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (k: keyof EventFormValues) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setValues((v) => ({ ...v, [k]: e.target.value }));

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const startDate = e.target.value;
    setValues((v) => ({
      ...v,
      start_date: startDate,
      end_date: v.end_date && v.end_date < startDate ? startDate : v.end_date,
    }));
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const endDate = e.target.value;
    setValues((v) => ({
      ...v,
      end_date: endDate < v.start_date ? v.start_date : endDate,
    }));
  };

  const isDataUrl = values.logo_url.startsWith("data:");

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      return;
    }
    setLogoBusy(true);
    setError(null);
    try {
      const dataUrl = await resizeImageToDataUrl(file);
      setValues((v) => ({ ...v, logo_url: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not process logo.");
    } finally {
      setLogoBusy(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setValues((v) => ({ ...v, logo_url: "" }));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (values.end_date < values.start_date) {
          setError("End date must be on or after the start date.");
          return;
        }
        setError(null);
        onSubmit(values);
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="name">Event name *</Label>
        <Input
          id="name"
          required
          value={values.name}
          onChange={set("name")}
          placeholder="En dag sammen"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="subtitle">Subtitle</Label>
        <Input
          id="subtitle"
          value={values.subtitle}
          onChange={set("subtitle")}
          placeholder="Små øyeblikk, gode minner"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="start_date">Start date *</Label>
          <Input
            id="start_date"
            type="date"
            required
            value={values.start_date}
            onChange={handleStartDateChange}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="end_date">End date *</Label>
          <Input
            id="end_date"
            type="date"
            required
            value={values.end_date}
            onChange={handleEndDateChange}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          value={values.location}
          onChange={set("location")}
          placeholder="Samfunnshuset"
        />
      </div>
      <div className="space-y-2">
        <Label>Logo</Label>
        <div className="rounded-xl border border-border bg-card p-4">
          {values.logo_url ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center rounded-lg bg-white p-3">
                <img
                  src={values.logo_url}
                  alt="Logo preview"
                  className="max-h-32 max-w-full object-contain"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Change
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                disabled={logoBusy}
              />
              <p className="text-xs text-muted-foreground">
                Upload a PNG, JPG or other image. It will be resized so it does not slow down
                exports.
              </p>
            </div>
          )}
          {!isDataUrl ? (
            <div className="mt-3 space-y-2">
              <Label htmlFor="logo_url" className="text-xs text-muted-foreground">
                Or paste an image URL
              </Label>
              <Input
                id="logo_url"
                value={values.logo_url}
                onChange={set("logo_url")}
                placeholder="https://…/logo.png"
              />
            </div>
          ) : null}
        </div>
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      <div className="sticky bottom-0 -mx-1 bg-background/95 px-1 pb-1 pt-3 backdrop-blur">
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
