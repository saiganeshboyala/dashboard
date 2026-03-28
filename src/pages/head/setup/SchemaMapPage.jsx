import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ZoomIn, ZoomOut, RotateCcw, ExternalLink } from 'lucide-react'
import * as api from '../../../utils/api'

// ─── Layout algorithm: simple grid placement ──────────────────────────────────

const CARD_W = 200
const CARD_H = 120
const GAP_X  = 80
const GAP_Y  = 60
const COLS   = 4

function layoutObjects(objects) {
  return objects.map((obj, i) => ({
    ...obj,
    x: (i % COLS) * (CARD_W + GAP_X) + 40,
    y: Math.floor(i / COLS) * (CARD_H + GAP_Y) + 40,
  }))
}

// ─── Find lookup relationships ────────────────────────────────────────────────

function findRelationships(fieldsMap, objectPositions) {
  const links  = []
  const posMap = {}
  objectPositions.forEach(o => { posMap[o.name] = o })

  Object.entries(fieldsMap).forEach(([objName, fields]) => {
    fields.forEach(f => {
      const lo = f.lookupObject || f.lookup_object
      if (!lo || !posMap[lo]) return
      const from = posMap[objName]
      const to   = posMap[lo]
      if (!from || !to) return
      links.push({
        fromObj: objName,
        toObj: lo,
        label: f.label,
        x1: from.x + CARD_W / 2,
        y1: from.y + CARD_H / 2,
        x2: to.x + CARD_W / 2,
        y2: to.y + CARD_H / 2,
      })
    })
  })
  return links
}

// ─── Object node ─────────────────────────────────────────────────────────────

function ObjectNode({ obj, selected, onClick }) {
  return (
    <g transform={`translate(${obj.x},${obj.y})`} style={{ cursor: 'pointer' }} onClick={() => onClick(obj)}>
      <rect
        width={CARD_W}
        height={CARD_H}
        rx={8}
        fill={selected ? '#eef2ff' : obj.isCustom ? '#f5f3ff' : '#f8fafc'}
        stroke={selected ? '#6366f1' : obj.isCustom ? '#a5b4fc' : '#cbd5e1'}
        strokeWidth={selected ? 2 : 1}
      />
      {/* Header */}
      <rect
        width={CARD_W}
        height={30}
        rx={8}
        fill={obj.isCustom ? '#e0e7ff' : '#f1f5f9'}
      />
      <rect y={22} width={CARD_W} height={8} fill={obj.isCustom ? '#e0e7ff' : '#f1f5f9'} />

      <text x={CARD_W / 2} y={20} textAnchor="middle" fill={obj.isCustom ? '#4338ca' : '#1e293b'} fontSize={12} fontWeight="600">
        {obj.label}
      </text>
      <text x={CARD_W / 2} y={36} textAnchor="middle" fill="#94a3b8" fontSize={10}>
        {obj.name}
      </text>
      {obj.fieldCount !== undefined && (
        <text x={CARD_W / 2} y={72} textAnchor="middle" fill={obj.isCustom ? '#6366f1' : '#475569'} fontSize={22} fontWeight="700">
          {obj.fieldCount}
        </text>
      )}
      <text x={CARD_W / 2} y={90} textAnchor="middle" fill="#94a3b8" fontSize={10}>
        fields
      </text>
      {obj.isCustom && (
        <text x={CARD_W - 8} y={110} textAnchor="end" fill="#818cf8" fontSize={9}>
          Custom
        </text>
      )}
    </g>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SchemaMapPage() {
  const navigate  = useNavigate()
  const svgRef    = useRef(null)

  const [objects,   setObjects]   = useState([])
  const [fieldsMap, setFieldsMap] = useState({})
  const [loading,   setLoading]   = useState(true)
  const [selected,  setSelected]  = useState(null)
  const [zoom,      setZoom]      = useState(0.8)
  const [pan,       setPan]       = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const panStart = useRef(null)

  useEffect(() => {
    const init = async () => {
      try {
        const r    = await api.getSchemaObjects()
        const objs = r?.objects || r || []
        setObjects(objs)

        const sample  = objs.slice(0, 12)
        const results = await Promise.allSettled(
          sample.map(o => api.getSchemaFields(o.name).then(fr => ({ name: o.name, fields: fr?.fields || fr || [] })))
        )
        const map = {}
        results.forEach(r => { if (r.status === 'fulfilled') map[r.value.name] = r.value.fields })
        setFieldsMap(map)
      } catch { /* ignore */ }
      setLoading(false)
    }
    init()
  }, [])

  const positioned      = layoutObjects(objects)
  const relationships   = findRelationships(fieldsMap, positioned)
  const totalW = COLS * (CARD_W + GAP_X) + 80
  const totalH = Math.ceil(objects.length / COLS) * (CARD_H + GAP_Y) + 80

  const handleMouseDown = (e) => {
    setIsPanning(true)
    panStart.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }
  const handleMouseMove = (e) => {
    if (!isPanning || !panStart.current) return
    setPan({ x: e.clientX - panStart.current.x, y: e.clientY - panStart.current.y })
  }
  const handleMouseUp = () => { setIsPanning(false) }

  const sel = selected ? positioned.find(o => o.name === selected.name) : null

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200 shrink-0">
        <h1 className="text-gray-900 font-semibold text-[14px]">Schema Map</h1>
        <span className="text-gray-400 text-[12px]">{objects.length} objects · {relationships.length} relationships</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setZoom(z => Math.min(z + 0.1, 2))}
            className="p-1.5 rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <ZoomIn size={14} />
          </button>
          <span className="text-gray-500 text-[12px] w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom(z => Math.max(z - 0.1, 0.3))}
            className="p-1.5 rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => { setZoom(0.8); setPan({ x: 0, y: 0 }) }}
            className="p-1.5 rounded border border-gray-200 bg-white text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
          >
            <RotateCcw size={14} />
          </button>
        </div>
      </div>

      {/* Canvas */}
      <div className="flex flex-1 overflow-hidden">
        <div
          className="flex-1 overflow-hidden relative bg-[#f8fafc]"
          style={{ cursor: isPanning ? 'grabbing' : 'grab' }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {loading && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-400">
              Loading schema map…
            </div>
          )}
          <svg
            ref={svgRef}
            width={totalW}
            height={totalH}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: '0 0', transition: 'none' }}
          >
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#6366f1" />
              </marker>
            </defs>
            {relationships.map((link, i) => (
              <g key={i}>
                <line
                  x1={link.x1} y1={link.y1}
                  x2={link.x2} y2={link.y2}
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  strokeDasharray="4,3"
                  markerEnd="url(#arrow)"
                  opacity={0.5}
                />
                <text
                  x={(link.x1 + link.x2) / 2}
                  y={(link.y1 + link.y2) / 2 - 6}
                  textAnchor="middle"
                  fill="#818cf8"
                  fontSize={9}
                  className="pointer-events-none"
                >
                  {link.label}
                </text>
              </g>
            ))}

            {positioned.map(obj => (
              <ObjectNode
                key={obj.name}
                obj={obj}
                selected={selected?.name === obj.name}
                onClick={setSelected}
              />
            ))}
          </svg>
        </div>

        {/* Detail panel */}
        {selected && sel && (
          <div className="w-64 bg-white border-l border-gray-200 p-4 overflow-y-auto shrink-0">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-gray-900 font-semibold">{selected.label}</h2>
                <code className="text-indigo-600 text-[11px] font-mono">{selected.name}</code>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-700 text-lg leading-none">×</button>
            </div>

            {selected.description && (
              <p className="text-gray-500 text-[12px] mb-4">{selected.description}</p>
            )}

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-[12px]">
                <span className="text-gray-500">Type</span>
                <span className={selected.isCustom ? 'text-indigo-600 font-medium' : 'text-gray-700'}>
                  {selected.isCustom ? 'Custom' : 'Standard'}
                </span>
              </div>
              {selected.fieldCount !== undefined && (
                <div className="flex justify-between text-[12px]">
                  <span className="text-gray-500">Fields</span>
                  <span className="text-gray-900 font-medium">{selected.fieldCount}</span>
                </div>
              )}
            </div>

            {relationships.filter(r => r.fromObj === selected.name || r.toObj === selected.name).length > 0 && (
              <div className="mb-4">
                <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">Relationships</p>
                {relationships
                  .filter(r => r.fromObj === selected.name || r.toObj === selected.name)
                  .map((r, i) => (
                    <div key={i} className="text-[11px] text-gray-500 mb-1">
                      {r.fromObj === selected.name
                        ? <span>→ <span className="text-gray-900 font-medium">{r.toObj}</span> via {r.label}</span>
                        : <span>← <span className="text-gray-900 font-medium">{r.fromObj}</span> lookup</span>
                      }
                    </div>
                  ))
                }
              </div>
            )}

            <div className="mt-4 space-y-2">
              <button
                onClick={() => navigate(`/head/setup/objects/${selected.name}`)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-indigo-50 border border-indigo-200 rounded text-[12px] text-indigo-700 hover:bg-indigo-100 transition-colors"
              >
                Open in Setup
              </button>
              <button
                onClick={() => navigate(`/head/dynamic/${selected.name}`)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-200 rounded text-[12px] text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-colors"
              >
                <ExternalLink size={12} /> View Records
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
