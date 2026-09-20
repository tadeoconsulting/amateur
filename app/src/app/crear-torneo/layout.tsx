import { WizardProvider } from "./_components/wizard-context";

export default function CrearTorneoLayout({ children }: { children: React.ReactNode }) {
  return <WizardProvider>{children}</WizardProvider>;
}
