export function MobileShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[430px] flex-col bg-surface-primary">
      {children}
    </div>
  );
}
