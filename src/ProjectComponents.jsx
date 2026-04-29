/* ─── IMPORTANT DETAILS BLOCK ───────────────────────────── */
export function ImportantDetailsBlock({personId,personName,importantDetails,setImportantDetails}){
  const details = importantDetails[personId] || {notes:'',links:[]};
  const[editing,setEditing]=useState(false);
  const[draft,setDraft]=useState(details.notes||'');
  const[linkForm,setLinkForm]=useState({label:'',url:''});
  const[addingLink,setAddingLink]=useState(false);

  function saveNotes(){
    setImportantDetails(p=>({...p,[personId]:{...(p[personId]||{links:[]}),notes:draft}}));
    setEditing(false);
  }
  function addLink(){
    if(!linkForm.url)return;
    const newLink={id:uid(),label:linkForm.label||linkForm.url,url:linkForm.url.startsWith('http')?linkForm.url:`https://${linkForm.url}`};
    setImportantDetails(p=>({...p,[personId]:{...(p[personId]||{notes:''}),links:[...(p[personId]?.links||[]),newLink]}}));
    setLinkForm({label:'',url:''});setAddingLink(false);
  }
  function delLink(id){
    setImportantDetails(p=>({...p,[personId]:{...(p[personId]||{notes:''}),links:(p[personId]?.links||[]).filter(l=>l.id!==id)}}));
  }

  // Simple text renderer: **text** = bold, lines starting with - = bullet
  function renderNotes(text){
    if(!text)return null;
    return text.split('\n').map((line,i)=>{
      const isBullet=line.trim().startsWith('-');
      const content=isBullet?line.trim().slice(1).trim():line;
      const parts=content.split(/\*\*([^*]+)\*\*/g);
      const rendered=parts.map((p,j)=>j%2===1?<strong key={j}>{p}</strong>:p);
      return(
        <div key={i} style={{display:'flex',gap:'6px',marginBottom:'3px',alignItems:'flex-start'}}>
          {isBullet&&<span style={{color:C.accent,fontWeight:700,fontSize:'14px',lineHeight:'18px',flexShrink:0}}>•</span>}
          <span style={{fontSize:'12px',color:C.text,lineHeight:'18px'}}>{rendered}</span>
        </div>
      );
    });
  }

  const hasContent=details.notes||(details.links||[]).length>0;

  return(
    <div style={{...cardS(),border:`2px solid ${C.accent}33`,background:'#fafcfd',marginBottom:'14px'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <span style={{fontSize:'16px'}}>📌</span>
          <div>
            <div style={{fontWeight:700,fontSize:'13px',color:C.navy}}>Important Details</div>
            {personName&&<div style={{fontSize:'10px',color:C.muted}}>{personName}</div>}
          </div>
        </div>
        <div style={{display:'flex',gap:'6px'}}>
          <button onClick={()=>setAddingLink(!addingLink)} style={Btn('secondary',{padding:'5px 12px',fontSize:'10px'})}>🔗 {addingLink?'Cancel':'Add Link'}</button>
          <button onClick={()=>{setEditing(!editing);setDraft(details.notes||'');}} style={Btn(editing?'primary':'accent',{padding:'5px 12px',fontSize:'10px'})}>{editing?'Cancel':'✏️ Edit Notes'}</button>
        </div>
      </div>

      {/* ADD LINK FORM */}
      {addingLink&&(
        <div style={{background:C.bg,borderRadius:'8px',padding:'10px 12px',marginBottom:'10px',border:`1px solid ${C.border}`}}>
          <div style={{display:'grid',gridTemplateColumns:'1fr 2fr auto',gap:'8px',alignItems:'end'}}>
            <div><label style={lblS()}>Label</label><input value={linkForm.label} onChange={e=>setLinkForm(p=>({...p,label:e.target.value}))} placeholder="e.g. Training Doc" style={inp()}/></div>
            <div><label style={lblS()}>URL *</label><input value={linkForm.url} onChange={e=>setLinkForm(p=>({...p,url:e.target.value}))} placeholder="https://…" style={inp()}/></div>
            <button onClick={addLink} style={{...Btn('primary'),padding:'8px 14px',alignSelf:'flex-end'}}>Save</button>
          </div>
        </div>
      )}

      {/* NOTES EDITOR */}
      {editing&&(
        <div style={{marginBottom:'10px'}}>
          <div style={{fontSize:'10px',color:C.muted,marginBottom:'6px'}}>
            Formatting: <strong>**bold text**</strong> for bold · Start line with <strong>-</strong> for bullet points · Press Enter for new line
          </div>
          <textarea value={draft} onChange={e=>setDraft(e.target.value)}
            placeholder="Add important notes here...&#10;- Use - for bullet points&#10;- Use **bold** for bold text"
            rows={6}
            style={{...inp(),resize:'vertical',lineHeight:'1.6',fontFamily:sans,fontSize:'12px',background:'#fff'}}/>
          <button onClick={saveNotes} style={{...Btn('primary'),marginTop:'8px',padding:'7px 20px'}}>✓ Save Notes</button>
        </div>
      )}

      {/* DISPLAY */}
      {!editing&&(
        <div>
          {/* LINKS */}
          {(details.links||[]).length>0&&(
            <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:details.notes?'10px':'0'}}>
              {(details.links||[]).map(l=>(
                <div key={l.id} style={{display:'flex',alignItems:'center',gap:'4px',background:C.accentBg,borderRadius:'999px',padding:'3px 10px 3px 12px',border:`1px solid ${C.accent}44`}}>
                  <a href={l.url} target="_blank" rel="noreferrer" style={{fontSize:'11px',color:C.accent,fontWeight:700,textDecoration:'none'}}>🔗 {l.label}</a>
                  <button onClick={()=>delLink(l.id)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'12px',padding:'0 2px',lineHeight:1}}>×</button>
                </div>
              ))}
            </div>
          )}
          {/* NOTES */}
          {details.notes&&<div style={{marginTop:(details.links||[]).length>0?'0':'0'}}>{renderNotes(details.notes)}</div>}
          {!hasContent&&<div style={{color:C.muted,fontSize:'11px'}}>No details yet — click "✏️ Edit Notes" to add notes or "🔗 Add Link" to save a link.</div>}
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';

// These constants and helpers are passed in or defined locally
const C={bg:'#f0f4f7',card:'#fff',navy:'#253649',accent:'#7a9fa3',accentL:'#9aafb2',accentBg:'#eaf2f3',text:'#1a2a35',muted:'#6b8090',border:'#dce4ea',success:'#2e9e68',successBg:'#e6f5ee',warn:'#b87d00',warnBg:'#fef5dc',danger:'#c03030',dangerBg:'#fdeaea',shadow:'0 1px 4px rgba(37,54,73,0.1)'};
const sans="'Montserrat',sans-serif",serif="'Cormorant Garamond',Georgia,serif";
const f0=n=>`$${Math.round(+n||0).toLocaleString('en-US')}`;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const wk=d=>Math.min(Math.ceil(new Date(d+'T12:00:00').getDate()/7),5);
const inp=(ex={})=>({width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:'7px',color:C.text,padding:'8px 10px',fontFamily:sans,fontSize:'12px',outline:'none',boxSizing:'border-box',...ex});
const sel=(ex={})=>({...inp(),background:'#fff',...ex});
const Btn=(v,ex={})=>{const m={primary:{background:C.navy,color:'#fff',border:'none'},secondary:{background:'#fff',color:C.navy,border:`1px solid ${C.border}`},accent:{background:C.accentBg,color:C.navy,border:`1px solid ${C.accent}55`},danger:{background:C.dangerBg,color:C.danger,border:`1px solid ${C.danger}44`}};return{padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontFamily:sans,fontWeight:600,fontSize:'12px',...(m[v]||m.primary),...ex};};
const cardS=(ex={})=>({background:C.card,borderRadius:'12px',padding:'18px',boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:'14px',...ex});
const lblS=(ex={})=>({fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'4px',display:'block',...ex});

const STATUS_OPTS=['Not Started','In Progress','Assistance Needed','Approval Needed','Complete'];
const PRIORITY_OPTS=['Low','Medium','High','Urgent'];
const statusColor={
  'Not Started':{bg:'#f0f0f0',color:'#888'},
  'In Progress':{bg:'#e6f3fa',color:'#3a7fa3'},
  'Assistance Needed':{bg:'#fdeaea',color:'#c03030'},
  'Approval Needed':{bg:'#f0eaf8',color:'#7a4fa3'},
  'Complete':{bg:'#e6f5ee',color:'#2e9e68'},
};
const priorityColor={
  'Low':{bg:'#f0f0f0',color:'#888'},
  'Medium':{bg:'#eaf2f3',color:'#7a9fa3'},
  'High':{bg:'#fef5dc',color:'#b87d00'},
  'Urgent':{bg:'#fdeaea',color:'#c03030'},
};
const StatusBadge=({s})=>{const cs=statusColor[s]||{bg:'#eee',color:'#888'};return<span style={{display:'inline-block',padding:'2px 10px',borderRadius:'999px',background:cs.bg,color:cs.color,fontSize:'9px',fontWeight:700,letterSpacing:'0.05em'}}>{s}</span>;};
const PriBadge=({p})=>{const cs=priorityColor[p]||{bg:'#eee',color:'#888'};return<span style={{display:'inline-block',padding:'2px 8px',borderRadius:'999px',background:cs.bg,color:cs.color,fontSize:'9px',fontWeight:700}}>{p}</span>;};

/* ── PROJECTS VIEW (admin) ── */
export function ProjectsView({projects,setProjects,providers,vaUsers,setVaUsers,creds,setCreds}){
  const[tab,setTab]=useState('projects');
  const[showForm,setShowForm]=useState(false);
  const[editId,setEditId]=useState(null);
  const[expandId,setExpandId]=useState(null);
  const[filter,setFilter]=useState('All');
  const[assigneeFilter,setAssigneeFilter]=useState('All');

  const allAssignees=[
    ...providers.map(p=>({id:p.id,name:p.name,type:'staff',color:p.color})),
    ...vaUsers.map(v=>({id:v.id,name:v.name,type:'va',color:'#9a6fa3'})),
  ];

  const blankP=()=>({id:uid(),title:'',description:'',assignedTo:[],dueDate:'',priority:'Medium',status:'Not Started',tasks:[],notes:[],createdAt:new Date().toISOString().split('T')[0],hoursLogged:{}});
  const blankT=()=>({id:uid(),title:'',status:'Not Started',assignedTo:'',notes:'',dueDate:''});
  const[form,setForm]=useState(blankP());
  const[taskForm,setTaskForm]=useState(blankT());
  const[addingTaskTo,setAddingTaskTo]=useState(null);
  const[addingNoteTo,setAddingNoteTo]=useState(null);
  const blankNote=()=>({id:uid(),text:'',link:'',createdAt:new Date().toISOString().split('T')[0]});
  const[noteForm,setNoteForm]=useState(blankNote());

  const filtered=projects.filter(p=>{
    const statusMatch=filter==='All'||p.status===filter;
    const assigneeMatch=assigneeFilter==='All'||p.assignedTo?.includes(assigneeFilter)||(p.tasks||[]).some(t=>t.assignedTo===assigneeFilter);
    return statusMatch&&assigneeMatch;
  });
  const stats={
    total:projects.length,
    active:projects.filter(p=>p.status==='In Progress').length,
    review:projects.filter(p=>p.status==='Review').length,
    done:projects.filter(p=>p.status==='Complete').length,
  };

  function saveProject(){
    if(!form.title)return;
    const p2={...form,id:editId||uid()};
    if(editId)setProjects(prev=>prev.map(x=>x.id===editId?p2:x));
    else setProjects(prev=>[...prev,p2]);
    setForm(blankP());setShowForm(false);setEditId(null);
  }

  function updateProject(id,updates){setProjects(prev=>prev.map(x=>x.id===id?{...x,...updates}:x));}

  function addTask(projId){
    if(!taskForm.title)return;
    const t2={...taskForm,id:uid()};
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:[...(x.tasks||[]),t2]}:x));
    setTaskForm(blankT());setAddingTaskTo(null);
  }

  function addNote(projId){
    if(!noteForm.text&&!noteForm.link)return;
    const n2={...noteForm,id:uid()};
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,notes:[...(x.notes||[]),n2]}:x));
    setNoteForm(blankNote());setAddingNoteTo(null);
  }
  function delNote(projId,noteId){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,notes:(x.notes||[]).filter(n=>n.id!==noteId)}:x));
  }
  function updateTask(projId,taskId,updates){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:(x.tasks||[]).map(t=>t.id===taskId?{...t,...updates}:t)}:x));
  }

  function delTask(projId,taskId){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:(x.tasks||[]).filter(t=>t.id!==taskId)}:x));
  }

  const completePct=(p)=>{
    if(!p.tasks||p.tasks.length===0)return 0;
    return Math.round((p.tasks.filter(t=>t.status==='Complete').length/p.tasks.length)*100);
  };

  // VA management
  const blankVA=()=>({id:uid(),name:'',role:'Virtual Assistant',hourlyRate:0,username:'',password:'VA2025'});
  const[vaForm,setVaForm]=useState(blankVA());
  const[showVAForm,setShowVAForm]=useState(false);

  function saveVA(){
    if(!vaForm.name||!vaForm.username)return;
    const v2={...vaForm,id:vaForm.id||uid()};
    setVaUsers(prev=>{const exists=prev.find(x=>x.id===v2.id);return exists?prev.map(x=>x.id===v2.id?v2:x):[...prev,v2];});
    setCreds(c=>({...c,vas:{...(c.vas||{}),[v2.id]:{id:v2.id,name:v2.name,username:v2.username,password:v2.password}}}));
    setVaForm(blankVA());setShowVAForm(false);
  }

  return(
    <div>
      {/* TAB NAV */}
      <div style={{display:'flex',gap:'4px',background:C.card,borderRadius:'10px',padding:'4px',marginBottom:'16px',width:'fit-content',border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
        {[['projects','📋 Projects'],['team','👤 VA Management']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 18px',borderRadius:'7px',border:'none',cursor:'pointer',background:tab===t?C.navy:'transparent',color:tab===t?'#fff':C.muted,fontFamily:sans,fontSize:'12px',fontWeight:600}}>{l}</button>
        ))}
      </div>

      {/* ── PROJECTS TAB ── */}
      {tab==='projects'&&(
        <>
          {/* STATS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'14px'}}>
            {[['Total Projects',stats.total,''],['In Progress',stats.active,C.accent],['In Review',stats.review,C.warn],['Complete',stats.done,C.success]].map(([l,v,col])=>(
              <div key={l} style={cardS({marginBottom:0})}>
                <div style={lblS()}>{l}</div>
                <div style={{fontSize:'26px',fontWeight:300,fontFamily:serif,color:col||C.text}}>{v}</div>
              </div>
            ))}
          </div>

          {/* FILTERS + ADD */}
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
            <div style={{display:'flex',gap:'10px',flexWrap:'wrap',alignItems:'center'}}>
              <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
              {['All',...STATUS_OPTS].map(f=>(

                <button key={f} onClick={()=>setFilter(f)} style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${filter===f?C.navy:C.border}`,background:filter===f?C.navy:C.card,color:filter===f?'#fff':C.muted,cursor:'pointer',fontFamily:sans,fontSize:'11px',fontWeight:600}}>{f}</button>
              ))}
              </div>
              <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                <span style={{fontSize:'10px',fontWeight:700,color:C.muted,textTransform:'uppercase',letterSpacing:'0.08em',whiteSpace:'nowrap'}}>Assigned to:</span>
                <select value={assigneeFilter} onChange={e=>setAssigneeFilter(e.target.value)} style={{...sel(),padding:'5px 12px',fontSize:'11px',width:'160px',borderRadius:'20px'}}>
                  <option value='All'>Everyone</option>
                  {allAssignees.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
            </div>
            <button style={Btn('primary')} onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(blankP());}}>
              {showForm?'✕ Cancel':'+ New Project'}
            </button>
          </div>

          {/* PROJECT FORM */}
          {showForm&&(
            <div style={cardS()}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'12px'}}>{editId?'Edit':'New'} Project</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'10px',marginBottom:'12px'}}>
                <div style={{gridColumn:'span 2'}}><label style={lblS()}>Project Title *</label><input value={form.title} onChange={e=>setForm(p=>({...p,title:e.target.value}))} placeholder="Project name" style={inp()}/></div>
                <div style={{gridColumn:'span 2'}}><label style={lblS()}>Description</label><input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="What needs to get done?" style={inp()}/></div>
                <div><label style={lblS()}>Priority</label><select value={form.priority} onChange={e=>setForm(p=>({...p,priority:e.target.value}))} style={sel()}>{PRIORITY_OPTS.map(o=><option key={o}>{o}</option>)}</select></div>
                <div><label style={lblS()}>Status</label><select value={form.status} onChange={e=>setForm(p=>({...p,status:e.target.value}))} style={sel()}>{STATUS_OPTS.map(o=><option key={o}>{o}</option>)}</select></div>
                <div><label style={lblS()}>Due Date</label><input type="date" value={form.dueDate} onChange={e=>setForm(p=>({...p,dueDate:e.target.value}))} style={inp()}/></div>
                <div><label style={lblS()}>Assign To</label>
                  <select multiple value={form.assignedTo} onChange={e=>setForm(p=>({...p,assignedTo:Array.from(e.target.selectedOptions).map(o=>o.value)}))} style={{...sel(),height:'80px'}}>
                    {allAssignees.map(a=><option key={a.id} value={a.id}>{a.name} ({a.type})</option>)}
                  </select>
                  <div style={{fontSize:'9px',color:C.muted,marginTop:'2px'}}>Hold Cmd/Ctrl to select multiple</div>
                </div>
              </div>
              <button style={Btn('primary')} onClick={saveProject}>✓ Save Project</button>
            </div>
          )}

          {/* PROJECT CARDS */}
          {filtered.length===0
            ?<div style={cardS({textAlign:'center',padding:'40px',color:C.muted})}>No projects yet. Click "+ New Project" to get started.</div>
            :filtered.map(proj=>{
              const expanded=expandId===proj.id;
              const pct=completePct(proj);
              const assigneeNames=proj.assignedTo?.map(id=>allAssignees.find(a=>a.id===id)?.name||id).join(', ')||'Unassigned';
              const today=new Date().toISOString().split('T')[0];
              const overdue=proj.dueDate&&proj.dueDate<today&&proj.status!=='Complete';
              return(
                <div key={proj.id} style={cardS()}>
                  {/* PROJECT HEADER */}
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',flexWrap:'wrap',gap:'8px'}}>
                    <div style={{flex:1,minWidth:'200px'}}>
                      <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'4px'}}>
                        <span style={{fontWeight:700,fontSize:'15px',color:C.navy}}>{proj.title}</span>
                        <StatusBadge s={proj.status}/>
                        <PriBadge p={proj.priority}/>
                        {overdue&&<span style={{fontSize:'9px',fontWeight:700,color:C.danger,background:C.dangerBg,padding:'2px 8px',borderRadius:'999px'}}>⚠ Overdue</span>}
                      </div>
                      {proj.description&&<div style={{fontSize:'11px',color:C.muted,marginBottom:'4px'}}>{proj.description}</div>}
                      <div style={{fontSize:'10px',color:C.muted,display:'flex',gap:'14px',flexWrap:'wrap'}}>
                        <span>👤 {assigneeNames}</span>
                        {proj.dueDate&&<span>📅 Due {proj.dueDate}</span>}
                        <span>✅ {proj.tasks?.filter(t=>t.status==='Complete').length||0}/{proj.tasks?.length||0} tasks</span>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:'6px',alignItems:'center',flexShrink:0}}>
                      <select value={proj.status} onChange={e=>updateProject(proj.id,{status:e.target.value})} style={{...sel(),padding:'5px 8px',fontSize:'11px',width:'130px'}}>
                        {STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
                      </select>
                      <button onClick={()=>{setEditId(proj.id);setForm(proj);setShowForm(true);setExpandId(null);}} style={Btn('secondary',{padding:'5px 10px',fontSize:'11px'})}>Edit</button>
                      <button onClick={()=>setExpandId(expanded?null:proj.id)} style={Btn('accent',{padding:'5px 10px',fontSize:'11px'})}>{expanded?'▲ Hide':'▼ Tasks'}</button>
                      <button onClick={()=>setProjects(prev=>prev.filter(x=>x.id!==proj.id))} style={Btn('danger',{padding:'5px 8px',fontSize:'11px'})}>✕</button>
                    </div>
                  </div>

                  {/* PROGRESS BAR */}
                  {(proj.tasks?.length||0)>0&&(
                    <div style={{marginBottom:expanded?'14px':'0'}}>
                      <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:C.muted,marginBottom:'4px'}}><span>Progress</span><span style={{fontWeight:700,color:pct===100?C.success:C.navy}}>{pct}%</span></div>
                      <div style={{background:C.bg,borderRadius:'999px',height:'6px',overflow:'hidden'}}>
                        <div style={{height:'100%',borderRadius:'999px',width:`${pct}%`,background:pct===100?C.success:C.accent,transition:'width 0.5s'}}/>
                      </div>
                    </div>
                  )}

                  {/* TASKS */}
                  {expanded&&(
                    <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'14px'}}>
                      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                        <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent}}>Tasks</div>
                        <button onClick={()=>setAddingTaskTo(addingTaskTo===proj.id?null:proj.id)} style={Btn('secondary',{padding:'4px 12px',fontSize:'10px'})}>+ Add Task</button>
                      </div>

                      {/* ADD TASK FORM */}
                      {addingTaskTo===proj.id&&(
                        <div style={{background:C.bg,borderRadius:'8px',padding:'12px',marginBottom:'12px',border:`1px solid ${C.border}`}}>
                          <div style={{display:'grid',gridTemplateColumns:'2fr 1fr 1fr 1fr auto',gap:'8px',alignItems:'end'}}>
                            <div><label style={lblS()}>Task Title *</label><input value={taskForm.title} onChange={e=>setTaskForm(p=>({...p,title:e.target.value}))} placeholder="Task description" style={inp()}/></div>
                            <div><label style={lblS()}>Assign To</label>
                              <select value={taskForm.assignedTo} onChange={e=>setTaskForm(p=>({...p,assignedTo:e.target.value}))} style={sel()}>
                                <option value="">Anyone</option>
                                {allAssignees.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}
                              </select>
                            </div>
                            <div><label style={lblS()}>Due Date</label><input type="date" value={taskForm.dueDate} onChange={e=>setTaskForm(p=>({...p,dueDate:e.target.value}))} style={inp()}/></div>
                            <div><label style={lblS()}>Notes</label><input value={taskForm.notes} onChange={e=>setTaskForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes" style={inp()}/></div>
                            <button onClick={()=>addTask(proj.id)} style={{...Btn('primary'),padding:'8px 12px',alignSelf:'flex-end'}}>Add</button>
                          </div>
                        </div>
                      )}

                      {/* TASK LIST */}
                      {(proj.tasks||[]).length===0
                        ?<div style={{color:C.muted,fontSize:'11px',textAlign:'center',padding:'14px'}}>No tasks yet. Add the first one above.</div>
                        :(proj.tasks||[]).map(task=>(
                          <div key={task.id} style={{padding:'10px 12px',borderRadius:'8px',marginBottom:'6px',background:task.status==='Complete'?C.successBg:task.status==='Assistance Needed'?C.dangerBg:task.status==='Approval Needed'?'#f0eaf8':C.bg,border:`1px solid ${task.status==='Complete'?C.success+'33':task.status==='Assistance Needed'?C.danger+'33':task.status==='Approval Needed'?'#7a4fa355':C.border}`}}>
                            <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                              <input type="checkbox" checked={task.status==='Complete'} onChange={e=>updateTask(proj.id,task.id,{status:e.target.checked?'Complete':'In Progress'})} style={{flexShrink:0}}/>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{fontSize:'12px',fontWeight:600,color:task.status==='Complete'?C.muted:C.text,textDecoration:task.status==='Complete'?'line-through':'none'}}>{task.title}</div>
                                <div style={{fontSize:'9px',color:C.muted,marginTop:'1px',display:'flex',gap:'8px',flexWrap:'wrap'}}>
                                  {task.assignedTo&&<span>👤 {allAssignees.find(a=>a.id===task.assignedTo)?.name||task.assignedTo}</span>}
                                  {task.dueDate&&<span>📅 {task.dueDate}</span>}
                                </div>
                              </div>
                              <select value={task.status} onChange={e=>updateTask(proj.id,task.id,{status:e.target.value})} style={{...sel(),padding:'3px 6px',fontSize:'10px',width:'150px',flexShrink:0}}>
                                {STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
                              </select>
                              <button onClick={()=>delTask(proj.id,task.id)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'14px',flexShrink:0}}>✕</button>
                            </div>
                            <div style={{marginTop:'8px',paddingLeft:'28px'}}>
                              <input value={task.notes||''} onChange={e=>updateTask(proj.id,task.id,{notes:e.target.value})} placeholder="Add a note…" style={{...inp(),background:'rgba(255,255,255,0.7)',fontSize:'11px',padding:'5px 10px',color:C.muted}}/>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  )}

                  {/* ── NOTES & LINKS (project level) ── */}
                  <div style={{marginTop:'14px',borderTop:`1px solid ${C.border}`,paddingTop:'14px'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                      <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent}}>📝 Notes & Links</div>
                      <button onClick={()=>setAddingNoteTo(addingNoteTo===proj.id?null:proj.id)} style={Btn('secondary',{padding:'4px 12px',fontSize:'10px'})}>{addingNoteTo===proj.id?'✕ Cancel':'+ Add Note'}</button>
                    </div>
                    {addingNoteTo===proj.id&&(
                      <div style={{background:C.bg,borderRadius:'8px',padding:'12px',marginBottom:'10px',border:`1px solid ${C.border}`}}>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr auto',gap:'8px',alignItems:'end'}}>
                          <div><label style={lblS()}>Note *</label><input value={noteForm.text} onChange={e=>setNoteForm(p=>({...p,text:e.target.value}))} placeholder="Type your note here…" style={inp()}/></div>
                          <div><label style={lblS()}>Live Link (optional)</label><input value={noteForm.link} onChange={e=>setNoteForm(p=>({...p,link:e.target.value}))} placeholder="https://…" style={inp()}/></div>
                          <button onClick={()=>addNote(proj.id)} style={{...Btn('primary'),padding:'8px 14px',alignSelf:'flex-end'}}>Save</button>
                        </div>
                      </div>
                    )}
                    {(proj.notes||[]).length===0&&addingNoteTo!==proj.id
                      ?<div style={{color:C.muted,fontSize:'11px',padding:'6px 0'}}>No notes yet — add links, reminders, or references.</div>
                      :(proj.notes||[]).map(note=>(
                        <div key={note.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'10px 12px',borderRadius:'8px',marginBottom:'6px',background:C.bg,border:`1px solid ${C.border}`}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{fontSize:'12px',color:C.text,lineHeight:1.5}}>{note.text}</div>
                            {note.link&&(
                              <a href={note.link.startsWith('http')?note.link:`https://${note.link}`} target="_blank" rel="noreferrer"
                                style={{fontSize:'11px',color:C.accent,fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px',marginTop:'5px',padding:'3px 10px',background:C.accentBg,borderRadius:'999px'}}>
                                🔗 {note.link.replace(/^https?:\/\//,'')}
                              </a>
                            )}
                            <div style={{fontSize:'9px',color:C.muted,marginTop:'5px'}}>{note.createdAt}</div>
                          </div>
                          <button onClick={()=>delNote(proj.id,note.id)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'13px',flexShrink:0}}>✕</button>
                        </div>
                      ))
                    }
                  </div>
                </div>
              );
            })
          }
        </>
      )}

      {/* ── VA MANAGEMENT TAB ── */}
      {tab==='team'&&(
        <>
          <div style={cardS()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div><div style={lblS()}>Virtual Assistant Accounts</div><div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>VAs have their own login and see only tasks assigned to them. Hourly tracking included.</div></div>
              <button style={Btn('primary')} onClick={()=>setShowVAForm(!showVAForm)}>{showVAForm?'✕ Cancel':'+ Add VA'}</button>
            </div>
            {showVAForm&&(
              <div style={{background:C.bg,borderRadius:'10px',padding:'14px',marginBottom:'14px',border:`1px solid ${C.border}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'10px'}}>
                  <div><label style={lblS()}>Full Name</label><input value={vaForm.name} onChange={e=>setVaForm(p=>({...p,name:e.target.value}))} placeholder="VA name" style={inp()}/></div>
                  <div><label style={lblS()}>Role / Title</label><input value={vaForm.role} onChange={e=>setVaForm(p=>({...p,role:e.target.value}))} placeholder="Virtual Assistant" style={inp()}/></div>
                  <div><label style={lblS()}>Hourly Rate ($)</label><input type="number" value={vaForm.hourlyRate} onChange={e=>setVaForm(p=>({...p,hourlyRate:+e.target.value||0}))} style={inp()}/></div>
                  <div><label style={lblS()}>Username</label><input value={vaForm.username} onChange={e=>setVaForm(p=>({...p,username:e.target.value}))} placeholder="Login username" style={inp()}/></div>
                  <div><label style={lblS()}>Password</label><input value={vaForm.password} onChange={e=>setVaForm(p=>({...p,password:e.target.value}))} style={inp()}/></div>
                </div>
                <button style={Btn('primary')} onClick={saveVA}>✓ Save VA</button>
              </div>
            )}
            {vaUsers.length===0
              ?<div style={{textAlign:'center',padding:'28px',color:C.muted}}>No VA accounts yet.</div>
              :vaUsers.map(va=>{
                const vaTasks=projects.flatMap(p=>(p.tasks||[]).filter(t=>t.assignedTo===va.id).map(t=>({...t,projectTitle:p.title})));
                const done=vaTasks.filter(t=>t.status==='Complete').length;
                const totalHours=Object.values(va.hoursLogged||{}).reduce((s,h)=>s+(+h||0),0);
                return(
                  <div key={va.id} style={{background:C.bg,borderRadius:'10px',padding:'14px',marginBottom:'10px',border:`1px solid ${C.border}`,borderLeft:'4px solid #9a6fa3'}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'8px'}}>
                      <div>
                        <div style={{fontWeight:700,fontSize:'14px',color:C.navy}}>{va.name}</div>
                        <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>{va.role} · ${va.hourlyRate}/hr · Login: <strong>{va.username}</strong></div>
                        <div style={{fontSize:'10px',color:C.muted,marginTop:'4px',display:'flex',gap:'14px',flexWrap:'wrap'}}>
                          <span>📋 {vaTasks.length} tasks assigned ({done} complete)</span>
                          <span>⏱ {totalHours} hrs logged · Est. pay: <strong style={{color:C.navy}}>{f0(totalHours*(va.hourlyRate||0))}</strong></span>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button onClick={()=>{setVaForm(va);setShowVAForm(true);}} style={Btn('secondary',{padding:'5px 12px',fontSize:'11px'})}>Edit</button>
                        <button onClick={()=>{setVaUsers(prev=>prev.filter(x=>x.id!==va.id));setCreds(c=>{const v={...(c.vas||{})};delete v[va.id];return{...c,vas:v};});}} style={Btn('danger',{padding:'5px 8px',fontSize:'11px'})}>Remove</button>
                      </div>
                    </div>
                    {vaTasks.length>0&&(
                      <div style={{marginTop:'10px',borderTop:`1px solid ${C.border}`,paddingTop:'10px'}}>
                        {vaTasks.slice(0,3).map(t=>(
                          <div key={t.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'4px 0',fontSize:'11px'}}>
                            <span style={{color:C.text}}>{t.projectTitle} → {t.title}</span>
                            <StatusBadge s={t.status}/>
                          </div>
                        ))}
                        {vaTasks.length>3&&<div style={{fontSize:'10px',color:C.muted,marginTop:'4px'}}>+{vaTasks.length-3} more tasks</div>}
                      </div>
                    )}
                  </div>
                );
              })
            }
          </div>
        </>
      )}
    </div>
  );
}

/* ── STAFF TASKS VIEW ── */
export function TasksView({projects,setProjects,provId,provName,month,importantDetails,setImportantDetails}){
  const now=new Date();
  const curMonth=month||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [yr,mo]=curMonth.split('-').map(Number);
  const ml=new Date(curMonth+'-02').toLocaleString('default',{month:'long',year:'numeric'});

  const myTasks=projects.flatMap(p=>
    (p.tasks||[]).filter(t=>t.assignedTo===provId||p.assignedTo?.includes(provId))
    .map(t=>({...t,projectId:p.id,projectTitle:p.title}))
  );
  const open=myTasks.filter(t=>t.status!=='Complete');
  const done=myTasks.filter(t=>t.status==='Complete');

  const daysInMonth=new Date(yr,mo,0).getDate();
  const tasksByWeek=[1,2,3,4,5].map(w=>({
    w,
    d1:(w-1)*7+1,
    d2:Math.min(w*7,daysInMonth),
    tasks:open.filter(t=>{
      if(!t.dueDate)return w===1;
      const [ty,tm,td]=t.dueDate.split('-').map(Number);
      if(ty!==yr||tm!==mo)return w===5;
      return Math.min(Math.ceil(td/7),5)===w;
    })
  }));

  function updateTask(projId,taskId,updates){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:(x.tasks||[]).map(t=>t.id===taskId?{...t,...updates}:t)}:x));
  }

  const TaskCard=({task})=>{
    const[editingNote,setEditingNote]=useState(false);
    const[noteDraft,setNoteDraft]=useState(task.notes||'');
    return(
      <div style={{padding:'12px 14px',borderRadius:'8px',marginBottom:'8px',
        background:task.status==='Assistance Needed'?C.dangerBg:task.status==='Approval Needed'?'#f0eaf8':C.bg,
        border:`1px solid ${task.status==='Assistance Needed'?C.danger+'33':task.status==='Approval Needed'?'#7a4fa355':C.border}`}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'8px'}}>
          <input type="checkbox" onChange={()=>updateTask(task.projectId,task.id,{status:'Complete'})}/>
          <div style={{flex:1}}>
            <div style={{fontSize:'12px',fontWeight:600,color:C.text}}>{task.title}</div>
            <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>📁 {task.projectTitle}{task.dueDate&&` · 📅 ${task.dueDate}`}</div>
          </div>
          <select value={task.status} onChange={e=>updateTask(task.projectId,task.id,{status:e.target.value})}
            style={{...sel(),padding:'4px 8px',fontSize:'11px',width:'160px'}}>{STATUS_OPTS.map(o=><option key={o}>{o}</option>)}</select>
        </div>
        {/* NOTES DISPLAY */}
        {task.notes&&!editingNote&&(
          <div style={{background:'rgba(255,255,255,0.8)',borderRadius:'6px',padding:'8px 12px',marginBottom:'6px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'4px'}}>📋 Notes</div>
            <div style={{fontSize:'11px',color:C.text,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{task.notes}</div>
          </div>
        )}
        {/* NOTE EDIT AREA */}
        {editingNote?(
          <div style={{marginTop:'4px'}}>
            <textarea value={noteDraft} onChange={e=>setNoteDraft(e.target.value)} rows={3}
              placeholder="Add or update note…"
              style={{...inp(),background:'#fff',fontSize:'11px',padding:'7px 10px',resize:'vertical',lineHeight:1.5,fontFamily:sans}}/>
            <div style={{display:'flex',gap:'6px',marginTop:'6px'}}>
              <button onClick={()=>{updateTask(task.projectId,task.id,{notes:noteDraft});setEditingNote(false);}} style={Btn('primary',{padding:'5px 14px',fontSize:'10px'})}>✓ Save</button>
              <button onClick={()=>{setNoteDraft(task.notes||'');setEditingNote(false);}} style={Btn('secondary',{padding:'5px 10px',fontSize:'10px'})}>Cancel</button>
            </div>
          </div>
        ):(
          <button onClick={()=>{setNoteDraft(task.notes||'');setEditingNote(true);}}
            style={{...Btn('secondary',{padding:'4px 12px',fontSize:'10px'}),marginTop:'4px'}}>
            {task.notes?'✏️ Edit Note':'+ Add Note'}
          </button>
        )}
      </div>
    );
  };

  return(
    <div>
      <ImportantDetailsBlock personId={provId} personName={provName} importantDetails={importantDetails||{}} setImportantDetails={setImportantDetails||(()=>{})}/>
      <div style={cardS()}>
        <div style={lblS()}>My Tasks — {provName} · {ml}</div>
        <div style={{fontSize:'10px',color:C.muted,marginBottom:'14px'}}>{open.length} open · {done.length} complete</div>
        {myTasks.length===0
          ?<div style={{textAlign:'center',padding:'32px',color:C.muted,fontSize:'13px'}}>No tasks assigned to you yet.</div>
          :<>
            {tasksByWeek.map(({w,d1,d2,tasks:wt})=>wt.length===0?null:(
              <div key={w} style={{marginBottom:'18px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                  <span style={{background:C.navy,color:'#fff',borderRadius:'999px',padding:'2px 12px',fontSize:'9px',fontWeight:700}}>Week {w}</span>
                  <span style={{fontSize:'10px',color:C.muted}}>{mo}/{d1} – {mo}/{d2} · {wt.length} task{wt.length!==1?'s':''}</span>
                </div>
                {wt.map(task=><TaskCard key={task.id} task={task}/>)}
              </div>
            ))}
            {done.length>0&&<>
              <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.muted,margin:'14px 0 8px'}}>Completed ✓</div>
              {done.map(task=>(
                <div key={task.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'8px 12px',borderRadius:'8px',marginBottom:'4px',background:C.successBg,border:`1px solid ${C.success}33`,opacity:0.7}}>
                  <input type="checkbox" checked readOnly/>
                  <div style={{flex:1}}><div style={{fontSize:'11px',color:C.muted,textDecoration:'line-through'}}>{task.title}</div><div style={{fontSize:'10px',color:C.muted}}>📁 {task.projectTitle}</div></div>
                  <StatusBadge s="Complete"/>
                </div>
              ))}
            </>}
          </>
        }
      </div>
    </div>
  );
}

/* ── VA VIEW ── */
export function VAView({projects,setProjects,auth,vaUsers,month,importantDetails,setImportantDetails}){
  const va=vaUsers.find(v=>v.id===auth.vaId)||{name:auth.vaName,hourlyRate:0,hoursLogged:{}};
  const now=new Date();
  const curMonth=month||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [yr,mo]=curMonth.split('-').map(Number);
  const ml=new Date(curMonth+'-02').toLocaleString('default',{month:'long',year:'numeric'});

  const myTasks=projects.flatMap(p=>
    (p.tasks||[]).filter(t=>t.assignedTo===auth.vaId)
    .map(t=>({...t,projectId:p.id,projectTitle:p.title}))
  );
  const open=myTasks.filter(t=>t.status!=='Complete');
  const done=myTasks.filter(t=>t.status==='Complete');
  const[hoursInput,setHoursInput]=useState({});
  const totalHours=Object.values(va.hoursLogged||{}).reduce((s,h)=>s+(+h||0),0);

  const daysInMonth=new Date(yr,mo,0).getDate();
  const tasksByWeek=[1,2,3,4,5].map(w=>({
    w,
    d1:(w-1)*7+1,
    d2:Math.min(w*7,daysInMonth),
    tasks:open.filter(t=>{
      if(!t.dueDate)return w===1;
      const [ty,tm,td]=t.dueDate.split('-').map(Number);
      if(ty!==yr||tm!==mo)return w===5;
      return Math.min(Math.ceil(td/7),5)===w;
    })
  }));

  function updateTask(projId,taskId,updates){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:(x.tasks||[]).map(t=>t.id===taskId?{...t,...updates}:t)}:x));
  }

  return(
    <div>
      <ImportantDetailsBlock personId={auth.vaId} personName={va.name} importantDetails={importantDetails||{}} setImportantDetails={setImportantDetails||(()=>{})}/>

      <div style={cardS()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:'10px'}}>
          <div>
            <div style={{fontFamily:serif,fontSize:'22px',fontWeight:300,color:C.navy}}>{va.name}</div>
            <div style={{fontSize:'11px',color:C.muted,marginTop:'2px'}}>{va.role||'Virtual Assistant'} · ${va.hourlyRate||0}/hr</div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'10px',textAlign:'center'}}>
            {[['Open Tasks',open.length],['Completed',done.length],['Hours Logged',totalHours]].map(([l,v])=>(
              <div key={l} style={{background:C.bg,borderRadius:'8px',padding:'10px 14px'}}>
                <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'2px'}}>{l}</div>
                <div style={{fontSize:'20px',fontWeight:300,fontFamily:serif,color:C.navy}}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={cardS()}>
        <div style={lblS()}>My Tasks — {ml}</div>
        <div style={{fontSize:'10px',color:C.muted,marginBottom:'14px'}}>Tasks grouped by week</div>
        {myTasks.length===0
          ?<div style={{textAlign:'center',padding:'32px',color:C.muted,fontSize:'13px'}}>No tasks assigned yet. Check back soon!</div>
          :<>
            {tasksByWeek.map(({w,d1,d2,tasks:wt})=>wt.length===0?null:(
              <div key={w} style={{marginBottom:'18px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'8px'}}>
                  <span style={{background:C.navy,color:'#fff',borderRadius:'999px',padding:'2px 12px',fontSize:'9px',fontWeight:700}}>Week {w}</span>
                  <span style={{fontSize:'10px',color:C.muted}}>{mo}/{d1} – {mo}/{d2} · {wt.length} task{wt.length!==1?'s':''}</span>
                </div>
                {wt.map(task=>(
                  <div key={task.id} style={{padding:'12px 14px',borderRadius:'10px',marginBottom:'8px',
                    background:task.status==='Assistance Needed'?C.dangerBg:task.status==='Approval Needed'?'#f0eaf8':C.bg,
                    border:`1px solid ${task.status==='Assistance Needed'?C.danger+'33':task.status==='Approval Needed'?'#7a4fa355':C.border}`}}>
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'8px',flexWrap:'wrap',gap:'6px'}}>
                      <div>
                        <div style={{fontSize:'13px',fontWeight:700,color:C.navy}}>{task.title}</div>
                        <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>📁 {task.projectTitle}{task.dueDate&&` · Due ${task.dueDate}`}</div>
                      </div>
                      <select value={task.status} onChange={e=>updateTask(task.projectId,task.id,{status:e.target.value})}
                        style={{...sel(),padding:'5px 10px',fontSize:'11px',width:'165px'}}>
                        {STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
                      </select>
                    </div>
                    {/* NOTES DISPLAY */}
                    {task.notes&&(
                      <div style={{background:'rgba(255,255,255,0.8)',borderRadius:'6px',padding:'8px 12px',marginBottom:'8px',border:`1px solid ${C.border}`}}>
                        <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'4px'}}>📋 Notes</div>
                        <div style={{fontSize:'11px',color:C.text,lineHeight:1.6,whiteSpace:'pre-wrap'}}>{task.notes}</div>
                      </div>
                    )}
                    <div style={{marginBottom:'8px'}}>
                      <textarea value={task.notes||''} onChange={e=>updateTask(task.projectId,task.id,{notes:e.target.value})}
                        placeholder="Add a note or update…" rows={2}
                        style={{...inp(),background:'rgba(255,255,255,0.7)',fontSize:'11px',padding:'7px 10px',resize:'vertical',lineHeight:1.5,fontFamily:sans}}/>
                    </div>
                    <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
                      <label style={{...lblS(),marginBottom:0,whiteSpace:'nowrap'}}>Log Hours:</label>
                      <input type="number" placeholder="0" value={hoursInput[task.id]||''} onChange={e=>setHoursInput(p=>({...p,[task.id]:e.target.value}))} style={{...inp(),width:'80px',padding:'5px 8px'}}/>
                      <button onClick={()=>{
                        const hrs=+hoursInput[task.id]||0;
                        if(!hrs)return;
                        updateTask(task.projectId,task.id,{hoursLogged:(+task.hoursLogged||0)+hrs,lastUpdated:new Date().toISOString().split('T')[0]});
                        setHoursInput(p=>({...p,[task.id]:''}));
                      }} style={Btn('accent',{padding:'5px 14px',fontSize:'11px'})}>+ Add</button>
                      {task.hoursLogged>0&&<span style={{fontSize:'10px',color:C.muted}}>Total: <strong>{task.hoursLogged} hrs</strong></span>}
                    </div>
                  </div>
                ))}
              </div>
            ))}
            {done.length>0&&<>
              <div style={{fontSize:'10px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.muted,margin:'14px 0 8px'}}>Completed ✓</div>
              {done.map(task=>(
                <div key={task.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderRadius:'8px',marginBottom:'4px',background:C.successBg,border:`1px solid ${C.success}33`}}>
                  <div>
                    <div style={{fontSize:'11px',color:C.muted,textDecoration:'line-through',fontWeight:600}}>{task.title}</div>
                    <div style={{fontSize:'10px',color:C.muted}}>📁 {task.projectTitle}{task.hoursLogged>0?` · ${task.hoursLogged} hrs`:''}</div>
                  </div>
                  <StatusBadge s="Complete"/>
                </div>
              ))}
            </>}
          </>
        }
      </div>
    </div>
  );
}
