import { useEffect } from "react";

interface SnackBarProps {
  message: string | null;
  action?: { label: string; onClick: () => void };
  onDismiss: () => void;
}

export function SnackBar({ message, action, onDismiss }: SnackBarProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3000);
    return () => clearTimeout(timer);
  }, [message]);

  if (!message) return null;

  return (
    <div className="emolog-snackbar">
      <span className="emolog-snackbar-text">{message}</span>
      {action && (
        <button
          className="emolog-snackbar-action"
          onClick={() => {
            action.onClick();
            onDismiss();
          }}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
