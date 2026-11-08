"use client";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, ReferenceLine } from "recharts";
import { Table2, LineChart as LineIcon } from "lucide-react";

/** Palette catégorielle sombre validée (ordre fixe, jamais recyclé). Max 4 séries par graphique. */
export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500"];
const AXIS = { stroke: "#8a93b8", fontSize: 11 };
const GRID = "#262c4d";

interface Series {
  key: string;
  label: string;
}

function TooltipBox({ active, payload, label, unit }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2 text-xs shadow-xl">
      <p className="mb-1 font-medium text-ink">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2 text-ink-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          {p.name} : <span className="text-ink">{typeof p.value === "number" ? p.value.toFixed(2).replace(".", ",") : p.value}{unit}</span>
        </p>
      ))}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <div className="mb-2 flex flex-wrap gap-3 text-xs text-ink-2">
      {series.map((s, i) => (
        <span key={s.key} className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded" style={{ background: SERIES[i] }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function DataTable({ data, xKey, series, unit }: { data: Record<string, any>[]; xKey: string; series: Series[]; unit: string }) {
  return (
    <div className="max-h-64 overflow-auto">
      <table className="table-base">
        <thead>
          <tr>
            <th>{xKey === "x" ? "Point" : xKey}</th>
            {series.map((s) => (
              <th key={s.key}>{s.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d[xKey]}</td>
              {series.map((s) => (
                <td key={s.key}>{d[s.key] == null ? "—" : `${Number(d[s.key]).toFixed(2).replace(".", ",")}${unit}`}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LineSeriesChart({ data, xKey = "x", series, unit = "", height = 240, reference }: { data: Record<string, any>[]; xKey?: string; series: Series[]; unit?: string; height?: number; reference?: number }) {
  const [table, setTable] = useState(false);
  const s = series.slice(0, 4);
  return (
    <div>
      <div className="flex items-start justify-between gap-2">
        <Legend series={s} />
        <button className="ml-auto text-muted hover:text-ink" onClick={() => setTable((t) => !t)} aria-label={table ? "Voir le graphique" : "Voir le tableau"} title={table ? "Graphique" : "Tableau"}>
          {table ? <LineIcon size={16} /> : <Table2 size={16} />}
        </button>
      </div>
      {table ? (
        <DataTable data={data} xKey={xKey} series={s} unit={unit} />
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke={GRID} vertical={false} />
              <XAxis dataKey={xKey} tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
              <YAxis tick={AXIS} tickLine={false} axisLine={false} domain={["auto", "auto"]} tickFormatter={(v) => `${v}${unit}`} width={56} />
              {reference != null && <ReferenceLine y={reference} stroke="#8a93b8" strokeDasharray="4 4" />}
              <Tooltip content={<TooltipBox unit={unit} />} cursor={{ stroke: "#8a93b8", strokeDasharray: "3 3" }} />
              {s.map((se, i) => (
                <Line key={se.key} type="monotone" dataKey={se.key} name={se.label} stroke={SERIES[i]} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "#111528" }} activeDot={{ r: 6 }} connectNulls isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

/** Barres horizontales à une seule série (magnitude) ; libellés et valeurs en texte. */
export function HBarChart({ data, unit = "", height, color = SERIES[0], highlight }: { data: { label: string; value: number }[]; unit?: string; height?: number; color?: string; highlight?: string }) {
  const h = height ?? Math.max(160, data.length * 30);
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 40, left: 8, bottom: 0 }} barCategoryGap={2}>
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="label" tick={{ ...AXIS, fill: "#b4bbdb" }} tickLine={false} axisLine={false} width={110} />
          <Tooltip content={<TooltipBox unit={unit} />} cursor={{ fill: "#1f2545" }} />
          <Bar dataKey="value" name="Valeur" radius={[0, 4, 4, 0]} maxBarSize={26} isAnimationActive={false} label={{ position: "right", fill: "#b4bbdb", fontSize: 11, formatter: (v: any) => `${v}${unit}` }}>
            {data.map((d) => (
              <Cell key={d.label} fill={highlight && d.label !== highlight ? "#2a3158" : color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Barres verticales groupées (≤ 4 séries) pour comparer des héros sur une même mesure. */
export function GroupedBarChart({ data, series, unit = "", height = 240 }: { data: Record<string, any>[]; series: Series[]; unit?: string; height?: number }) {
  const s = series.slice(0, 4);
  return (
    <div>
      <Legend series={s} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }} barGap={2}>
            <CartesianGrid stroke={GRID} vertical={false} />
            <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: GRID }} />
            <YAxis tick={AXIS} tickLine={false} axisLine={false} width={50} tickFormatter={(v) => `${v}${unit}`} />
            <Tooltip content={<TooltipBox unit={unit} />} cursor={{ fill: "#1f2545" }} />
            {s.map((se, i) => (
              <Bar key={se.key} dataKey={se.key} name={se.label} fill={SERIES[i]} radius={[4, 4, 0, 0]} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
