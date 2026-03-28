import { useState, useEffect, useCallback, useRef } from "react";
import {
  Page,
  Loading,
  Tabs,
  DataTable,
  Badge,
  Button,
  Modal,
  Input,
  Select,
  ConfirmDialog,
} from "../../components/Shared";
import { getToken } from "../../utils/auth";
import {
  Plus,
  Trash2,
  Edit3,
  GripVertical,
  ChevronDown,
  ChevronRight,
  Database,
  Settings,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  ArrowUp,
  ArrowDown,
  Link2,
  Layers,
  Palette,
  X,
} from "lucide-react";
import { useToast } from "../../context/ToastContext";
async function api(p, o = {}) {
  const r = await fetch(p, {
    ...o,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
      ...o.headers,
    },
  });
  const j = await r.json();
  if (j.success !== undefined) {
    if (!j.success) throw new Error(j.error?.message || "Failed");
    return j.data || j;
  }
  return j;
}

const FIELD_TYPES = [
  "text",
  "number",
  "email",
  "phone",
  "url",
  "date",
  "datetime",
  "textarea",
  "picklist",
  "multipicklist",
  "checkbox",
  "currency",
  "percent",
  "lookup",
  "formula",
  "auto_number",
];
const FIELD_TYPE_ICONS = {
  text: "Aa",
  number: "#",
  email: "@",
  phone: "📱",
  url: "🔗",
  date: "📅",
  datetime: "🕐",
  textarea: "¶",
  picklist: "☰",
  multipicklist: "☷",
  checkbox: "☑",
  currency: "$",
  percent: "%",
  lookup: "🔗",
  formula: "ƒx",
  auto_number: "++",
};

// ═══════════════════════════════════════════════════════════════════════════
// DRAG-DROP HELPER
// ═══════════════════════════════════════════════════════════════════════════
function useDragReorder(items, onReorder) {
  const [dragIdx, setDragIdx] = useState(null);
  const [overIdx, setOverIdx] = useState(null);

  const onDragStart = (idx) => setDragIdx(idx);
  const onDragOver = (e, idx) => {
    e.preventDefault();
    setOverIdx(idx);
  };
  const onDrop = (idx) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null);
      setOverIdx(null);
      return;
    }
    const reordered = [...items];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(idx, 0, moved);
    onReorder(reordered);
    setDragIdx(null);
    setOverIdx(null);
  };
  const onDragEnd = () => {
    setDragIdx(null);
    setOverIdx(null);
  };

  return { dragIdx, overIdx, onDragStart, onDragOver, onDrop, onDragEnd };
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 1: OBJECTS
// ═══════════════════════════════════════════════════════════════════════════
function ObjectsTab({ selectedObj, onSelect }) {
  const [confirmDelObj, setConfirmDelObj] = useState(null);
  const toast = useToast();
  const [objects, setObjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const load = () => {
    setLoading(true);
    api("/api/v1/schema/objects")
      .then((r) => setObjects(Array.isArray(r) ? r : r?.objects || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const create = async () => {
    try {
      await api("/api/v1/schema/objects", {
        method: "POST",
        body: JSON.stringify(form),
      });
      toast.success("Object created!");
      setShowCreate(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const [deleting, setDeleting] = useState(false);
  const del = async (name) => {
    setDeleting(true);
    try {
      await api(`/api/v1/schema/objects/${name}`, { method: "DELETE" });
      toast.success("Object deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    }
    setDeleting(false);
    setConfirmDelObj(null);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{objects.length} objects</p>
        <Button
          onClick={() => {
            setShowCreate(true);
            setForm({});
          }}
        >
          <Plus size={14} /> New Object
        </Button>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {objects.map((obj) => (
          <div
            key={obj.name || obj.id}
            onClick={() => onSelect(obj.name)}
            className={`bg-white border rounded-xl p-4 cursor-pointer transition-all hover:shadow-md ${selectedObj === obj.name ? "border-blue-500 ring-2 ring-blue-100" : "border-gray-200"}`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Database size={14} className="text-blue-600" />
                <span className="font-mono text-sm font-bold text-gray-900">
                  {obj.name}
                </span>
              </div>
              {obj.is_custom && <Badge color="blue">Custom</Badge>}
            </div>
            <p className="text-xs text-gray-500">{obj.label || obj.name}</p>
            {obj.description && (
              <p className="text-[10px] text-gray-400 mt-1">
                {obj.description}
              </p>
            )}
            <div className="flex justify-between items-center mt-3">
              <span className="text-[10px] text-gray-400">
                {obj.field_count || "—"} fields
              </span>
              {obj.is_custom && (
                <button
                  onClick={(e) => { e.stopPropagation(); setConfirmDelObj(obj.name); }}
                  className="text-gray-300 hover:text-red-500"
                >
                  <Trash2 size={12} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <ConfirmDialog
        open={!!confirmDelObj}
        onClose={() => setConfirmDelObj(null)}
        onConfirm={() => del(confirmDelObj)}
        title="Delete Object"
        description={`Delete the object "${confirmDelObj}" and its table? This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Custom Object"
      >
        <div className="space-y-4 mb-6">
          <Input
            label="API Name"
            value={form.name || ""}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""),
              })
            }
            placeholder="vendor_contacts"
          />
          <Input
            label="Display Label"
            value={form.label || ""}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Vendor Contacts"
          />
          <Input
            label="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-amber-700">
            This will create a real database table with tenant_id, id, name,
            created_at, updated_at columns. Add custom fields after creation.
          </p>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create Object</Button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 2: FIELDS
// ═══════════════════════════════════════════════════════════════════════════
function FieldsTab({ objectName }) {
  const toast = useToast();
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editField, setEditField] = useState(null);
  const [confirmDelField, setConfirmDelField] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ fieldType: "text" });
  const load = () => {
    setLoading(true);
    api(`/api/v1/schema/fields?objectName=${objectName}`)
      .then((r) => setFields(Array.isArray(r) ? r : r?.fields || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [objectName]);

  const save = async () => {
    try {
      await api("/api/v1/schema/fields", {
        method: "POST",
        body: JSON.stringify({ objectName, ...form }),
      });
      toast.success("Field created!");
      setShowCreate(false);
      setEditField(null);
      setForm({ fieldType: "text" });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const delField = async (id) => {
    setDeleting(true);
    try {
      await api(`/api/v1/schema/fields/${id}`, { method: "DELETE" });
      toast.success("Field deleted");
      load();
    } catch (e) {
      toast.error(e.message);
    }
    setDeleting(false);
    setConfirmDelField(null);
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {fields.length} fields on{" "}
          <span className="font-mono font-bold">{objectName}</span>
        </p>
        <Button
          onClick={() => {
            setShowCreate(true);
            setForm({ fieldType: "text" });
          }}
        >
          <Plus size={14} /> New Field
        </Button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Type
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Label
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                API Name
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Required
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Unique
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Default
              </th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {fields.map((f, i) => (
              <tr key={f.id || f.fieldName || f.field_name || i}>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-gray-100 text-xs font-mono">
                    <span>
                      {FIELD_TYPE_ICONS[f.fieldType || f.field_type] || "?"}
                    </span>{" "}
                    {f.fieldType || f.field_type}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {f.label}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-gray-500">
                  {f.fieldName || f.field_name}
                </td>
                <td className="px-4 py-3">
                  {f.isRequired || f.is_required ? (
                    <Badge color="red">Required</Badge>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {f.isUnique || f.is_unique ? (
                    <Badge color="purple">Unique</Badge>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {f.defaultValue || f.default_value || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  {(f.isCustom || f.is_custom) && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setEditField(f)}
                        className="text-gray-300 hover:text-blue-500"
                      >
                        <Edit3 size={13} />
                      </button>
                      <button
                        onClick={() => setConfirmDelField(f)}
                        className="text-gray-300 hover:text-red-500"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Field Modal */}
      <Modal
        open={showCreate || !!editField}
        onClose={() => {
          setShowCreate(false);
          setEditField(null);
        }}
        title={editField ? "Edit Field" : "Create Field"}
        width="max-w-xl"
      >
        <div className="space-y-4 mb-6">
          <Input
            label="Label"
            value={form.label || ""}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="LinkedIn URL"
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Field Type"
              value={form.fieldType || "text"}
              onChange={(e) => setForm({ ...form, fieldType: e.target.value })}
            >
              {FIELD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {FIELD_TYPE_ICONS[t] || ""} {t}
                </option>
              ))}
            </Select>
            <Input
              label="Default Value"
              value={form.defaultValue || ""}
              onChange={(e) =>
                setForm({ ...form, defaultValue: e.target.value })
              }
            />
          </div>

          {/* Type-specific options */}
          {(form.fieldType === "picklist" ||
            form.fieldType === "multipicklist") && (
            <Input
              label="Values (comma-separated)"
              value={form.picklistValues || ""}
              onChange={(e) =>
                setForm({ ...form, picklistValues: e.target.value })
              }
              placeholder="Morning,Afternoon,Evening"
            />
          )}
          {form.fieldType === "lookup" && (
            <Input
              label="Related Object"
              value={form.relatedObject || ""}
              onChange={(e) =>
                setForm({ ...form, relatedObject: e.target.value })
              }
              placeholder="recruiters"
            />
          )}
          {form.fieldType === "formula" && (
            <Input
              label="Formula Expression"
              value={form.formulaExpression || ""}
              onChange={(e) =>
                setForm({ ...form, formulaExpression: e.target.value })
              }
              placeholder="bill_rate * 160"
            />
          )}
          {form.fieldType === "number" && (
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Decimal Places"
                type="number"
                value={form.decimalPlaces || 0}
                onChange={(e) =>
                  setForm({ ...form, decimalPlaces: parseInt(e.target.value) })
                }
              />
              <Input
                label="Max Length"
                type="number"
                value={form.maxLength || ""}
                onChange={(e) =>
                  setForm({ ...form, maxLength: parseInt(e.target.value) })
                }
              />
            </div>
          )}

          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.isRequired || false}
                onChange={(e) =>
                  setForm({ ...form, isRequired: e.target.checked })
                }
                className="rounded"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.isUnique || false}
                onChange={(e) =>
                  setForm({ ...form, isUnique: e.target.checked })
                }
                className="rounded"
              />
              Unique
            </label>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={form.isIndexed || false}
                onChange={(e) =>
                  setForm({ ...form, isIndexed: e.target.checked })
                }
                className="rounded"
              />
              Indexed
            </label>
          </div>
          <Input
            label="Help Text"
            value={form.helpText || ""}
            onChange={(e) => setForm({ ...form, helpText: e.target.value })}
            placeholder="Enter the candidate's LinkedIn profile URL"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreate(false);
              setEditField(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={save}>
            {editField ? "Update" : "Create"} Field
          </Button>
        </div>
      </Modal>
      <ConfirmDialog
        open={!!confirmDelField}
        onClose={() => setConfirmDelField(null)}
        onConfirm={() => delField(confirmDelField?.id)}
        title="Delete Field"
        description={`Delete the field "${confirmDelField?.label || confirmDelField?.fieldName}"? This will drop the column from the database and cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={deleting}
      />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 3: PICKLIST VALUES (with drag reorder + colors)
// ═══════════════════════════════════════════════════════════════════════════
function PicklistTab({ objectName }) {
  const toast = useToast();
  const [fields, setFields] = useState([]);
  const [selectedField, setSelectedField] = useState("");
  const [values, setValues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  // Load picklist fields for this object
  useEffect(() => {
    api(`/api/v1/schema/fields?objectName=${objectName}`)
      .then((r) => {
        const allFields = Array.isArray(r) ? r : r?.fields || [];
        const plFields = allFields.filter(f => (f.fieldType || f.field_type) === 'picklist' || (f.fieldType || f.field_type) === 'multipicklist')
        setFields(plFields);
        if (plFields.length > 0 && !selectedField)
          setSelectedField(plFields[0].field_name);
      })
      .catch(console.error);
  }, [objectName]);

  // Load values for selected field
  useEffect(() => {
    if (!selectedField) return;
    setLoading(true);
    api(
      `/api/v1/schema/picklists?objectName=${objectName}&fieldName=${selectedField}`,
    )
      .then((r) => setValues(Array.isArray(r) ? r : r?.values || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedField, objectName]);

  const { dragIdx, overIdx, onDragStart, onDragOver, onDrop, onDragEnd } =
    useDragReorder(values, (reordered) => {
      setValues(reordered);
      // TODO: send reorder to backend
    });

  const create = async () => {
    try {
      await api("/api/v1/schema/picklists", {
        method: "POST",
        body: JSON.stringify({ objectName, fieldName: selectedField, ...form }),
      });
      toast.success("Value added!");
      setShowCreate(false);
      setForm({});
      // Reload
      const r = await api(
        `/api/v1/schema/picklists?objectName=${objectName}&fieldName=${selectedField}`,
      );
      setValues(Array.isArray(r) ? r : r?.values || []);
    } catch (e) {
      toast.error(e.message);
    }
  };

  return (
    <div>
      <div className="flex items-end gap-4 mb-4">
        <Select
          label="Picklist Field"
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
        >
          {fields.map(f => <option key={f.fieldName || f.field_name} value={f.fieldName || f.field_name}>{f.label} ({f.fieldName || f.field_name})</option>)}
        </Select>
        <Button
          onClick={() => {
            setShowCreate(true);
            setForm({ color: "#6b7280" });
          }}
        >
          <Plus size={14} /> Add Value
        </Button>
      </div>

      {loading ? (
        <Loading />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
          {values.length === 0 ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              No picklist values. Click "Add Value" to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {values.map((v, i) => (
                <div
                  key={v.id || i}
                  draggable
                  onDragStart={() => onDragStart(i)}
                  onDragOver={(e) => onDragOver(e, i)}
                  onDrop={() => onDrop(i)}
                  onDragEnd={onDragEnd}
                  className={`flex items-center gap-3 px-4 py-3 transition-all cursor-grab active:cursor-grabbing ${dragIdx === i ? "opacity-30" : ""} ${overIdx === i ? "bg-blue-50 border-l-2 border-blue-500" : "hover:bg-gray-50"}`}
                >
                  <GripVertical size={14} className="text-gray-300 shrink-0" />
                  <div
                    className="w-5 h-5 rounded-md border border-gray-200 shrink-0"
                    style={{ background: v.color || "#6b7280" }}
                  />
                  <span className="font-medium text-gray-900 flex-1">
                    {v.value}
                  </span>
                  <span className="text-xs text-gray-400">
                    {v.label || v.value}
                  </span>
                  {v.is_default && <Badge color="green">Default</Badge>}
                  <span className="text-[10px] font-mono text-gray-300">
                    #{v.sort_order ?? i}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Picklist Value"
      >
        <div className="space-y-4 mb-6">
          <Input
            label="Value"
            value={form.value || ""}
            onChange={(e) => setForm({ ...form, value: e.target.value })}
            placeholder="In Market"
          />
          <Input
            label="Label (optional)"
            value={form.label || ""}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Same as value if empty"
          />
          <div className="flex items-center gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Color
              </label>
              <input
                type="color"
                value={form.color || "#6b7280"}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer"
              />
            </div>
            <label className="flex items-center gap-2 text-xs mt-5">
              <input
                type="checkbox"
                checked={form.isDefault || false}
                onChange={(e) =>
                  setForm({ ...form, isDefault: e.target.checked })
                }
                className="rounded"
              />
              Set as default
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Add Value</Button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 4: DEPENDENT PICKLISTS
// ═══════════════════════════════════════════════════════════════════════════
function DependentPicklistsTab({ objectName }) {
  const toast = useToast();
  const [deps, setDeps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const [testResult, setTestResult] = useState(null);

  const load = () => {
    setLoading(true);
    api("/api/v1/knowledge/dependent-picklists")
      .then((r) => setDeps(Array.isArray(r) ? r : r?.dependencies || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, []);

  const filtered = deps.filter((d) => d.object_name === objectName);

  const create = async () => {
    try {
      await api("/api/v1/knowledge/dependent-picklists", {
        method: "POST",
        body: JSON.stringify({ objectName, ...form }),
      });
      toast.success("Dependency created!");
      setShowCreate(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  const del = async (id) => {
    await api(`/api/v1/knowledge/dependent-picklists/${id}`, {
      method: "DELETE",
    });
    load();
  };

  const resolve = async (parentField, parentValue, childField) => {
    try {
      const r = await api(
        `/api/v1/knowledge/dependent-picklists/resolve?objectName=${objectName}&parentField=${parentField}&parentValue=${parentValue}&childField=${childField}`,
      );
      setTestResult(r);
    } catch (e) {
      setTestResult({ error: e.message });
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-blue-800">
          Dependent picklists control which child values appear based on the
          parent field's selection. Example: Technology = "JAVA" → Batch shows
          only Java-related batches.
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {filtered.length} dependencies on{" "}
          <span className="font-mono font-bold">{objectName}</span>
        </p>
        <Button
          onClick={() => {
            setShowCreate(true);
            setForm({});
          }}
        >
          <Plus size={14} /> New Dependency
        </Button>
      </div>

      <div className="space-y-3">
        {filtered.map((d) => (
          <div
            key={d.id}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-card"
          >
            <div className="flex items-center gap-3 mb-2">
              <Link2 size={14} className="text-purple-600" />
              <span className="font-mono text-sm font-bold text-gray-900">
                {d.parent_field}
              </span>
              <span className="text-gray-400">=</span>
              <Badge color="purple">{d.parent_value}</Badge>
              <span className="text-gray-400">→</span>
              <span className="font-mono text-sm font-bold text-blue-600">
                {d.child_field}
              </span>
              <span className="text-gray-400">shows:</span>
              <div className="flex gap-1 flex-wrap">
                {(d.child_values || "").split(",").map((v, i) => (
                  <Badge key={i} color="blue">
                    {v.trim()}
                  </Badge>
                ))}
              </div>
              <button
                onClick={() => del(d.id)}
                className="ml-auto text-gray-300 hover:text-red-500"
              >
                <Trash2 size={13} />
              </button>
            </div>
            <button
              onClick={() =>
                resolve(d.parent_field, d.parent_value, d.child_field)
              }
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Test resolve →
            </button>
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-400 text-sm">
            No dependent picklists for this object.
          </div>
        )}
      </div>

      {testResult && (
        <div className="mt-4 p-4 bg-gray-50 border rounded-xl">
          <p className="text-xs font-bold text-gray-600 mb-2">
            Resolve Result:
          </p>
          <div className="space-y-1">
            {testResult && typeof testResult === "object" ? (
              Object.entries(testResult).map(([k, v]) => (
                <div key={k} className="flex gap-3 text-xs">
                  <span className="text-gray-400 w-28 shrink-0">{k}</span>
                  <span className="font-mono text-gray-700">
                    {typeof v === "object" ? JSON.stringify(v) : String(v)}
                  </span>
                </div>
              ))
            ) : (
              <span className="text-xs text-gray-700">
                {String(testResult)}
              </span>
            )}
          </div>
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Dependent Picklist"
      >
        <div className="space-y-4 mb-6">
          <Input
            label="Parent Field"
            value={form.parentField || ""}
            onChange={(e) => setForm({ ...form, parentField: e.target.value })}
            placeholder="technology"
          />
          <Input
            label="Parent Value"
            value={form.parentValue || ""}
            onChange={(e) => setForm({ ...form, parentValue: e.target.value })}
            placeholder="JAVA"
          />
          <Input
            label="Child Field"
            value={form.childField || ""}
            onChange={(e) => setForm({ ...form, childField: e.target.value })}
            placeholder="batch"
          />
          <Input
            label="Child Values (comma-separated)"
            value={form.childValues || ""}
            onChange={(e) => setForm({ ...form, childValues: e.target.value })}
            placeholder="Mar26,Jan26,Sep25"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 5: PAGE LAYOUTS (with drag-drop sections + fields)
// ═══════════════════════════════════════════════════════════════════════════
function LayoutsTab({ objectName }) {
  const toast = useToast();
  const [layouts, setLayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editLayout, setEditLayout] = useState(null);
  const [availableFields, setAvailableFields] = useState([]);
  const [form, setForm] = useState({
    sections: [{ name: "Details", fields: [] }],
  });
  const load = () => {
    setLoading(true);
    Promise.all([
      api(`/api/v1/schema/layouts?objectName=${objectName}`),
      api(`/api/v1/schema/fields?objectName=${objectName}`),
    ])
      .then(([l, f]) => {
        setLayouts(Array.isArray(l) ? l : l?.layouts || []);
        setAvailableFields(
          (Array.isArray(f) ? f : f?.fields || []).map(
            (x) => x.field_name || x.label,
          ),
        );
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [objectName]);

  const addSection = () => {
    const name = `Section ${(form.sections?.length || 0) + 1}`;
    setForm((prev) => ({
      ...prev,
      sections: [...prev.sections, { name, fields: [] }],
    }));
  };

  const addFieldToSection = (sectionIdx, field) => {
    setForm((prev) => {
      const sections = [...prev.sections];
      if (!sections[sectionIdx].fields.includes(field))
        sections[sectionIdx].fields.push(field);
      return { ...prev, sections };
    });
  };

  const removeFieldFromSection = (sectionIdx, fieldIdx) => {
    setForm((prev) => {
      const sections = [...prev.sections];
      sections[sectionIdx].fields.splice(fieldIdx, 1);
      return { ...prev, sections };
    });
  };

  const removeSection = (idx) => {
    setForm((prev) => ({
      ...prev,
      sections: prev.sections.filter((_, i) => i !== idx),
    }));
  };

  const save = async () => {
    try {
      await api("/api/v1/schema/layouts", {
        method: "POST",
        body: JSON.stringify({
          objectName,
          layoutName: form.layoutName,
          role: form.role,
          sections: form.sections,
        }),
      });
      toast.success("Layout saved!");
      setShowCreate(false);
      setEditLayout(null);
      setForm({ sections: [{ name: "Details", fields: [] }] });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <Loading />;

  // Fields already assigned in current form
  const assignedFields = new Set(form.sections.flatMap((s) => s.fields));
  const unassignedFields = availableFields.filter(
    (f) => !assignedFields.has(f),
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">{layouts.length} layouts</p>
        <Button
          onClick={() => {
            setShowCreate(true);
            setForm({
              sections: [
                { name: "Basic Info", fields: [] },
                { name: "Details", fields: [] },
              ],
            });
          }}
        >
          <Plus size={14} /> New Layout
        </Button>
      </div>

      <DataTable
        searchable={false}
        columns={[
          {
            key: "layout_name",
            label: "Layout",
            render: (v, r) => (
              <div className="flex items-center gap-3">
                <Layers size={14} className="text-blue-600" />
                <div>
                  <p className="font-medium text-gray-900">{v}</p>
                  <p className="text-[10px] text-gray-400">
                    {r.sections?.length || 0} sections
                  </p>
                </div>
              </div>
            ),
          },
          {
            key: "role",
            label: "Role",
            render: (v) => (
              <Badge
                color={
                  v === "HEAD"
                    ? "red"
                    : v === "BU_ADMIN"
                      ? "blue"
                      : v === "RECRUITER"
                        ? "purple"
                        : "green"
                }
              >
                {v}
              </Badge>
            ),
          },
          {
            key: "actions",
            label: "",
            render: (_, r) => (
              <button
                onClick={() => {
                  setEditLayout(r);
                  setShowCreate(true);
                  setForm({
                    layoutName: r.layout_name,
                    role: r.role,
                    sections: r.sections || [],
                  });
                }}
                className="text-gray-400 hover:text-blue-600"
              >
                <Edit3 size={13} />
              </button>
            ),
          },
        ]}
        rows={layouts}
      />

      {/* Create/Edit Layout Modal */}
      <Modal
        open={showCreate}
        onClose={() => {
          setShowCreate(false);
          setEditLayout(null);
        }}
        title={editLayout ? "Edit Layout" : "Create Layout"}
        width="max-w-3xl"
      >
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Layout Name"
              value={form.layoutName || ""}
              onChange={(e) => setForm({ ...form, layoutName: e.target.value })}
              placeholder="Recruiter View"
            />
            <Select
              label="Role"
              value={form.role || ""}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="">All Roles</option>
              <option value="HEAD">HEAD</option>
              <option value="BU_ADMIN">BU_ADMIN</option>
              <option value="RECRUITER">RECRUITER</option>
              <option value="STUDENT">STUDENT</option>
            </Select>
          </div>

          {/* Sections */}
          <div className="space-y-3">
            {form.sections.map((section, si) => (
              <div
                key={si}
                className="border border-gray-200 rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b">
                  <span className="text-sm font-bold text-gray-700">
                    {section.name}
                  </span>
                  <button
                    onClick={() => removeSection(si)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </div>
                <div className="p-3">
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {section.fields.map((field, fi) => (
                      <span
                        key={fi}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-200"
                      >
                        {field}
                        <button
                          onClick={() => removeFieldFromSection(si, fi)}
                          className="text-blue-400 hover:text-red-500"
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                    {section.fields.length === 0 && (
                      <span className="text-xs text-gray-300 py-1">
                        Drag fields here or click from unassigned list
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <button
              onClick={addSection}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium"
            >
              + Add Section
            </button>
          </div>

          {/* Unassigned fields */}
          {unassignedFields.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">
                Unassigned Fields (click to add to last section):
              </p>
              <div className="flex flex-wrap gap-1">
                {unassignedFields.map((f) => (
                  <button
                    key={f}
                    onClick={() =>
                      addFieldToSection(form.sections.length - 1, f)
                    }
                    className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors"
                  >
                    + {f}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3">
          <Button
            variant="secondary"
            onClick={() => {
              setShowCreate(false);
              setEditLayout(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={save}>Save Layout</Button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 6: FIELD PERMISSIONS (role × field matrix)
// ═══════════════════════════════════════════════════════════════════════════
function PermissionsTab({ objectName }) {
  const toast = useToast();
  const [role, setRole] = useState("RECRUITER");
  const [perms, setPerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const load = () => {
    setLoading(true);
    api(`/api/v1/schema/permissions?role=${role}&objectName=${objectName}`)
      .then((r) => setPerms(Array.isArray(r) ? r : r?.permissions || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [role, objectName]);

  const toggle = async (fieldName, key, currentVal) => {
    const data = { role, objectName, fieldName, [key]: !currentVal };
    if (key === "visible" && currentVal) data.editable = false; // If hiding, also disable edit
    try {
      await api("/api/v1/schema/permissions", {
        method: "POST",
        body: JSON.stringify(data),
      });
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="flex items-end gap-4 mb-4">
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
        >
          <option value="HEAD">HEAD</option>
          <option value="BU_ADMIN">BU_ADMIN</option>
          <option value="RECRUITER">RECRUITER</option>
          <option value="STUDENT">STUDENT</option>
        </Select>
        <p className="text-sm text-gray-500 pb-2">
          {perms.length} field permissions
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">
                Field
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                Visible
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                Editable
              </th>
              <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500">
                Access Level
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {perms.map((p) => (
              <tr key={p.field_name} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-700">
                  {p.field_name}
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(p.field_name, "visible", p.visible)}
                    className={`p-1.5 rounded-lg transition-colors ${p.visible ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-red-100 text-red-600 hover:bg-red-200"}`}
                  >
                    {p.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(p.field_name, "editable", p.editable)}
                    disabled={!p.visible}
                    className={`p-1.5 rounded-lg transition-colors disabled:opacity-30 ${p.editable ? "bg-green-100 text-green-600 hover:bg-green-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                  >
                    {p.editable ? <Unlock size={14} /> : <Lock size={14} />}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <Badge
                    color={!p.visible ? "red" : p.editable ? "green" : "amber"}
                  >
                    {!p.visible ? "Hidden" : p.editable ? "Edit" : "Read Only"}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 7: RECORD TYPES
// ═══════════════════════════════════════════════════════════════════════════
function RecordTypesTab({ objectName }) {
  const toast = useToast();
  const [types, setTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({});
  const load = () => {
    setLoading(true);
    api(`/api/v1/schema/objects`)
      .then((r) => {
        // Record types are typically on the schema object itself or a separate endpoint
        // Try to get from the objects list
        const all = Array.isArray(r) ? r : r?.objects || [];
        const obj = all.find((o) => o.name === objectName);
        setTypes(obj?.record_types || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };
  useEffect(() => {
    load();
  }, [objectName]);

  const create = async () => {
    try {
      await api("/api/v1/schema/record-types", {
        method: "POST",
        body: JSON.stringify({ objectName, ...form }),
      });
      toast.success("Record type created!");
      setShowCreate(false);
      setForm({});
      load();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (loading) return <Loading />;

  return (
    <div>
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
        <p className="text-sm text-blue-800">
          Record types allow different page layouts, picklist values, and
          business processes for different categories of the same object. For
          example: "Full-Time Student" vs "Contract Student" can have different
          fields visible.
        </p>
      </div>

      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-gray-500">
          {types.length} record types on{" "}
          <span className="font-mono font-bold">{objectName}</span>
        </p>
        <Button
          onClick={() => {
            setShowCreate(true);
            setForm({});
          }}
        >
          <Plus size={14} /> New Record Type
        </Button>
      </div>

      {types.length > 0 ? (
        <DataTable
          searchable={false}
          columns={[
            {
              key: "name",
              label: "Name",
              render: (v) => (
                <span className="font-medium text-gray-900">{v}</span>
              ),
            },
            { key: "label", label: "Label" },
            { key: "description", label: "Description" },
            {
              key: "layout_name",
              label: "Layout",
              render: (v) => (v ? <Badge color="blue">{v}</Badge> : "—"),
            },
            {
              key: "is_active",
              label: "Active",
              render: (v) => (
                <Badge color={v !== false ? "green" : "gray"}>
                  {v !== false ? "Active" : "Inactive"}
                </Badge>
              ),
            },
          ]}
          rows={types}
        />
      ) : (
        <div className="bg-gray-50 border rounded-xl p-8 text-center text-gray-400 text-sm">
          No record types defined. All records use the default layout.
        </div>
      )}

      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Create Record Type"
      >
        <div className="space-y-4 mb-6">
          <Input
            label="Name"
            value={form.name || ""}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="full_time"
          />
          <Input
            label="Label"
            value={form.label || ""}
            onChange={(e) => setForm({ ...form, label: e.target.value })}
            placeholder="Full-Time Student"
          />
          <Input
            label="Description"
            value={form.description || ""}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <Input
            label="Associated Layout"
            value={form.layoutName || ""}
            onChange={(e) => setForm({ ...form, layoutName: e.target.value })}
            placeholder="Leave empty for default"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setShowCreate(false)}>
            Cancel
          </Button>
          <Button onClick={create}>Create</Button>
        </div>
      </Modal>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TAB 8: VISUAL SCHEMA BUILDER
// ═══════════════════════════════════════════════════════════════════════════
const SCHEMA_RELATIONS = [
  { from: 'students',    to: 'submissions',    label: 'submits' },
  { from: 'students',    to: 'interviews',     label: 'attends' },
  { from: 'students',    to: 'placements',     label: 'placed as' },
  { from: 'submissions', to: 'interviews',     label: 'leads to' },
  { from: 'recruiters',  to: 'students',       label: 'manages' },
  { from: 'recruiters',  to: 'submissions',    label: 'submits' },
  { from: 'business_units', to: 'recruiters',  label: 'contains' },
  { from: 'business_units', to: 'students',    label: 'enrolls' },
  { from: 'leads',       to: 'students',       label: 'converts to' },
]

const OBJ_COLORS = {
  students: '#3b82f6', submissions: '#8b5cf6', interviews: '#f59e0b',
  placements: '#10b981', recruiters: '#ef4444', business_units: '#6366f1',
  clusters: '#06b6d4', leads: '#f97316', campaigns: '#ec4899',
  cases: '#64748b', territories: '#84cc16', expenses: '#78716c',
}

const DEFAULT_POSITIONS = {
  students:       { x: 320, y: 60  },
  submissions:    { x: 600, y: 200 },
  interviews:     { x: 600, y: 420 },
  placements:     { x: 320, y: 520 },
  recruiters:     { x: 40,  y: 200 },
  business_units: { x: 40,  y: 420 },
  clusters:       { x: 40,  y: 60  },
  leads:          { x: 320, y: 300 },
  campaigns:      { x: 600, y: 60  },
  cases:          { x: 860, y: 200 },
  territories:    { x: 860, y: 60  },
  expenses:       { x: 860, y: 420 },
}

const CARD_W = 220
const CANVAS_W = 2400
const CANVAS_H = 1600

function SchemaBuilderTab({ objects }) {
  // Which objects are visible on canvas
  const [visible, setVisible] = useState(new Set())

  // Positions on the large canvas
  const [positions, setPositions] = useState({})

  // Initialise positions + visibility when objects load
  useEffect(() => {
    if (!objects.length) return
    setPositions(prev => {
      const pos = { ...prev }
      objects.forEach((o, i) => {
        if (!pos[o.name]) pos[o.name] = DEFAULT_POSITIONS[o.name] || { x: 60 + (i % 5) * 260, y: 60 + Math.floor(i / 5) * 300 }
      })
      return pos
    })
    setVisible(prev => {
      if (prev.size > 0) return prev
      const s = new Set()
      objects.forEach(o => { if (DEFAULT_POSITIONS[o.name]) s.add(o.name) })
      return s
    })
  }, [objects])

  // Fields cache: { [objectName]: field[] }
  const [fieldCache, setFieldCache] = useState({})
  const [zoom, setZoom] = useState(1)
  const zoomIn  = () => setZoom(z => Math.min(2, +(z + 0.1).toFixed(1)))
  const zoomOut = () => setZoom(z => Math.max(0.3, +(z - 0.1).toFixed(1)))
  const [dragging, setDragging] = useState(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const scrollRef = useRef(null)

  // Load fields for all visible objects
  useEffect(() => {
    visible.forEach(name => {
      if (fieldCache[name]) return
      api(`/api/v1/schema/fields?objectName=${name}`)
        .then(r => {
          const fields = Array.isArray(r) ? r : r?.fields || []
          setFieldCache(prev => ({ ...prev, [name]: fields }))
        })
        .catch(() => setFieldCache(prev => ({ ...prev, [name]: [] })))
    })
  }, [visible])

  const toggleObj = (name) => {
    setVisible(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const onMouseDown = (e, name) => {
    e.preventDefault()
    const canvasEl = scrollRef.current?.querySelector('[data-canvas]')
    if (!canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    // Convert to unscaled canvas coordinates
    const mouseX = (e.clientX - rect.left) / zoom
    const mouseY = (e.clientY - rect.top) / zoom
    setDragging(name)
    setDragOffset({
      x: mouseX - (positions[name]?.x || 0),
      y: mouseY - (positions[name]?.y || 0),
    })
  }

  const onMouseMove = useCallback((e) => {
    if (!dragging || !scrollRef.current) return
    const canvasEl = scrollRef.current.querySelector('[data-canvas]')
    if (!canvasEl) return
    const rect = canvasEl.getBoundingClientRect()
    // Convert to unscaled canvas coordinates, subtract the grab offset
    const mouseX = (e.clientX - rect.left) / zoom
    const mouseY = (e.clientY - rect.top) / zoom
    const x = Math.max(0, Math.min(mouseX - dragOffset.x, CANVAS_W - CARD_W - 10))
    const y = Math.max(0, Math.min(mouseY - dragOffset.y, CANVAS_H - 10))
    setPositions(prev => ({ ...prev, [dragging]: { x, y } }))
  }, [dragging, dragOffset, zoom])

  const onMouseUp = useCallback(() => setDragging(null), [])

  const cardCenter = (name, cardH) => {
    const p = positions[name]
    if (!p) return { x: 0, y: 0 }
    return { x: p.x + CARD_W / 2, y: p.y + (cardH || 40) / 2 }
  }

  const getCardH = (name) => {
    const fields = fieldCache[name] || []
    const FIELD_ROW = 22
    const MAX_FIELDS = 8
    const shown = Math.min(fields.length, MAX_FIELDS)
    return 38 + (shown > 0 ? shown * FIELD_ROW + 8 : 24)
  }

  const visibleObjects = objects.filter(o => visible.has(o.name))

  const resetLayout = () => {
    const pos = {}
    objects.forEach((o, i) => {
      pos[o.name] = DEFAULT_POSITIONS[o.name] || { x: 60 + (i % 5) * 260, y: 60 + Math.floor(i / 5) * 300 }
    })
    setPositions(pos)
    setVisible(new Set(objects.filter(o => DEFAULT_POSITIONS[o.name]).map(o => o.name)))
  }

  return (
    <div className="flex gap-3" style={{ height: 680 }}>
      {/* ── LEFT PANEL: object toggles ── */}
      <div className="w-48 shrink-0 bg-white border border-gray-200 rounded-xl flex flex-col">
        <div className="px-3 py-2.5 border-b border-gray-100">
          <p className="text-[11px] font-bold text-gray-700 uppercase tracking-wide">Objects</p>
          <p className="text-[10px] text-gray-400 mt-0.5">Toggle visibility</p>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {objects.map(obj => {
            const color = OBJ_COLORS[obj.name] || '#6b7280'
            const on = visible.has(obj.name)
            return (
              <button
                key={obj.name}
                onClick={() => toggleObj(obj.name)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors text-[11px] ${on ? 'bg-gray-50' : 'opacity-40 hover:opacity-70'}`}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                <span className="font-medium text-gray-800 truncate">{obj.label || obj.name}</span>
                <div className={`ml-auto w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${on ? 'border-blue-500 bg-blue-500' : 'border-gray-300'}`}>
                  {on && <svg width="8" height="8" viewBox="0 0 8 8"><path d="M1 4l2 2 4-4" stroke="white" strokeWidth="1.5" fill="none" strokeLinecap="round"/></svg>}
                </div>
              </button>
            )
          })}
        </div>
        <div className="p-2 border-t border-gray-100">
          <button onClick={resetLayout} className="w-full text-[10px] text-gray-500 hover:text-gray-700 py-1">Reset layout</button>
        </div>
      </div>

      {/* ── RIGHT: scrollable canvas ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Zoom controls */}
        <div className="flex items-center gap-1 mb-2 justify-end">
          <button
            onClick={zoomOut}
            className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center text-base font-bold leading-none shadow-sm"
            title="Zoom out"
          >−</button>
          <button
            onClick={() => setZoom(1)}
            className="h-7 px-2 rounded-lg border border-gray-200 bg-white text-[11px] text-gray-500 hover:bg-gray-50 hover:text-gray-900 shadow-sm tabular-nums min-w-[46px] text-center"
            title="Reset zoom"
          >{Math.round(zoom * 100)}%</button>
          <button
            onClick={zoomIn}
            className="w-7 h-7 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center justify-center text-base font-bold leading-none shadow-sm"
            title="Zoom in"
          >+</button>
        </div>

        <div
          ref={scrollRef}
          className="flex-1 border border-gray-200 rounded-xl overflow-auto bg-gray-50 select-none"
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseUp}
        >
        <div data-canvas style={{ position: 'relative', width: CANVAS_W * zoom, height: CANVAS_H * zoom, transformOrigin: 'top left' }}>
          <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', width: CANVAS_W, height: CANVAS_H, position: 'relative' }}>

          {/* Grid dots */}
          <svg width={CANVAS_W} height={CANVAS_H} style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}>
            <defs>
              <pattern id="sbgrid" width="24" height="24" patternUnits="userSpaceOnUse">
                <circle cx="1" cy="1" r="1" fill="#d1d5db" />
              </pattern>
              <marker id="sbarrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L0,6 L6,3 z" fill="#94a3b8" />
              </marker>
            </defs>
            <rect width={CANVAS_W} height={CANVAS_H} fill="url(#sbgrid)" />

            {/* Relationship lines */}
            {SCHEMA_RELATIONS.filter(r => visible.has(r.from) && visible.has(r.to)).map((rel, i) => {
              const fH = getCardH(rel.from)
              const tH = getCardH(rel.to)
              const f = cardCenter(rel.from, fH)
              const t = cardCenter(rel.to, tH)
              const mx = (f.x + t.x) / 2
              const my = (f.y + t.y) / 2
              return (
                <g key={i}>
                  <line x1={f.x} y1={f.y} x2={t.x} y2={t.y} stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="5,3" markerEnd="url(#sbarrow)" />
                  <rect x={mx - 22} y={my - 11} width="44" height="13" rx="3" fill="white" opacity="0.85" />
                  <text x={mx} y={my} fontSize="9" fill="#64748b" textAnchor="middle">{rel.label}</text>
                </g>
              )
            })}
          </svg>

          {/* Object cards */}
          {visibleObjects.map(obj => {
            const pos = positions[obj.name]
            if (!pos) return null
            const color = OBJ_COLORS[obj.name] || '#6b7280'
            const fields = fieldCache[obj.name]
            const isDragging = dragging === obj.name

            return (
              <div
                key={obj.name}
                style={{ position: 'absolute', left: pos.x, top: pos.y, width: CARD_W, zIndex: isDragging ? 20 : 2 }}
                onMouseDown={(e) => onMouseDown(e, obj.name)}
              >
                <div
                  className={`rounded-xl border bg-white shadow-sm ${isDragging ? 'shadow-xl ring-2' : 'hover:shadow-md'}`}
                  style={{ borderColor: color, cursor: isDragging ? 'grabbing' : 'grab', '--tw-ring-color': color }}
                >
                  {/* Header */}
                  <div className="px-2 py-1.5 rounded-t-xl flex items-center gap-1.5" style={{ background: color }}>
                    <span className="text-[11px] font-bold text-white truncate flex-1">{obj.label || obj.name}</span>
                    {obj.is_custom && <span className="text-[8px] bg-white/20 text-white px-1 rounded shrink-0">custom</span>}
                  </div>

                  <div className="px-2.5 pt-1 pb-0.5">
                    <p className="text-[9px] text-gray-400 font-mono">{obj.name}</p>
                  </div>

                  {/* Fields list */}
                  <div className="overflow-y-auto mx-1 mb-1 rounded-lg" style={{ maxHeight: 200 }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    {!fields ? (
                      <div className="px-2.5 py-2 text-[10px] text-gray-400">Loading fields…</div>
                    ) : fields.length === 0 ? (
                      <div className="px-2.5 py-2 text-[10px] text-gray-400">No fields found</div>
                    ) : (
                      <table className="w-full">
                        <tbody>
                          {fields.map((f, fi) => {
                            const fname = f.fieldName || f.field_name || f.label || String(fi)
                            const ftype = f.fieldType || f.field_type || 'text'
                            const icon = FIELD_TYPE_ICONS[ftype] || '·'
                            return (
                              <tr key={fname + fi} className="hover:bg-gray-50 group">
                                <td className="pl-2 pr-1 py-0.5 w-5">
                                  <span className="text-[9px] text-gray-400 font-mono">{icon}</span>
                                </td>
                                <td className="pr-2 py-0.5">
                                  <span className="text-[10px] text-gray-700 font-medium leading-tight block truncate">{f.label || fname}</span>
                                  <span className="text-[8px] text-gray-400 font-mono leading-tight block">{fname}</span>
                                </td>
                                <td className="pr-2 py-0.5 text-right">
                                  <span className="text-[8px] text-gray-300 group-hover:text-gray-400">{ftype}</span>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Footer count */}
                  <div className="px-2.5 py-1 border-t border-gray-100 rounded-b-xl">
                    <span className="text-[9px] text-gray-400">{fields ? fields.length : (obj.field_count || '…')} fields</span>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN: SchemaAdminPage
// ═══════════════════════════════════════════════════════════════════════════
export default function SchemaAdminPage() {
  const [tab, setTab] = useState("objects");
  const [selectedObj, setSelectedObj] = useState("students");
  const [allObjects, setAllObjects] = useState([])

  useEffect(() => {
    api("/api/v1/schema/objects")
      .then(r => setAllObjects(Array.isArray(r) ? r : r?.objects || []))
      .catch(() => {})
  }, [])

  return (
    <Page
      title="Schema Admin"
      subtitle="Customize objects, fields, layouts, and permissions"
    >
      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "objects", label: "Objects" },
          { id: "builder", label: "Schema Builder" },
          { id: "fields", label: "Fields" },
          { id: "picklists", label: "Picklists" },
          { id: "dependent", label: "Dependent Picklists" },
          { id: "layouts", label: "Page Layouts" },
          { id: "permissions", label: "Permissions" },
          { id: "record-types", label: "Record Types" },
        ]}
      />

      {/* Object selector for tabs 3-8 */}
      {tab !== "objects" && tab !== "builder" && (
        <div className="mt-4 mb-2">
          <Select
            label="Object"
            value={selectedObj}
            onChange={(e) => setSelectedObj(e.target.value)}
          >
            {allObjects.length > 0
              ? allObjects.map(o => <option key={o.name} value={o.name}>{o.label || o.name}{o.is_custom ? ' (custom)' : ''}</option>)
              : <option value={selectedObj}>{selectedObj}</option>
            }
          </Select>
        </div>
      )}

      <div className="mt-4">
        {tab === "objects" && (
          <ObjectsTab
            selectedObj={selectedObj}
            onSelect={(name) => {
              setSelectedObj(name);
              setTab("fields");
            }}
          />
        )}
        {tab === "builder" && <SchemaBuilderTab objects={allObjects} />}
        {tab === "fields" && <FieldsTab objectName={selectedObj} />}
        {tab === "picklists" && <PicklistTab objectName={selectedObj} />}
        {tab === "dependent" && (
          <DependentPicklistsTab objectName={selectedObj} />
        )}
        {tab === "layouts" && <LayoutsTab objectName={selectedObj} />}
        {tab === "permissions" && <PermissionsTab objectName={selectedObj} />}
        {tab === "record-types" && <RecordTypesTab objectName={selectedObj} />}
      </div>
    </Page>
  );
}
