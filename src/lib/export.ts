export function exportarCSV(
  nombreArchivo: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const BOM = "\uFEFF";
  const escape = (cell: string | number | null | undefined) => {
    const s = cell == null ? "" : String(cell);
    return `"${s.replace(/"/g, '""')}"`;
  };
  const csv = [
    headers.map(escape).join(","),
    ...rows.map((r) => r.map(escape).join(",")),
  ].join("\n");
  const blob = new Blob([BOM + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportarPDF(
  titulo: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
  opts?: { orientacion?: "portrait" | "landscape" }
): Promise<void> {
  const [{ default: jsPDF }, autoTable] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: opts?.orientacion || "portrait" });
  doc.setFontSize(16);
  doc.text(titulo, 14, 22);
  doc.setFontSize(9);
  doc.text(`Generado: ${new Date().toLocaleString("es-BO")}`, 14, 28);
  autoTable.default(doc, {
    startY: 32,
    head: [headers],
    body: rows.map((r) => r.map((c) => (c == null ? "" : String(c)))),
    styles: { fontSize: 8 },
    headStyles: { fillColor: [51, 51, 51] },
  });
  doc.save(`${titulo.replace(/\s+/g, "_").toLowerCase()}.pdf`);
}
