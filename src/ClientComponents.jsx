import { useState, useEffect, useRef } from 'react';

const C={bg:'#f0f4f7',card:'#fff',navy:'#253649',accent:'#7a9fa3',accentL:'#9aafb2',accentBg:'#eaf2f3',text:'#1a2a35',muted:'#6b8090',border:'#dce4ea',success:'#2e9e68',successBg:'#e6f5ee',warn:'#b87d00',warnBg:'#fef5dc',danger:'#c03030',dangerBg:'#fdeaea',shadow:'0 1px 4px rgba(37,54,73,0.1)'};
const sans="'Montserrat',sans-serif",serif="'Cormorant Garamond',Georgia,serif";
const inp=(ex={})=>({width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:'7px',color:C.text,padding:'8px 10px',fontFamily:sans,fontSize:'12px',outline:'none',boxSizing:'border-box',...ex});
const cardS=(ex={})=>({background:C.card,borderRadius:'12px',padding:'18px',boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:'14px',...ex});
const lblS=(ex={})=>({fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'4px',display:'block',...ex});
const Btn=(v,ex={})=>{const m={primary:{background:C.navy,color:'#fff',border:'none'},secondary:{background:'#fff',color:C.navy,border:`1px solid ${C.border}`},danger:{background:C.dangerBg,color:C.danger,border:`1px solid ${C.danger}44`}};return{padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontFamily:sans,fontWeight:600,fontSize:'12px',...(m[v]||m.primary),...ex};};
const f0=n=>`$${Math.round(+n||0).toLocaleString('en-US')}`;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);

/* ── CLIENT AUTOCOMPLETE INPUT ── */
export function ClientAutocomplete({ value, onChange, clients }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const ref = useRef(null);

  const matches = query.length > 0
    ? clients.filter(c => c.name.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Client name"
        style={inp()}
      />
      {open && matches.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: C.card, border: `1px solid ${C.border}`, borderRadius: '8px', boxShadow: C.shadow, zIndex: 100, marginTop: '2px', overflow: 'hidden' }}>
          {matches.map(c => (
            <div key={c.id} onClick={() => { setQuery(c.name); onChange(c.name); setOpen(false); }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '12px', color: C.text, borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => e.target.style.background = C.accentBg}
              onMouseLeave={e => e.target.style.background = 'transparent'}>
              <div style={{ fontWeight: 600 }}>{c.name}</div>
              {c.phone && <div style={{ fontSize: '10px', color: C.muted }}>{c.phone}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── CLIENT DATABASE VIEW ── */
export function ClientDatabaseView({ clients, setClients }) {
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const blankC = () => ({ id: uid(), name: '', phone: '', email: '', notes: '', createdAt: new Date().toISOString().split('T')[0] });
  const [form, setForm] = useState(blankC());

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone||'').includes(search) || (c.email||'').toLowerCase().includes(search.toLowerCase()));

  function save() {
    if (!form.name) return;
    if (editId) setClients(p => p.map(x => x.id === editId ? { ...form } : x));
    else setClients(p => [...p, { ...form, id: uid() }]);
    setForm(blankC()); setShowForm(false); setEditId(null);
  }

  function startEdit(c) { setForm(c); setEditId(c.id); setShowForm(true); }

  return (
    <div>
      <div style={cardS()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <div style={lblS()}>Client Database</div>
            <div style={{ fontSize: '10px', color: C.muted }}>{clients.length} clients · Names auto-complete in the service log</div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…" style={{ ...inp(), width: '180px' }} />
            <button style={Btn('primary')} onClick={() => { setShowForm(!showForm); setEditId(null); setForm(blankC()); }}>{showForm ? '✕ Cancel' : '+ Add Client'}</button>
          </div>
        </div>

        {showForm && (
          <div style={{ background: C.bg, borderRadius: '10px', padding: '14px', marginBottom: '14px', border: `1px solid ${C.border}` }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: '10px', marginBottom: '10px' }}>
              <div><label style={lblS()}>Full Name *</label><input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Client name" style={inp()} /></div>
              <div><label style={lblS()}>Phone</label><input value={form.phone || ''} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="(000) 000-0000" style={inp()} /></div>
              <div><label style={lblS()}>Email</label><input value={form.email || ''} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="client@email.com" style={inp()} /></div>
              <div style={{ gridColumn: '1/-1' }}><label style={lblS()}>Notes</label><input value={form.notes || ''} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Allergies, preferences, VIP status…" style={inp()} /></div>
            </div>
            <button style={Btn('primary')} onClick={save}>✓ Save Client</button>
          </div>
        )}

        {filtered.length === 0
          ? <div style={{ textAlign: 'center', padding: '28px', color: C.muted, fontSize: '13px' }}>{search ? 'No clients match your search.' : 'No clients yet. Add the first one!'}</div>
          : <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
              <thead><tr>{['Name', 'Phone', 'Email', 'Notes', 'Added', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '6px 8px', fontSize: '9px', fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: C.muted, borderBottom: `1px solid ${C.border}` }}>{h}</th>
              ))}</tr></thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px', fontWeight: 700 }}>{c.name}</td>
                    <td style={{ padding: '8px', color: C.muted }}>{c.phone || '—'}</td>
                    <td style={{ padding: '8px', color: C.muted }}>{c.email || '—'}</td>
                    <td style={{ padding: '8px', color: C.muted, maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.notes || '—'}</td>
                    <td style={{ padding: '8px', color: C.muted, fontSize: '10px' }}>{c.createdAt}</td>
                    <td style={{ padding: '8px', whiteSpace: 'nowrap' }}>
                      <button onClick={() => startEdit(c)} style={Btn('secondary', { padding: '3px 10px', fontSize: '10px', marginRight: '4px' })}>Edit</button>
                      <button onClick={() => setClients(p => p.filter(x => x.id !== c.id))} style={Btn('danger', { padding: '3px 8px', fontSize: '10px' })}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        }
      </div>
    </div>
  );
}
