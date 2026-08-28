'use client'

import * as React from 'react'

// Two demo "component blocks" (F-02): ordinary React components, owned entirely by this host
// app, registered with <Tldraw components={...}> and referenced from documents only by a
// serializable `componentId` + `props` bag (see ComponentShape in @tlslides/tldraw). They exist
// to demonstrate the kind of slide content that would be painful as a native shape type — a
// stat/KPI tile and a small bar chart — without adding a charting dependency (hand-rolled SVG/CSS
// only, per the design brief in reviews/04-custom-component-blocks.md).
//
// Colors below are the validated default categorical/status palette from the repo's dataviz
// design method (light-mode slots only — a slide's own content keeps a fixed background
// regardless of the editor chrome's dark mode, the same way a real deck would).
const tokens = {
  surface: '#fcfcfb',
  border: 'rgba(11,11,11,0.10)',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  textMuted: '#898781',
  gridline: '#e1e0d9',
  baseline: '#c3c2b7',
  seriesBlue: '#2a78d6',
  good: '#0ca30c',
  critical: '#d03b3b',
}

const fontStack = 'system-ui, -apple-system, "Segoe UI", sans-serif'

const cardStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  boxSizing: 'border-box',
  background: tokens.surface,
  border: `1px solid ${tokens.border}`,
  borderRadius: 12,
  boxShadow: '0 1px 2px rgba(11,11,11,0.06)',
  fontFamily: fontStack,
  userSelect: 'none',
}

export interface StatTileProps {
  label: string
  value: string
  delta?: number
  deltaLabel?: string
}

// A KPI/stat tile: a headline number a slide author drops in as a single block, styled to read
// as finished slide content rather than a debug rectangle. This is the kind of "branded element"
// document 4 calls out as painful to build as a native canvas shape (typography, layout, a
// direction-aware delta) but ordinary as a React component.
export function StatTile({ label, value, delta, deltaLabel }: StatTileProps) {
  const hasDelta = delta !== undefined
  const isUp = (delta ?? 0) >= 0
  const deltaColor = isUp ? tokens.good : tokens.critical

  return (
    <div
      style={{
        ...cardStyle,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 10,
        padding: '22px 26px',
      }}
    >
      <div style={{ fontSize: 14, color: tokens.textSecondary, fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: 42, color: tokens.textPrimary, fontWeight: 600, lineHeight: 1.1 }}>
        {value}
      </div>
      {hasDelta && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 14,
            fontWeight: 600,
            color: deltaColor,
          }}
        >
          {/* Direction is carried by the icon + label, not by color alone. */}
          <span aria-hidden="true">{isUp ? '▲' : '▼'}</span>
          <span>{Math.abs(delta as number)}%</span>
          {deltaLabel && (
            <span style={{ color: tokens.textMuted, fontWeight: 400 }}>{deltaLabel}</span>
          )}
        </div>
      )}
    </div>
  )
}

export interface BarChartProps {
  title: string
  categories: string[]
  values: number[]
}

const PLOT_HEIGHT = 130
const BAR_WIDTH = 22

// A small hand-rolled bar chart — no charting dependency, per the design brief. Single series, so
// no legend box (the title names it); each bar is directly labelled at its cap, which is the
// documented-good pattern for columns (as opposed to labelling every point on a dense chart);
// gridlines are recessive hairlines; the native `title` attribute on each bar gives a free
// per-mark hover tooltip without any JS.
export function BarChart({ title, categories, values }: BarChartProps) {
  const max = Math.max(...values, 1)

  return (
    <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', padding: '18px 22px' }}>
      <div style={{ fontSize: 14, color: tokens.textSecondary, fontWeight: 600, marginBottom: 14 }}>
        {title}
      </div>
      <div style={{ position: 'relative', height: PLOT_HEIGHT }}>
        {/* Recessive midline gridline, one step off the surface. */}
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: PLOT_HEIGHT / 2,
            borderTop: `1px solid ${tokens.gridline}`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-around',
            borderBottom: `1px solid ${tokens.baseline}`,
          }}
        >
          {values.map((value, i) => {
            const barHeight = Math.max(2, (value / max) * (PLOT_HEIGHT - 24))
            return (
              <div
                key={categories[i] ?? i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  height: '100%',
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: tokens.textPrimary,
                    marginBottom: 4,
                  }}
                >
                  {value}
                </div>
                <div
                  title={`${categories[i]}: ${value}`}
                  style={{
                    width: BAR_WIDTH,
                    height: barHeight,
                    background: tokens.seriesBlue,
                    borderRadius: '4px 4px 0 0',
                  }}
                />
              </div>
            )
          })}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-around', marginTop: 6 }}>
        {categories.map((label) => (
          <div key={label} style={{ fontSize: 12, color: tokens.textMuted, width: 0, flex: 1, textAlign: 'center' }}>
            {label}
          </div>
        ))}
      </div>
    </div>
  )
}

export const blockComponents = {
  'kpi-tile': StatTile,
  'bar-chart': BarChart,
}
