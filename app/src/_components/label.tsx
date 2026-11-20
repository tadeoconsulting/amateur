import type { LabelHTMLAttributes, ReactNode } from "react";

/**
 * La tipografía de TODAS las etiquetas de campo de la plataforma (2026-11-19): DM Sans, 14 px, peso 600. Es la única definición:
 * ningún formulario repite la fuente, el tamaño ni el peso; `Label` es el componente que se usa en todos lados.
 */
export const labelText = "font-body text-sm font-semibold text-text-primary";

type LabelProps = Omit<LabelHTMLAttributes<HTMLLabelElement>, "className" | "children"> & {
  children: ReactNode;
  /** Solo espaciado y disposición (`mb-2`, `block`...): la tipografía no se cambia desde afuera. */
  className?: string;
  /**
   * `label` (por omisión) es la etiqueta de un campo y lleva `htmlFor`. `span` es para el título de un grupo que no se asocia a
   * un solo campo («Equipos», «Foto del torneo»), con el mismo aspecto.
   */
  as?: "label" | "span";
  /** Marca de obligatorio (*). */
  required?: boolean;
  /** Aclara «(opcional)» al lado del nombre. */
  optional?: boolean;
};

export function Label({ children, className = "", as = "label", required = false, optional = false, ...props }: LabelProps) {
  const classes = `${labelText} ${className}`.trim();
  const content = (
    <>
      {children}
      {required && <span aria-hidden className="ml-0.5 text-text-secondary">*</span>}
      {optional && <span className="ml-1 font-normal text-text-secondary">(opcional)</span>}
    </>
  );
  if (as === "span") return <span className={classes}>{content}</span>;
  return (
    <label className={classes} {...props}>
      {content}
    </label>
  );
}
