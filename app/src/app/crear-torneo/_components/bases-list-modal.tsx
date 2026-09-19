"use client";

export function BasesListModal({
  open,
  condiciones,
  showToast = false,
  onClose,
  onEdit,
}: {
  open: boolean;
  condiciones: string[];
  showToast?: boolean;
  onClose: () => void;
  onEdit: (index: number, newText: string) => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-start bg-surface-primary">
      <div className="w-full max-w-[430px] flex flex-col flex-1">
        {/* Success toast */}
        {showToast && (
          <div className="mx-4 mt-3 flex items-center justify-between rounded-lg bg-field-green px-4 py-3">
            <span className="font-body text-sm font-semibold text-white">
              Se guardo con éxito la información
            </span>
            <button onClick={onClose} className="text-white cursor-pointer ml-2" aria-label="Cerrar toast">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="4" y1="4" x2="14" y2="14" />
                <line x1="4" y1="14" x2="14" y2="4" />
              </svg>
            </button>
          </div>
        )}

        {/* Header */}
        <div className="flex justify-end px-4 pt-4">
          <button
            onClick={onClose}
            className="flex items-center gap-1 font-heading text-sm font-semibold text-text-primary cursor-pointer"
          >
            Cerrar
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="4" y1="4" x2="14" y2="14" />
              <line x1="4" y1="14" x2="14" y2="4" />
            </svg>
          </button>
        </div>

        <div className="px-4 pt-2 pb-6 flex-1">
          <h2 className="font-heading text-xl font-bold text-text-primary mb-6">
            Bases de tu torneo
          </h2>

          <div className="flex flex-col">
            {condiciones.map((condicion, i) => (
              <div
                key={i}
                className="flex items-start gap-3 py-4 border-b border-brand-200 last:border-0"
              >
                {/* Drag handle */}
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className="text-text-secondary mt-0.5 shrink-0">
                  <path d="M7 5h6M7 10h6M7 15h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>

                <p className="flex-1 font-body text-sm text-text-primary leading-snug">
                  {condicion}
                </p>

                {/* Edit icon */}
                <button
                  onClick={() => {
                    const newText = prompt("Editar condición:", condicion);
                    if (newText !== null && newText.trim()) onEdit(i, newText.trim());
                  }}
                  className="p-1 text-text-secondary hover:text-text-primary cursor-pointer shrink-0"
                  aria-label="Editar condición"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M13.5 2.5a1.5 1.5 0 012.12 2.12L6 14.25 2 16l1.75-4L13.5 2.5z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
