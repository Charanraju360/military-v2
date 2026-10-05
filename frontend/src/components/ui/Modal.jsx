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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#25231F]/35 backdrop-blur-[2px]">
      <div
        role="dialog"
        aria-modal="true"
        className={`bg-[#FFFFFF] border border-[#DEDAD2] rounded-md ${maxWidth} w-full p-5 sm:p-6 shadow-[0_12px_32px_rgba(37,35,31,0.12)] space-y-4`}
      >
        {title && (
          <div className="flex items-center justify-between border-b border-[#EBE7DF] pb-3">
            <h3 className="text-base font-semibold text-[#25231F] font-serif tracking-tight">
              {title}
            </h3>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="text-[#858078] hover:text-[#25231F] p-1 rounded hover:bg-[#F2EFE8] transition-colors"
                aria-label="Close modal"
              >
                <CloseIcon size={14} />
              </button>
            )}
          </div>
        )}
        <div className="text-sm text-[#47423B]">{children}</div>
      </div>
    </div>
  );
}
