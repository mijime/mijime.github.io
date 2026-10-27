import type { ReactNode } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Height of the sheet container. */
  height?: string;
  /** Max height of the sheet container. */
  maxHeight?: string;
}

/**
 * Mobile-only bottom sheet (md:hidden) shared by the tool sheet and DSL panel.
 * Backdrop + slide-up panel with a drag handle.
 */
export function BottomSheet({
  open,
  onClose,
  children,
  height = "auto",
  maxHeight = "80vh",
}: Props) {
  return (
    <>
      <div
        className={`md:hidden fixed inset-0 z-40 transition-opacity duration-200 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        style={{ background: "rgba(0,0,0,0.3)" }}
        onClick={onClose}
      />
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-2xl shadow-xl transition-transform duration-200"
        style={{
          background: "var(--toolbar)",
          borderTop: "2px solid var(--border)",
          height,
          maxHeight,
          transform: open ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div
            style={{
              background: "var(--border)",
              borderRadius: "9999px",
              height: "4px",
              width: "40px",
            }}
          />
        </div>
        {children}
      </div>
    </>
  );
}
