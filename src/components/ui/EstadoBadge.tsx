import clsx from "clsx";

type EstadoVariant = "borrador" | "pendiente" | "aprobado" | "rechazado" | "solicitada" | "pagada" | "cobrada" | "ejecutada" | "anulada" | "abierto" | "cerrado" | "abierta" | "en_revision" | "cerrada" | "exitoso" | "fallido";

const estadoConfig: Record<string, { variant: string; className: string }> = {
  Borrador:     { variant: "gray",   className: "bg-gray-100 text-gray-700" },
  Pendiente:    { variant: "amber",  className: "bg-amber-100 text-amber-800" },
  Aprobado:     { variant: "green",  className: "bg-green-100 text-green-800" },
  Aprobada:     { variant: "green",  className: "bg-green-100 text-green-800" },
  Rechazado:    { variant: "red",    className: "bg-red-100 text-red-800" },
  Rechazada:    { variant: "red",    className: "bg-red-100 text-red-800" },
  Solicitada:   { variant: "blue",   className: "bg-blue-100 text-blue-800" },
  Pagada:       { variant: "blue",   className: "bg-blue-100 text-blue-800" },
  Cobrada:      { variant: "teal",   className: "bg-teal-100 text-teal-800" },
  Ejecutada:    { variant: "indigo", className: "bg-indigo-100 text-indigo-800" },
  Anulada:      { variant: "red",    className: "bg-red-100 text-red-800" },
  Abierto:      { variant: "green",  className: "bg-green-100 text-green-800" },
  Cerrado:      { variant: "gray",   className: "bg-gray-100 text-gray-700" },
  Abierta:      { variant: "red",    className: "bg-red-100 text-red-800" },
  "En revisión":{ variant: "amber",  className: "bg-amber-100 text-amber-800" },
  "En revision": { variant: "amber",  className: "bg-amber-100 text-amber-800" },
  Cerrada:      { variant: "green",  className: "bg-green-100 text-green-800" },
  Exitoso:      { variant: "green",  className: "bg-green-100 text-green-800" },
  Fallido:      { variant: "red",    className: "bg-red-100 text-red-800" },
};

const fallback = "bg-gray-100 text-gray-700";

export interface EstadoBadgeProps {
  estado: string;
  className?: string;
}

export default function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const config = estadoConfig[estado];
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        config?.className ?? fallback,
        className
      )}
    >
      {estado}
    </span>
  );
}
