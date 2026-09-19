"use client";

const notifications: { id: string; title: string; body: string; date: string }[] = [];

export default function NotificacionesPage() {
  return (
    <div className="flex min-h-dvh flex-col pb-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" className="text-text-primary">
          <path
            d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <h1 className="font-heading text-xl font-bold text-text-primary">Notificacion</h1>
      </div>

      {/* Notifications */}
      {notifications.length > 0 ? (
        <div className="mt-4 flex flex-col gap-3 px-4">
          {notifications.map((notif) => (
            <div
              key={notif.id}
              className="rounded-xl border border-border-primary p-4"
            >
              <div className="mb-2 flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0 text-text-primary">
                  <path
                    d="M2 2h4l1 3-2 2a11 11 0 004 4l2-2 3 1v4a1 1 0 01-1 1A13 13 0 011 3a1 1 0 011-1z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3 className="font-heading text-sm font-bold text-text-primary">
                  {notif.title}
                </h3>
              </div>
              <p className="font-body text-sm leading-relaxed text-text-secondary">
                {notif.body}
              </p>
              <p className="mt-3 font-body text-xs text-text-secondary">
                {notif.date}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center px-4 py-20 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" className="text-text-secondary">
              <path
                d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9zM13.73 21a2 2 0 01-3.46 0"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="mt-4 font-body text-sm text-text-secondary">
            No tienes notificaciones aún.
          </p>
        </div>
      )}
    </div>
  );
}
