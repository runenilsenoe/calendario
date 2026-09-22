import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import type { ExportOptions } from "@/components/exports/DayPoster";
import { BACKGROUNDS, PALETTES, type CardStyle, type PaletteKey } from "@/lib/poster-style";

const LANGUAGES: { locale: string; label: string }[] = [
  { locale: "nb-NO", label: "Norsk" },
  { locale: "en-GB", label: "English" },
];

const CARD_STYLES: { key: CardStyle; label: string }[] = [
  { key: "filled", label: "Helfarget" },
  { key: "outline", label: "Strek" },
  { key: "paper", label: "Papir" },
  { key: "glass", label: "Glass" },
];

type Props = {
  options: ExportOptions;
  onChange: (next: ExportOptions) => void;
};

export function GraphicsSettings({ options, onChange }: Props) {
  const set = (patch: Partial<ExportOptions>) => onChange({ ...options, ...patch });
  const style = options.cardStyle ?? "paper";
  const opacity = options.cardOpacity ?? 1;
  const palette: PaletteKey = options.palette ?? "category";
  const background = options.backgroundColor ?? "#14120f";
  const locale = options.locale ?? "nb-NO";
  const fontScale = options.fontScale ?? 1;

  return (
    <div className="space-y-4 rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex flex-wrap gap-4">
        <Toggle
          id="opt-subtitle"
          label="Undertekst"
          checked={options.includeSubtitle}
          onChange={(v) => set({ includeSubtitle: v })}
        />
        <Toggle
          id="opt-location"
          label="Sted"
          checked={options.includeLocation}
          onChange={(v) => set({ includeLocation: v })}
        />
        <Toggle id="opt-logo" label="Logo" checked={options.includeLogo} onChange={(v) => set({ includeLogo: v })} />
        <Toggle
          id="opt-grid"
          label="Tidslinjer"
          checked={options.includeGrid !== false}
          onChange={(v) => set({ includeGrid: v })}
        />
        <Toggle
          id="opt-footer"
          label="Bunntekst"
          checked={options.includeFooter !== false}
          onChange={(v) => set({ includeFooter: v })}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Kortstil</Label>
          <div className="flex flex-wrap gap-2">
            {CARD_STYLES.map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => set({ cardStyle: s.key })}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  style === s.key
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="opt-opacity">Gjennomsiktighet · {Math.round(opacity * 100)}%</Label>
          <Slider
            id="opt-opacity"
            min={20}
            max={100}
            step={5}
            value={[Math.round(opacity * 100)]}
            onValueChange={([v]) => set({ cardOpacity: (v ?? 100) / 100 })}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="opt-fontsize">Skriftstørrelse · {Math.round(fontScale * 100)}%</Label>
          <Slider
            id="opt-fontsize"
            min={80}
            max={180}
            step={5}
            value={[Math.round(fontScale * 100)]}
            onValueChange={([v]) => set({ fontScale: (v ?? 100) / 100 })}
          />
        </div>

        <div className="space-y-2">
          <Label>Fargepalett</Label>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.key}
                type="button"
                onClick={() => set({ palette: p.key })}
                title={p.label}
                className={`flex items-center gap-2 rounded-full border px-2.5 py-1.5 text-xs transition-colors ${
                  palette === p.key
                    ? "border-primary bg-accent text-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                <span className="flex">
                  {p.colors.slice(0, 4).map((c) => (
                    <span
                      key={c}
                      className="h-3.5 w-3.5 rounded-full ring-1 ring-background"
                      style={{ background: c, marginLeft: -4 }}
                    />
                  ))}
                </span>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Språk</Label>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => (
              <button
                key={l.locale}
                type="button"
                onClick={() => set({ locale: l.locale })}
                className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  locale === l.locale
                    ? "border-transparent bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Bakgrunnsfarge</Label>
          <div className="flex flex-wrap items-center gap-2">
            {BACKGROUNDS.map((b) => (
              <button
                key={b.key}
                type="button"
                title={b.label}
                onClick={() => set({ backgroundColor: b.hex })}
                className={`h-8 w-8 rounded-full border-2 transition-colors ${
                  background.toLowerCase() === b.hex.toLowerCase() ? "border-primary" : "border-border"
                }`}
                style={{ background: b.hex }}
              >
                <span className="sr-only">{b.label}</span>
              </button>
            ))}
            <Input
              type="color"
              aria-label="Egendefinert bakgrunnsfarge"
              className="h-8 w-12 p-1"
              value={background}
              onChange={(e) => set({ backgroundColor: e.target.value })}
            />
          </div>
        </div>

      </div>
    </div>
  );
}

function Toggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}
