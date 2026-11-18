'use client';

import {ResponsiveContainer} from 'recharts';
import type {ReactNode} from 'react';

export function ChartContainer({children, loadingLabel}: {loadingLabel: string; children: ReactNode}) {
  return <div data-slot="chart" className="chart-stage"><div role="status" className="chart-loading">{loadingLabel}</div><ResponsiveContainer width="100%" height="100%" minWidth={0}>{children}</ResponsiveContainer></div>;
}

export function ChartTooltipContent({title, children}: {title: ReactNode; children: ReactNode}) {
  return <div className="chart-tooltip"><strong>{title}</strong>{children}</div>;
}
