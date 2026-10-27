import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { IconButton } from "./icon-button";
import { cx } from "./cx";

export interface MenuItem {
  label: ReactNode;
  icon?: ReactNode;
  onSelect: () => void;
  tone?: "default" | "danger";
  disabled?: boolean;
}

export interface MenuProps {
  label: string;
  icon?: ReactNode;
  items: MenuItem[];
  align?: "start" | "end";
  className?: string;
  triggerVariant?: "ghost" | "secondary";
  triggerSize?: "icon" | "icon-sm";
}

export function Menu({
  label,
  icon,
  items,
  align = "end",
  className,
  triggerVariant = "ghost",
  triggerSize = "icon-sm",
}: MenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cx("ui-menu", className)}>
      <IconButton
        label={label}
        size={triggerSize}
        variant={triggerVariant}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {icon}
      </IconButton>
      {open && (
        <div className="ui-menu__panel" role="menu" data-align={align}>
          {items.map((item, index) => (
            <button
              key={index}
              type="button"
              role="menuitem"
              disabled={item.disabled}
              className={cx("ui-menu__item", item.tone === "danger" && "ui-menu__item--danger")}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
