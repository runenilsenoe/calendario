import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, Link2, Trash2 } from "lucide-react";
import {
  addCollaborator,
  fetchCollaborators,
  removeCollaborator,
  setEventPublic,
  updateCollaboratorRole,
} from "@/lib/api";
import { shareUrl, type EventRow } from "@/lib/programio";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ShareDialog({
  event,
  open,
  onOpenChange,
  isOwner,
}: {
  event: EventRow;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isOwner: boolean;
}) {
  const qc = useQueryClient();
  const [identifier, setIdentifier] = useState("");
  const [role, setRole] = useState<"viewer" | "editor">("editor");
  const [copied, setCopied] = useState(false);

  const url = shareUrl(event.public_slug);

  const collabs = useQuery({
    queryKey: ["collaborators", event.id],
    queryFn: () => fetchCollaborators({ data: event.id }),
    enabled: open,
  });

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["collaborators", event.id] });
    qc.invalidateQueries({ queryKey: ["event", event.id] });
  };

  const togglePublic = useMutation({
    mutationFn: (v: boolean) => setEventPublic({ data: { eventId: event.id, isPublic: v } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const invite = useMutation({
    mutationFn: () => addCollaborator({ data: { eventId: event.id, identifier, role } }),
    onSuccess: () => {
      setIdentifier("");
      refresh();
      toast.success("Collaborator invited");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const changeRole = useMutation({
    mutationFn: ({ id, r }: { id: string; r: "viewer" | "editor" }) =>
      updateCollaboratorRole({ data: { eventId: event.id, id, role: r } }),
    onSuccess: refresh,
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => removeCollaborator({ data: { eventId: event.id, id } }),
    onSuccess: () => {
      refresh();
      toast.success("Access removed");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
      toast.success("Link copied");
    } catch {
      toast.error("Could not copy the link");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share “{event.name}”</DialogTitle>
        </DialogHeader>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 font-medium">
                <Link2 className="h-4 w-4" /> Public view link
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Anyone with the link can view the program — no account needed.
              </p>
            </div>
            <Switch
              checked={event.is_public}
              disabled={!isOwner || togglePublic.isPending}
              onCheckedChange={(v) => togglePublic.mutate(v)}
            />
          </div>

          {event.is_public ? (
            <div className="flex gap-2">
              <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
              <Button type="button" variant="outline" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          ) : null}
        </section>

        <section className="space-y-3 rounded-xl border border-border p-4">
          <div>
            <p className="font-medium">Invite collaborators</p>
            <p className="mt-1 text-sm text-muted-foreground">
              They get access with the email address or phone number they sign in with.
            </p>
          </div>

          {isOwner ? (
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!identifier.trim()) return;
                invite.mutate();
              }}
            >
              <Input
                required
                placeholder="name@example.com or +47 912 34 567"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="min-w-[12rem] flex-1"
              />
              <Select value={role} onValueChange={(v) => setRole(v as "viewer" | "editor")}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button type="submit" disabled={invite.isPending}>
                Invite
              </Button>
            </form>
          ) : (
            <p className="text-sm text-muted-foreground">Only the event owner can invite people.</p>
          )}

          <ul className="space-y-2">
            {(collabs.data ?? []).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-muted/40 px-3 py-2"
              >
                <span className="truncate text-sm">{c.identifier}</span>
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <>
                      <Select
                        value={c.role}
                        onValueChange={(v) =>
                          changeRole.mutate({ id: c.id, r: v as "viewer" | "editor" })
                        }
                      >
                        <SelectTrigger className="h-8 w-28">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="viewer">Viewer</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label={`Remove ${c.identifier}`}
                        onClick={() => remove.mutate(c.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <span className="text-sm capitalize text-muted-foreground">{c.role}</span>
                  )}
                </div>
              </li>
            ))}
            {collabs.data && collabs.data.length === 0 ? (
              <li className="text-sm text-muted-foreground">No collaborators yet.</li>
            ) : null}
          </ul>
        </section>

        <p className="text-xs text-muted-foreground">
          <Label className="text-xs">Editors</Label> can change the program. Viewers can only look
          at it.
        </p>
      </DialogContent>
    </Dialog>
  );
}
