import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Page, Badge, Button, Loading, Tabs, DataTable } from '../../components/Shared';
import api from '../../utils/api';
import { usePermissions } from '../../hooks/usePermissions';

// Fields to hide from the detail view (internal/system fields)
const HIDDEN_FIELDS = new Set([
  'id', 'tenant_id', 'password_hash', 'password_history', 'password_changed_at',
  'failed_login_count', 'locked_until', 'sf_id', 'created_by', 'owner_id',
]);

// Fields that should be read-only
const READONLY_FIELDS = new Set([
  'id', 'created_at', 'updated_at', 'tenant_id', 'sf_id',
]);

export default function DynamicRecordPage() {
  const { objectName, id } = useParams();
  const navigate = useNavigate();
  const { perms, hiddenFields, readOnlyFields } = usePermissions(objectName);
  const isNew = id === 'new';
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editValues, setEditValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createValues, setCreateValues] = useState({});
  const [activeTab, setActiveTab] = useState('details');
  const [relatedData, setRelatedData] = useState({});

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    if (isNew) {
      try {
        const res = await api.get(`/api/v1/dynamic/${objectName}/schema`);
        setData({ record: {}, fields: res?.fields || [], picklists: res?.picklists || {}, layout: res?.layout || null, related: {} });
      } catch (e) {
        console.error('Failed to load schema:', e);
      }
      setLoading(false);
      return;
    }
    try {
      const res = await api.get(`/api/v1/dynamic/${objectName}/${id}`);
      setData(res || null);
    } catch (e) {
      console.error('Failed to load record:', e);
    }
    setLoading(false);
  }, [objectName, id, isNew]);

  useEffect(() => { fetchRecord(); }, [fetchRecord]);

  // Fetch related records when switching tabs
  const fetchRelated = async (relatedObject) => {
    if (relatedData[relatedObject]) return;
    try {
      const res = await api.get(`/api/v1/dynamic/${objectName}/${id}/related/${relatedObject}`);
      setRelatedData(prev => ({ ...prev, [relatedObject]: res || { records: [], total: 0 } }));
    } catch (e) {
      console.error(`Failed to load related ${relatedObject}:`, e);
    }
  };

  const startEdit = () => {
    setEditing(true);
    setEditValues({ ...data.record });
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditValues({});
  };

  const saveRecord = async () => {
    setSaving(true);
    try {
      // Only send changed fields
      const changes = {};
      for (const [key, val] of Object.entries(editValues)) {
        if (val !== data.record[key]) changes[key] = val;
      }
      if (Object.keys(changes).length > 0) {
        await api.put(`/api/v1/dynamic/${objectName}/${id}`, changes);
        await fetchRecord();
      }
      setEditing(false);
    } catch (e) {
      alert('Save failed: ' + (e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  const createRecord = async () => {
    setCreating(true);
    try {
      const res = await api.post(`/api/v1/dynamic/${objectName}`, createValues);
      const newId = res?.id ?? res?.data?.id;
      navigate(`/head/dynamic/${objectName}/${newId}`, { replace: true });
    } catch (e) {
      alert('Create failed: ' + (e.response?.data?.message || e.message));
    }
    setCreating(false);
  };

  if (loading) return <Page title="Loading..."><Loading /></Page>;
  if (!data) return <Page title="Not Found"><p style={{ color: '#94a3b8' }}>Record not found</p></Page>;

  const { record, fields, picklists, layout, related, canEdit: apiCanEdit, canDelete: apiCanDelete } = data;

  // Effective permission: use API-returned flags (set by backend per profile), fall back to hook
  const canEditRecord  = apiCanEdit  ?? perms?.canEdit  ?? true;
  const canDeleteRecord = apiCanDelete ?? perms?.canDelete ?? false;

  // Group fields by section — filter system fields AND profile-hidden fields
  const visibleFields = fields.filter(f =>
    !HIDDEN_FIELDS.has(f.field_name) && !hiddenFields.has(f.field_name) && !f.hidden
  );
  const sections = groupBySection(visibleFields, layout);

  const objectLabel = objectName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  // Build record title
  const title = isNew
    ? `New ${objectLabel}`
    : (record.name || record.first_name
        ? `${record.first_name || ''} ${record.last_name || ''}`.trim() || record.name
        : `${objectLabel} #${id}`);

  // Related tabs (only for existing records)
  const relatedTabs = isNew ? [] : getRelatedTabs(objectName, related);

  const tabs = [
    { id: 'details', label: 'Details' },
    ...relatedTabs.map(r => ({ id: r.object, label: `${r.label} (${r.count || 0})` })),
  ];

  // Determine active values and change handler based on mode
  const isEditMode = isNew || editing;
  const currentValues = isNew ? createValues : (editing ? editValues : record);
  const handleFieldChange = isNew
    ? (fn, val) => setCreateValues(prev => ({ ...prev, [fn]: val }))
    : (fn, val) => setEditValues(prev => ({ ...prev, [fn]: val }));

  return (
    <Page
      title={title}
      subtitle={isNew ? `Create a new ${objectLabel} record` : `${objectLabel} · ID: ${id}`}
      actions={
        <div style={{ display: 'flex', gap: 8 }}>
          {isNew ? (
            <>
              <button onClick={() => navigate(-1)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                Cancel
              </button>
              <Button onClick={createRecord} disabled={creating}>{creating ? 'Creating...' : 'Create'}</Button>
            </>
          ) : editing ? (
            <>
              <Button variant="secondary" onClick={cancelEdit}>Cancel</Button>
              <Button onClick={saveRecord} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            </>
          ) : (
            <>
              {canEditRecord && <Button onClick={startEdit}>Edit</Button>}
              <button onClick={() => navigate(-1)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13 }}>
                ← Back
              </button>
            </>
          )}
        </div>
      }
    >
      {!isNew && <Tabs active={activeTab} onChange={(t) => { setActiveTab(t); if (t !== 'details') fetchRelated(t); }} tabs={tabs} />}

      <div style={{ marginTop: 16 }}>
        {/* ═══ DETAILS TAB ═══ */}
        {activeTab === 'details' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {sections.map((section) => (
              <div key={section.name} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden' }}>
                {/* Section header */}
                <div style={{ background: '#f8fafc', padding: '10px 16px', borderBottom: '1px solid #e2e8f0' }}>
                  <h3 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{section.name}</h3>
                </div>
                {/* Field grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0 }}>
                  {section.fields.map((field, fi) => (
                    <FieldCell
                      key={`${field.field_name}-${fi}`}
                      field={field}
                      value={currentValues[field.field_name]}
                      picklist={picklists[field.field_name]}
                      editing={isEditMode && !READONLY_FIELDS.has(field.field_name) && !readOnlyFields.has(field.field_name) && !field.read_only}
                      onChange={(val) => handleFieldChange(field.field_name, val)}
                      isOdd={fi % 2 === 1}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ═══ RELATED TABS ═══ */}
        {activeTab !== 'details' && (
          <RelatedList
            objectName={activeTab}
            data={relatedData[activeTab]}
            onRowClick={(rec) => navigate(`/head/dynamic/${activeTab}/${rec.id}`)}
          />
        )}
      </div>
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// FIELD CELL — Renders one field (view or edit mode)
// ═══════════════════════════════════════════════════════════════════════════════

function FieldCell({ field, value, picklist, editing, onChange, isOdd }) {
  const displayValue = formatValue(field, value, picklist);

  return (
    <div style={{
      padding: '10px 16px',
      borderBottom: '1px solid #f1f5f9',
      borderRight: isOdd ? 'none' : '1px solid #f1f5f9',
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      minHeight: 44,
    }}>
      <span style={{ fontSize: 12, color: '#64748b', width: 160, flexShrink: 0, fontWeight: 500 }}>
        {field.label}
        {field.is_required && <span style={{ color: '#ef4444', marginLeft: 2 }}>*</span>}
      </span>

      {editing ? (
        <EditableField field={field} value={value} picklist={picklist} onChange={onChange} />
      ) : (
        <span style={{ fontSize: 13, color: '#1e293b', flex: 1 }}>
          {displayValue}
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// EDITABLE FIELD — Renders the right input type
// ═══════════════════════════════════════════════════════════════════════════════

function EditableField({ field, value, picklist, onChange }) {
  const type = field.field_type;

  // Picklist dropdown
  if (picklist && picklist.length > 0) {
    return (
      <select value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle}>
        <option value="">— Select —</option>
        {picklist.map(pv => (
          <option key={pv.value} value={pv.value}>{pv.label}</option>
        ))}
      </select>
    );
  }

  // Boolean checkbox
  if (type === 'boolean' || type === 'checkbox') {
    return (
      <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)}
        style={{ width: 16, height: 16, accentColor: '#2563eb' }} />
    );
  }

  // Date
  if (type === 'date') {
    const dateVal = value ? new Date(value).toISOString().split('T')[0] : '';
    return <input type="date" value={dateVal} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  }

  // DateTime
  if (type === 'datetime') {
    const dtVal = value ? new Date(value).toISOString().slice(0, 16) : '';
    return <input type="datetime-local" value={dtVal} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  }

  // Number / Decimal / Currency
  if (['number', 'decimal', 'currency', 'percent'].includes(type)) {
    return <input type="number" value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}
      step={type === 'decimal' || type === 'currency' ? '0.01' : '1'} style={inputStyle} />;
  }

  // Textarea
  if (type === 'textarea') {
    return <textarea value={value || ''} onChange={e => onChange(e.target.value)}
      style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} />;
  }

  // Email
  if (type === 'email') {
    return <input type="email" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  }

  // URL
  if (type === 'url') {
    return <input type="url" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  }

  // Phone
  if (type === 'phone') {
    return <input type="tel" value={value || ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
  }

  // Default: text input
  return <input type="text" value={value ?? ''} onChange={e => onChange(e.target.value)} style={inputStyle} />;
}

// ═══════════════════════════════════════════════════════════════════════════════
// RELATED LIST — Shows related records in a table
// ═══════════════════════════════════════════════════════════════════════════════

function RelatedList({ objectName, data, onRowClick }) {
  if (!data) return <Loading />;
  if (data.records.length === 0) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>No related {objectName} records</div>;
  }

  // Auto-detect columns from first record
  const columns = Object.keys(data.records[0])
    .filter(k => !HIDDEN_FIELDS.has(k) && k !== 'tenant_id')
    .slice(0, 8)
    .map(k => ({
      key: k,
      label: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      render: (v) => {
        if (v === null || v === undefined) return <span style={{ color: '#cbd5e1' }}>—</span>;
        if (typeof v === 'boolean') return <Badge color={v ? 'green' : 'red'}>{v ? 'Yes' : 'No'}</Badge>;
        if (k.includes('date') || k.includes('_at')) {
          try { return new Date(v).toLocaleDateString(); } catch { return String(v); }
        }
        if (k.includes('rate') || k.includes('amount') || k.includes('salary')) return `$${Number(v).toLocaleString()}`;
        return String(v).substring(0, 100);
      },
    }));

  return (
    <div>
      <p style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{data.total} record{data.total !== 1 ? 's' : ''}</p>
      <DataTable columns={columns} rows={data.records} onRowClick={onRowClick} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function formatValue(field, value, picklist) {
  if (value === null || value === undefined || value === '') {
    return <span style={{ color: '#cbd5e1' }}>—</span>;
  }

  const type = field.field_type;

  // Picklist — show with color badge
  if (picklist && picklist.length > 0) {
    const pv = picklist.find(p => p.value === String(value));
    if (pv) return <Badge color={pv.color || 'blue'}>{pv.label}</Badge>;
    return <Badge color="gray">{String(value)}</Badge>;
  }

  // Boolean
  if (type === 'boolean' || type === 'checkbox') {
    return <Badge color={value ? 'green' : 'red'}>{value ? 'Yes' : 'No'}</Badge>;
  }

  // Date
  if (type === 'date' || type === 'datetime' || field.field_name.includes('date') || field.field_name.includes('_at')) {
    try {
      const d = new Date(value);
      if (isNaN(d.getTime())) return String(value);
      return type === 'datetime' || field.field_name.includes('_at')
        ? d.toLocaleString()
        : d.toLocaleDateString();
    } catch { return String(value); }
  }

  // Currency / Rate
  if (type === 'currency' || field.field_name.includes('rate') || field.field_name.includes('amount') || field.field_name.includes('salary')) {
    return `$${Number(value).toLocaleString()}`;
  }

  // Percent
  if (type === 'percent') {
    return `${Number(value).toFixed(1)}%`;
  }

  // Email — clickable
  if (type === 'email' || field.field_name.includes('email')) {
    return <a href={`mailto:${value}`} style={{ color: '#2563eb' }}>{value}</a>;
  }

  // URL — clickable
  if (type === 'url' || field.field_name.includes('url') || field.field_name.includes('link')) {
    return <a href={value} target="_blank" rel="noreferrer" style={{ color: '#2563eb' }}>{value}</a>;
  }

  // Phone — clickable
  if (type === 'phone' || field.field_name.includes('phone') || field.field_name.includes('mobile')) {
    return <a href={`tel:${value}`} style={{ color: '#2563eb' }}>{value}</a>;
  }

  // Long text
  if (String(value).length > 200) {
    return <span title={String(value)}>{String(value).substring(0, 200)}...</span>;
  }

  return String(value);
}

function groupBySection(fields, layout) {
  // If a layout exists, use its section configuration
  if (layout?.sections) {
    try {
      const layoutSections = typeof layout.sections === 'string' ? JSON.parse(layout.sections) : layout.sections;
      if (Array.isArray(layoutSections) && layoutSections.length > 0) {
        return layoutSections.map(s => ({
          name: s.label || s.name,
          fields: (s.fields || []).map(fn => fields.find(f => f.field_name === fn)).filter(Boolean),
        })).filter(s => s.fields.length > 0);
      }
    } catch { /* fall through to auto-grouping */ }
  }

  // Auto-group by section_name from custom_fields
  const sectionMap = {};
  for (const field of fields) {
    const section = field.section_name || 'General';
    if (!sectionMap[section]) sectionMap[section] = [];
    sectionMap[section].push(field);
  }

  // Sort: Standard Fields first, then alphabetical
  const sectionOrder = ['Standard Fields', 'Contact Information', 'Status & Tracking', 'Metrics & Financials', 'Dates & History', 'Custom Fields'];
  const sorted = Object.entries(sectionMap).sort(([a], [b]) => {
    const ai = sectionOrder.indexOf(a);
    const bi = sectionOrder.indexOf(b);
    if (ai >= 0 && bi >= 0) return ai - bi;
    if (ai >= 0) return -1;
    if (bi >= 0) return 1;
    return a.localeCompare(b);
  });

  return sorted.map(([name, flds]) => ({ name, fields: flds }));
}

function getRelatedTabs(objectName, related) {
  const tabs = {
    students: [
      { object: 'submissions', label: 'Submissions', count: related?.submissions },
      { object: 'interviews', label: 'Interviews', count: related?.interviews },
      { object: 'placements', label: 'Placements', count: related?.placements },
    ],
    business_units: [
      { object: 'students', label: 'Students', count: related?.students },
      { object: 'recruiters', label: 'Recruiters', count: related?.recruiters },
    ],
    clusters: [
      { object: 'business_units', label: 'Business Units', count: related?.business_units },
      { object: 'students', label: 'Students', count: related?.students },
    ],
    recruiters: [
      { object: 'students', label: 'Students', count: related?.students },
      { object: 'submissions', label: 'Submissions', count: related?.submissions },
      { object: 'interviews', label: 'Interviews', count: related?.interviews },
    ],
    submissions: [
      { object: 'interviews', label: 'Interviews', count: related?.interviews },
    ],
  };
  return tabs[objectName] || [];
}

const inputStyle = {
  flex: 1, padding: '5px 10px', borderRadius: 5, border: '1px solid #d1d5db',
  fontSize: 13, outline: 'none', background: '#fff',
};