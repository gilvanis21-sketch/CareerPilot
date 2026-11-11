"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function BarList({ data, label, vertical = true }: { data: { name: string; value: number }[]; label: string; vertical?: boolean }) {
  return (
    <div role="img" aria-label={label} className="h-64 w-full">
      <ResponsiveContainer>
        <BarChart data={data} layout={vertical ? "vertical" : "horizontal"} margin={{ top: 4, right: 12, left: 8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={!vertical} vertical={vertical} />
          {vertical ? <><XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} /><YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 12 }} /></>
            : <><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} /></>}
          <Tooltip />
          <Bar dataKey="value" fill="#115e59" radius={4} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
