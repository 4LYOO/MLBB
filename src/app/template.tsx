/**
 * Enveloppe de chaque page : fondu + léger glissement à l'arrivée (150 ms),
 * pour des changements d'onglet plus fluides.
 */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-fade-in">{children}</div>;
}
