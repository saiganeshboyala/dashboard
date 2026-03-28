import React, { useState, useEffect, useCallback } from 'react'
import { Page, DataTable, Badge, Button, Modal, Input, Select, Loading, Tabs } from '../../components/Shared'
import { getProfiles, createProfile, deleteProfile as deleteProfileApi, cloneProfile, getProfileUsers, getObjectPermissions, bulkSetObjectPermissions, getFieldPermissions, bulkSetFieldPermissions, getTabPermissions, setTabPermission, getPermissionSets, createPermissionSet, deletePermissionSet as deletePermSetApi, getPermSetObjectPerms, setPermSetObjectPerm, getAvailableObjects, getAvailableTabs, getSchemaFields } from '../../utils/api'

const BASE_ROLES = [{ value: 'HEAD', label: 'System Admin' }, { value: 'BU_ADMIN', label: 'BU Admin' }, { value: 'RECRUITER', label: 'Recruiter / Employee' }, { value: 'STUDENT', label: 'Student' }]
const PERM_ACTIONS = ['canRead', 'canCreate', 'canEdit', 'canDelete', 'canViewAll', 'canModifyAll']
const PERM_LABELS = { canRead: 'Read', canCreate: 'Create', canEdit: 'Edit', canDelete: 'Delete', canViewAll: 'View All', canModifyAll: 'Modify All' }

export default function ProfilesPage() {
  const [activeTab, setActiveTab] = useState('profiles')
  return (
    <Page title="Profiles & Permission Sets" subtitle="Manage user access — create profiles, set object/field permissions, assign to users">
      <Tabs tabs={[{ id: 'profiles', label: 'Profiles' }, { id: 'permission-sets', label: 'Permission Sets' }]} active={activeTab} onChange={setActiveTab} />
      <div style={{ marginTop: 16 }}>
        {activeTab === 'profiles' && <ProfilesTab />}
        {activeTab === 'permission-sets' && <PermissionSetsTab />}
      </div>
    </Page>
  )
}

function ProfilesTab() {
  const [profiles, setProfiles] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const [showClone, setShowClone] = useState(null)
  const fetchProfiles = useCallback(async () => { setLoading(true); try { const r = await getProfiles(); setProfiles(Array.isArray(r) ? r : r?.data || []) } catch(e) { console.error(e) } setLoading(false) }, [])
  useEffect(() => { fetchProfiles() }, [fetchProfiles])
  const handleDelete = async (id) => { if (!confirm('Delete this profile?')) return; try { await deleteProfileApi(id); fetchProfiles(); if (selectedProfile?.id === id) setSelectedProfile(null) } catch(e) { alert(e.message) } }
  if (selectedProfile) return <ProfileDetail profile={selectedProfile} onBack={() => { setSelectedProfile(null); fetchProfiles() }} />
  return (<>
    <div className="flex items-center justify-between mb-4">
      <span className="text-xs text-gray-400">{profiles.length} profile{profiles.length !== 1 ? 's' : ''} · Click to manage permissions</span>
      <Button onClick={() => setShowCreate(true)}>+ New Profile</Button>
    </div>
    <DataTable columns={[
      { key: 'name', label: 'Profile Name', render: (v, row) => <span className="text-brand-600 cursor-pointer font-medium hover:underline" onClick={e => { e.stopPropagation(); setSelectedProfile(row) }}>{row.name}</span> },
      { key: 'base_role', label: 'Base Role', render: v => <Badge color={v==='HEAD'?'blue':v==='BU_ADMIN'?'purple':v==='RECRUITER'?'green':'gray'}>{BASE_ROLES.find(r=>r.value===v)?.label||v}</Badge> },
      { key: 'user_count', label: 'Users', render: v => <span className="font-semibold tabular-nums">{Number(v)||0}</span> },
      { key: 'is_system', label: 'Type', render: v => v ? <Badge color="amber">System</Badge> : <Badge color="gray">Custom</Badge> },
      { key: 'is_active', label: 'Active', render: v => v!==false ? <Badge color="green">Active</Badge> : <Badge color="red">Inactive</Badge> },
      { key: 'actions', label: '', sortable: false, render: (_, row) => <div className="flex gap-2">
        <Button variant="ghost" size="xs" onClick={e=>{e.stopPropagation();setShowClone(row)}}>Clone</Button>
        {!row.is_system && <Button variant="ghost" size="xs" onClick={e=>{e.stopPropagation();handleDelete(row.id)}}><span className="text-red-500">Delete</span></Button>}
      </div> },
    ]} rows={profiles} loading={loading} onRowClick={setSelectedProfile} />
    <CreateProfileModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); fetchProfiles() }} />
    <CloneProfileModal profile={showClone} open={!!showClone} onClose={() => setShowClone(null)} onCloned={() => { setShowClone(null); fetchProfiles() }} />
  </>)
}

function ProfileDetail({ profile, onBack }) {
  const [tab, setTab] = useState('objects')
  return (<div>
    <div className="flex items-center gap-3 mb-5">
      <Button variant="ghost" size="sm" onClick={onBack}>← Back</Button>
      <div><h2 className="text-lg font-bold text-gray-900">{profile.name}</h2>
        <div className="flex items-center gap-2 mt-0.5"><Badge color="blue">{BASE_ROLES.find(r=>r.value===profile.base_role)?.label||profile.base_role}</Badge>{profile.is_system&&<Badge color="amber">System</Badge>}</div>
      </div>
    </div>
    <Tabs tabs={[{id:'objects',label:'Object Permissions'},{id:'fields',label:'Field-Level Security'},{id:'tabs',label:'Tab Settings'},{id:'users',label:'Assigned Users',count:Number(profile.user_count)||0}]} active={tab} onChange={setTab} />
    <div className="mt-4">
      {tab==='objects'&&<ObjectPermissionsPanel profileId={profile.id}/>}
      {tab==='fields'&&<FieldPermissionsPanel profileId={profile.id}/>}
      {tab==='tabs'&&<TabPermissionsPanel profileId={profile.id}/>}
      {tab==='users'&&<ProfileUsersPanel profileId={profile.id}/>}
    </div>
  </div>)
}

function ObjectPermissionsPanel({ profileId }) {
  const [objects, setObjects] = useState([]); const [perms, setPerms] = useState({}); const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [dirty, setDirty] = useState(false)
  useEffect(() => { (async()=>{ setLoading(true); try { const [o,p]=await Promise.all([getAvailableObjects(),getObjectPermissions(profileId)]); setObjects(Array.isArray(o)?o:o?.data||[]); const m={}; (Array.isArray(p)?p:p?.data||[]).forEach(x=>m[x.object_name]=x); setPerms(m) } catch(e){console.error(e)} setLoading(false) })() }, [profileId])
  const gv=(n,a)=>{const p=perms[n];if(!p)return false;const s=a.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());return!!p[a]||!!p[s]}
  const toggle=(n,a)=>{const u={...perms[n]||{},[a]:!gv(n,a)};if(a==='canModifyAll'&&u.canModifyAll){u.canViewAll=true;u.canEdit=true;u.canDelete=true;u.canRead=true}if(a==='canViewAll'&&u.canViewAll)u.canRead=true;if(['canCreate','canEdit','canDelete'].includes(a)&&u[a])u.canRead=true;if(a==='canRead'&&!u.canRead)PERM_ACTIONS.forEach(x=>u[x]=false);setPerms(p=>({...p,[n]:{...p[n],...u}}));setDirty(true)}
  const saveAll=async()=>{setSaving(true);try{await bulkSetObjectPermissions({profileId,permissions:objects.map(o=>({objectName:o.name,canRead:gv(o.name,'canRead'),canCreate:gv(o.name,'canCreate'),canEdit:gv(o.name,'canEdit'),canDelete:gv(o.name,'canDelete'),canViewAll:gv(o.name,'canViewAll'),canModifyAll:gv(o.name,'canModifyAll')}))});setDirty(false)}catch(e){alert('Save failed: '+e.message)}setSaving(false)}
  if(loading)return<Loading/>
  return(<div>
    <div className="flex items-center justify-between mb-3"><p className="text-xs text-gray-400">Set CRUD + View All / Modify All per object.</p><Button onClick={saveAll} disabled={!dirty||saving} size="sm">{saving?'Saving...':'Save All'}</Button></div>
    <div className="card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="table-th">Object</th>{PERM_ACTIONS.map(a=><th key={a} className="table-th text-center" style={{width:75}}>{PERM_LABELS[a]}</th>)}</tr></thead>
    <tbody className="divide-y divide-gray-50">{objects.map(obj=><tr key={obj.name} className="hover:bg-gray-50/60"><td className="table-td font-medium">{obj.label}{obj.isCustom&&<Badge color="purple">Custom</Badge>}</td>
    {PERM_ACTIONS.map(a=><td key={a} className="table-td text-center"><input type="checkbox" checked={gv(obj.name,a)} onChange={()=>toggle(obj.name,a)} className="w-4 h-4 rounded border-gray-300 text-brand-600 cursor-pointer"/></td>)}</tr>)}</tbody></table></div>
  </div>)
}

function FieldPermissionsPanel({ profileId }) {
  const [objects,setObjects]=useState([]);const [sel,setSel]=useState('');const [fields,setFields]=useState([]);const [perms,setPerms]=useState({});const [loading,setLoading]=useState(false);const [saving,setSaving]=useState(false);const [dirty,setDirty]=useState(false)
  useEffect(()=>{(async()=>{try{const r=await getAvailableObjects();const o=Array.isArray(r)?r:r?.data||[];setObjects(o);if(o.length)setSel(o[0].name)}catch(e){console.error(e)}})()},[])
  useEffect(()=>{if(!sel)return;(async()=>{setLoading(true);try{const [f,p]=await Promise.all([getSchemaFields(sel),getFieldPermissions(profileId,sel)]);setFields(Array.isArray(f)?f:f?.data||[]);const m={};(Array.isArray(p)?p:p?.data||[]).forEach(x=>m[x.field_name]=x);setPerms(m);setDirty(false)}catch(e){console.error(e)}setLoading(false)})()},[profileId,sel])
  const tog=(fn,prop)=>{setPerms(p=>{const c=p[fn]||{visible:true,read_only:false};const u={...c};if(prop==='visible'){u.visible=!c.visible;if(!u.visible)u.read_only=false}else{u.read_only=!c.read_only;if(u.read_only)u.visible=true}return{...p,[fn]:u}});setDirty(true)}
  const saveAll=async()=>{setSaving(true);try{await bulkSetFieldPermissions({profileId,objectName:sel,permissions:fields.map(f=>({fieldName:f.field_name,visible:perms[f.field_name]?.visible!==false,readOnly:!!perms[f.field_name]?.read_only}))});setDirty(false)}catch(e){alert('Save failed: '+e.message)}setSaving(false)}
  return(<div>
    <div className="flex items-center justify-between gap-4 mb-4">
      <Select label="Object" value={sel} onChange={e=>setSel(e.target.value)}>{objects.map(o=><option key={o.name} value={o.name}>{o.label}</option>)}</Select>
      <Button onClick={saveAll} disabled={!dirty||saving} size="sm">{saving?'Saving...':'Save'}</Button>
    </div>
    {loading?<Loading/>:fields.length===0?<div className="py-16 text-center text-sm text-gray-400">No custom fields found for this object.</div>:
    <div className="card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="table-th">Field</th><th className="table-th">Type</th><th className="table-th text-center" style={{width:100}}>Visible</th><th className="table-th text-center" style={{width:100}}>Read Only</th></tr></thead>
    <tbody className="divide-y divide-gray-50">{fields.map(f=>{const p=perms[f.field_name]||{visible:true,read_only:false};return<tr key={f.field_name} className="hover:bg-gray-50/60"><td className="table-td font-medium">{f.label}</td><td className="table-td"><Badge color="gray">{f.field_type}</Badge></td>
    <td className="table-td text-center"><input type="checkbox" checked={p.visible!==false} onChange={()=>tog(f.field_name,'visible')} className="w-4 h-4 rounded border-gray-300 text-brand-600 cursor-pointer"/></td>
    <td className="table-td text-center"><input type="checkbox" checked={!!p.read_only} onChange={()=>tog(f.field_name,'read_only')} className="w-4 h-4 rounded border-gray-300 text-amber-500 cursor-pointer"/></td></tr>})}</tbody></table></div>}
  </div>)
}

function TabPermissionsPanel({ profileId }) {
  const [tabs,setTabs]=useState([]);const [perms,setPerms]=useState({});const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{setLoading(true);try{const [t,p]=await Promise.all([getAvailableTabs(),getTabPermissions(profileId)]);setTabs(Array.isArray(t)?t:t?.data||[]);const m={};(Array.isArray(p)?p:p?.data||[]).forEach(x=>m[x.tab_name]=x.visibility);setPerms(m)}catch(e){console.error(e)}setLoading(false)})()},[profileId])
  const sv=async(n,v)=>{setPerms(p=>({...p,[n]:v}));try{await setTabPermission({profileId,tabName:n,visibility:v})}catch(e){console.error(e)}}
  if(loading)return<Loading/>
  return(<div className="card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="table-th">Tab</th><th className="table-th text-center" style={{width:100}}>Default</th><th className="table-th text-center" style={{width:100}}>On</th><th className="table-th text-center" style={{width:100}}>Off</th></tr></thead>
  <tbody className="divide-y divide-gray-50">{tabs.map(t=>{const vis=perms[t.name]||'default';return<tr key={t.name} className="hover:bg-gray-50/60"><td className="table-td font-medium">{t.label}</td>
  {['default','on','off'].map(v=><td key={v} className="table-td text-center"><input type="radio" name={`tab-${t.name}`} checked={vis===v} onChange={()=>sv(t.name,v)} className="w-4 h-4 border-gray-300 text-brand-600 cursor-pointer"/></td>)}</tr>})}</tbody></table></div>)
}

function ProfileUsersPanel({ profileId }) {
  const [users,setUsers]=useState([]);const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{setLoading(true);try{const r=await getProfileUsers(profileId);setUsers(Array.isArray(r)?r:r?.data||[])}catch(e){console.error(e)}setLoading(false)})()},[profileId])
  if(loading)return<Loading/>
  return users.length===0?<div className="py-16 text-center text-sm text-gray-400">No users assigned to this profile yet.</div>:
  <DataTable columns={[{key:'name',label:'Name'},{key:'email',label:'Email'},{key:'role',label:'Role',render:v=><Badge color="blue">{v}</Badge>},{key:'is_active',label:'Active',render:v=>v?<Badge color="green">Active</Badge>:<Badge color="red">Inactive</Badge>}]} rows={users}/>
}

function PermissionSetsTab() {
  const [sets,setSets]=useState([]);const [loading,setLoading]=useState(true);const [showCreate,setShowCreate]=useState(false);const [selectedSet,setSelectedSet]=useState(null)
  const fetch=useCallback(async()=>{setLoading(true);try{const r=await getPermissionSets();setSets(Array.isArray(r)?r:r?.data||[])}catch(e){console.error(e)}setLoading(false)},[])
  useEffect(()=>{fetch()},[fetch])
  const del=async id=>{if(!confirm('Delete?'))return;try{await deletePermSetApi(id);fetch();if(selectedSet?.id===id)setSelectedSet(null)}catch(e){alert(e.message)}}
  if(selectedSet)return<PermissionSetDetail permSet={selectedSet} onBack={()=>{setSelectedSet(null);fetch()}}/>
  return(<>
    <div className="flex items-center justify-between mb-4"><span className="text-xs text-gray-400">Permission sets are additive — they grant extra permissions on top of the user's profile.</span><Button onClick={()=>setShowCreate(true)}>+ New Permission Set</Button></div>
    <DataTable columns={[
      {key:'name',label:'Permission Set',render:(_,row)=><span className="text-brand-600 cursor-pointer font-medium hover:underline" onClick={e=>{e.stopPropagation();setSelectedSet(row)}}>{row.name}</span>},
      {key:'description',label:'Description',render:v=><span className="text-gray-400">{v||'—'}</span>},
      {key:'user_count',label:'Users',render:v=><span className="font-semibold tabular-nums">{Number(v)||0}</span>},
      {key:'is_active',label:'Active',render:v=>v!==false?<Badge color="green">Active</Badge>:<Badge color="red">Inactive</Badge>},
      {key:'actions',label:'',sortable:false,render:(_,row)=><Button variant="ghost" size="xs" onClick={e=>{e.stopPropagation();del(row.id)}}><span className="text-red-500">Delete</span></Button>},
    ]} rows={sets} loading={loading} onRowClick={setSelectedSet}/>
    <CreatePermissionSetModal open={showCreate} onClose={()=>setShowCreate(false)} onCreated={()=>{setShowCreate(false);fetch()}}/>
  </>)
}

function PermissionSetDetail({ permSet, onBack }) {
  return(<div>
    <div className="flex items-center gap-3 mb-5"><Button variant="ghost" size="sm" onClick={onBack}>← Back</Button><div><h2 className="text-lg font-bold text-gray-900">{permSet.name}</h2><p className="text-xs text-gray-400 mt-0.5">{permSet.description||'No description'}</p></div></div>
    <PermSetObjectPermsPanel permSetId={permSet.id}/>
  </div>)
}

function PermSetObjectPermsPanel({ permSetId }) {
  const [objects,setObjects]=useState([]);const [perms,setPerms]=useState({});const [loading,setLoading]=useState(true)
  useEffect(()=>{(async()=>{setLoading(true);try{const [o,p]=await Promise.all([getAvailableObjects(),getPermSetObjectPerms(permSetId)]);setObjects(Array.isArray(o)?o:o?.data||[]);const m={};(Array.isArray(p)?p:p?.data||[]).forEach(x=>m[x.object_name]=x);setPerms(m)}catch(e){console.error(e)}setLoading(false)})()},[permSetId])
  const gv=(n,a)=>{const p=perms[n];if(!p)return false;const s=a.replace(/[A-Z]/g,m=>'_'+m.toLowerCase());return!!p[a]||!!p[s]}
  const tog=async(n,a)=>{const nv=!gv(n,a);setPerms(p=>({...p,[n]:{...p[n],[a]:nv}}));try{await setPermSetObjectPerm(permSetId,{permissionSetId:permSetId,objectName:n,canRead:a==='canRead'?nv:gv(n,'canRead'),canCreate:a==='canCreate'?nv:gv(n,'canCreate'),canEdit:a==='canEdit'?nv:gv(n,'canEdit'),canDelete:a==='canDelete'?nv:gv(n,'canDelete'),canViewAll:a==='canViewAll'?nv:gv(n,'canViewAll'),canModifyAll:a==='canModifyAll'?nv:gv(n,'canModifyAll')})}catch(e){console.error(e)}}
  if(loading)return<Loading/>
  return(<div className="card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b border-gray-100"><th className="table-th">Object</th>{PERM_ACTIONS.map(a=><th key={a} className="table-th text-center" style={{width:75}}>{PERM_LABELS[a]}</th>)}</tr></thead>
  <tbody className="divide-y divide-gray-50">{objects.map(obj=><tr key={obj.name} className="hover:bg-gray-50/60"><td className="table-td font-medium">{obj.label}</td>
  {PERM_ACTIONS.map(a=><td key={a} className="table-td text-center"><input type="checkbox" checked={gv(obj.name,a)} onChange={()=>tog(obj.name,a)} className="w-4 h-4 rounded border-gray-300 text-emerald-600 cursor-pointer"/></td>)}</tr>)}</tbody></table></div>)
}

function CreateProfileModal({ open, onClose, onCreated }) {
  const [form,setForm]=useState({name:'',description:'',baseRole:'RECRUITER'});const [saving,setSaving]=useState(false)
  const save=async()=>{if(!form.name.trim())return alert('Name is required');setSaving(true);try{await createProfile(form);setForm({name:'',description:'',baseRole:'RECRUITER'});onCreated()}catch(e){alert(e.message||'Create failed')}setSaving(false)}
  return(<Modal open={open} onClose={onClose} title="Create New Profile">
    <div className="space-y-4">
      <Input label="Profile Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Senior Recruiter Profile"/>
      <Input label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What this profile is for"/>
      <Select label="Base Role" value={form.baseRole} onChange={e=>setForm(f=>({...f,baseRole:e.target.value}))}>
        {BASE_ROLES.map(r=><option key={r.value} value={r.value}>{r.label}</option>)}
      </Select>
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving} loading={saving}>Create Profile</Button></div>
    </div>
  </Modal>)
}

function CloneProfileModal({ profile, open, onClose, onCloned }) {
  const [name,setName]=useState('');const [saving,setSaving]=useState(false)
  useEffect(()=>{if(profile)setName(`${profile.name} (Clone)`)},[profile])
  const save=async()=>{if(!name.trim())return alert('Name is required');setSaving(true);try{await cloneProfile(profile.id,{name});onCloned()}catch(e){alert(e.message||'Clone failed')}setSaving(false)}
  return(<Modal open={open} onClose={onClose} title={`Clone "${profile?.name||''}"`} width="max-w-md">
    <div className="space-y-4">
      <p className="text-xs text-gray-400">This will copy all object permissions, field-level security, and tab settings.</p>
      <Input label="New Profile Name" value={name} onChange={e=>setName(e.target.value)}/>
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving} loading={saving}>Clone Profile</Button></div>
    </div>
  </Modal>)
}

function CreatePermissionSetModal({ open, onClose, onCreated }) {
  const [form,setForm]=useState({name:'',description:''});const [saving,setSaving]=useState(false)
  const save=async()=>{if(!form.name.trim())return alert('Name is required');setSaving(true);try{await createPermissionSet(form);setForm({name:'',description:''});onCreated()}catch(e){alert(e.message||'Create failed')}setSaving(false)}
  return(<Modal open={open} onClose={onClose} title="Create Permission Set">
    <div className="space-y-4">
      <Input label="Permission Set Name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="e.g., Submissions & Interviews Permissions"/>
      <Input label="Description" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="What extra access this grants"/>
      <div className="flex justify-end gap-2 pt-2"><Button variant="secondary" onClick={onClose}>Cancel</Button><Button onClick={save} disabled={saving} loading={saving}>Create</Button></div>
    </div>
  </Modal>)
}