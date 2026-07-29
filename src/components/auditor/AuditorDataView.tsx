"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import DataTable, { type Column } from "@/components/ui/DataTable";

interface Props<T> {
  title: string;
  apiPath: string;
  dataKey: string;
  columns: Column<T>[];
  keyExtractor: (item: T) => number | string;
  emptyMessage?: string;
}

export default function AuditorDataView<T>({
  title, apiPath, dataKey, columns, keyExtractor, emptyMessage,
}: Props<T>) {
  const [data, setData] = useState<T[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    setError(false);
    fetch(apiPath)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setData(d[dataKey] || []))
      .catch(() => setError(true));
  }, [apiPath, dataKey]);

  return (
    <div className="p-6">
      <PageHeader title={title} />
      <Card>
        {error ? (
          <p className="text-sm text-red-600">Error al cargar datos</p>
        ) : (
          <DataTable
            columns={columns}
            data={data}
            keyExtractor={keyExtractor}
            emptyMessage={emptyMessage || `No hay registros`}
          />
        )}
      </Card>
    </div>
  );
}
