import React, { useEffect } from "react";
import { CloseIcon } from "./Icons";

export default function Modal({ children, open = false, onClose, title, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape" && open && onClose) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#161912]/50 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-[#FAF6E9] dark:bg-[#1F241A] border border-[#DDD2A8] dark:border-[#343B2A] rounded-md ${maxWidth} w-full p-5 sm:p-6 shadow-[0_12px_32px_rgba(22,25,18,0.2)] space-y-4 text-[#242918] dark:text-[#F1E8C7]`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[#DDD2A8] dark:border-[#343B2A] pb-3">
            <h3 className="text-base font-semibold text-[#242918] dark:text-[#F1E8C7] font-serif tracking-tight">
              {title}
            </h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[#6B7354] dark:text-[#9A947A] hover:text-[#242918] dark:hover:text-[#F1E8C7] p-1 rounded hover:bg-[#9CA764]/10 transition-colors"
                aria-label="Close modal"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        )}
        <div className="text-sm text-[#3D442C] dark:text-[#D8CFB0]">{children}</div>
      </div>
    </div>
  );
}
