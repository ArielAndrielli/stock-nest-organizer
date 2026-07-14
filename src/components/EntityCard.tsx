import { MoreVertical, Package } from "lucide-react";
import { type ReactNode } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type EntityCardAction = {
  label: string;
  icon?: ReactNode;
  onSelect: () => void;
  destructive?: boolean;
};

export function EntityCard({
  cover,
  title,
  subtitle,
  badges,
  footer,
  onClick,
  actions,
  className,
}: {
  cover?: string | null;
  title: string;
  subtitle?: string;
  badges?: ReactNode;
  footer?: ReactNode;
  onClick?: () => void;
  actions?: EntityCardAction[];
  className?: string;
}) {
  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (onClick && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all duration-[250ms] ease-out animate-fade-in",
        onClick && "cursor-pointer hover:scale-[1.03] hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-primary/40",
        className,
      )}
    >
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt={title}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Package className="h-10 w-10 text-muted-foreground/60" />
          </div>
        )}
        {actions && actions.length > 0 && (
          <div className="absolute right-2 top-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Opções"
                  onClick={(e) => e.stopPropagation()}
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-card/90 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-card"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                {actions.map((a, i) => (
                  <div key={a.label}>
                    {i > 0 && a.destructive && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onSelect={() => a.onSelect()}
                      className={cn(a.destructive && "text-destructive focus:text-destructive")}
                    >
                      {a.icon}
                      {a.label}
                    </DropdownMenuItem>
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="truncate text-base font-semibold leading-tight">{title}</h3>
            {subtitle && <p className="line-clamp-2 text-sm text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
        {badges && <div className="flex flex-wrap items-center gap-1.5">{badges}</div>}
        {footer && <div className="mt-auto pt-2 text-sm">{footer}</div>}
      </div>
    </div>
  );
}
