import React, { useState, useEffect, useCallback } from 'react';
import {
  Page, DataTable, Badge, Button, Modal, Input, Select, Loading, Tabs
} from '../../components/Shared';
import { get, post, put, del } from '../../utils/api';

// ─── Constants ──────────────────────────────────────────────────────────────

const OPERATORS = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'does not equal' },
  { value: 'contains', label: 'contains' },
  { value: 'is_empty', label: 'is blank' },
  { value: 'is_not_empty', label: 'is not blank' },
  { value: 'greater_than', label: 'greater than' },
  { value: 'less_than', label: 'less than' },
  { value: 'in_list', label: 'is one of' },
  { value: 'not_in_list', label: 'is not one of' },
  { value: 'changed_to', label: 'is changed to' },
  { value: 'is_changed', label: 'is changed (any value)' },
  { value: 'regex', label: 'matches pattern' },
  { value: 'starts_with', label: 'starts with' },
];

const RULE_TYPES = [
  { value: 'error', label: 'Block Save (Error)' },
  { value: 'warning', label: 'Show Warning (Allow Save)' },
  { value: 'required', label: 'Require Field' },
];

const APPLIES_TO = [
  { value: 'both', label: 'Create & Update' },
  { value: 'create', label: 'Create Only' },
  { value: 'update', label: 'Update Only' },
];

const OBJECT_OPTIONS = [
  { value: 'students', label: 'Students' },
  { value: 'business_units', label: 'Business Units (BU)' },
  { value: 'submissions', label: 'Submissions' },
  { value: 'interviews', label: 'Interviews' },
  { value: 'employees', label: 'Employees' },
  { value: 'leads', label: 'Leads' },
  { value: 'jobs', label: 'Jobs' },
  { value: 'expenses', label: 'Expenses' },
  { value: 'tech_support', label: 'Tech Support' },
  { value: 'organizations', label: 'Organizations' },
  { value: 'guest_houses', label: 'Guest Houses' },
  { value: 'clusters', label: 'Clusters' },
  { value: 'cases', label: 'Cases' },
  { value: 'campaigns', label: 'Campaigns' },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function RuleBuilderPage() {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editRule, setEditRule] = useState(null);
  const [filterObj, setFilterObj] = useState('');
  const [testModal, setTestModal] = useState(null);

  const fetchRules = useCallback(async () => {
    setLoading(true);
    try {
      const res = await get('/api/v1/validation-rules');
      setRules(res?.rules || res?.data || (Array.isArray(res) ? res : []));
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRules(); }, [fetchRules]);

  const toggleActive = async (rule) => {
    try {
      await put(`/api/v1/validation-rules/${rule.id}`, { isActive: !rule.is_active });
      fetchRules();
    } catch (e) { alert(e.message || 'Toggle failed'); }
  };

  const deleteRule = async (id) => {
    if (!confirm('Delete this validation rule?')) return;
    try {
      await del(`/api/v1/validation-rules/${id}`);
      fetchRules();
    } catch (e) { alert('Delete failed'); }
  };

  const filtered = filterObj ? rules.filter(r => r.object_type === filterObj) : rules;

  return (
    <Page title="Validation Rules" subtitle="Create rules with clicks (Simple mode) or Salesforce formulas (Advanced mode)">
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <select
            value={filterObj}
            onChange={e => setFilterObj(e.target.value)}
            style={selectStyle}
          >
            <option value="">All Objects ({rules.length})</option>
            {OBJECT_OPTIONS.map(o => {
              const count = rules.filter(r => r.object_type === o.value).length;
              return <option key={o.value} value={o.value}>{o.label} ({count})</option>;
            })}
          </select>
          <span style={{ color: '#64748b', fontSize: 13 }}>
            {filtered.filter(r => r.is_active).length} active · {filtered.filter(r => !r.is_active).length} inactive
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setShowCreate('simple')}>+ Simple Rule</Button>
          <button
            onClick={() => setShowCreate('formula')}
            style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#374151', fontWeight: 500 }}
          >
            + Advanced (Formula)
          </button>
        </div>
      </div>

      {/* Rules List */}
      {loading ? <Loading /> : filtered.length === 0 ? (
        <EmptyState onCreateSimple={() => setShowCreate('simple')} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(rule => (
            <RuleCard
              key={rule.id}
              rule={rule}
              onToggle={() => toggleActive(rule)}
              onEdit={() => setEditRule(rule)}
              onDelete={() => deleteRule(rule.id)}
              onTest={() => setTestModal(rule)}
            />
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <RuleEditorModal
          mode={showCreate}
          onClose={() => setShowCreate(false)}
          onSaved={() => { setShowCreate(false); fetchRules(); }}
        />
      )}

      {/* Edit Modal */}
      {editRule && (
        <RuleEditorModal
          mode={editRule.rule_mode || (editRule.sf_formula ? 'formula' : 'simple')}
          existingRule={editRule}
          onClose={() => setEditRule(null)}
          onSaved={() => { setEditRule(null); fetchRules(); }}
        />
      )}

      {/* Test Modal */}
      {testModal && (
        <TestRuleModal rule={testModal} onClose={() => setTestModal(null)} />
      )}
    </Page>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE CARD — Displays one rule with visual summary
// ═══════════════════════════════════════════════════════════════════════════════

function RuleCard({ rule, onToggle, onEdit, onDelete, onTest }) {
  const isFormula = rule.rule_mode === 'formula' || rule.sf_formula;

  return (
    <div style={{
      border: `1px solid ${rule.is_active ? '#e2e8f0' : '#fecaca'}`,
      borderRadius: 10,
      padding: '14px 18px',
      background: rule.is_active ? '#fff' : '#fef2f2',
      transition: 'all 0.15s',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {/* Left: Rule info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>{rule.name}</span>
            <Badge color={rule.is_active ? 'green' : 'red'}>{rule.is_active ? 'Active' : 'Inactive'}</Badge>
            <Badge color={isFormula ? 'purple' : 'blue'}>{isFormula ? 'Formula' : 'Simple'}</Badge>
            <Badge color="gray">{rule.object_type}</Badge>
            <Badge color={rule.applies_to === 'create' ? 'cyan' : rule.applies_to === 'update' ? 'orange' : 'gray'}>
              {rule.applies_to === 'both' ? 'Create & Update' : rule.applies_to === 'create' ? 'Create Only' : 'Update Only'}
            </Badge>
          </div>

          {/* Visual condition summary */}
          <div style={{ fontSize: 13, color: '#475569', marginBottom: 4 }}>
            {isFormula ? (
              <code style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontSize: 12, wordBreak: 'break-all' }}>
                {(rule.sf_formula || rule.formula || '').substring(0, 200)}{(rule.sf_formula || '').length > 200 ? '...' : ''}
              </code>
            ) : (
              <span>
                When <strong>{rule.condition_field || '?'}</strong>{' '}
                <em>{OPERATORS.find(o => o.value === rule.condition_operator)?.label || rule.condition_operator}</em>{' '}
                {rule.condition_value && <strong>"{rule.condition_value}"</strong>}
                {rule.and_field && (
                  <span> AND <strong>{rule.and_field}</strong> <em>{rule.and_operator}</em> {rule.and_value && <strong>"{rule.and_value}"</strong>}</span>
                )}
              </span>
            )}
          </div>

          {/* Error message */}
          <div style={{ fontSize: 12, color: '#dc2626', marginTop: 4 }}>
            → {rule.error_message}
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: 'flex', gap: 6, flexShrink: 0, marginLeft: 16 }}>
          <ActionBtn label="Test" onClick={onTest} color="#06b6d4" />
          <ActionBtn label="Edit" onClick={onEdit} color="#2563eb" />
          <ActionBtn
            label={rule.is_active ? 'Disable' : 'Enable'}
            onClick={onToggle}
            color={rule.is_active ? '#f59e0b' : '#10b981'}
          />
          <ActionBtn label="Delete" onClick={onDelete} color="#dc2626" />
        </div>
      </div>
    </div>
  );
}

function ActionBtn({ label, onClick, color }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'none', border: `1px solid ${color}33`, borderRadius: 6,
        padding: '3px 10px', cursor: 'pointer', fontSize: 11, color,
        fontWeight: 500, whiteSpace: 'nowrap',
      }}
    >
      {label}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// RULE EDITOR MODAL — Simple (visual) or Formula (advanced)
// ═══════════════════════════════════════════════════════════════════════════════

function RuleEditorModal({ mode: initialMode, existingRule, onClose, onSaved }) {
  const [mode, setMode] = useState(initialMode);
  const [saving, setSaving] = useState(false);
  const [fields, setFields] = useState([]);

  // Form state
  const [form, setForm] = useState({
    name: existingRule?.name || '',
    description: existingRule?.description || '',
    objectType: existingRule?.object_type || 'students',
    appliesTo: existingRule?.applies_to || 'both',
    ruleType: existingRule?.rule_type || 'error',
    // Simple mode
    conditionField: existingRule?.condition_field || '',
    conditionOperator: existingRule?.condition_operator || 'equals',
    conditionValue: existingRule?.condition_value || '',
    andField: existingRule?.and_field || '',
    andOperator: existingRule?.and_operator || '',
    andValue: existingRule?.and_value || '',
    targetField: existingRule?.target_field || '',
    errorMessage: existingRule?.error_message || '',
    errorLocation: existingRule?.error_location || 'top',
    priority: existingRule?.priority || 0,
    // Formula mode
    formula: existingRule?.sf_formula || existingRule?.formula || '',
  });

  // Load fields for selected object
  useEffect(() => {
    (async () => {
      try {
        const res = await get(`/api/v1/schema/fields?objectName=${form.objectType}`);
        const customFields = res?.data || (Array.isArray(res) ? res : []);
        // Add standard fields based on object
        const standard = getStandardFields(form.objectType);
        setFields([...standard, ...customFields.map(f => ({ value: f.field_name, label: f.label }))]);
      } catch { setFields(getStandardFields(form.objectType)); }
    })();
  }, [form.objectType]);

  const update = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const save = async () => {
    if (!form.name.trim()) return alert('Rule name is required');
    if (!form.errorMessage.trim()) return alert('Error message is required');

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        objectType: form.objectType,
        appliesTo: form.appliesTo,
        ruleType: form.ruleType,
        errorMessage: form.errorMessage,
        errorLocation: form.errorLocation,
        priority: form.priority,
      };

      if (mode === 'simple') {
        payload.conditionField = form.conditionField;
        payload.conditionOperator = form.conditionOperator;
        payload.conditionValue = form.conditionValue || null;
        payload.andField = form.andField || null;
        payload.andOperator = form.andOperator || null;
        payload.andValue = form.andValue || null;
        payload.targetField = form.targetField || null;
      } else {
        // Formula mode — store the raw formula
        payload.conditionOperator = 'formula';
        payload.conditionField = null;
        payload.conditionValue = form.formula;
      }

      if (existingRule) {
        await put(`/api/v1/validation-rules/${existingRule.id}`, payload);
      } else {
        await post('/api/v1/validation-rules', payload);
      }
      onSaved();
    } catch (e) { alert(e.message || 'Save failed'); }
    setSaving(false);
  };

  const noValueOps = ['is_empty', 'is_not_empty', 'is_changed'];

  return (
    <Modal
      open
      title={existingRule ? `Edit Rule: ${existingRule.name}` : 'Create Validation Rule'}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div style={{ maxHeight: '70vh', overflowY: 'auto', padding: '4px 0' }}>
        {/* Mode Switcher */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 20, border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden', width: 'fit-content' }}>
          <button
            onClick={() => setMode('simple')}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: mode === 'simple' ? '#2563eb' : '#fff',
              color: mode === 'simple' ? '#fff' : '#374151',
            }}
          >
            Simple (Clicks)
          </button>
          <button
            onClick={() => setMode('formula')}
            style={{
              padding: '8px 20px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: mode === 'formula' ? '#7c3aed' : '#fff',
              color: mode === 'formula' ? '#fff' : '#374151',
            }}
          >
            Advanced (Formula)
          </button>
        </div>

        {/* Common Fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
          <Input label="Rule Name *" value={form.name} onChange={e => update('name', e.target.value)} placeholder="e.g., Restrict_BU_Name_Update" />
          <Select label="Object *" value={form.objectType} onChange={e => update('objectType', e.target.value)}>
            {OBJECT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
          <Select label="Applies To" value={form.appliesTo} onChange={e => update('appliesTo', e.target.value)}>
            {APPLIES_TO.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Select label="Rule Type" value={form.ruleType} onChange={e => update('ruleType', e.target.value)}>
            {RULE_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </Select>
          <Input label="Priority" type="number" value={form.priority} onChange={e => update('priority', parseInt(e.target.value) || 0)} />
        </div>

        {/* ── SIMPLE MODE ── */}
        {mode === 'simple' && (
          <>
            <SectionLabel>When this condition is true:</SectionLabel>
            <div style={{ background: '#f0f9ff', borderRadius: 8, padding: 16, marginBottom: 16, border: '1px solid #bae6fd' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                <Select
                  label="Field"
                  value={form.conditionField}
                  onChange={e => update('conditionField', e.target.value)}
                >
                  <option value="">— Select field —</option>
                  {fields.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                <Select
                  label="Operator"
                  value={form.conditionOperator}
                  onChange={e => update('conditionOperator', e.target.value)}
                >
                  {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
                {!noValueOps.includes(form.conditionOperator) && (
                  <Input
                    label="Value"
                    value={form.conditionValue}
                    onChange={e => update('conditionValue', e.target.value)}
                    placeholder={form.conditionOperator === 'in_list' ? 'val1, val2, val3' : 'value'}
                  />
                )}
              </div>

              {/* AND condition */}
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px dashed #93c5fd' }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#1e40af', marginBottom: 6, display: 'block' }}>AND (optional second condition):</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <Select
                    label=""
                    value={form.andField}
                    onChange={e => update('andField', e.target.value)}
                  >
                    <option value="">— None —</option>
                    {fields.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Select>
                  {form.andField && (
                    <Select
                      label=""
                      value={form.andOperator}
                      onChange={e => update('andOperator', e.target.value)}
                    >
                      <option value="">— Operator —</option>
                      {OPERATORS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </Select>
                  )}
                  {form.andField && form.andOperator && !noValueOps.includes(form.andOperator) && (
                    <Input label="" value={form.andValue} onChange={e => update('andValue', e.target.value)} placeholder="value" />
                  )}
                </div>
              </div>
            </div>

            {/* Target field for 'required' type */}
            {form.ruleType === 'required' && (
              <div style={{ marginBottom: 16 }}>
                <Select
                  label="Then require this field to be filled:"
                  value={form.targetField}
                  onChange={e => update('targetField', e.target.value)}
                >
                  <option value="">— Select field —</option>
                  {fields.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </Select>
              </div>
            )}
          </>
        )}

        {/* ── FORMULA MODE ── */}
        {mode === 'formula' && (
          <>
            <SectionLabel>Salesforce-style formula (evaluates to true = show error):</SectionLabel>
            <div style={{ marginBottom: 16 }}>
              <textarea
                value={form.formula}
                onChange={e => update('formula', e.target.value)}
                placeholder={`AND(\n  ISCHANGED(Name),\n  $User.ProfileId != '00eJ1000000tKaT'\n)`}
                style={{
                  width: '100%', minHeight: 160, padding: 14, borderRadius: 8,
                  border: '1px solid #c4b5fd', fontFamily: 'monospace', fontSize: 13,
                  background: '#faf5ff', color: '#4c1d95', resize: 'vertical',
                  lineHeight: 1.6,
                }}
              />
              <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 6 }}>
                Supported functions: AND(), OR(), NOT(), ISNEW(), ISCHANGED(field), ISPICKVAL(field, value),
                ISBLANK(field), PRIORVALUE(field), $User.ProfileId, TODAY(), field comparisons (&gt;, &lt;, ==, !=)
              </div>
            </div>
          </>
        )}

        {/* Error Message */}
        <SectionLabel>Error message to show:</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: 12, marginBottom: 20 }}>
          <Input
            label=""
            value={form.errorMessage}
            onChange={e => update('errorMessage', e.target.value)}
            placeholder="e.g., BU Name Can not be Updated"
          />
          <Select
            label=""
            value={form.errorLocation}
            onChange={e => update('errorLocation', e.target.value)}
          >
            <option value="top">Show at top</option>
            <option value="field">Show on field</option>
          </Select>
        </div>

        {/* Description */}
        <Input label="Description (optional)" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Internal notes about this rule" />

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} disabled={saving}>
            {saving ? 'Saving...' : existingRule ? 'Update Rule' : 'Create Rule'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// TEST RULE MODAL
// ═══════════════════════════════════════════════════════════════════════════════

function TestRuleModal({ rule, onClose }) {
  const [testData, setTestData] = useState('{}');
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const runTest = async () => {
    setTesting(true);
    try {
      let data;
      try { data = JSON.parse(testData); } catch { alert('Invalid JSON'); setTesting(false); return; }
      const res = await post('/api/v1/validation-rules/test', {
        objectType: rule.object_type,
        data,
        existing: null,
      });
      setResult(res);
    } catch (e) { setResult({ error: e.message }); }
    setTesting(false);
  };

  // Generate example JSON based on object type
  useEffect(() => {
    const examples = {
      students: { firstName: 'John', lastName: 'Doe', marketingStatus: 'In Market', batch: "Mar'26" },
      submissions: { clientName: 'Acme Corp', submittedAt: new Date().toISOString().split('T')[0] },
      interviews: { scheduledAt: new Date().toISOString(), durationInMinutes: 60 },
      business_units: { name: 'Test BU' },
    };
    setTestData(JSON.stringify(examples[rule.object_type] || {}, null, 2));
  }, [rule]);

  return (
    <Modal open title={`Test Rule: ${rule.name}`} onClose={onClose} width="max-w-xl">
      <div style={{ marginBottom: 12 }}>
        <label style={{ fontWeight: 500, fontSize: 13, display: 'block', marginBottom: 6 }}>Test Data (JSON):</label>
        <textarea
          value={testData}
          onChange={e => setTestData(e.target.value)}
          style={{ width: '100%', minHeight: 120, padding: 12, borderRadius: 8, border: '1px solid #d1d5db', fontFamily: 'monospace', fontSize: 12, resize: 'vertical' }}
        />
      </div>
      <Button onClick={runTest} disabled={testing}>{testing ? 'Testing...' : 'Run Test'}</Button>
      {result && (
        <div style={{ marginTop: 16, padding: 14, borderRadius: 8, background: result.errors?.length > 0 ? '#fef2f2' : '#f0fdf4', border: `1px solid ${result.errors?.length > 0 ? '#fecaca' : '#bbf7d0'}` }}>
          {result.errors?.length > 0 ? (
            <div>
              <strong style={{ color: '#dc2626' }}>Validation Failed:</strong>
              {result.errors.map((e, i) => <div key={i} style={{ marginTop: 4, color: '#dc2626' }}>• {e.message}</div>)}
            </div>
          ) : result.error ? (
            <div style={{ color: '#dc2626' }}>Error: {result.error}</div>
          ) : (
            <div style={{ color: '#16a34a' }}><strong>Validation Passed</strong> — No errors triggered.</div>
          )}
          {result.warnings?.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <strong style={{ color: '#f59e0b' }}>Warnings:</strong>
              {result.warnings.map((w, i) => <div key={i} style={{ marginTop: 4, color: '#f59e0b' }}>• {w.message}</div>)}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

function EmptyState({ onCreateSimple }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: '#64748b' }}>
      <div style={{ marginBottom: 16 }}></div>
      <h3 style={{ margin: '0 0 8px', color: '#1e293b' }}>No Validation Rules Yet</h3>
      <p style={{ margin: '0 0 20px' }}>Create rules to enforce data quality — like Salesforce, but simpler.</p>
      <Button onClick={onCreateSimple}>+ Create Your First Rule</Button>
    </div>
  );
}

function SectionLabel({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b', marginBottom: 8 }}>{children}</div>;
}

function getStandardFields(objectType) {
  const common = [
    { value: 'name', label: 'Name' },
    { value: 'createdAt', label: 'Created Date' },
    { value: 'updatedAt', label: 'Last Modified' },
  ];

  const byObject = {
    students: [
      { value: 'firstName', label: 'First Name' },
      { value: 'lastName', label: 'Last Name' },
      { value: 'email', label: 'Email' },
      { value: 'phone', label: 'Phone' },
      { value: 'marketingStatus', label: 'Marketing Status' },
      { value: 'batch', label: 'Batch' },
      { value: 'technology', label: 'Technology' },
      { value: 'billRate', label: 'Bill Rate' },
      { value: 'payRate', label: 'Pay Rate' },
      { value: 'offerType', label: 'Offer Type' },
      { value: 'marketingStartDate', label: 'Marketing Start Date' },
      { value: 'verbalConfirmationDate', label: 'Verbal Confirmation Date' },
      { value: 'jobStartDate', label: 'Job Start Date' },
      { value: 'jobEndDate', label: 'Job End Date' },
      { value: 'paidOfferStartDate', label: 'Paid Offer Start Date' },
      { value: 'reasonForExit', label: 'Reason for Exit' },
      { value: 'projectType', label: 'Project Type' },
      { value: 'onboardingVisaStatus', label: 'Onboarding Visa Status' },
      { value: 'jobTitle', label: 'Job Title' },
    ],
    submissions: [
      { value: 'clientName', label: 'Client Name' },
      { value: 'submittedAt', label: 'Submission Date' },
      { value: 'status', label: 'Status' },
      { value: 'studentStatus', label: 'Student Marketing Status' },
    ],
    interviews: [
      { value: 'scheduledAt', label: 'Interview Date' },
      { value: 'endDateTime', label: 'End Date/Time' },
      { value: 'durationInMinutes', label: 'Duration (Minutes)' },
      { value: 'amountUsd', label: 'Amount (USD)' },
      { value: 'techSupportName', label: 'Tech Support' },
      { value: 'finalStatus', label: 'Final Status' },
      { value: 'otterLink', label: 'Otter Link' },
      { value: 'studentOtterPerformance', label: 'Student Otter Performance' },
      { value: 'anyTechnicalIssues', label: 'Any Technical Issues' },
    ],
    business_units: [
      { value: 'buName', label: 'BU Name' },
      { value: 'buEmail', label: 'BU Email' },
      { value: 'cluster', label: 'Cluster' },
      { value: 'offshoreManager', label: 'Offshore Manager' },
    ],
    employees: [
      { value: 'approvalStatus', label: 'Approval Status' },
      { value: 'department', label: 'Department' },
      { value: 'workPhone', label: 'Work Phone' },
      { value: 'personalPhone', label: 'Personal Phone' },
    ],
    leads: [
      { value: 'approvalStatus', label: 'Approval Status' },
      { value: 'city', label: 'City' },
    ],
    jobs: [
      { value: 'active', label: 'Active' },
      { value: 'billRate', label: 'Bill Rate' },
      { value: 'projectEndDate', label: 'Project End Date' },
    ],
  };

  return [...common, ...(byObject[objectType] || [])];
}

// ─── Shared Styles ──────────────────────────────────────────────────────────

const selectStyle = {
  padding: '6px 12px',
  borderRadius: 6,
  border: '1px solid #d1d5db',
  fontSize: 13,
  background: '#fff',
  cursor: 'pointer',
};