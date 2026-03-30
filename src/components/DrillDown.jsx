import React, { useState, useEffect, useCallback } from 'react';
import { Modal, DataTable, Badge, Loading, Button } from './Shared';
import { get, post } from '../utils/api';

// ═══════════════════════════════════════════════════════════════════════════════
// DRILL-DOWN MODAL — Shows actual records behind a chart data point
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage:
//   <DrillDownModal
//     title="Students with Technology: JAVA"
//     object="students"
//     field="technology"
//     value="JAVA"
//     onClose={() => setDrillDown(null)}
//   />
//
// Or use the shortcut endpoints:
//   <DrillDownModal
//     title="In Market Students"
//     endpoint="/api/v1/analytics/drill-down/status?status=In Market"
//     onClose={() => setDrillDown(null)}
//   />

export function DrillDownModal({ title, object, field, value, operator, endpoint, onClose, onRowClick }) {
  const [records, setRecords] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const limit = 50;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      let res;
      if (endpoint) {
        const sep = endpoint.includes('?') ? '&' : '?';
        res = await get(`${endpoint}${sep}limit=${limit}&offset=${page * limit}`);
      } else {
        res = await post('/api/v1/analytics/drill-down', {
          object, field, value, operator: operator || 'equals',
          limit, offset: page * limit,
        });
      }
      const data = res?.data || res || {};
      setRecords(data.records || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error('Drill-down fetch failed:', e);
      setRecords([]);
    }
    setLoading(false);
  }, [object, field, value, operator, endpoint, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-detect columns from first record
  const columns = records.length > 0
    ? Object.keys(records[0])
        .filter(k => !['id'].includes(k))
        .slice(0, 10) // max 10 columns
        .map(k => ({
          key: k,
          label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          render: (v) => {
            if (v === null || v === undefined) return <span style={{ color: '#94a3b8' }}>—</span>;
            if (typeof v === 'boolean') return <Badge color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Badge>;
            if (k.includes('status') || k.includes('marketing_status')) return <Badge color="blue">{String(v)}</Badge>;
            if (k.includes('date') || k.includes('_at')) {
              try { return new Date(v).toLocaleDateString(); } catch { return String(v); }
            }
            if (k.includes('rate') || k.includes('amount')) return `$${Number(v).toLocaleString()}`;
            return String(v);
          },
        }))
    : [];

  // Add ID as first column with click handler
  if (records.length > 0) {
    columns.unshift({
      key: 'id',
      label: 'ID',
      render: (v) => (
        <span
          style={{ color: '#2563eb', cursor: onRowClick ? 'pointer' : 'default', fontWeight: 600 }}
          onClick={() => onRowClick && onRowClick(v)}
        >
          #{v}
        </span>
      ),
    });
  }

  const totalPages = Math.ceil(total / limit);

  return (
    <Modal title={title || 'Drill-Down Records'} onClose={onClose} width={950}>
      <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#64748b', fontSize: 13 }}>
          {total} record{total !== 1 ? 's' : ''} found
          {field && value && <> · Filtered by <strong>{field}</strong> = <strong>{value}</strong></>}
        </span>
        {total > limit && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0}
              style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              ← Prev
            </button>
            <span style={{ fontSize: 12, color: '#64748b' }}>Page {page + 1} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1}
              style={{ padding: '4px 10px', borderRadius: 4, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 12 }}>
              Next →
            </button>
          </div>
        )}
      </div>

      {loading ? <Loading /> : records.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No records found for this filter.</div>
      ) : (
        <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
          <DataTable columns={columns} data={records} />
        </div>
      )}
    </Modal>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// CLICKABLE BAR CHART — Wraps Recharts BarChart with drill-down on click
// ═══════════════════════════════════════════════════════════════════════════════
//
// Usage:
//   <ClickableBarChart
//     data={[{ name: 'JAVA', count: 45 }, { name: '.NET', count: 32 }]}
//     dataKey="count"
//     nameKey="name"
//     drillDown={{ object: 'students', field: 'technology' }}
//     title="Students by Technology"
//   />

export function ClickableBarChart({ data, dataKey, nameKey = 'name', drillDown, title, color = '#3B82F6', height = 300 }) {
  const [drill, setDrill] = useState(null);

  // Lazy import Recharts
  const [Recharts, setRecharts] = useState(null);
  useEffect(() => {
    import('recharts').then(m => setRecharts(m));
  }, []);

  if (!Recharts) return <Loading />;
  const { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } = Recharts;

  const handleClick = (entry) => {
    if (!drillDown || !entry) return;
    const label    = entry[nameKey] || entry.name;
    const paramKey = drillDown.paramKey || drillDown.field;
    // When using a shortcut endpoint prefer the record's numeric id over the display label
    const value    = drillDown.endpoint
      ? (entry.id ?? entry[drillDown.field] ?? label)
      : (entry[drillDown.field] ?? label);
    setDrill({
      title: `${title || 'Records'}: ${label}`,
      object: drillDown.object,
      field: drillDown.field,
      value,
      endpoint: drillDown.endpoint ? `${drillDown.endpoint}?${paramKey}=${encodeURIComponent(value)}` : null,
    });
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis dataKey={nameKey} tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip />
          <Bar dataKey={dataKey} radius={[4, 4, 0, 0]} cursor="pointer" onClick={(_, index) => handleClick(data[index])}>
            {data.map((_, i) => (
              <Cell key={i} fill={color} style={{ cursor: 'pointer' }} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {drill && (
        <DrillDownModal
          title={drill.title}
          object={drill.object}
          field={drill.field}
          value={drill.value}
          endpoint={drill.endpoint}
          onClose={() => setDrill(null)}
          onRowClick={(id) => {
            window.location.href = `/head/students/${id}`;
          }}
        />
      )}
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// CLICKABLE PIE CHART — Same concept for pie/donut charts
// ═══════════════════════════════════════════════════════════════════════════════

export function ClickablePieChart({ data, dataKey = 'count', nameKey = 'name', drillDown, title, height = 300 }) {
  const [drill, setDrill] = useState(null);
  const [Recharts, setRecharts] = useState(null);
  useEffect(() => { import('recharts').then(m => setRecharts(m)); }, []);

  if (!Recharts) return <Loading />;
  const { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } = Recharts;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

  const handleClick = (entry) => {
    if (!drillDown || !entry) return;
    const label    = entry[nameKey] || entry.name;
    const paramKey = drillDown.paramKey || drillDown.field;
    const value    = drillDown.endpoint
      ? (entry.id ?? entry[drillDown.field] ?? label)
      : (entry[drillDown.field] ?? label);
    setDrill({
      title: `${title || 'Records'}: ${label}`,
      object: drillDown.object,
      field: drillDown.field,
      value,
      endpoint: drillDown.endpoint ? `${drillDown.endpoint}?${paramKey}=${encodeURIComponent(value)}` : null,
    });
  };

  return (
    <>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} dataKey={dataKey} nameKey={nameKey} cx="50%" cy="50%" outerRadius={100} innerRadius={50}
            cursor="pointer" onClick={(entry) => handleClick(entry)} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>

      {drill && (
        <DrillDownModal
          title={drill.title}
          object={drill.object}
          field={drill.field}
          value={drill.value}
          endpoint={drill.endpoint}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  );
}


// ═══════════════════════════════════════════════════════════════════════════════
// CLICKABLE FUNNEL — For conversion funnel chart
// ═══════════════════════════════════════════════════════════════════════════════

export function ClickableFunnel({ data, height = 300 }) {
  const [drill, setDrill] = useState(null);
  const COLORS = ['#3B82F6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

  const maxCount = Math.max(...data.map(d => d.count), 1);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0' }}>
        {data.map((stage, i) => {
          const width = Math.max(20, (stage.count / maxCount) * 100);
          const stageKey = stage.stage?.toLowerCase().replace(/\s+/g, '') || '';
          return (
            <div key={i}
              onClick={() => setDrill({ title: `${stage.stage} (${stage.count})`, endpoint: `/api/v1/analytics/drill-down/funnel?stage=${stageKey}` })}
              style={{
                background: COLORS[i % COLORS.length] + '15',
                borderLeft: `4px solid ${COLORS[i % COLORS.length]}`,
                borderRadius: '0 8px 8px 0',
                padding: '10px 16px',
                width: `${width}%`,
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ fontWeight: 600, fontSize: 13 }}>{stage.stage}</span>
              <span style={{ fontWeight: 700, fontSize: 15, color: COLORS[i % COLORS.length] }}>{stage.count} <span style={{ fontSize: 11, fontWeight: 400, color: '#64748b' }}>({stage.pct}%)</span></span>
            </div>
          );
        })}
      </div>

      {drill && (
        <DrillDownModal
          title={drill.title}
          endpoint={drill.endpoint}
          onClose={() => setDrill(null)}
        />
      )}
    </>
  );
}


export default DrillDownModal;