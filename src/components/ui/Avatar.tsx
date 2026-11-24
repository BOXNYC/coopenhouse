import { cn } from "@/lib/cn";
import type { User } from "@/lib/types";

const sizes = { xs: "h-6 w-6 text-[10px]", sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-14 w-14 text-lg", xl: "h-20 w-20 text-2xl" };

export function Avatar({ user, size = "md", className, ring }: { user: Pick<User, "initials" | "avatarColor" | "name">; size?: keyof typeof sizes; className?: string; ring?: boolean }) {
  return (
    <span
      role="img"
      aria-label={user.name}
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white", ring && "ring-2 ring-surface", sizes[size], className)}
      style={{ backgroundColor: user.avatarColor }}
    >
      {user.initials}
    </span>
  );
}

export function AvatarStack({ users, max = 3, size = "sm" }: { users: Pick<User, "initials" | "avatarColor" | "name">[]; max?: number; size?: keyof typeof sizes }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <span className="inline-flex items-center -space-x-2">
      {shown.map((u, i) => (
        <Avatar key={i} user={u} size={size} ring />
      ))}
      {extra > 0 && <span className={cn("inline-flex items-center justify-center rounded-full bg-line text-ink-soft font-semibold ring-2 ring-surface", sizes[size])}>+{extra}</span>}
    </span>
  );
}
