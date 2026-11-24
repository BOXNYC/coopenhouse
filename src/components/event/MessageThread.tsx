"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { Avatar, Button, Card, Input, SectionTitle, SendIcon, useToast } from "@/components/ui";
import { sendMessage } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatTime, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { EventCtx } from "./shared";

export function MessageThread({ ctx, readOnly }: { ctx: EventCtx; readOnly?: boolean }) {
  const { req, me, other, now } = ctx;
  const toast = useToast();
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const send = useMutation(sendMessage, { onSuccess: () => setText(""), onError: (e) => toast.error(e.message) });
  const count = req.messages.length;
  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [count]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim() || send.loading) return;
    send.mutate(req.id, me.id, text);
  };

  return (
    <Card>
      <SectionTitle>Messages{other ? ` with ${other.name.split(" ")[0]}` : ""}</SectionTitle>
      <div ref={listRef} className="max-h-72 space-y-3 overflow-y-auto rounded-xl bg-paper p-3" role="log" aria-live="polite" aria-label="Message thread">
        {count === 0 ? (
          <p className="py-4 text-center text-sm text-muted">No messages yet. Say hello and confirm your arrival plan.</p>
        ) : (
          req.messages.map((m) => {
            const mine = m.senderId === me.id;
            return (
              <div key={m.id} className={cn("flex items-end gap-2", mine && "flex-row-reverse")}>
                {!mine && other && <Avatar user={other} size="xs" />}
                <div className={cn("max-w-[80%] rounded-2xl px-3 py-2 text-sm", mine ? "rounded-br-sm bg-brand-700 text-white" : "rounded-bl-sm bg-surface text-ink shadow-sm")}>
                  <p className="whitespace-pre-wrap break-words">{m.text}</p>
                  <p className={cn("mt-0.5 text-[10px]", mine ? "text-white/70" : "text-muted")} title={relativeTime(m.sentAt, now)}>
                    {formatTime(m.sentAt)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      {!readOnly && (
        <form onSubmit={submit} className="mt-3 flex items-center gap-2">
          <Input aria-label="Write a message" placeholder="Write a message" value={text} onChange={(e) => setText(e.target.value)} maxLength={500} />
          <Button type="submit" aria-label="Send message" loading={send.loading} disabled={!text.trim()} icon={<SendIcon size={16} />} className="shrink-0 px-3" />
        </form>
      )}
    </Card>
  );
}
