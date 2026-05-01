import { useState, useEffect, useMemo } from "react";
import * as XLSX from 'xlsx';

// ── INLINE EMAIL HELPERS ────────────────────────────────
const DEFAULT_EMAIL_SERVICE = 'service_742oajo';
const DEFAULT_EMAIL_TEMPLATE = 'template_mk11yaq';  
const DEFAULT_EMAIL_KEY = 'Zyf1nHcE0NKucw1go';

function initEmail(key){ if(typeof emailjs!=="undefined") emailjs.init(key||DEFAULT_EMAIL_KEY); }

async function sendEmail({serviceId,templateId,to,subject,body,from_name='Lumé Haus Tracker'}){
  const sId=serviceId||DEFAULT_EMAIL_SERVICE;
  const tId=templateId||DEFAULT_EMAIL_TEMPLATE;
  if(!to){console.warn('No recipient email');return false;}
  try{
    if(typeof emailjs==="undefined"){console.warn('EmailJS not loaded');return false;}
    await emailjs.send(sId,tId,{to_email:to,to_name:to,from_name,subject,message:body});
    return true;
  }catch(e){console.error('Email failed:',e);return false;}
}

async function sendTaskAlert({emailConfig,taskTitle,projectTitle,status,providerName}){
  return sendEmail({serviceId:emailConfig?.serviceId,templateId:emailConfig?.templateId,to:emailConfig?.adminEmail,
    subject:`⚠️ Task Update: ${status} — ${taskTitle}`,
    body:`A task needs your attention.\n\nTask: ${taskTitle}\nProject: ${projectTitle}\nStatus: ${status}\nUpdated by: ${providerName}\n\nLog in: https://dashboard.lumehaus.health`});
}

async function sendHoursApproval({emailConfig,vaName,weekLabel,hours,details}){
  return sendEmail({serviceId:emailConfig?.serviceId,templateId:emailConfig?.templateId,to:emailConfig?.adminEmail,
    subject:`⏱️ Hours Approval — ${vaName} · ${weekLabel}`,
    body:`${vaName} submitted hours for approval.\n\nWeek: ${weekLabel}\nTotal: ${hours} hrs\n\n${details}\n\nLog in: https://dashboard.lumehaus.health`});
}


import { dbGet, dbSet, uploadReceipt, deleteReceipt } from './supabase.js';
// All components inlined below

const C={bg:'#f0f4f7',card:'#fff',navy:'#253649',accent:'#7a9fa3',accentL:'#9aafb2',accentBg:'#eaf2f3',text:'#1a2a35',muted:'#6b8090',border:'#dce4ea',success:'#2e9e68',successBg:'#e6f5ee',warn:'#b87d00',warnBg:'#fef5dc',danger:'#c03030',dangerBg:'#fdeaea',shadow:'0 1px 4px rgba(37,54,73,0.1)'};
const sans="'Montserrat',sans-serif",serif="'Cormorant Garamond',Georgia,serif";
const f2=n=>`$${(+n||0).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const f0=n=>`$${Math.round(+n||0).toLocaleString('en-US')}`;
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,6);
const wk=d=>Math.min(Math.ceil(new Date(d+'T12:00:00').getDate()/7),5);
const pct=(a,b)=>b>0?Math.min((a/b)*100,100):0;
const cogCalc=(s,u,v)=>!s?0:s.cogsType==='per_unit'?(s.cogsUnit||0)*(+u||0):s.cogsType==='per_vial'?(s.cogsVial||0)*(+v||0):(s.cogsFlat||0);
const inp=(ex={})=>({width:'100%',background:C.bg,border:`1px solid ${C.border}`,borderRadius:'7px',color:C.text,padding:'8px 10px',fontFamily:sans,fontSize:'12px',outline:'none',boxSizing:'border-box',...ex});
const sel=(ex={})=>({...inp(),background:'#fff',...ex});
const cardS=(ex={})=>({background:C.card,borderRadius:'12px',padding:'18px',boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:'14px',...ex});
const lblS=(ex={})=>({fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'4px',display:'block',...ex});
const Btn=(v,ex={})=>{const m={primary:{background:C.navy,color:'#fff',border:'none'},secondary:{background:'#fff',color:C.navy,border:`1px solid ${C.border}`},danger:{background:C.dangerBg,color:C.danger,border:`1px solid ${C.danger}44`}};return{padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontFamily:sans,fontWeight:600,fontSize:'12px',...(m[v]||m.primary),...ex};};
const catCs={injectable:{color:'#3a7fa3',bg:'#e6f3fa'},facial:{color:'#7a4fa3',bg:'#f0eaf8'},other:{color:'#5a7080',bg:'#ecf0f3'},membership:{color:'#2e9e68',bg:'#e6f5ee'},retail:{color:'#b87d00',bg:'#fef5dc'}};
const Badge=({cat,name})=>{const cs=catCs[cat]||{color:C.muted,bg:'#eee'};return<span style={{display:'inline-block',padding:'2px 8px',borderRadius:'999px',background:cs.bg,color:cs.color,fontSize:'9px',fontWeight:700}}>{name}</span>;};

const DEF_CAT=[
  {id:'c1',name:'Botox / Neurotoxin',cat:'injectable',price:16,cogsType:'per_unit',cogsFlat:0,cogsUnit:4.5,cogsVial:0,unit:'unit',active:true},
  {id:'c2',name:'Dysport',cat:'injectable',price:5,cogsType:'per_unit',cogsFlat:0,cogsUnit:1.5,cogsVial:0,unit:'unit',active:true},
  {id:'c3',name:'Juvederm',cat:'injectable',price:700,cogsType:'per_vial',cogsFlat:0,cogsUnit:0,cogsVial:200,unit:'syringe',active:true},
  {id:'c4',name:'Restylane',cat:'injectable',price:650,cogsType:'per_vial',cogsFlat:0,cogsUnit:0,cogsVial:185,unit:'syringe',active:true},
  {id:'c5',name:'Sculptra',cat:'injectable',price:800,cogsType:'per_vial',cogsFlat:0,cogsUnit:0,cogsVial:300,unit:'vial',active:true},
  {id:'c6',name:'Advanced Facial',cat:'facial',price:175,cogsType:'flat',cogsFlat:25,cogsUnit:0,cogsVial:0,unit:'session',active:true},
  {id:'c7',name:'Chemical Peel',cat:'facial',price:150,cogsType:'flat',cogsFlat:18,cogsUnit:0,cogsVial:0,unit:'session',active:true},
  {id:'c8',name:'Microneedling',cat:'facial',price:350,cogsType:'flat',cogsFlat:45,cogsUnit:0,cogsVial:0,unit:'session',active:true},
  {id:'c9',name:'Skin Rejuvenation',cat:'facial',price:200,cogsType:'flat',cogsFlat:30,cogsUnit:0,cogsVial:0,unit:'session',active:true},
  {id:'c10',name:'Red Light Therapy',cat:'other',price:99,cogsType:'flat',cogsFlat:5,cogsUnit:0,cogsVial:0,unit:'session',active:true},
  {id:'c11',name:'Peptide Therapy',cat:'other',price:250,cogsType:'flat',cogsFlat:80,cogsUnit:0,cogsVial:0,unit:'vial',active:true},
  {id:'c12',name:'Lumé 360 Consult',cat:'other',price:150,cogsType:'flat',cogsFlat:0,cogsUnit:0,cogsVial:0,unit:'session',active:true},
  {id:'c13',name:'Membership Signup',cat:'membership',price:0,cogsType:'flat',cogsFlat:0,cogsUnit:0,cogsVial:0,unit:'signup',active:true},
];
const DEF_PROV=[
  {id:'lauren',name:'Lauren',role:'Esthetician',color:'#7a9fa3',monthlyGoal:8000,hasHourly:true,compType:'hourly_goal',hourlyRate:15,injectableTiers:[{upTo:1999,rate:15},{upTo:3999,rate:20},{upTo:99999,rate:25}],facialTiers:[{upTo:1999,rate:15},{upTo:3999,rate:20},{upTo:99999,rate:25}],membershipBonus:10,retailCommRate:10},
  {id:'emy',name:'Emy Rodriguez',role:'Injector / Esthetician',color:'#5b8f93',monthlyGoal:15000,hasHourly:false,compType:'commission_first',hourlyRate:0,injectableTiers:[{upTo:4999,rate:20},{upTo:9999,rate:25},{upTo:99999,rate:30}],facialTiers:[{upTo:1999,rate:15},{upTo:4999,rate:20},{upTo:99999,rate:25}],membershipBonus:10,retailCommRate:10},
  {id:'megan',name:'Megan M. Jones',role:'Esthetician / Injector',color:'#4a7d81',monthlyGoal:12000,hasHourly:false,compType:'commission_first',hourlyRate:0,injectableTiers:[{upTo:4999,rate:20},{upTo:9999,rate:25},{upTo:99999,rate:30}],facialTiers:[{upTo:1999,rate:15},{upTo:4999,rate:20},{upTo:99999,rate:25}],membershipBonus:10,retailCommRate:10},
];
const DEF_CREDS={admins:[{id:'admin1',name:'Crystal-Dior',username:'admin',password:'LumeAdmin2025'}],providers:{lauren:{username:'lauren',password:'Lauren2025'},emy:{username:'emy',password:'Emy2025'},megan:{username:'megan',password:'Megan2025'}},vas:{}};

function calcComm(entries,prov,catalog,hrs,retail){
  const rows=entries.map(e=>{const s=catalog.find(c=>c.id===e.serviceId);const net=Math.max(0,(+e.retailPrice||0)-(+e.discount||0));const cogs=e.cogsOverride?(+e.cogsManual||0):cogCalc(s,e.unitsUsed,e.vialsUsed);return{...e,net,cogs,tip:+e.tip||0,cat:s?.cat||'other'};});
  const injRev=rows.filter(r=>r.cat==='injectable').reduce((s,r)=>s+r.net,0);
  const facRev=rows.filter(r=>r.cat==='facial').reduce((s,r)=>s+r.net,0);
  const svcRev=rows.reduce((s,r)=>s+r.net,0);
  const retRev=+retail?.rev||0,retCogs=+retail?.cogs||0;
  const totRev=svcRev+retRev,totCogs=rows.reduce((s,r)=>s+r.cogs,0)+retCogs;
  const totTips=rows.reduce((s,r)=>s+r.tip,0),memCt=rows.filter(r=>r.cat==='membership').length;
  const memB=memCt*(prov?.membershipBonus||10||10);
  const retComm=retRev*((prov?.retailCommRate||0||0)/100);
  const gp=totRev-totCogs;
  const iT=(prov?.injectableTiers||[]||[]).find(t=>injRev<=t.upTo)||{rate:0};
  const fT=(prov?.facialTiers||[]||[]).find(t=>facRev<=t.upTo)||{rate:0};
  let basePay=0,injC=0,facC=0,above=0;
  if(prov?.compType==='hourly_goal'){basePay=(+hrs||0)*(+prov?.hourlyRate||0||0);above=Math.max(0,svcRev-(prov?.monthlyGoal||0||0));if(above>0&&svcRev>0){injC=(above*(injRev/svcRev))*(iT.rate/100);facC=(above*(facRev/svcRev))*(fT.rate/100);}}
  else{injC=injRev*(iT.rate/100);facC=facRev*(fT.rate/100);}
  return{totRev,svcRev,injRev,facRev,retRev,totCogs,retCogs,gp,totTips,memCt,memB,retComm,basePay,iT,fT,injC,facC,totC:injC+facC+memB+retComm,totalPay:basePay+injC+facC+memB+retComm,above,hrs:+hrs||0};
}

function LoginScreen({providers,creds,onLogin}){
  const[user,setUser]=useState(''),pass=useState(''),show=useState(false),err=useState('');
  const[pw,setPw]=pass,[showPw,setShow]=show,[errMsg,setErr]=err;
  function attempt(){
    const adminList = creds.admins || (creds.adminUser ? [{id:'admin1',name:'Admin',username:creds.adminUser,password:creds.adminPass}] : []);
    const adminMatch = adminList.find(a=>a.username===user.trim()&&a.password===pw);
    if(adminMatch){onLogin({role:'admin',providerId:null,adminId:adminMatch.id});return;}
    // VA login
    const vaList=Object.values(creds.vas||{});
    const vaMatch=vaList.find(v=>v.username===user.trim()&&v.password===pw);
    if(vaMatch){onLogin({role:'va',vaId:vaMatch.id,vaName:vaMatch.name});return;}
    const p=providers.find(p=>{const pc=creds.providers[p.id];return pc&&pc.username===user.trim()&&pc.password===pw;});
    if(p)onLogin({role:'staff',providerId:p.id});else setErr('Incorrect username or password.');
  }
  return(
    <div style={{minHeight:'100vh',background:C.navy,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:sans,padding:'20px'}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      <div style={{width:'100%',maxWidth:'360px'}}>
        <div style={{textAlign:'center',marginBottom:'32px'}}>
          <div style={{fontFamily:serif,fontSize:'28px',fontWeight:300,letterSpacing:'0.12em',color:'#fff'}}>Lumé Haus</div>
          <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.2em',color:C.accentL,textTransform:'uppercase',marginTop:'4px'}}>by CornerstoneMD · Staff Portal</div>
        </div>
        <div style={{background:'#fff',borderRadius:'16px',padding:'28px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
          <div style={{marginBottom:'14px'}}>
            <label style={lblS()}>Username</label>
            <input value={user} onChange={e=>{setUser(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&attempt()} placeholder="Enter username" style={inp()}/>
          </div>
          <div style={{marginBottom:'18px'}}>
            <label style={lblS()}>Password</label>
            <div style={{position:'relative'}}>
              <input type={showPw?'text':'password'} value={pw} onChange={e=>{setPw(e.target.value);setErr('');}} onKeyDown={e=>e.key==='Enter'&&attempt()} placeholder="Enter password" style={inp({paddingRight:'40px'})}/>
              <button onClick={()=>setShow(s=>!s)} style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'none',border:'none',cursor:'pointer',color:C.muted,fontSize:'13px'}}>{showPw?'🙈':'👁'}</button>
            </div>
          </div>
          {errMsg&&<div style={{background:C.dangerBg,color:C.danger,borderRadius:'7px',padding:'8px 12px',fontSize:'11px',fontWeight:600,marginBottom:'12px'}}>{errMsg}</div>}
          <button onClick={attempt} style={{...Btn('primary'),width:'100%',padding:'12px',fontSize:'13px',borderRadius:'10px'}}>Sign In</button>
        </div>
        <div style={{textAlign:'center',marginTop:'18px',fontSize:'9px',color:'rgba(154,175,178,0.4)',letterSpacing:'0.1em',fontWeight:700}}>DR. LOUIS GILBERT, MD · LUMEHAUS.HEALTH</div>
      </div>
    </div>
  );
}

function TierEditor({label,tiers,onUpdate}){
  return(
    <div>
      <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'8px'}}>{label}</div>
      {tiers.map((t,i)=>(
        <div key={i} style={{display:'grid',gridTemplateColumns:'1fr 80px 28px',gap:'5px',marginBottom:'5px',alignItems:'center'}}>
          <input type="number" value={t.upTo>=99999?'':t.upTo} placeholder="∞ last tier" onChange={e=>onUpdate(tiers.map((x,j)=>j===i?{...x,upTo:+e.target.value||99999}:x))} style={inp({padding:'5px 8px',fontSize:'11px'})}/>
          <input type="number" value={t.rate} onChange={e=>onUpdate(tiers.map((x,j)=>j===i?{...x,rate:+e.target.value||0}:x))} style={inp({padding:'5px 8px',fontSize:'11px'})}/>
          <button onClick={()=>onUpdate(tiers.filter((_,j)=>j!==i))} style={{background:'none',border:'none',color:C.danger,cursor:'pointer',fontSize:'16px',padding:0}}>×</button>
        </div>
      ))}
      <button onClick={()=>onUpdate([...tiers,{upTo:99999,rate:0}])} style={Btn('secondary',{padding:'4px 10px',fontSize:'10px',marginTop:'2px'})}>+ Add Tier</button>
    </div>
  );
}

function CombinedView({providers,logData,hoursData,retailData,catalog,month}){
  const ml=new Date(month+'-02').toLocaleString('default',{month:'long',year:'numeric'});
  const stats=(providers||[]).map(p=>{const mk=`${p.id}:${month}`;return{p,c:calcComm(logData[mk]||[],p,catalog,hoursData[mk]||0,retailData[mk]||{})};});
  const T={rev:stats.reduce((s,x)=>s+x.c.totRev,0),pay:stats.reduce((s,x)=>s+x.c.totalPay,0),cogs:stats.reduce((s,x)=>s+x.c.totCogs,0),gp:stats.reduce((s,x)=>s+x.c.gp,0),tips:stats.reduce((s,x)=>s+x.c.totTips,0)};
  return(
    <div>
      <div style={cardS()}>
        <div style={lblS()}>All Providers — {ml}</div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginTop:'10px'}}>
          {[['Total Revenue',f0(T.rev)],['Est. Total Pay',f0(T.pay),true],['Total COGs',f0(T.cogs)],['Gross Profit',f0(T.gp)],['Tips Tracked',f0(T.tips)],['Providers',providers.length]].map(([l,v,hi])=>(
            <div key={l} style={{background:hi?C.navy:C.bg,borderRadius:'10px',padding:'12px',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:hi?C.accentL:C.accent,marginBottom:'3px'}}>{l}</div>
              <div style={{fontSize:'20px',fontWeight:300,fontFamily:serif,color:hi?'#fff':C.text}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))',gap:'14px'}}>
        {stats.map(({p,c})=>{
          const gp2=pct(c.svcRev,p.monthlyGoal);
          return(
            <div key={p.id} style={cardS({marginBottom:0,borderLeft:`4px solid ${p.color}`})}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'12px'}}>
                <div><div style={{fontWeight:700,fontSize:'14px',color:C.navy}}>{p.name}</div><div style={{fontSize:'10px',color:C.muted}}>{p.role}</div></div>
                <div style={{textAlign:'right'}}><div style={{fontSize:'20px',fontWeight:300,fontFamily:serif,color:p.color}}>{f0(c.totalPay)}</div><div style={{fontSize:'9px',color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>est. pay</div></div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'6px',marginBottom:'10px'}}>
                {[['Revenue',f0(c.totRev)],['COGs',f0(c.totCogs)],['Profit',f0(c.gp)]].map(([l,v])=>(
                  <div key={l} style={{background:C.bg,borderRadius:'7px',padding:'7px'}}>
                    <div style={{fontSize:'9px',color:C.muted,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div>
                    <div style={{fontSize:'14px',fontFamily:serif,color:C.text,marginTop:'2px'}}>{v}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:'10px',color:C.muted,marginBottom:'4px',display:'flex',justifyContent:'space-between'}}><span>Goal Progress</span><span style={{fontWeight:700,color:gp2>=100?C.success:C.navy}}>{gp2.toFixed(0)}% of {f0(p.monthlyGoal)}</span></div>
              <div style={{background:C.bg,borderRadius:'999px',height:'7px',overflow:'hidden'}}><div style={{height:'100%',borderRadius:'999px',width:`${gp2}%`,background:gp2>=100?C.success:p.color,transition:'width 0.5s'}}/></div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


/* ─── EXPENSES VIEW ─────────────────────────────────────── */
function ExpensesView({expenses,setExpenses,month,payroll,setPayroll,providers,logData,hoursData,retailData,catalog}){
  const[tab,setTab]=useState('startup');
  const[payrollMonth,setPayrollMonth]=useState(month);
  const[showForm,setShowForm]=useState(false);
  const[uploading,setUploading]=useState(false);
  const[editId,setEditId]=useState(null);
  const blankExp=()=>({
    id:uid(),type:tab,description:'',amount:'',purchase_date:new Date().toISOString().split('T')[0],
    vendor:'',purchased_by:'',category:'',notes:'',receipt_url:'',receipt_path:'',month:month,
  });
  const[form,setForm]=useState(blankExp());

  const CATS_STARTUP=['Equipment','Furniture','Software','Licensing','Marketing','Build-out','Inventory','Legal','Other'];
  const CATS_MONTHLY=['Rent','Utilities','Software Subscriptions','Supplies','Marketing','Insurance','Payroll Services','Cleaning','Other'];

  const startupExp=expenses.filter(e=>e.type==='startup');
  const monthlyExp=expenses.filter(e=>e.type==='monthly'&&e.month===month);
  const startupTotal=startupExp.reduce((s,e)=>s+(+e.amount||0),0);
  const monthlyTotal=monthlyExp.reduce((s,e)=>s+(+e.amount||0),0);

  async function handleFile(file){
    if(!file)return;
    setUploading(true);
    const path=`${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`;
    const url=await uploadReceipt(file,path);
    if(url)setForm(p=>({...p,receipt_url:url,receipt_path:path}));
    else alert('Receipt upload failed. Check Supabase storage bucket setup.');
    setUploading(false);
  }

  async function saveExp(){
    if(!form.description||!form.amount)return;
    const e2={...form,id:editId||uid(),type:tab,amount:+form.amount,month:tab==='monthly'?month:''};
    if(editId){setExpenses(p=>p.map(x=>x.id===editId?e2:x));}
    else{setExpenses(p=>[...p,e2]);}
    setForm(blankExp());setShowForm(false);setEditId(null);
  }

  async function delExp(exp){
    if(exp.receipt_path)await deleteReceipt(exp.receipt_path);
    setExpenses(p=>p.filter(x=>x.id!==exp.id));
  }

  function startEdit(exp){
    setForm({...exp,amount:String(exp.amount)});
    setEditId(exp.id);setTab(exp.type);setShowForm(true);
  }

  const ml=new Date(month+'-02').toLocaleString('default',{month:'long',year:'numeric'});
  const cats=tab==='startup'?CATS_STARTUP:CATS_MONTHLY;
  const list=tab==='startup'?startupExp:monthlyExp;

  return(
    <div>
      {/* KPI CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:'12px',marginBottom:'16px'}}>
        {[
          {l:'Start-up Expenses',v:f0(startupTotal),s:`${startupExp.length} purchases total`,hi:false},
          {l:`Monthly Expenses — ${ml}`,v:f0(monthlyTotal),s:`${monthlyExp.length} expenses this month`,hi:true},
          {l:'Combined This Month',v:f0(monthlyTotal),s:'Ongoing only (startup is one-time)',hi:false},
        ].map((k,i)=>(
          <div key={i} style={{background:k.hi?C.navy:C.card,borderRadius:'12px',padding:'16px',boxShadow:C.shadow,border:`1px solid ${k.hi?'transparent':C.border}`}}>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:k.hi?C.accentL:C.accent,marginBottom:'4px'}}>{k.l}</div>
            <div style={{fontSize:'24px',fontWeight:300,fontFamily:serif,color:k.hi?'#fff':C.text}}>{k.v}</div>
            <div style={{fontSize:'10px',color:k.hi?'rgba(255,255,255,0.4)':C.muted,marginTop:'3px'}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* TABS + ADD BUTTON */}
      <div style={cardS()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'14px',flexWrap:'wrap',gap:'10px'}}>
          <div style={{display:'flex',gap:'4px',background:C.bg,borderRadius:'8px',padding:'3px',flexWrap:'wrap'}}>
            {[['startup','🚀 Start-up'],['monthly','📅 Monthly'],['payroll','💵 Payroll']].map(([t,l])=>(
              <button key={t} onClick={()=>{setTab(t);setShowForm(false);setEditId(null);if(t!=='payroll')setForm({...blankExp(),type:t});}}
                style={{padding:'7px 18px',borderRadius:'6px',border:'none',cursor:'pointer',background:tab===t?C.navy:'transparent',color:tab===t?'#fff':C.muted,fontFamily:sans,fontSize:'12px',fontWeight:600}}>
                {l}
              </button>
            ))}
          </div>
          {tab!=='payroll'&&<button style={Btn('primary')} onClick={()=>{setShowForm(!showForm);setEditId(null);setForm(blankExp());}}>{
showForm?'✕ Cancel':'+ Add Expense'}}</button>}
        </div>

        {/* PAYROLL TAB */}
        {tab==='payroll'&&(
          <div>
            <div style={{fontSize:'10px',color:C.muted,marginBottom:'14px'}}>
              Enter actual payroll paid to each provider per month. If left blank, the commission calculator estimate is used in the breakeven tracker. Use this to record what was actually paid out.
            </div>
            <div style={{display:'flex',gap:'10px',alignItems:'center',marginBottom:'16px',flexWrap:'wrap'}}>
              <label style={lblS({marginBottom:0})}>Viewing Month:</label>
              <input type="month" value={payrollMonth} onChange={e=>setPayrollMonth(e.target.value)}
                style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:'7px',color:C.text,padding:'6px 10px',fontFamily:sans,fontSize:'12px'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'12px'}}>
              {providers.map(p=>{
                const mk2=`${p.id}:${payrollMonth}`;
                const ents=logData[mk2]||[];
                const hrs=hoursData[mk2]||0;
                const ret=retailData[mk2]||{rev:0,cogs:0};
                const calc=calcComm(ents,p,catalog,hrs,ret);
                const actualKey=`${p.id}:${payrollMonth}`;
                const actual=payroll[actualKey];
                return(
                  <div key={p.id} style={{background:C.bg,borderRadius:'10px',padding:'14px',border:`1px solid ${C.border}`,borderLeft:`4px solid ${p.color}`}}>
                    <div style={{fontWeight:700,fontSize:'13px',color:C.navy,marginBottom:'2px'}}>{p.name}</div>
                    <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>{p.role}</div>
                    <div style={{fontSize:'10px',color:C.muted,marginBottom:'4px'}}>Calculator estimate: <strong style={{color:C.navy}}>{f0(calc.totalPay)}</strong></div>
                    <label style={lblS()}>Actual Amount Paid ($)</label>
                    <input type="number"
                      value={actual!==undefined&&actual!==''?actual:''}
                      placeholder={`Est. ${f0(calc.totalPay)}`}
                      onChange={e=>setPayroll(prev=>({...prev,[actualKey]:e.target.value===''?'':+e.target.value}))}
                      style={inp({background:'#fff'})}/>
                    {actual!==undefined&&actual!==''&&+actual!==calc.totalPay&&(
                      <div style={{fontSize:'10px',marginTop:'6px',color:+actual>calc.totalPay?C.warn:C.success}}>
                        {+actual>calc.totalPay?`↑ $${(+actual-calc.totalPay).toFixed(2)} over estimate`:`↓ $${(calc.totalPay-+actual).toFixed(2)} under estimate`}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{marginTop:'12px',padding:'10px 14px',background:C.accentBg,borderRadius:'8px',fontSize:'10px',color:C.accent}}>
              💡 Payroll records auto-save as you type. These amounts feed directly into the Breakeven tracker for accurate profit calculations.
            </div>
          </div>
        )}

        {/* FORM */}
        {tab!=='payroll'&&showForm&&(
          <div style={{background:C.bg,borderRadius:'10px',padding:'16px',marginBottom:'16px',border:`1px solid ${C.border}`}}>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'12px'}}>
              {editId?'Edit':'New'} {tab==='startup'?'Start-up':'Monthly'} Expense
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))',gap:'10px',marginBottom:'12px'}}>
              <div style={{gridColumn:'span 2'}}>
                <label style={lblS()}>Description *</label>
                <input value={form.description} onChange={e=>setForm(p=>({...p,description:e.target.value}))} placeholder="What was purchased?" style={inp()}/>
              </div>
              <div>
                <label style={lblS()}>Amount ($) *</label>
                <input type="number" value={form.amount} onChange={e=>setForm(p=>({...p,amount:e.target.value}))} placeholder="0.00" style={inp()}/>
              </div>
              <div>
                <label style={lblS()}>Date Purchased</label>
                <input type="date" value={form.purchase_date} onChange={e=>setForm(p=>({...p,purchase_date:e.target.value}))} style={inp()}/>
              </div>
              <div>
                <label style={lblS()}>Vendor / Where Purchased</label>
                <input value={form.vendor} onChange={e=>setForm(p=>({...p,vendor:e.target.value}))} placeholder="Amazon, Home Depot…" style={inp()}/>
              </div>
              <div>
                <label style={lblS()}>Purchased By</label>
                <input value={form.purchased_by} onChange={e=>setForm(p=>({...p,purchased_by:e.target.value}))} placeholder="Your name" style={inp()}/>
              </div>
              <div>
                <label style={lblS()}>Category</label>
                <select value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={sel()}>
                  <option value="">Select category…</option>
                  {cats.map(c=><option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lblS()}>Notes</label>
                <input value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} placeholder="Optional notes" style={inp()}/>
              </div>
              <div style={{gridColumn:'1/-1'}}>
                <label style={lblS()}>Receipt Upload</label>
                <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                  <input type="file" accept="image/*,application/pdf" onChange={e=>handleFile(e.target.files[0])}
                    style={{fontSize:'12px',fontFamily:sans,color:C.text}}/>
                  {uploading&&<span style={{fontSize:'11px',color:C.accent}}>Uploading…</span>}
                  {form.receipt_url&&!uploading&&(
                    <a href={form.receipt_url} target="_blank" rel="noreferrer"
                      style={{fontSize:'11px',color:C.success,fontWeight:700,textDecoration:'none'}}>✓ Receipt saved — view</a>
                  )}
                </div>
              </div>
            </div>
            <button style={Btn('primary')} onClick={saveExp}>✓ Save Expense</button>
          </div>
        )}

        {/* TABLE */}
        {tab!=='payroll'&&list.length===0
          ?<div style={{textAlign:'center',padding:'36px',color:C.muted,fontSize:'13px'}}>
            No {tab==='startup'?'start-up':'monthly'} expenses added yet.
           </div>
          :<div style={{overflowX:'auto'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'700px'}}>
              <thead><tr>
                {['Date','Description','Category','Vendor','Purchased By','Amount','Receipt',''].map(h=>(
                  <th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {list.sort((a,b)=>new Date(b.purchase_date)-new Date(a.purchase_date)).map(exp=>(
                  <tr key={exp.id} style={{borderBottom:`1px solid ${C.border}`}}>
                    <td style={{padding:'8px'}}>{exp.purchase_date}</td>
                    <td style={{padding:'8px',fontWeight:600,maxWidth:'180px'}}>{exp.description}{exp.notes&&<div style={{fontSize:'9px',color:C.muted,fontWeight:400,marginTop:'2px'}}>{exp.notes}</div>}</td>
                    <td style={{padding:'8px'}}>{exp.category&&<span style={{background:C.accentBg,color:C.accent,fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'999px'}}>{exp.category}</span>}</td>
                    <td style={{padding:'8px',color:C.muted}}>{exp.vendor||'—'}</td>
                    <td style={{padding:'8px',color:C.muted}}>{exp.purchased_by||'—'}</td>
                    <td style={{padding:'8px',fontWeight:700,color:C.navy}}>{f2(exp.amount)}</td>
                    <td style={{padding:'8px'}}>
                      {exp.receipt_url
                        ?<a href={exp.receipt_url} target="_blank" rel="noreferrer" style={{color:C.success,fontWeight:700,fontSize:'10px',textDecoration:'none'}}>📎 View</a>
                        :<span style={{color:C.muted,fontSize:'10px'}}>None</span>}
                    </td>
                    <td style={{padding:'8px',whiteSpace:'nowrap'}}>
                      <button onClick={()=>startEdit(exp)} style={Btn('secondary',{padding:'3px 10px',fontSize:'10px',marginRight:'4px'})}>Edit</button>
                      <button onClick={()=>delExp(exp)} style={Btn('danger',{padding:'3px 8px',fontSize:'10px'})}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{background:C.bg,borderTop:`2px solid ${C.accent}55`}}>
                  <td colSpan={5} style={{padding:'8px',fontWeight:700,fontSize:'10px',color:C.navy}}>TOTAL</td>
                  <td style={{padding:'8px',fontWeight:700,fontSize:'13px',color:C.navy}}>{f0(list.reduce((s,e)=>s+(+e.amount||0),0))}</td>
                  <td colSpan={2}/>
                </tr>
              </tfoot>
            </table>
          </div>
        }
      </div>
    </div>
  );
}



/* ─── ANALYTICS VIEW ────────────────────────────────────── */
function AnalyticsView({expenses,payroll,providers,logData,hoursData,retailData,catalog,month}){
  const[tab,setTab]=useState('pl');
  const now=new Date();

  // Helper: get all data for a given month across all providers
  function monthStats(m){
    let injRev=0,facRev=0,otherRev=0,memRev=0,retRev=0,totCogs=0,totPayroll=0,entries=[];
    providers.forEach(p=>{
      const mk=`${p.id}:${m}`;
      const ents=logData[mk]||[];
      const hrs=hoursData[mk]||0;
      const ret=retailData[mk]||{rev:0,cogs:0};
      const c=calcComm(ents,p,catalog,hrs,ret);
      injRev+=c.injRev; facRev+=c.facRev;
      otherRev+=ents.filter(e=>{const s=catalog.find(x=>x.id===e.serviceId);return s?.cat==='other';}).reduce((s,e)=>s+Math.max(0,(+e.retailPrice||0)-(+e.discount||0)),0);
      memRev+=ents.filter(e=>{const s=catalog.find(x=>x.id===e.serviceId);return s?.cat==='membership';}).reduce((s,e)=>s+Math.max(0,(+e.retailPrice||0)-(+e.discount||0)),0);
      retRev+=c.retRev; totCogs+=c.totCogs;
      const actualPay=payroll[`${p.id}:${m}`];
      totPayroll+=(actualPay!==undefined&&actualPay!=='')?+actualPay:c.totalPay;
      entries=[...entries,...ents.map(e=>({...e,provName:p.name}))];
    });
    const svcRev=injRev+facRev+otherRev+memRev;
    const totRev=svcRev+retRev;
    const grossProfit=totRev-totCogs;
    const monthlyExp=expenses.filter(e=>e.type==='monthly'&&e.month===m).reduce((s,e)=>s+(+e.amount||0),0);
    const totalOpEx=totPayroll+monthlyExp;
    const netIncome=grossProfit-totalOpEx;
    return{injRev,facRev,otherRev,memRev,retRev,svcRev,totRev,totCogs,grossProfit,totPayroll,monthlyExp,totalOpEx,netIncome,entries};
  }

  // Current month stats
  const cur=monthStats(month);
  const ml=new Date(month+'-02').toLocaleString('default',{month:'long',year:'numeric'});

  // Last 6 months for trend
  const last6=Array.from({length:6},(_,i)=>{
    const d=new Date(month+'-02');
    d.setMonth(d.getMonth()-i);
    const m=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
    const ml2=d.toLocaleString('default',{month:'short'});
    const s=monthStats(m);
    return{month:m,ml:ml2,...s};
  }).reverse();

  const prev=last6[last6.length-2];
  const pctChange=(old,nw)=>old===0?null:Math.round(((nw-old)/Math.abs(old))*100);
  const arrow=(pct)=>pct===null?'—':pct>0?`▲ ${pct}%`:`▼ ${Math.abs(pct)}%`;
  const arrowColor=(pct,flip=false)=>pct===null?C.muted:((pct>0)!==flip)?C.success:C.danger;

  // KPI calculations
  const curEntries=cur.entries;
  const uniqueClients=new Set(curEntries.map(e=>e.client?.toLowerCase().trim())).size;
  const avgTicket=curEntries.length>0?(cur.svcRev/curEntries.length):0;

  // Top services by revenue
  const svcRevMap={};
  const svcCntMap={};
  curEntries.forEach(e=>{
    const sv=catalog.find(c=>c.id===e.serviceId);
    const name=sv?.name||'Unknown';
    const net=Math.max(0,(+e.retailPrice||0)-(+e.discount||0));
    svcRevMap[name]=(svcRevMap[name]||0)+net;
    svcCntMap[name]=(svcCntMap[name]||0)+1;
  });
  const topByRev=Object.entries(svcRevMap).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topByCnt=Object.entries(svcCntMap).sort((a,b)=>b[1]-a[1]).slice(0,5);

  // Revenue by provider
  const provStats=providers.map(p=>{
    const mk=`${p.id}:${month}`;
    const ents=logData[mk]||[];
    const hrs=hoursData[mk]||0;
    const ret=retailData[mk]||{rev:0,cogs:0};
    const c=calcComm(ents,p,catalog,hrs,ret);
    const sessions=ents.length;
    return{name:p.name,color:p.color,rev:c.totRev,sessions,avg:sessions>0?c.svcRev/sessions:0,pay:c.totalPay};
  });

  // Busiest week
  const weekRevs=[1,2,3,4,5].map(w=>({w,rev:curEntries.filter(e=>wk(e.date)===w).reduce((s,e)=>s+Math.max(0,(+e.retailPrice||0)-(+e.discount||0)),0)}));
  const busiestWeek=weekRevs.reduce((a,b)=>b.rev>a.rev?b:a,weekRevs[0]);

  // Chart max
  const maxRev=Math.max(...last6.map(m=>m.totRev),1);

  const PLRow=({label,value,sub=false,bold=false,line=false,pos=null,indent=0})=>(
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',
      padding:`${sub?'5px':'9px'} ${indent?'24px':'0px'}`,
      borderTop:line?`2px solid ${C.border}`:'none',
      borderBottom:bold?`1px solid ${C.border}`:'none',
      background:bold&&!sub?C.bg:'transparent',
      borderRadius:bold?'6px':'0',
      marginBottom:bold?'4px':'0'}}>
      <span style={{fontSize:sub?'11px':'12px',color:sub?C.muted:C.text,fontWeight:bold?700:400}}>{label}</span>
      <span style={{fontSize:sub?'11px':'13px',fontWeight:bold?700:500,
        color:pos===true?C.success:pos===false?C.danger:C.text,
        fontFamily:serif}}>{value}</span>
    </div>
  );

  return(
    <div>
      {/* TAB NAV */}
      <div style={{display:'flex',gap:'4px',background:C.card,borderRadius:'10px',padding:'4px',marginBottom:'16px',width:'fit-content',border:`1px solid ${C.border}`,boxShadow:C.shadow}}>
        {[['pl','📋 P&L Statement'],['growth','📈 Growth Trends']].map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} style={{padding:'7px 18px',borderRadius:'7px',border:'none',cursor:'pointer',background:tab===t?C.navy:'transparent',color:tab===t?'#fff':C.muted,fontFamily:sans,fontSize:'12px',fontWeight:600}}>
            {l}
          </button>
        ))}
      </div>

      {/* ── P&L STATEMENT ── */}
      {tab==='pl'&&(
        <div style={cardS()}>
          <div style={{marginBottom:'16px'}}>
            <div style={{fontFamily:serif,fontSize:'22px',fontWeight:300,color:C.navy}}>Profit & Loss Statement</div>
            <div style={{fontSize:'11px',color:C.muted,marginTop:'2px'}}>Lumé Haus by CornerstoneMD · {ml}</div>
          </div>

          {/* REVENUE */}
          <div style={{marginBottom:'8px',fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent}}>Revenue</div>
          <PLRow label="Injectable Services" value={f2(cur.injRev)} sub indent={1}/>
          <PLRow label="Facial & Skin Services" value={f2(cur.facRev)} sub indent={1}/>
          <PLRow label="Other Services" value={f2(cur.otherRev)} sub indent={1}/>
          <PLRow label="Membership" value={f2(cur.memRev)} sub indent={1}/>
          <PLRow label="Retail Products" value={f2(cur.retRev)} sub indent={1}/>
          <PLRow label="Total Revenue" value={f2(cur.totRev)} bold/>

          {/* COGS */}
          <div style={{margin:'12px 0 8px',fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent}}>Cost of Goods Sold</div>
          <PLRow label="Product & Supply Costs" value={`(${f2(cur.totCogs)})`} sub indent={1}/>
          <PLRow label="Gross Profit" value={f2(cur.grossProfit)} bold pos={cur.grossProfit>=0}/>
          <div style={{fontSize:'10px',color:C.muted,marginBottom:'12px',marginTop:'2px'}}>
            Gross Margin: {cur.totRev>0?((cur.grossProfit/cur.totRev)*100).toFixed(1):0}%
          </div>

          {/* OPERATING EXPENSES */}
          <div style={{margin:'12px 0 8px',fontSize:'10px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent}}>Operating Expenses</div>
          {providers.map(p=>{
            const mk=`${p.id}:${month}`;
            const ents=logData[mk]||[];
            const hrs=hoursData[mk]||0;
            const ret=retailData[mk]||{rev:0,cogs:0};
            const c=calcComm(ents,p,catalog,hrs,ret);
            const actual=payroll[`${p.id}:${month}`];
            const pay=(actual!==undefined&&actual!=='')?+actual:c.totalPay;
            return<PLRow key={p.id} label={`${p.name} (payroll)`} value={`(${f2(pay)})`} sub indent={1}/>;
          })}
          {expenses.filter(e=>e.type==='monthly'&&e.month===month).map(e=>(
            <PLRow key={e.id} label={e.description} value={`(${f2(e.amount)})`} sub indent={1}/>
          ))}
          <PLRow label="Total Operating Expenses" value={`(${f2(cur.totalOpEx)})`} bold/>

          {/* NET INCOME */}
          <div style={{margin:'16px 0 6px',padding:'14px 16px',background:cur.netIncome>=0?C.successBg:C.dangerBg,borderRadius:'10px',border:`1px solid ${cur.netIncome>=0?C.success+'44':C.danger+'44'}`}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
              <span style={{fontWeight:700,fontSize:'14px',color:cur.netIncome>=0?C.success:C.danger}}>Net Income</span>
              <span style={{fontWeight:700,fontSize:'22px',fontFamily:serif,color:cur.netIncome>=0?C.success:C.danger}}>{f2(cur.netIncome)}</span>
            </div>
            <div style={{fontSize:'10px',color:cur.netIncome>=0?C.success:C.danger,marginTop:'4px',opacity:0.8}}>
              Net Margin: {cur.totRev>0?((cur.netIncome/cur.totRev)*100).toFixed(1):0}% · {cur.netIncome>=0?'Profitable month ✓':'Operating at a loss'}
            </div>
          </div>

          <div style={{marginTop:'12px',padding:'10px 14px',background:C.warnBg,borderRadius:'8px',fontSize:'10px',color:C.warn}}>
            💡 This P&L uses cash-basis accounting. For accrual-basis or CPA-ready statements, export your data and share with your accountant.
          </div>
        </div>
      )}

      {/* ── GROWTH TRENDS ── */}
      {tab==='growth'&&(
        <>
          {/* MOM CHANGE CARDS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px',marginBottom:'14px'}}>
            {[
              {l:'Revenue',cur:cur.totRev,prev:prev?.totRev,flip:false},
              {l:'Gross Profit',cur:cur.grossProfit,prev:prev?.grossProfit,flip:false},
              {l:'Net Income',cur:cur.netIncome,prev:prev?.netIncome,flip:false},
              {l:'Total Expenses',cur:cur.totalOpEx,prev:prev?.totalOpEx,flip:true},
            ].map((k,i)=>{
              const pct=pctChange(k.prev||0,k.cur);
              return(
                <div key={i} style={cardS({marginBottom:0})}>
                  <div style={lblS()}>{k.l}</div>
                  <div style={{fontSize:'20px',fontWeight:300,fontFamily:serif,color:C.text}}>{f0(k.cur)}</div>
                  <div style={{fontSize:'11px',fontWeight:700,color:arrowColor(pct,k.flip),marginTop:'4px'}}>{arrow(pct)} vs last month</div>
                  <div style={{fontSize:'10px',color:C.muted}}>Last month: {f0(k.prev||0)}</div>
                </div>
              );
            })}
          </div>

          {/* 6-MONTH CHART */}
          <div style={cardS()}>
            <div style={lblS()}>6-Month Revenue & Profit Trend</div>
            <div style={{fontSize:'10px',color:C.muted,marginBottom:'14px'}}>Bar = Total Revenue · Line dot = Net Income (green = profit, red = loss)</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(6,1fr)',gap:'8px',alignItems:'end',marginBottom:'8px'}}>
              {last6.map((m,i)=>{
                const barH=maxRev>0?(m.totRev/maxRev)*80:0;
                const profitable=m.netIncome>=0;
                return(
                  <div key={m.month} style={{textAlign:'center'}}>
                    <div style={{fontSize:'10px',fontWeight:700,color:C.navy,marginBottom:'3px'}}>{m.totRev>0?f0(m.totRev):''}</div>
                    <div style={{height:'100px',background:C.bg,borderRadius:'8px',position:'relative',border:`1px solid ${C.border}`,overflow:'hidden'}}>
                      <div style={{position:'absolute',bottom:0,width:'100%',height:`${barH}%`,background:C.accent,opacity:0.7,borderRadius:'6px 6px 0 0'}}/>
                      {m.totRev>0&&<div style={{position:'absolute',bottom:`${maxRev>0?(Math.max(0,m.netIncome)/maxRev)*80:0}%`,left:'50%',transform:'translateX(-50%)',width:'10px',height:'10px',borderRadius:'50%',background:profitable?C.success:C.danger,border:'2px solid #fff',zIndex:2}}/>}
                    </div>
                    <div style={{fontSize:'10px',color:C.muted,marginTop:'4px',fontWeight:600}}>{m.ml}</div>
                    {m.totRev>0&&<div style={{fontSize:'9px',fontWeight:700,color:profitable?C.success:C.danger}}>{profitable?'+':''}{f0(m.netIncome)}</div>}
                  </div>
                );
              })}
            </div>

            {/* TREND TABLE */}
            <div style={{overflowX:'auto',marginTop:'16px'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'500px'}}>
                <thead><tr>
                  {['Month','Revenue','MoM %','Gross Profit','Net Income','Margin %'].map(h=>(
                    <th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
                  ))}
                </tr></thead>
                <tbody>
                  {last6.map((m,i)=>{
                    const prevM=i>0?last6[i-1]:null;
                    const momPct=prevM?pctChange(prevM.totRev,m.totRev):null;
                    const margin=m.totRev>0?((m.netIncome/m.totRev)*100).toFixed(1):null;
                    return(
                      <tr key={m.month} style={{borderBottom:`1px solid ${C.border}`,background:m.month===month?C.accentBg:'transparent'}}>
                        <td style={{padding:'8px',fontWeight:600}}>{m.ml}{m.month===month&&<span style={{fontSize:'8px',color:C.accent,marginLeft:'6px'}}>current</span>}</td>
                        <td style={{padding:'8px'}}>{m.totRev>0?f0(m.totRev):'—'}</td>
                        <td style={{padding:'8px',fontWeight:700,color:arrowColor(momPct)}}>{arrow(momPct)}</td>
                        <td style={{padding:'8px'}}>{m.totRev>0?f0(m.grossProfit):'—'}</td>
                        <td style={{padding:'8px',fontWeight:700,color:m.netIncome>=0?C.success:C.danger}}>{m.totRev>0?f0(m.netIncome):'—'}</td>
                        <td style={{padding:'8px',color:margin&&+margin>=0?C.success:C.danger}}>{margin?`${margin}%`:'—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── KPIs ── */}

    </div>
  );
}


/* ─── BREAKEVEN & ANNUAL TRACKER ───────────────────────── */
function BreakevenView({expenses,payroll,providers,logData,hoursData,retailData,catalog}){
  const now=new Date();
  const year=now.getFullYear();

  // Build 12 months of data for current year
  const months=Array.from({length:12},(_,i)=>{
    const m=String(i+1).padStart(2,'0');
    return `${year}-${m}`;
  });

  const monthData=months.map(month=>{
    // Revenue & COGs from all providers
    let totRev=0,totCogs=0,totComm=0;
    providers.forEach(p=>{
      const mk=`${p.id}:${month}`;
      const ents=logData[mk]||[];
      const hrs=hoursData[mk]||0;
      const ret=retailData[mk]||{rev:0,cogs:0};
      const c=calcComm(ents,p,catalog,hrs,ret);
      totRev+=c.totRev;
      totCogs+=c.totCogs;
      // Use actual payroll if entered, otherwise use calculated
      const actualPay=payroll[`${p.id}:${month}`];
      totComm+=(actualPay!==undefined&&actualPay!=='')?+actualPay:c.totalPay;
    });
    const monthlyExp=expenses.filter(e=>e.type==='monthly'&&e.month===month).reduce((s,e)=>s+(+e.amount||0),0);
    const netProfit=totRev-totCogs-totComm-monthlyExp;
    const ml=new Date(month+'-02').toLocaleString('default',{month:'short'});
    return{month,ml,totRev,totCogs,totComm,monthlyExp,netProfit};
  });

  const startupTotal=expenses.filter(e=>e.type==='startup').reduce((s,e)=>s+(+e.amount||0),0);

  // Cumulative profit
  let cumulative=0;
  const withCumulative=monthData.map(m=>{
    cumulative+=m.netProfit;
    return{...m,cumulative};
  });

  // Find breakeven month
  const breakevenMonth=withCumulative.find(m=>m.cumulative>=-startupTotal&&m.cumulative>=0);
  const breakevenIdx=withCumulative.findIndex(m=>m.cumulative>=-startupTotal&&m.cumulative>=0);

  // Average monthly profit (months with data only)
  const activeMonths=monthData.filter(m=>m.totRev>0);
  const avgMonthlyProfit=activeMonths.length>0?activeMonths.reduce((s,m)=>s+m.netProfit,0)/activeMonths.length:0;

  // Project breakeven if not yet reached
  const currentCumulative=withCumulative[withCumulative.length-1]?.cumulative||0;
  const remainingToBreakeven=startupTotal+Math.min(0,currentCumulative);
  const monthsToBreakeven=avgMonthlyProfit>0?Math.ceil(remainingToBreakeven/avgMonthlyProfit):null;

  const maxBar=Math.max(...monthData.map(m=>Math.abs(m.totRev)),1);

  return(
    <div>
      {/* SUMMARY CARDS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[
          {l:'Total Start-up Costs',v:f0(startupTotal),s:'One-time investment to recoup',hi:false},
          {l:'Cumulative Profit YTD',v:f0(Math.max(0,currentCumulative)),s:`${year} year-to-date`,hi:currentCumulative>=startupTotal},
          {l:'Avg Monthly Profit',v:f0(avgMonthlyProfit),s:'Active months only',hi:false},
          {l:breakevenMonth?'Breakeven Reached!':'Est. Months to Breakeven',
           v:breakevenMonth?breakevenMonth.ml:(monthsToBreakeven?`~${monthsToBreakeven} mo`:'—'),
           s:breakevenMonth?`Recouped in ${year}`:(monthsToBreakeven?'Based on current avg':'Add data to project'),
           hi:!!breakevenMonth},
        ].map((k,i)=>(
          <div key={i} style={{background:k.hi?C.success:C.card,borderRadius:'12px',padding:'14px 15px',boxShadow:C.shadow,border:`1px solid ${k.hi?'transparent':C.border}`}}>
            <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:k.hi?'rgba(255,255,255,0.7)':C.accent,marginBottom:'3px'}}>{k.l}</div>
            <div style={{fontSize:'21px',fontWeight:300,fontFamily:serif,color:k.hi?'#fff':C.text}}>{k.v}</div>
            <div style={{fontSize:'10px',color:k.hi?'rgba(255,255,255,0.5)':C.muted,marginTop:'2px'}}>{k.s}</div>
          </div>
        ))}
      </div>

      {/* BREAKEVEN PROGRESS BAR */}
      {startupTotal>0&&(
        <div style={cardS({padding:'16px 20px'})}>
          <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'6px'}}>Startup Cost Recovery Progress</div>
          <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>
            Total startup costs: {f0(startupTotal)} · Cumulative profit: {f0(Math.max(0,currentCumulative))} · Remaining: {f0(Math.max(0,startupTotal-Math.max(0,currentCumulative)))}
          </div>
          <div style={{background:C.bg,borderRadius:'999px',height:'14px',overflow:'hidden',marginBottom:'6px'}}>
            <div style={{height:'100%',borderRadius:'999px',transition:'width 0.8s',
              width:`${startupTotal>0?Math.min((Math.max(0,currentCumulative)/startupTotal)*100,100):0}%`,
              background:`linear-gradient(90deg, ${C.accent}, ${C.success})`}}/>
          </div>
          <div style={{fontSize:'11px',fontWeight:700,color:currentCumulative>=startupTotal?C.success:C.navy}}>
            {startupTotal>0?`${Math.min(((Math.max(0,currentCumulative)/startupTotal)*100),100).toFixed(1)}% recovered`:'Add start-up expenses to track recovery'}
          </div>
        </div>
      )}

      {/* MONTHLY CHART */}
      <div style={cardS()}>
        <div style={lblS()}>Monthly Revenue vs Expenses — {year}</div>
        <div style={{fontSize:'10px',color:C.muted,marginBottom:'14px'}}>
          Net Profit = Revenue − COGs − Payroll − Monthly Expenses. Green bar = profitable month. Red = loss.
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(12,1fr)',gap:'4px',alignItems:'end',marginBottom:'8px'}}>
          {monthData.map((m,i)=>{
            const revH=maxBar>0?(m.totRev/maxBar)*100:0;
            const profitable=m.netProfit>=0;
            return(
              <div key={m.month} style={{textAlign:'center'}}>
                <div style={{fontSize:'9px',fontWeight:700,color:C.navy,marginBottom:'2px'}}>{m.totRev>0?`$${Math.round(m.totRev/1000)}k`:''}</div>
                <div style={{height:'80px',background:C.bg,borderRadius:'6px',position:'relative',overflow:'hidden',border:`1px solid ${m.netProfit!==0?( profitable?C.success+'44':C.danger+'44'):C.border}`}}>
                  <div style={{position:'absolute',bottom:0,width:'100%',height:`${revH}%`,
                    background:m.totRev===0?'transparent':(profitable?C.success:C.danger),
                    borderRadius:'4px 4px 0 0',opacity:0.75,transition:'height 0.5s'}}/>
                </div>
                <div style={{fontSize:'8px',color:C.muted,marginTop:'3px',fontWeight:600}}>{m.ml}</div>
                {m.netProfit!==0&&<div style={{fontSize:'7px',color:m.netProfit>0?C.success:C.danger,fontWeight:700}}>{m.netProfit>0?'+':''}{Math.round(m.netProfit/1000)}k</div>}
              </div>
            );
          })}
        </div>
        <div style={{display:'flex',gap:'16px',flexWrap:'wrap',marginTop:'8px'}}>
          <span style={{fontSize:'10px',color:C.success}}>■ Profitable month</span>
          <span style={{fontSize:'10px',color:C.danger}}>■ Loss month</span>
          <span style={{fontSize:'10px',color:C.muted}}>Bar height = revenue · Number below = net profit</span>
        </div>
      </div>

      {/* ANNUAL TABLE */}
      <div style={cardS()}>
        <div style={lblS()}>Annual Breakdown — {year}</div>
        <div style={{fontSize:'10px',color:C.muted,marginBottom:'12px'}}>
          Month-by-month profit/loss. Cumulative column shows your running total toward recovering startup costs.
        </div>
        <div style={{overflowX:'auto'}}>
          <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'700px'}}>
            <thead><tr>
              {['Month','Revenue','COGs','Payroll','Mo. Expenses','Net Profit','Cumulative','Status'].map(h=>(
                <th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {withCumulative.map((m,i)=>{
                const profitable=m.netProfit>=0;
                const isBreakeven=i===breakevenIdx;
                return(
                  <tr key={m.month} style={{borderBottom:`1px solid ${C.border}`,background:isBreakeven?C.successBg:'transparent'}}>
                    <td style={{padding:'8px',fontWeight:600,color:C.navy}}>{m.ml}</td>
                    <td style={{padding:'8px'}}>{m.totRev>0?f0(m.totRev):'—'}</td>
                    <td style={{padding:'8px',color:C.muted}}>{m.totCogs>0?f0(m.totCogs):'—'}</td>
                    <td style={{padding:'8px',color:C.muted}}>{m.totComm>0?f0(m.totComm):'—'}</td>
                    <td style={{padding:'8px',color:C.muted}}>{m.monthlyExp>0?f0(m.monthlyExp):'—'}</td>
                    <td style={{padding:'8px',fontWeight:700,color:m.totRev===0?C.muted:(profitable?C.success:C.danger)}}>{m.totRev===0?'—':(profitable?'+':'')+f0(m.netProfit)}</td>
                    <td style={{padding:'8px',fontWeight:700,color:m.cumulative>=0?C.success:C.navy}}>{m.totRev===0&&i>=(now.getMonth())&&!m.cumulative?'—':f0(m.cumulative)}</td>
                    <td style={{padding:'8px'}}>
                      {isBreakeven?<span style={{background:C.success,color:'#fff',fontSize:'9px',fontWeight:700,padding:'2px 8px',borderRadius:'999px'}}>🎉 BREAKEVEN</span>
                      :m.totRev===0?<span style={{fontSize:'9px',color:C.muted}}>No data</span>
                      :profitable?<span style={{fontSize:'9px',color:C.success,fontWeight:700}}>✓ Profit</span>
                      :<span style={{fontSize:'9px',color:C.danger,fontWeight:700}}>↓ Loss</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{background:C.bg,borderTop:`2px solid ${C.accent}55`}}>
                <td style={{padding:'8px',fontWeight:700,fontSize:'10px',color:C.navy}}>TOTALS</td>
                <td style={{padding:'8px',fontWeight:700}}>{f0(monthData.reduce((s,m)=>s+m.totRev,0))}</td>
                <td style={{padding:'8px',fontWeight:700,color:C.muted}}>{f0(monthData.reduce((s,m)=>s+m.totCogs,0))}</td>
                <td style={{padding:'8px',fontWeight:700,color:C.muted}}>{f0(monthData.reduce((s,m)=>s+m.totComm,0))}</td>
                <td style={{padding:'8px',fontWeight:700,color:C.muted}}>{f0(monthData.reduce((s,m)=>s+m.monthlyExp,0))}</td>
                <td style={{padding:'8px',fontWeight:700,color:monthData.reduce((s,m)=>s+m.netProfit,0)>=0?C.success:C.danger}}>{f0(monthData.reduce((s,m)=>s+m.netProfit,0))}</td>
                <td colSpan={2}/>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}




/* ── CLIENT AUTOCOMPLETE INPUT ── */
function ClientAutocomplete({ value, onChange, clients }) {
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

            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── CLIENT DATABASE VIEW ── */
function ClientDatabaseView({ clients, setClients }) {
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



const STATUS_COLORS={
  'Not Started':'#888',
  'In Progress':C.accent,
  'Assistance Needed':C.danger,
  'Approval Needed':'#7a4fa3',
  'Complete':C.success,
};

function CalendarView({ projects, month, setMonth, providers }) {
  const [yr, mo] = month.split('-').map(Number);
  const [selectedDay, setSelectedDay] = useState(null);

  const firstDay = new Date(yr, mo - 1, 1).getDay();
  const daysInMonth = new Date(yr, mo, 0).getDate();
  const ml = new Date(month + '-02').toLocaleString('default', { month: 'long', year: 'numeric' });

  // Gather all events: tasks with due dates + project due dates
  const events = {};
  const addEvent = (day, event) => {
    if (!events[day]) events[day] = [];
    events[day].push(event);
  };

  projects.forEach(proj => {
    // Project due date
    if (proj.dueDate) {
      const [py, pm, pd] = proj.dueDate.split('-').map(Number);
      if (py === yr && pm === mo) {
        addEvent(pd, { type: 'project', title: proj.title, status: proj.status, color: C.navy });
      }
    }
    // Task due dates
    (proj.tasks || []).forEach(task => {
      if (task.dueDate) {
        const [ty, tm, td] = task.dueDate.split('-').map(Number);
        if (ty === yr && tm === mo) {
          const assigneeName = providers.find(p => p.id === task.assignedTo)?.name || task.assignedTo || 'Unassigned';
          addEvent(td, { type: 'task', title: task.title, project: proj.title, status: task.status, assignee: assigneeName, color: STATUS_COLORS[task.status] || C.muted });
        }
      }
    });
  });

  const selectedEvents = selectedDay ? (events[selectedDay] || []) : [];
  const today = new Date().toISOString().split('T')[0];
  const todayDay = today.startsWith(month) ? parseInt(today.split('-')[2]) : null;

  function prevMonth() {
    const d = new Date(yr, mo - 2, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }
  function nextMonth() {
    const d = new Date(yr, mo, 1);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div style={cardS()}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <button onClick={prevMonth} style={{ ...Btn('secondary'), padding: '6px 14px' }}>‹</button>
          <div style={{ fontFamily: serif, fontSize: '22px', fontWeight: 300, color: C.navy }}>{ml}</div>
          <button onClick={nextMonth} style={{ ...Btn('secondary'), padding: '6px 14px' }}>›</button>
        </div>

        {/* DAY LABELS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '2px', marginBottom: '4px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} style={{ textAlign: 'center', fontSize: '9px', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '4px 0' }}>{d}</div>
          ))}
        </div>

        {/* CALENDAR GRID */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: '3px' }}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} style={{ minHeight: '70px' }} />;
            const dayEvents = events[day] || [];
            const isToday = day === todayDay;
            const isSelected = day === selectedDay;
            return (
              <div key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                style={{ minHeight: '70px', background: isSelected ? C.accentBg : isToday ? C.navy + '0d' : C.bg, borderRadius: '8px', padding: '6px', cursor: dayEvents.length > 0 ? 'pointer' : 'default', border: `1px solid ${isSelected ? C.accent : isToday ? C.accent + '55' : C.border}`, transition: 'all 0.15s' }}>
                <div style={{ fontSize: '11px', fontWeight: isToday ? 700 : 500, color: isToday ? C.accent : C.text, marginBottom: '4px' }}>{day}</div>
                {dayEvents.slice(0, 2).map((ev, j) => (
                  <div key={j} style={{ fontSize: '8px', fontWeight: 600, color: ev.color, background: ev.color + '18', borderRadius: '3px', padding: '1px 4px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.type === 'project' ? '📁' : '✓'} {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && <div style={{ fontSize: '8px', color: C.muted }}>+{dayEvents.length - 2} more</div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* SELECTED DAY PANEL */}
      {selectedDay && (
        <div style={cardS()}>
          <div style={lblS()}>{ml} {selectedDay} — {selectedEvents.length} item{selectedEvents.length !== 1 ? 's' : ''}</div>
          {selectedEvents.length === 0
            ? <div style={{ color: C.muted, fontSize: '12px' }}>Nothing scheduled.</div>
            : selectedEvents.map((ev, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', padding: '10px 12px', borderRadius: '8px', marginBottom: '6px', background: C.bg, border: `1px solid ${C.border}`, borderLeft: `4px solid ${ev.color}` }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '12px', color: C.navy }}>{ev.title}</div>
                  {ev.type === 'task' && <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>📁 {ev.project} · 👤 {ev.assignee}</div>}
                  {ev.type === 'project' && <div style={{ fontSize: '10px', color: C.muted, marginTop: '2px' }}>Project deadline</div>}
                </div>
                <span style={{ fontSize: '9px', fontWeight: 700, padding: '2px 8px', borderRadius: '999px', background: ev.color + '22', color: ev.color, alignSelf: 'flex-start', whiteSpace: 'nowrap' }}>{ev.status}</span>
              </div>
            ))
          }
        </div>
      )}

      {/* LEGEND */}
      <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', padding: '4px 0' }}>
        {Object.entries(STATUS_COLORS).map(([s, col]) => (
          <div key={s} style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: col }} />
            <span style={{ fontSize: '10px', color: C.muted }}>{s}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: C.navy }} />
          <span style={{ fontSize: '10px', color: C.muted }}>Project deadline</span>
        </div>
      </div>
    </div>
  );
}


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


// These constants and helpers are passed in or defined locally

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
export function ProjectsView({projects,setProjects,providers,vaUsers,setVaUsers,creds,setCreds,emailConfig}){
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
                            <div><label style={lblS()}>Repeat</label><select value={taskForm.repeat||'none'} onChange={e=>setTaskForm(p=>({...p,repeat:e.target.value}))} style={{...sel(),padding:'5px 8px',fontSize:'11px'}}>{'none,weekly,monthly'.split(',').map(o=><option key={o} value={o}>{o.charAt(0).toUpperCase()+o.slice(1)}</option>)}</select></div>
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
export function TasksView({projects,setProjects,provId,provName,month,importantDetails,setImportantDetails,emailConfig,providerName}){
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
          <select value={task.status} onChange={e=>{
              const newStatus=e.target.value;
              updateTask(task.projectId,task.id,{status:newStatus});
              if(newStatus==='Assistance Needed'||newStatus==='Approval Needed'){
                sendTaskAlert({emailConfig,taskTitle:task.title,projectTitle:task.projectTitle,status:newStatus,providerName:providerName||'Staff'});
              }
            }} style={{...sel(),padding:'4px 8px',fontSize:'11px',width:'160px'}}>{STATUS_OPTS.map(o=><option key={o}>{o}</option>)}</select>
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


/* ── VA DAILY TIMESHEET ── */
function VATimesheet({va,vaId,vaUsers,setVaUsers,month,ml,emailConfig}){
  const[yr,mo]=month.split('-').map(Number);
  const daysInMonth=new Date(yr,mo,0).getDate();
  const[showLog,setShowLog]=useState(false);
  const[submitting,setSubmitting]=useState(false);
  const[submitted,setSubmitted]=useState(false);

  // Get timesheet for this month
  const timesheet=va?.timesheet?.[month]||{};

  function setHours(day,val){
    setVaUsers(prev=>prev.map(v=>v.id===vaId?{...v,timesheet:{...(v.timesheet||{}),[month]:{...(v.timesheet?.[month]||{}),[day]:val===''?undefined:+val}}}:v));
  }

  // Build weeks
  const weeks=[];
  let week=[];
  for(let d=1;d<=daysInMonth;d++){
    const date=new Date(yr,mo-1,d);
    week.push({day:d,dow:date.toLocaleDateString('en-US',{weekday:'short'}),hours:timesheet[d]||0});
    if(date.getDay()===6||d===daysInMonth){weeks.push([...week]);week=[];}
  }

  const totalHours=Object.values(timesheet).reduce((s,h)=>s+(+h||0),0);
  const weekTotals=weeks.map(w=>w.reduce((s,d)=>s+(+d.hours||0),0));

  async function submitForApproval(){
    setSubmitting(true);
    const details=weeks.map((w,i)=>'Week '+(i+1)+': '+weekTotals[i]+' hrs\n'+w.filter(d=>d.hours>0).map(d=>'  '+d.dow+' '+mo+'/'+d.day+': '+d.hours+' hrs').join('\n')).join('\n\n');
    const sent=await sendHoursApproval({emailConfig,vaName:va.name,weekLabel:ml,hours:totalHours,details});
    setSubmitting(false);
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false),4000);
  }

  return(
    <div style={{...cardS(),border:`2px solid ${C.accent}33`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px',flexWrap:'wrap',gap:'8px'}}>
        <div>
          <div style={{fontWeight:700,fontSize:'13px',color:C.navy}}>⏱ Daily Timesheet — {ml}</div>
          <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>Log hours each day. Submit weekly for admin approval.</div>
        </div>
        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent}}>Total Hours</div>
            <div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy,lineHeight:1}}>{totalHours}</div>
          </div>
          <button onClick={()=>setShowLog(!showLog)} style={{...Btn('secondary',{padding:'7px 14px',fontSize:'11px'})}}>
            {showLog?'▲ Hide':'▼ Log Hours'}
          </button>
        </div>
      </div>

      {showLog&&(
        <div>
          {weeks.map((week,wi)=>(
            <div key={wi} style={{marginBottom:'14px'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'8px'}}>
                <span style={{fontSize:'10px',fontWeight:700,color:C.navy,background:C.accentBg,padding:'2px 10px',borderRadius:'999px'}}>Week {wi+1}</span>
                <span style={{fontSize:'10px',color:C.muted,fontWeight:700}}>Total: <strong style={{color:C.navy}}>{weekTotals[wi]} hrs</strong></span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(70px,1fr))',gap:'6px'}}>
                {week.map(({day,dow,hours})=>(
                  <div key={day} style={{background:hours>0?C.accentBg:C.bg,borderRadius:'8px',padding:'8px',border:`1px solid ${hours>0?C.accent+'44':C.border}`,textAlign:'center'}}>
                    <div style={{fontSize:'9px',fontWeight:700,color:C.muted,marginBottom:'2px'}}>{dow}</div>
                    <div style={{fontSize:'10px',color:C.muted,marginBottom:'5px'}}>{mo}/{day}</div>
                    <input type="number" value={hours||''} min="0" max="24" step="0.5" placeholder="0"
                      onChange={e=>setHours(day,e.target.value)}
                      style={{width:'100%',textAlign:'center',background:'#fff',border:`1px solid ${C.border}`,borderRadius:'5px',padding:'4px 2px',fontFamily:sans,fontSize:'12px',fontWeight:700,color:C.navy,outline:'none'}}/>
                    <div style={{fontSize:'8px',color:C.muted,marginTop:'2px'}}>hrs</div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'12px',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:'10px'}}>
            <div style={{fontSize:'10px',color:C.muted}}>Click "Submit for Approval" to email your hours to admin for review.</div>
            <button onClick={submitForApproval} disabled={submitting||totalHours===0}
              style={{...Btn('primary',{padding:'9px 20px'}),opacity:totalHours===0?0.5:1}}>
              {submitting?'Sending…':submitted?'✓ Sent!':'📧 Submit for Approval'}
            </button>
          </div>
        </div>
      )}

      {!showLog&&totalHours>0&&(
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
          {weekTotals.map((wt,i)=>wt>0&&(
            <div key={i} style={{background:C.bg,borderRadius:'7px',padding:'6px 12px',border:`1px solid ${C.border}`}}>
              <span style={{fontSize:'10px',color:C.muted}}>Wk {i+1}: </span>
              <span style={{fontSize:'11px',fontWeight:700,color:C.navy}}>{wt} hrs</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── VA VIEW ── */
export function VAView({projects,setProjects,auth,vaUsers,setVaUsers,month,importantDetails,setImportantDetails,emailConfig}){
  const va=vaUsers.find(v=>v.id===auth?.vaId)||{name:auth?.vaName,hourlyRate:0,hoursLogged:{}};
  const now=new Date();
  const curMonth=month||`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const [yr,mo]=curMonth.split('-').map(Number);
  const ml=new Date(curMonth+'-02').toLocaleString('default',{month:'long',year:'numeric'});

  const myTasks=projects.flatMap(p=>
    (p.tasks||[]).filter(t=>t.assignedTo===auth?.vaId)
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
      <ImportantDetailsBlock personId={auth?.vaId} personName={va.name} importantDetails={importantDetails||{}} setImportantDetails={setImportantDetails||(()=>{})}/>

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

      {/* VA DAILY TIMESHEET */}
      <VATimesheet va={va} vaId={auth?.vaId} vaUsers={vaUsers} setVaUsers={setVaUsers} month={curMonth} ml={ml} emailConfig={emailConfig}/>

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





/* ─── VA FORM INLINE (used in Providers tab) ────────────── */
function VAFormInline({vaUsers,setVaUsers,creds,setCreds}){
  const[f,setF]=useState({id:uid(),name:'',role:'Virtual Assistant',hourlyRate:0,username:'',password:'VA2025'});
  function save(){
    if(!f.name||!f.username)return;
    setVaUsers(p=>[...p,f]);
    setCreds(c=>({...c,_showVAForm:false,vas:{...(c.vas||{}),[f.id]:{id:f.id,name:f.name,username:f.username,password:f.password}}}));
  }
  return(
    <div style={{background:C.bg,borderRadius:'10px',padding:'14px',marginBottom:'12px',border:`1px solid ${C.border}`}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'10px'}}>
        <div><label style={lblS()}>Full Name *</label><input value={f.name} onChange={e=>setF(p=>({...p,name:e.target.value}))} placeholder="VA name" style={inp()}/></div>
        <div><label style={lblS()}>Role</label><input value={f.role} onChange={e=>setF(p=>({...p,role:e.target.value}))} placeholder="Virtual Assistant" style={inp()}/></div>
        <div><label style={lblS()}>Hourly Rate ($)</label><input type="number" value={f.hourlyRate} onChange={e=>setF(p=>({...p,hourlyRate:+e.target.value}))} style={inp()}/></div>
        <div><label style={lblS()}>Username *</label><input value={f.username} onChange={e=>setF(p=>({...p,username:e.target.value}))} style={inp()}/></div>
        <div><label style={lblS()}>Password</label><input value={f.password} onChange={e=>setF(p=>({...p,password:e.target.value}))} style={inp()}/></div>
      </div>
      <button style={Btn('primary')} onClick={save}>✓ Add VA</button>
    </div>
  );
}

/* ─── PROVIDER DAILY/WEEKLY TASK VIEW ───────────────────── */
function ProviderTaskView({projects,setProjects,provId,provName,month}){
  const[viewMode,setViewMode]=useState('day');
  const now=new Date();
  const today=now.toISOString().split('T')[0];
  const[yr,mo]=month.split('-').map(Number);

  const dayOfWeekP=now.getDay();
  const allMyTasks=projects.flatMap(p=>
    (p.tasks||[]).filter(t=>{
      const isAssigned=t.assignedTo===provId||p.assignedTo?.includes(provId);
      if(!isAssigned)return false;
      if(t.status==='Complete'&&(!t.repeat||t.repeat==='none'))return false;
      if(!t.repeat||t.repeat==='none')return true;
      if(t.repeat==='daily')return true;
      if(t.repeat==='weekly'){
        if(!t.dueDate)return dayOfWeekP===1;
        return dayOfWeekP===new Date(t.dueDate+'T12:00:00').getDay();
      }
      if(t.repeat==='monthly'){
        if(!t.dueDate)return now.getDate()===1;
        return now.getDate()===parseInt(t.dueDate.split('-')[2]);
      }
      return true;
    })
    .map(t=>({...t,projectId:p.id,projectTitle:p.title}))
  );

  // Daily: tasks due today or no due date
  const dailyTasks=allMyTasks.filter(t=>!t.dueDate||t.dueDate===today);

  // Weekly: group by day of week (Mon-Sun this week)
  const weekStart=new Date(now);
  weekStart.setDate(now.getDate()-now.getDay()+1);
  const weekDays=Array.from({length:7},(_,i)=>{
    const d=new Date(weekStart);d.setDate(weekStart.getDate()+i);
    return{date:d.toISOString().split('T')[0],label:d.toLocaleDateString('en-US',{weekday:'short',month:'numeric',day:'numeric'})};
  });

  function updateTask(projId,taskId,updates){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:(x.tasks||[]).map(t=>t.id===taskId?{...t,...updates}:t)}:x));
  }

  const TaskPill=({task})=>(
    <div style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 10px',borderRadius:'8px',marginBottom:'5px',
      background:task.status==='Assistance Needed'?C.dangerBg:task.status==='Approval Needed'?'#f0eaf8':C.bg,
      border:`1px solid ${task.status==='Assistance Needed'?C.danger+'44':task.status==='Approval Needed'?'#7a4fa355':C.border}`}}>
      <input type="checkbox" onChange={()=>updateTask(task.projectId,task.id,{status:'Complete'})} style={{flexShrink:0}}/>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:'12px',fontWeight:600,color:C.text,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{task.title}</div>
        <div style={{fontSize:'9px',color:C.muted}}>📁 {task.projectTitle}</div>
        {task.notes&&<div style={{fontSize:'9px',color:C.accent,marginTop:'1px'}}>📋 {task.notes}</div>}
      </div>
      <select value={task.status} onChange={e=>updateTask(task.projectId,task.id,{status:e.target.value})}
        style={{...sel(),padding:'3px 6px',fontSize:'9px',width:'120px',flexShrink:0}}>
        {['Not Started','In Progress','Assistance Needed','Approval Needed','Complete'].map(o=><option key={o}>{o}</option>)}
      </select>
    </div>
  );

  return(
    <div style={cardS()}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'8px'}}>
        <div style={lblS()}>My Tasks</div>
        <div style={{display:'flex',gap:'4px',background:C.bg,borderRadius:'8px',padding:'3px'}}>
          {[['day','📅 Today'],['week','📆 This Week']].map(([m,l])=>(
            <button key={m} onClick={()=>setViewMode(m)} style={{padding:'5px 14px',borderRadius:'6px',border:'none',cursor:'pointer',background:viewMode===m?C.navy:'transparent',color:viewMode===m?'#fff':C.muted,fontFamily:sans,fontSize:'11px',fontWeight:600}}>{l}</button>
          ))}
        </div>
      </div>

      {viewMode==='day'&&(
        <>
          <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>{now.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})} · {dailyTasks.length} task{dailyTasks.length!==1?'s':''}</div>
          {dailyTasks.length===0
            ?<div style={{color:C.success,fontSize:'12px',fontWeight:600,padding:'12px 0'}}>✓ No tasks due today!</div>
            :dailyTasks.map(t=><TaskPill key={t.id} task={t}/>)
          }
        </>
      )}

      {viewMode==='week'&&(
        <div>
          {weekDays.map(({date,label})=>{
            const dayTasks=allMyTasks.filter(t=>t.dueDate===date||(date===today&&!t.dueDate));
            return(
              <div key={date} style={{marginBottom:'12px'}}>
                <div style={{display:'flex',alignItems:'center',gap:'8px',marginBottom:'5px'}}>
                  <span style={{fontSize:'10px',fontWeight:700,color:date===today?C.accent:C.navy,background:date===today?C.accentBg:C.bg,padding:'2px 10px',borderRadius:'999px',border:`1px solid ${date===today?C.accent:C.border}`}}>{label}{date===today?' · Today':''}</span>
                  <span style={{fontSize:'9px',color:C.muted}}>{dayTasks.length} task{dayTasks.length!==1?'s':''}</span>
                </div>
                {dayTasks.length===0
                  ?<div style={{fontSize:'10px',color:C.muted,padding:'4px 8px'}}>No tasks</div>
                  :dayTasks.map(t=><TaskPill key={t.id} task={t}/>)
                }
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── KPI VIEW ──────────────────────────────────────────── */
function KPIView({providers,kpiData,setKpiData,month}){
  const[selProv,setSelProv]=useState(providers[0]?.id||'');
  const[showForm,setShowForm]=useState(false);
  const[noteInput,setNoteInput]=useState('');
  const[notingKpi,setNotingKpi]=useState(null);
  const blankKPI=()=>({id:uid(),metric:'',value:'',unit:'',date:month,notes:[],createdAt:new Date().toISOString()});
  const[form,setForm]=useState(blankKPI());

  const prov=providers.find(p=>p.id===selProv)||providers[0];
  const provKPIs=(kpiData[selProv]||[]);

  const METRICS=['Revenue','Services Completed','New Clients','Returning Clients','Avg Ticket Size','Units Sold','Memberships Sold','Client Satisfaction','Retail Sales','Injectable Revenue','Facial Revenue'];

  function saveKPI(){
    if(!form.metric||!form.value)return;
    const k2={...form,id:uid(),createdAt:new Date().toISOString()};
    setKpiData(p=>({...p,[selProv]:[...(p[selProv]||[]),k2]}));
    setForm(blankKPI());setShowForm(false);
  }
  function delKPI(id){setKpiData(p=>({...p,[selProv]:(p[selProv]||[]).filter(k=>k.id!==id)}));}
  function addNote(kpiId,text,author='Admin'){
    if(!text.trim())return;
    const note={id:uid(),text,author,ts:new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})};
    setKpiData(p=>({...p,[selProv]:(p[selProv]||[]).map(k=>k.id===kpiId?{...k,notes:[...(k.notes||[]),note]}:k)}));
    setNoteInput('');setNotingKpi(null);
  }

  const ml=new Date(month+'-02').toLocaleString('default',{month:'long',year:'numeric'});

  return(
    <div>
      {/* PROVIDER TABS */}
      <div style={{display:'flex',gap:'7px',marginBottom:'14px',flexWrap:'wrap'}}>
        {providers.map(p=>(
          <button key={p.id} onClick={()=>setSelProv(p.id)}
            style={{padding:'7px 18px',borderRadius:'20px',border:`2px solid ${selProv===p.id?p.color:C.border}`,background:selProv===p.id?p.color:C.card,color:selProv===p.id?'#fff':C.muted,cursor:'pointer',fontFamily:sans,fontSize:'12px',fontWeight:600,transition:'all 0.15s'}}>
            {p.name}
          </button>
        ))}
      </div>

      <div style={cardS()}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px',flexWrap:'wrap',gap:'10px'}}>
          <div>
            <div style={lblS()}>KPI Tracker — {prov?.name} · {ml}</div>
            <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>Log key performance indicators for each provider. Both admin and provider can add notes with timestamps.</div>
          </div>
          <button style={Btn('primary')} onClick={()=>setShowForm(!showForm)}>{showForm?'✕ Cancel':'+ Add KPI'}</button>
        </div>

        {/* ADD FORM */}
        {showForm&&(
          <div style={{background:C.bg,borderRadius:'10px',padding:'14px',marginBottom:'14px',border:`1px solid ${C.border}`}}>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'10px'}}>
              <div>
                <label style={lblS()}>Metric *</label>
                <select value={form.metric} onChange={e=>setForm(p=>({...p,metric:e.target.value}))} style={sel()}>
                  <option value="">Select metric…</option>
                  {METRICS.map(m=><option key={m}>{m}</option>)}
                  <option value="__custom__">Custom…</option>
                </select>
                {form.metric==='__custom__'&&<input value={form.customMetric||''} onChange={e=>setForm(p=>({...p,customMetric:e.target.value,metric:e.target.value}))} placeholder="Custom metric name" style={{...inp(),marginTop:'6px'}}/>}
              </div>
              <div><label style={lblS()}>Value *</label><input value={form.value} onChange={e=>setForm(p=>({...p,value:e.target.value}))} placeholder="e.g. 12,500" style={inp()}/></div>
              <div><label style={lblS()}>Unit</label><input value={form.unit} onChange={e=>setForm(p=>({...p,unit:e.target.value}))} placeholder="$, %, clients, units…" style={inp()}/></div>
              <div><label style={lblS()}>Period</label><input type="month" value={form.date} onChange={e=>setForm(p=>({...p,date:e.target.value}))} style={inp()}/></div>
            </div>
            <button style={Btn('primary')} onClick={saveKPI}>✓ Save KPI</button>
          </div>
        )}

        {/* KPI LIST */}
        {provKPIs.length===0
          ?<div style={{textAlign:'center',padding:'32px',color:C.muted,fontSize:'13px'}}>No KPIs logged for {prov?.name} yet.</div>
          :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:'12px'}}>
            {provKPIs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(kpi=>(
              <div key={kpi.id} style={{background:C.bg,borderRadius:'10px',padding:'14px',border:`1px solid ${C.border}`,borderLeft:`4px solid ${prov?.color||C.accent}`}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'6px'}}>
                  <div>
                    <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent}}>{kpi.metric}</div>
                    <div style={{fontSize:'26px',fontWeight:300,fontFamily:serif,color:C.navy,lineHeight:1.1}}>{kpi.value}<span style={{fontSize:'13px',color:C.muted,marginLeft:'4px'}}>{kpi.unit}</span></div>
                    <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>{new Date(kpi.date+'-02').toLocaleString('default',{month:'long',year:'numeric'})}</div>
                  </div>
                  <button onClick={()=>delKPI(kpi.id)} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'14px'}}>✕</button>
                </div>

                {/* NOTES THREAD */}
                {(kpi.notes||[]).length>0&&(
                  <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'8px',marginTop:'8px'}}>
                    {kpi.notes.map(n=>(
                      <div key={n.id} style={{padding:'5px 8px',borderRadius:'6px',marginBottom:'4px',background:n.author==='Admin'?C.accentBg:'#fff',borderLeft:`2px solid ${n.author==='Admin'?C.accent:C.success}`}}>
                        <div style={{fontSize:'10px',color:C.text}}>{n.text}</div>
                        <div style={{fontSize:'9px',color:C.muted,marginTop:'2px'}}>{n.author} · {n.ts}</div>
                      </div>
                    ))}
                  </div>
                )}

                {/* ADD NOTE */}
                {notingKpi===kpi.id?(
                  <div style={{marginTop:'8px',display:'flex',gap:'6px'}}>
                    <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} placeholder="Add a note…"
                      onKeyDown={e=>e.key==='Enter'&&addNote(kpi.id,noteInput)}
                      style={{...inp({flex:1,padding:'5px 8px',fontSize:'11px',background:'#fff'})}}/>
                    <button onClick={()=>addNote(kpi.id,noteInput)} style={Btn('primary',{padding:'5px 12px',fontSize:'10px'})}>Add</button>
                    <button onClick={()=>setNotingKpi(null)} style={Btn('secondary',{padding:'5px 8px',fontSize:'10px'})}>✕</button>
                  </div>
                ):(
                  <button onClick={()=>{setNotingKpi(kpi.id);setNoteInput('');}} style={Btn('secondary',{padding:'4px 10px',fontSize:'10px',marginTop:'8px'})}>+ Note</button>
                )}
              </div>
            ))}
          </div>
        }
      </div>
    </div>
  );
}

/* ─── PROVIDER KPI VIEW (staff side) ────────────────────── */
function ProviderKPIView({provId,provName,kpiData,setKpiData}){
  const[noteInput,setNoteInput]=useState('');
  const[notingKpi,setNotingKpi]=useState(null);
  const provKPIs=(kpiData[provId]||[]);

  function addNote(kpiId,text){
    if(!text.trim())return;
    const note={id:uid(),text,author:provName,ts:new Date().toLocaleString('en-US',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})};
    setKpiData(p=>({...p,[provId]:(p[provId]||[]).map(k=>k.id===kpiId?{...k,notes:[...(k.notes||[]),note]}:k)}));
    setNoteInput('');setNotingKpi(null);
  }

  return(
    <div style={cardS()}>
      <div style={lblS()}>My KPIs</div>
      <div style={{fontSize:'10px',color:C.muted,marginBottom:'14px'}}>Key performance indicators added by your manager. You can add notes to any KPI.</div>
      {provKPIs.length===0
        ?<div style={{textAlign:'center',padding:'24px',color:C.muted,fontSize:'13px'}}>No KPIs logged yet.</div>
        :<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'12px'}}>
          {provKPIs.sort((a,b)=>new Date(b.createdAt)-new Date(a.createdAt)).map(kpi=>(
            <div key={kpi.id} style={{background:C.bg,borderRadius:'10px',padding:'14px',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'2px'}}>{kpi.metric}</div>
              <div style={{fontSize:'26px',fontWeight:300,fontFamily:serif,color:C.navy,lineHeight:1.1}}>{kpi.value}<span style={{fontSize:'13px',color:C.muted,marginLeft:'4px'}}>{kpi.unit}</span></div>
              <div style={{fontSize:'10px',color:C.muted,marginTop:'2px',marginBottom:'8px'}}>{new Date(kpi.date+'-02').toLocaleString('default',{month:'long',year:'numeric'})}</div>
              {(kpi.notes||[]).length>0&&(
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'8px',marginBottom:'8px'}}>
                  {kpi.notes.map(n=>(
                    <div key={n.id} style={{padding:'5px 8px',borderRadius:'6px',marginBottom:'4px',background:n.author==='Admin'?C.accentBg:'#fff',borderLeft:`2px solid ${n.author==='Admin'?C.accent:C.success}`}}>
                      <div style={{fontSize:'10px',color:C.text}}>{n.text}</div>
                      <div style={{fontSize:'9px',color:C.muted,marginTop:'2px'}}>{n.author} · {n.ts}</div>
                    </div>
                  ))}
                </div>
              )}
              {notingKpi===kpi.id?(
                <div style={{display:'flex',gap:'6px'}}>
                  <input value={noteInput} onChange={e=>setNoteInput(e.target.value)} placeholder="Add your note…"
                    onKeyDown={e=>e.key==='Enter'&&addNote(kpi.id,noteInput)}
                    style={{...inp({flex:1,padding:'5px 8px',fontSize:'11px',background:'#fff'})}}/>
                  <button onClick={()=>addNote(kpi.id,noteInput)} style={Btn('primary',{padding:'5px 10px',fontSize:'10px'})}>Add</button>
                  <button onClick={()=>setNotingKpi(null)} style={Btn('secondary',{padding:'5px 8px',fontSize:'10px'})}>✕</button>
                </div>
              ):(
                <button onClick={()=>{setNotingKpi(kpi.id);setNoteInput('');}} style={Btn('secondary',{padding:'4px 10px',fontSize:'10px'})}>+ Add Note</button>
              )}
            </div>
          ))}
        </div>
      }
    </div>
  );
}


/* ─── STAFF PROJECTS VIEW ───────────────────────────────── */
function StaffProjectsView({projects,setProjects,provId,provName}){
  const[expandId,setExpandId]=useState(null);
  const[filter,setFilter]=useState('All');

  // Projects assigned to this provider OR with tasks assigned to them
  const myProjects=projects.filter(p=>
    p.assignedTo?.includes(provId)||
    (p.tasks||[]).some(t=>t.assignedTo===provId)
  );

  const filtered=filter==='All'?myProjects:myProjects.filter(p=>p.status===filter);

  function updateTask(projId,taskId,updates){
    setProjects(prev=>prev.map(x=>x.id===projId?{...x,tasks:(x.tasks||[]).map(t=>t.id===taskId?{...t,...updates}:t)}:x));
  }

  const completePct=p=>{
    if(!p.tasks||p.tasks.length===0)return 0;
    return Math.round((p.tasks.filter(t=>t.status==='Complete').length/p.tasks.length)*100);
  };

  const stats={
    total:myProjects.length,
    active:myProjects.filter(p=>p.status==='In Progress').length,
    review:myProjects.filter(p=>p.status==='Review'||p.status==='Approval Needed').length,
    done:myProjects.filter(p=>p.status==='Complete').length,
  };

  return(
    <div>
      {/* STATS */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:'10px',marginBottom:'14px'}}>
        {[['My Projects',stats.total,''],['In Progress',stats.active,C.accent],['Needs Review',stats.review,C.warn],['Complete',stats.done,C.success]].map(([l,v,col])=>(
          <div key={l} style={cardS({marginBottom:0})}>
            <div style={lblS()}>{l}</div>
            <div style={{fontSize:'26px',fontWeight:300,fontFamily:serif,color:col||C.text}}>{v}</div>
          </div>
        ))}
      </div>

      {/* FILTER */}
      <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'14px'}}>
        {['All',...STATUS_OPTS].map(f=>(
          <button key={f} onClick={()=>setFilter(f)}
            style={{padding:'5px 12px',borderRadius:'20px',border:`1px solid ${filter===f?C.navy:C.border}`,background:filter===f?C.navy:C.card,color:filter===f?'#fff':C.muted,cursor:'pointer',fontFamily:sans,fontSize:'11px',fontWeight:600}}>
            {f}
          </button>
        ))}
      </div>

      {/* PROJECT CARDS */}
      {filtered.length===0
        ?<div style={cardS({textAlign:'center',padding:'40px',color:C.muted})}>No projects assigned to you yet.</div>
        :filtered.map(proj=>{
          const expanded=expandId===proj.id;
          const pct=completePct(proj);
          const myTasks=(proj.tasks||[]).filter(t=>t.assignedTo===provId||proj.assignedTo?.includes(provId));
          const allTasks=proj.tasks||[];
          const today=new Date().toISOString().split('T')[0];
          const overdue=proj.dueDate&&proj.dueDate<today&&proj.status!=='Complete';

          return(
            <div key={proj.id} style={cardS()}>
              {/* HEADER */}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'10px',flexWrap:'wrap',gap:'8px'}}>
                <div style={{flex:1,minWidth:'200px'}}>
                  <div style={{display:'flex',gap:'8px',alignItems:'center',flexWrap:'wrap',marginBottom:'4px'}}>
                    <span style={{fontWeight:700,fontSize:'15px',color:C.navy}}>{proj.title}</span>
                    <StatusBadge s={proj.status}/>
                    <PriBadge p={proj.priority}/>
                    {overdue&&<span style={{fontSize:'9px',fontWeight:700,color:C.danger,background:C.dangerBg,padding:'2px 8px',borderRadius:'999px'}}>⚠ Overdue</span>}
                    {proj.dueDate&&<span style={{fontSize:'10px',color:C.muted}}>📅 Due {proj.dueDate}</span>}
                  </div>
                  {proj.description&&<div style={{fontSize:'11px',color:C.muted,marginBottom:'4px'}}>{proj.description}</div>}
                  <div style={{fontSize:'10px',color:C.muted,display:'flex',gap:'14px',flexWrap:'wrap'}}>
                    <span>✅ {allTasks.filter(t=>t.status==='Complete').length}/{allTasks.length} tasks complete</span>
                    <span style={{color:C.accent,fontWeight:600}}>👤 {myTasks.length} assigned to you</span>
                  </div>
                </div>
                <button onClick={()=>setExpandId(expanded?null:proj.id)}
                  style={Btn('accent',{padding:'6px 14px',fontSize:'11px'})}>
                  {expanded?'▲ Hide Tasks':'▼ View Tasks'}
                </button>
              </div>

              {/* PROGRESS BAR */}
              {allTasks.length>0&&(
                <div style={{marginBottom:expanded?'14px':'0'}}>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:'10px',color:C.muted,marginBottom:'4px'}}>
                    <span>Overall Progress</span>
                    <span style={{fontWeight:700,color:pct===100?C.success:C.navy}}>{pct}%</span>
                  </div>
                  <div style={{background:C.bg,borderRadius:'999px',height:'7px',overflow:'hidden'}}>
                    <div style={{height:'100%',borderRadius:'999px',width:`${pct}%`,background:pct===100?C.success:C.accent,transition:'width 0.5s'}}/>
                  </div>
                </div>
              )}

              {/* TASKS */}
              {expanded&&(
                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'14px'}}>
                  {/* ALL TASKS in this project */}
                  {allTasks.length===0
                    ?<div style={{color:C.muted,fontSize:'11px',textAlign:'center',padding:'14px'}}>No tasks in this project yet.</div>
                    :<>
                      {/* MY TASKS first */}
                      {myTasks.length>0&&(
                        <div style={{marginBottom:'12px'}}>
                          <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'8px'}}>Assigned to You</div>
                          {myTasks.map(task=>(
                            <div key={task.id} style={{padding:'10px 12px',borderRadius:'8px',marginBottom:'6px',
                              background:task.status==='Assistance Needed'?C.dangerBg:task.status==='Approval Needed'?'#f0eaf8':C.bg,
                              border:`1px solid ${task.status==='Assistance Needed'?C.danger+'33':task.status==='Approval Needed'?'#7a4fa355':C.border}`}}>
                              <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'6px'}}>
                                <input type="checkbox" checked={task.status==='Complete'} onChange={e=>updateTask(proj.id,task.id,{status:e.target.checked?'Complete':'In Progress'})}/>
                                <div style={{flex:1}}>
                                  <div style={{fontSize:'12px',fontWeight:600,color:task.status==='Complete'?C.muted:C.text,textDecoration:task.status==='Complete'?'line-through':'none'}}>{task.title}</div>
                                  <div style={{fontSize:'9px',color:C.muted,display:'flex',gap:'8px',marginTop:'1px',flexWrap:'wrap'}}>
                                    {task.dueDate&&<span>📅 {task.dueDate}</span>}
                                    {task.repeat&&task.repeat!=='none'&&<span style={{color:C.accent}}>🔄 {task.repeat}</span>}
                                  </div>
                                </div>
                                <select value={task.status} onChange={e=>updateTask(proj.id,task.id,{status:e.target.value})}
                                  style={{...sel(),padding:'4px 6px',fontSize:'10px',width:'155px',flexShrink:0}}>
                                  {STATUS_OPTS.map(o=><option key={o}>{o}</option>)}
                                </select>
                              </div>
                              {/* ADMIN NOTES - read only display */}
                              {task.notes&&(
                                <div style={{background:'rgba(255,255,255,0.8)',borderRadius:'6px',padding:'7px 10px',marginBottom:'6px',border:`1px solid ${C.border}`}}>
                                  <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'3px'}}>📋 Notes</div>
                                  <div style={{fontSize:'11px',color:C.text,lineHeight:1.5,whiteSpace:'pre-wrap'}}>{task.notes}</div>
                                </div>
                              )}
                              {/* COMMENTS */}
                              {(task.comments||[]).length>0&&(
                                <div style={{borderTop:`1px solid ${C.border}`,paddingTop:'6px',marginBottom:'6px'}}>
                                  {task.comments.map((cm,ci)=>(
                                    <div key={ci} style={{fontSize:'10px',color:C.text,padding:'4px 8px',background:'rgba(255,255,255,0.6)',borderRadius:'6px',marginBottom:'3px',borderLeft:`3px solid ${cm.author==='Admin'?C.accent:C.success}`}}>
                                      <span style={{fontWeight:700,color:C.navy}}>{cm.author}: </span>{cm.text}
                                      <span style={{color:C.muted,marginLeft:'6px',fontSize:'9px'}}>{cm.date}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* ADD COMMENT */}
                              <input placeholder="Add a comment… (press Enter)"
                                style={{...inp({padding:'4px 8px',fontSize:'10px',background:'rgba(255,255,255,0.7)'})}}
                                onKeyDown={e=>{if(e.key==='Enter'&&e.target.value.trim()){updateTask(proj.id,task.id,{comments:[...(task.comments||[]),{text:e.target.value.trim(),author:provName,date:new Date().toISOString().split('T')[0]}]});e.target.value='';}}}/>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* OTHER TASKS (not assigned to this provider) — view only */}
                      {allTasks.filter(t=>!myTasks.find(m=>m.id===t.id)).length>0&&(
                        <div>
                          <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.muted,marginBottom:'8px'}}>Other Team Tasks</div>
                          {allTasks.filter(t=>!myTasks.find(m=>m.id===t.id)).map(task=>(
                            <div key={task.id} style={{display:'flex',alignItems:'center',gap:'10px',padding:'7px 10px',borderRadius:'7px',marginBottom:'4px',background:C.bg,border:`1px solid ${C.border}`,opacity:0.75}}>
                              <StatusBadge s={task.status}/>
                              <div style={{flex:1}}>
                                <div style={{fontSize:'11px',color:C.muted,textDecoration:task.status==='Complete'?'line-through':'none'}}>{task.title}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  }

                  {/* PROJECT NOTES */}
                  {(proj.notes||[]).length>0&&(
                    <div style={{marginTop:'12px',borderTop:`1px solid ${C.border}`,paddingTop:'12px'}}>
                      <div style={{fontSize:'9px',fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:C.accent,marginBottom:'8px'}}>📝 Project Notes & Links</div>
                      {proj.notes.map(note=>(
                        <div key={note.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'8px 12px',borderRadius:'8px',marginBottom:'5px',background:C.bg,border:`1px solid ${C.border}`}}>
                          <div style={{flex:1}}>
                            <div style={{fontSize:'11px',color:C.text,lineHeight:1.5}}>{note.text}</div>
                            {note.link&&(
                              <a href={note.link.startsWith('http')?note.link:`https://${note.link}`} target="_blank" rel="noreferrer"
                                style={{fontSize:'11px',color:C.accent,fontWeight:600,textDecoration:'none',display:'inline-flex',alignItems:'center',gap:'4px',marginTop:'4px',padding:'2px 10px',background:C.accentBg,borderRadius:'999px'}}>
                                🔗 {note.link.replace(/^https?:\/\//,'')}
                              </a>
                            )}
                            <div style={{fontSize:'9px',color:C.muted,marginTop:'3px'}}>{note.createdAt}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })
      }
    </div>
  );
}



export default function App(){
  const now=new Date();
  const[month,setMonth]=useState(`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`);
  const[sid,setSid]=useState('lauren');
  const[providers,setProviders]=useState(DEF_PROV);
  const[catalog,setCatalog]=useState(DEF_CAT);
  const[creds,setCreds]=useState(DEF_CREDS);
  const[logData,setLogData]=useState({});
  const[hoursData,setHoursData]=useState({});
  const[retailData,setRetailData]=useState({});
  const[expenses,setExpenses]=useState([]);
  const[importantDetails,setImportantDetails]=useState({});
  const[clients,setClients]=useState([]);
  const[kpiData,setKpiData]=useState({});
  const[emailConfig,setEmailConfig]=useState({serviceId:'',templateId:'',publicKey:'',adminEmail:''});
  const[showQuickLog,setShowQuickLog]=useState(false);
  const[quickEntry,setQuickEntry]=useState({date:new Date().toISOString().split('T')[0],time:'',client:'',serviceId:'c1',retailPrice:'',discount:'0',tip:'0'});
  const[projects,setProjects]=useState([]);
  const[vaUsers,setVaUsers]=useState([]);
  const[payroll,setPayroll]=useState({});
  const[auth,setAuth]=useState(null);
  const[view,setView]=useState('dashboard');
  const[ready,setReady]=useState(false);
  const[logOpen,setLogOpen]=useState(false);
  const[provOpen,setProvOpen]=useState(false);
  const[svcOpen,setSvcOpen]=useState(false);
  const[editProv,setEditProv]=useState(null);
  const[editSvc,setEditSvc]=useState(null);
  const blankE=()=>({date:now.toISOString().split('T')[0],client:'',serviceId:'c1',retailPrice:'',discount:'0',tip:'0',unitsUsed:'',vialsUsed:'',cogsManual:'',cogsOverride:false,notes:''});
  const blankP=()=>({id:uid(),name:'',role:'',color:'#7a9fa3',monthlyGoal:8000,hasHourly:false,compType:'commission_first',hourlyRate:0,injectableTiers:[{upTo:4999,rate:20},{upTo:99999,rate:25}],facialTiers:[{upTo:1999,rate:15},{upTo:99999,rate:20}],membershipBonus:10});
  const blankSv=()=>({id:uid(),name:'',cat:'facial',price:0,cogsType:'flat',cogsFlat:0,cogsUnit:0,cogsVial:0,unit:'session',active:true});
  const[entry,setEntry]=useState(blankE());
  const[newProv,setNewProv]=useState(blankP());
  const[newSvc,setNewSvc]=useState(blankSv());

  useEffect(()=>{
    (async()=>{
      try{
        const d=await dbGet('lh4:data');if(d)setLogData(JSON.parse(d));
        const h=await dbGet('lh4:hrs');if(h)setHoursData(JSON.parse(h));
        const r=await dbGet('lh4:ret');if(r)setRetailData(JSON.parse(r));
        const p=await dbGet('lh4:prov');if(p)setProviders(JSON.parse(p));
        const c=await dbGet('lh4:cat');if(c)setCatalog(JSON.parse(c));
        const ex=await dbGet('lh4:expenses');if(ex)setExpenses(JSON.parse(ex));
        const id2=await dbGet('lh4:details');if(id2)setImportantDetails(JSON.parse(id2));
        const cl=await dbGet('lh4:clients');if(cl)setClients(JSON.parse(cl));
        const kd=await dbGet('lh4:kpi');if(kd)setKpiData(JSON.parse(kd));
        const ec=await dbGet('lh4:email');if(ec){const parsed=JSON.parse(ec);setEmailConfig(parsed);if(parsed.publicKey)initEmail(parsed.publicKey);}
        const pj=await dbGet('lh4:projects');if(pj)setProjects(JSON.parse(pj));
        const va=await dbGet('lh4:vausers');if(va)setVaUsers(JSON.parse(va));
        const pr=await dbGet('lh4:payroll');if(pr)setPayroll(JSON.parse(pr));
        const cr=await dbGet('lh4:creds');
        if(cr){
          const parsed=JSON.parse(cr);
          // Migrate old format to new format if needed
          if(parsed.adminUser && !parsed.admins){
            parsed.admins=[{id:'admin1',name:'Admin',username:parsed.adminUser,password:parsed.adminPass}];
          }
          setCreds(parsed);
        }
      }catch(e){console.error('Load error',e);}
      setReady(true);
    })();
  },[]);
  useEffect(()=>{if(ready)dbSet('lh4:data',JSON.stringify(logData));},[logData,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:hrs',JSON.stringify(hoursData));},[hoursData,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:ret',JSON.stringify(retailData));},[retailData,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:prov',JSON.stringify(providers));},[providers,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:cat',JSON.stringify(catalog));},[catalog,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:creds',JSON.stringify(creds));},[creds,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:expenses',JSON.stringify(expenses));},[expenses,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:details',JSON.stringify(importantDetails));},[importantDetails,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:clients',JSON.stringify(clients));},[clients,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:kpi',JSON.stringify(kpiData));},[kpiData,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:email',JSON.stringify(emailConfig));},[emailConfig,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:projects',JSON.stringify(projects));},[projects,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:vausers',JSON.stringify(vaUsers));},[vaUsers,ready]);
  useEffect(()=>{if(ready)dbSet('lh4:payroll',JSON.stringify(payroll));},[payroll,ready]);

  const isAdmin=auth?.role==='admin';
  const prov=providers.find(p=>p.id===(isAdmin?sid:auth?.providerId))||providers[0];
  const mk=prov?`${prov?.id}:${month}`:'none';
  const entries=logData[mk]||[];
  const hrs=hoursData[mk]||0;
  const retail=retailData[mk]||{rev:0,cogs:0};
  const comm=useMemo(()=>prov?calcComm(entries,prov,catalog,hrs,retail):{totRev:0,svcRev:0,injRev:0,facRev:0,retRev:0,totCogs:0,retCogs:0,gp:0,totTips:0,memCt:0,memB:0,retComm:0,basePay:0,iT:{rate:0},fT:{rate:0},injC:0,facC:0,totC:0,totalPay:0,above:0,hrs:0},[entries,prov,catalog,hrs,retail]);

  if(!ready)return<div style={{minHeight:'100vh',background:C.navy,display:'flex',alignItems:'center',justifyContent:'center',color:C.accentL,fontFamily:sans}}>Loading…</div>;
  if(!auth)return<LoginScreen providers={providers} creds={creds} onLogin={a=>{setAuth(a);if(a.role==='staff'){setSid(a.providerId);setView('dashboard');}else if(a.role==='va'){setView('projects');}else{setView('combined');}}}/> ;
  const selSvc=catalog.find(c=>c.id===entry.serviceId)||catalog.find(c=>c.active)||catalog[0]||null;
  const autoCOG=selSvc?cogCalc(selSvc,entry.unitsUsed,entry.vialsUsed):0;
  const ml=new Date(month+'-02').toLocaleString('default',{month:'long',year:'numeric'});
  const gPct=pct(comm.svcRev,prov?.monthlyGoal||0);
  const weeks=[1,2,3,4,5].map(w=>({w,rev:(entries||[]).filter(e=>wk(e.date)===w).reduce((s,e)=>s+Math.max(0,(+e.retailPrice||0)-(+e.discount||0)),0),cnt:(entries||[]).filter(e=>wk(e.date)===w).length}));
  const maxW=Math.max(...weeks.map(w=>w.rev),1);

  const updProv=(id,u)=>setProviders(p=>p.map(x=>x.id===id?{...x,...u}:x));
  const updSvc=(id,u)=>setCatalog(p=>p.map(x=>x.id===id?{...x,...u}:x));
  const setHrs=v=>setHoursData(p=>({...p,[mk]:+v||0}));
  const setRet=(f,v)=>setRetailData(p=>({...p,[mk]:{...(p[mk]||{rev:0,cogs:0}),[f]:+v||0}}));
  function downloadReport(){
    const wb = XLSX.utils.book_new();
    const provList = isAdmin ? providers : [prov];

    // ── SUMMARY SHEET ──────────────────────────────────
    const summaryRows = [
      ['Lumé Haus by CornerstoneMD — Monthly Report', ml],
      [],
      ['Provider','Goal','Total Revenue','Service Rev','Retail Rev','Total COGs','Gross Profit','Tips','Inj Rev','Facial Rev',
       `Inj Comm %','Inj Comm','Facial Comm %','Facial Comm','Retail Comm %','Retail Comm',
       'Membership Bonuses','Base Pay','Total Commission','TOTAL PAY`],
    ];
    provList.forEach(p => {
      const mk2 = `${p.id}:${month}`;
      const ents = logData[mk2]||[];
      const h2 = hoursData[mk2]||0;
      const ret2 = retailData[mk2]||{rev:0,cogs:0};
      const c2 = calcComm(ents,p,catalog,h2,ret2);
      summaryRows.push([
        p.name, p.monthlyGoal, c2.totRev, c2.svcRev, c2.retRev, c2.totCogs, c2.gp, c2.totTips,
        c2.injRev, c2.facRev, `${c2.iT.rate}%`, c2.injC, `${c2.fT.rate}%`, c2.facC,
        `${p.retailCommRate||0}%`, c2.retComm, c2.memB,
        p.compType==='hourly_goal'?c2.basePay:0, c2.totC, c2.totalPay
      ]);
    });
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
    wsSummary['!cols'] = Array(20).fill({wch:16});
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // ── PER-PROVIDER SERVICE LOG SHEETS ───────────────
    provList.forEach(p => {
      const mk2 = `${p.id}:${month}`;
      const ents = logData[mk2]||[];
      const h2 = hoursData[mk2]||0;
      const ret2 = retailData[mk2]||{rev:0,cogs:0};
      const c2 = calcComm(ents,p,catalog,h2,ret2);

      const rows = [
        [`${p.name} — ${ml}`],
        [],
        ['SUMMARY'],
        ['Monthly Goal', p.monthlyGoal],
        ['Total Revenue', c2.totRev],
        ['Service Revenue', c2.svcRev],
        ['Retail Revenue', c2.retRev],
        ['Total COGs', c2.totCogs],
        ['Gross Profit', c2.gp],
        ['Tips Collected', c2.totTips],
        [],
        ['COMMISSION BREAKDOWN'],
        ['Injectable Revenue', c2.injRev],
        [`Injectable Commission (${c2.iT.rate}%)`, c2.injC],
        ['Facial Revenue', c2.facRev],
        [`Facial Commission (${c2.fT.rate}%)`, c2.facC],
        [`Retail Commission (${p.retailCommRate||0}%)`, c2.retComm],
        [`Membership Bonuses (${c2.memCt} signups × $${p.membershipBonus})`, c2.memB],
        ...(p.compType==='hourly_goal'?[[`Base Pay ($${p.hourlyRate}/hr × ${c2.hrs} hrs)`, c2.basePay]]:[]),
        ['TOTAL PAY', c2.totalPay],
        [],
        ['SERVICE LOG'],
        ['Date','Week','Client','Service','Category','Retail Price','Discount','Net Revenue','Tip','Units/Vials','COGs','Profit','Notes'],
        ...ents.map(e => {
          const sv = catalog.find(c=>c.id===e.serviceId);
          const net = (+e.retailPrice||0)-(+e.discount||0);
          const cogs = e.cogsOverride?(+e.cogsManual||0):cogCalc(sv,e.unitsUsed,e.vialsUsed);
          const qty = sv?.cogsType==='per_unit'?`${+e.unitsUsed||0} ${sv.unit}s`:sv?.cogsType==='per_vial'?`${+e.vialsUsed||0} vials`:'';
          return [e.date, `Week ${wk(e.date)}`, e.client, sv?.name||'', sv?.cat||'',
                  +e.retailPrice||0, +e.discount||0, net, +e.tip||0, qty, cogs, net-cogs, e.notes||''];
        }),
        [],
        ['Retail Monthly Total', ret2.rev, '', 'Retail COGs', ret2.cogs],
      ];

      const ws = XLSX.utils.aoa_to_sheet(rows);
      ws['!cols'] = Array(13).fill({wch:18});
      // Bold the header rows
      XLSX.utils.book_append_sheet(wb, ws, p.name.slice(0,31));
    });

    XLSX.writeFile(wb, `LumeHaus_${isAdmin?'AllProviders':prov?.name||"".replace(/ /g,'_')}_${month}.xlsx`);
  }

  function saveLog(){
    if(!entry.client||!entry.serviceId)return;
    const sv2=catalog.find(c=>c.id===entry.serviceId);
    const cog2=entry.cogsOverride?(+entry.cogsManual||0):cogCalc(sv2,entry.unitsUsed,entry.vialsUsed);
    const e2={...entry,id:uid(),retailPrice:+entry.retailPrice||(sv2?.price||0),discount:+entry.discount||0,tip:+entry.tip||0,cogsManual:cog2};
    setLogData(p=>({...p,[mk]:[...(p[mk]||[]),e2]}));setEntry(blankE());setLogOpen(false);
  }
  function saveProv(){
    if(!newProv.name)return;
    const id=uid();
    setProviders(p=>[...p,{...newProv,id}]);
    setCreds(c=>({...c,providers:{...c.providers,[id]:{username:newProv.name.toLowerCase().split(' ')[0],password:'LH2025'}}}));
    setNewProv(blankP());setProvOpen(false);
  }
  function saveSvc(){if(!newSvc.name)return;setCatalog(p=>[...p,{...newSvc,id:uid()}]);setNewSvc(blankSv());setSvcOpen(false);}

  const navItems=isAdmin?['combined','dashboard','log','commission','catalog','providers','expenses','breakeven','analytics','projects','kpi']:auth?.role==='va'?['projects']:['dashboard','log','tasks','myprojects'];
  const navLabels={'combined':'👥 All Providers','dashboard':'Dashboard','log':'Log','commission':'Commission','catalog':'Catalog','providers':'Providers','expenses':'💰 Expenses','breakeven':'📈 Breakeven','analytics':'📊 Analytics','projects':'📋 Projects','tasks':'📋 My Tasks','myprojects':'📁 My Projects','kpi':'🎯 KPIs'};

  return(
    <div style={{background:C.bg,minHeight:'100vh',fontFamily:sans,color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      {/* TOP BAR */}
      <div style={{background:C.navy,padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,0.2)',flexWrap:'wrap',gap:'8px'}}>
        <div style={{fontFamily:serif,fontSize:'18px',fontWeight:300,letterSpacing:'0.1em',color:'#fff'}}>
          <span style={{color:C.accentL}}>Lumé Haus</span>
          {isAdmin&&<span style={{fontFamily:sans,fontSize:'10px',fontWeight:700,background:'rgba(255,255,255,0.12)',color:C.accentL,padding:'2px 8px',borderRadius:'999px',marginLeft:'10px'}}>ADMIN</span>}
          {!isAdmin&&auth?.role!=='va'&&<span style={{fontFamily:sans,fontSize:'11px',color:'rgba(255,255,255,0.4)',marginLeft:'10px'}}>Welcome, {prov?.name}</span>}
          {auth?.role==='va'&&<span style={{fontFamily:sans,fontSize:'11px',color:'rgba(255,255,255,0.4)',marginLeft:'10px'}}>Welcome, {auth?.vaName}</span>}
        </div>
        <div style={{display:'flex',gap:'10px',alignItems:'center'}}>
          <div style={{display:'flex',gap:'6px',alignItems:'center',flexWrap:'wrap'}}>
            <button onClick={()=>{const d=new Date(month+'-02');d.setMonth(d.getMonth()-1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:'6px',padding:'5px 10px',cursor:'pointer',fontFamily:sans,fontSize:'13px'}}>‹</button>
            <input type="month" value={month} onChange={e=>setMonth(e.target.value)} style={{background:'rgba(255,255,255,0.1)',border:`1px solid ${C.accentL}33`,borderRadius:'7px',color:'#fff',padding:'5px 10px',fontFamily:sans,fontSize:'11px',colorScheme:'dark'}}/>
            <button onClick={()=>{const d=new Date(month+'-02');d.setMonth(d.getMonth()+1);setMonth(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`);}} style={{background:'rgba(255,255,255,0.1)',border:'1px solid rgba(255,255,255,0.2)',color:'#fff',borderRadius:'6px',padding:'5px 10px',cursor:'pointer',fontFamily:sans,fontSize:'13px'}}>›</button>
            <button onClick={downloadReport} style={{background:C.accent,border:'none',color:'#fff',borderRadius:'7px',padding:'5px 12px',cursor:'pointer',fontFamily:sans,fontSize:'11px',fontWeight:700}}>⬇ Report</button>
          </div>
          <button onClick={()=>setAuth(null)} style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.15)',color:'rgba(255,255,255,0.7)',cursor:'pointer',padding:'5px 12px',borderRadius:'7px',fontFamily:sans,fontSize:'11px'}}>Sign Out</button>
        </div>
      </div>

      {/* QUICK LOG MODAL */}
      {showQuickLog&&(
        <div style={{position:'fixed',top:0,left:0,right:0,bottom:0,background:'rgba(0,0,0,0.4)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:'20px'}}>
          <div style={{background:C.card,borderRadius:'16px',padding:'24px',width:'100%',maxWidth:'460px',boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'16px'}}>
              <div style={{fontFamily:serif,fontSize:'20px',fontWeight:300,color:C.navy}}>⚡ Quick Log</div>
              <button onClick={()=>setShowQuickLog(false)} style={{background:'none',border:'none',fontSize:'20px',cursor:'pointer',color:C.muted}}>✕</button>
            </div>
            <div style={{display:'grid',gap:'10px',marginBottom:'14px'}}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label style={lblS()}>Service Date</label><input type="date" value={quickEntry.date} onChange={e=>setQuickEntry(p=>({...p,date:e.target.value}))} style={inp()}/></div>
                <div><label style={lblS()}>Service Time</label><input type="time" value={quickEntry.time} onChange={e=>setQuickEntry(p=>({...p,time:e.target.value}))} style={inp()}/></div>
              </div>
              <div><label style={lblS()}>Client *</label><ClientAutocomplete value={quickEntry.client} onChange={v=>setQuickEntry(p=>({...p,client:v}))} clients={clients}/></div>
              <div><label style={lblS()}>Service *</label>
                <select value={quickEntry.serviceId} onChange={e=>{const sv=(catalog||[]).find(c=>c.id===e.target.value);setQuickEntry(p=>({...p,serviceId:e.target.value,retailPrice:sv?.price||''}));}} style={sel()}>
                  {(catalog||[]).filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'8px'}}>
                <div><label style={lblS()}>Price ($)</label><input type="number" value={quickEntry.retailPrice} onChange={e=>setQuickEntry(p=>({...p,retailPrice:e.target.value}))} style={inp()}/></div>
                <div><label style={lblS()}>Discount ($)</label><input type="number" value={quickEntry.discount} onChange={e=>setQuickEntry(p=>({...p,discount:e.target.value}))} placeholder="0" style={inp()}/></div>
                <div><label style={lblS()}>Tip ($)</label><input type="number" value={quickEntry.tip} onChange={e=>setQuickEntry(p=>({...p,tip:e.target.value}))} placeholder="0" style={inp()}/></div>
              </div>
            </div>
            <button style={{...Btn('primary'),width:'100%',padding:'12px',fontSize:'13px',borderRadius:'10px'}} onClick={()=>{
              if(!quickEntry.client||!quickEntry.serviceId)return;
              const sv=catalog.find(c=>c.id===quickEntry.serviceId);
              const price=parseFloat(quickEntry.retailPrice)||(sv?.price||0);
              const autoCOG2=cogCalc(sv,0,0);
              const e2={id:uid(),date:quickEntry.date||new Date().toISOString().split('T')[0],time:quickEntry.time||'',client:quickEntry.client,serviceId:quickEntry.serviceId,retailPrice:price,discount:parseFloat(quickEntry.discount)||0,tip:parseFloat(quickEntry.tip)||0,unitsUsed:'',vialsUsed:'',cogsManual:autoCOG2,cogsOverride:false,notes:''};
              const qMk=`${prov?.id}:${month}`;
              setLogData(p=>({...p,[qMk]:[...(p[qMk]||[]),e2]}));
              // Add to client DB if new
              if(!clients.find(c=>c.name.toLowerCase()===quickEntry.client.toLowerCase())){
                setClients(p=>[...p,{id:uid(),name:quickEntry.client,phone:'',email:'',notes:'',createdAt:new Date().toISOString().split('T')[0]}]);
              }
              setQuickEntry({date:new Date().toISOString().split('T')[0],time:'',client:'',serviceId:'c1',retailPrice:'',discount:'0',tip:'0'});
              setShowQuickLog(false);
            }}>✓ Log Service</button>
          </div>
        </div>
      )}

      {/* QUICK LOG FLOATING BUTTON */}
      {auth?.role!=='va'&&(
        <button onClick={()=>setShowQuickLog(true)} style={{position:'fixed',bottom:'24px',right:'24px',background:C.navy,color:'#fff',border:'none',borderRadius:'999px',width:'56px',height:'56px',fontSize:'24px',cursor:'pointer',boxShadow:'0 4px 20px rgba(37,54,73,0.35)',zIndex:150,display:'flex',alignItems:'center',justifyContent:'center'}}>+</button>
      )}

      <div style={{maxWidth:'1140px',margin:'0 auto',padding:'18px 16px'}}>
        {/* PROVIDER TABS (admin) */}
        {isAdmin&&auth?.role!=='va'&&(
          <div style={{display:'flex',gap:'7px',marginBottom:'14px',flexWrap:'wrap'}}>
            {providers.map(p=>(
              <button key={p.id} onClick={()=>{setSid(p.id);if(view==='combined')setView('dashboard');}} style={{padding:'7px 18px',borderRadius:'20px',border:`2px solid ${(view!=='combined'&&sid===p.id)?p.color:C.border}`,background:(view!=='combined'&&sid===p.id)?p.color:C.card,color:(view!=='combined'&&sid===p.id)?'#fff':C.muted,cursor:'pointer',fontFamily:sans,fontSize:'12px',fontWeight:600,transition:'all 0.15s'}}>
                {p.name}
              </button>
            ))}
          </div>
        )}
        {/* NAV */}
        <div style={{display:'flex',gap:'2px',marginBottom:'16px',background:C.card,borderRadius:'10px',padding:'4px',boxShadow:C.shadow,width:'fit-content',border:`1px solid ${C.border}`,flexWrap:'wrap'}}>
          {navItems.map(k=>(
            <button key={k} onClick={()=>setView(k)} style={{padding:'6px 14px',borderRadius:'7px',border:'none',cursor:'pointer',background:view===k?C.navy:'transparent',color:view===k?'#fff':C.muted,fontFamily:sans,fontSize:'12px',fontWeight:600,whiteSpace:'nowrap'}}>
              {navLabels[k]}
            </button>
          ))}
        </div>

        {/* ── COMBINED ── */}
        {view==='combined'&&isAdmin&&<>
          <ImportantDetailsBlock personId={`admin:${auth?.adminId||'admin'}`} personName={`Admin Notes`} importantDetails={importantDetails} setImportantDetails={setImportantDetails}/>
          <CombinedView providers={providers} logData={logData} hoursData={hoursData} retailData={retailData} catalog={catalog} month={month}/>
        </>}

        {/* ── DASHBOARD ── */}
        {view==='dashboard'&&auth?.role!=='va'&&(
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:'10px',marginBottom:'14px'}}>
              {[{l:'Total Revenue',v:f0(comm.totRev),s:'Net after discounts'},{l:isAdmin?'Total Pay':'Est. Pay',v:f0(comm.totalPay),s:prov?.compType==='hourly_goal'?'Base + commission':'Commission',hi:true},{l:'Total COGs',v:f0(comm.totCogs),s:'Services + retail'},{l:'Gross Profit',v:f0(comm.gp),s:'Revenue − COGs'},{l:'% to Goal',v:`${gPct.toFixed(0)}%`,s:`Goal: ${f0(prov?.monthlyGoal||0)}`},{l:'Tips',v:f0(comm.totTips),s:'Not in commission'}].map((k,i)=>(
                <div key={i} style={{background:k.hi?C.navy:C.card,borderRadius:'12px',padding:'14px 15px',boxShadow:C.shadow,border:`1px solid ${k.hi?'transparent':C.border}`}}>
                  <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:k.hi?C.accentL:C.accent,marginBottom:'3px'}}>{k.l}</div>
                  <div style={{fontSize:'21px',fontWeight:300,fontFamily:serif,color:k.hi?'#fff':C.text}}>{k.v}</div>
                  <div style={{fontSize:'10px',color:k.hi?'rgba(255,255,255,0.4)':C.muted,marginTop:'2px'}}>{k.s}</div>
                </div>
              ))}
            </div>
            {/* GOAL BAR */}
            <div style={cardS({padding:'14px 18px'})}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:'7px',flexWrap:'wrap',gap:'6px'}}>
                <div style={{display:'flex',gap:'10px',alignItems:'center',flexWrap:'wrap'}}>
                  <span style={{fontWeight:700,fontSize:'13px',color:C.navy}}>{prov?.name||""} · {ml}</span>
                  {prov?.hasHourly&&<span style={{fontSize:'10px',padding:'2px 9px',borderRadius:'999px',background:prov?.compType==='hourly_goal'?C.accentBg:C.successBg,color:prov?.compType==='hourly_goal'?C.accent:C.success,fontWeight:700}}>{prov?.compType==='hourly_goal'?'Mode A: Hourly + Goal':'Mode B: Commission First'}</span>}
                </div>
                <span style={{fontWeight:700,color:C.navy}}>{f0(comm.svcRev)} / {f0(prov?.monthlyGoal||0)}</span>
              </div>
              <div style={{background:C.bg,borderRadius:'999px',height:'10px',overflow:'hidden'}}><div style={{height:'100%',borderRadius:'999px',width:`${gPct}%`,background:gPct>=100?C.success:gPct>=70?prov?.color||C.accent:C.warn,transition:'width 0.5s'}}/></div>
              {gPct>=100&&<div style={{fontSize:'11px',color:C.success,marginTop:'5px',fontWeight:700}}>🎉 Monthly goal reached!</div>}
              {prov?.hasHourly&&prov?.compType==='hourly_goal'&&comm.above>0&&<div style={{fontSize:'11px',color:C.success,marginTop:'5px'}}>✓ {f0(comm.above)} above goal — commission active on overage</div>}
              {prov?.hasHourly&&prov?.compType==='hourly_goal'&&!comm.above&&comm.svcRev>0&&<div style={{fontSize:'11px',color:C.warn,marginTop:'5px'}}>⏳ {f0((prov?.monthlyGoal||0||0)-comm.svcRev)} away from goal — commission activates then</div>}
            </div>
            {/* HOURLY (admin, Mode A) */}
            {isAdmin&&prov?.hasHourly&&prov?.compType==='hourly_goal'&&(
              <div style={cardS({padding:'14px 18px'})}>
                <label style={lblS()}>Hours Worked — {ml}</label>
                <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>Base Pay = Hourly Rate × Hours. Commission only activates on service revenue above goal.</div>
                <div style={{display:'flex',gap:'16px',alignItems:'flex-end',flexWrap:'wrap'}}>
                  <div><label style={lblS()}>Hours This Month</label><input type="number" value={hrs||''} placeholder="0" onChange={e=>setHrs(e.target.value)} style={inp({width:'110px'})}/></div>
                  <div style={{paddingBottom:'8px',fontSize:'12px',color:C.muted}}>× ${prov?.hourlyRate||0}/hr</div>
                  <div style={{paddingBottom:'4px'}}><div style={lblS()}>Base Pay</div><div style={{fontSize:'24px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.basePay)}</div></div>
                </div>
              </div>
            )}
            {/* RETAIL */}
            <div style={cardS({padding:'14px 18px'})}>
              <label style={lblS()}>Monthly Retail — {ml}</label>
              <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>Enter total retail product sales for the month as a lump sum. Not subject to commission.</div>
              <div style={{display:'flex',gap:'14px',flexWrap:'wrap'}}>
                <div><label style={lblS()}>Retail Revenue ($)</label><input type="number" value={retail.rev||''} placeholder="0.00" onChange={e=>setRet('rev',e.target.value)} style={inp({width:'140px'})}/></div>
                {isAdmin&&<div><label style={lblS()}>Retail COGs ($)</label><input type="number" value={retail.cogs||''} placeholder="0.00" onChange={e=>setRet('cogs',e.target.value)} style={inp({width:'140px'})}/></div>}
              </div>
            </div>
            {/* WEEKLY CHART */}
            <div style={cardS()}>
              <div style={lblS()}>Weekly Service Revenue — {ml}</div>
              <div style={{fontSize:'10px',color:C.muted,marginBottom:'12px'}}>Net service revenue per week (excludes retail). Week 1 = days 1–7, etc.</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:'10px'}}>
                {weeks.map(w=>(
                  <div key={w.w} style={{textAlign:'center'}}>
                    <div style={{fontSize:'11px',fontWeight:700,color:C.navy,marginBottom:'4px'}}>{w.rev>0?f0(w.rev):'—'}</div>
                    <div style={{height:'70px',background:C.bg,borderRadius:'8px',position:'relative',overflow:'hidden',border:`1px solid ${C.border}`}}>
                      <div style={{position:'absolute',bottom:0,width:'100%',height:`${maxW>0?(w.rev/maxW)*100:0}%`,background:C.accent,borderRadius:'6px 6px 0 0',transition:'height 0.5s'}}/>
                    </div>
                    <div style={{fontSize:'10px',color:C.muted,marginTop:'4px',fontWeight:600}}>Wk {w.w}</div>
                    <div style={{fontSize:'9px',color:C.border}}>{w.cnt} svc{w.cnt!==1?'s':''}</div>
                  </div>
                ))}
              </div>
            </div>
            {/* RECENT */}
            <div style={cardS()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <div><div style={lblS()}>Recent Services</div><div style={{fontSize:'10px',color:C.muted}}>Last 5 entries. Go to Log tab to see all.</div></div>
                <button style={Btn('primary')} onClick={()=>{setView('log');setLogOpen(true);}}>+ Add Service</button>
              </div>
              {entries.length===0?<div style={{textAlign:'center',padding:'24px',color:C.muted,fontSize:'13px'}}>No services logged for {ml} yet.</div>:(
                <div style={{overflowX:'auto'}}>
                  <table style={{width:'100%',borderCollapse:'collapse',fontSize:'12px',minWidth:'500px'}}>
                    <thead><tr>{['Date','Client','Service','Retail','Discount','Tip','Net'].map(h=><th key={h} style={{textAlign:'left',padding:'5px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'0.07em',textTransform:'uppercase',color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
                    <tbody>
                      {[...entries].reverse().slice(0,5).map(e=>{const sv=catalog.find(c=>c.id===e.serviceId);const net=(+e.retailPrice||0)-(+e.discount||0);return(
                        <tr key={e.id} style={{borderBottom:`1px solid ${C.border}`}}>
                          <td style={{padding:'8px'}}>{e.date}</td><td style={{padding:'8px',fontWeight:600}}>{e.client}</td>
                          <td style={{padding:'8px'}}><Badge cat={sv?.cat||'other'} name={sv?.name||'—'}/></td>
                          <td style={{padding:'8px'}}>{f2(e.retailPrice)}</td>
                          <td style={{padding:'8px',color:(+e.discount||0)>0?C.danger:C.muted}}>{(+e.discount||0)>0?`−${f2(e.discount)}`:'—'}</td>
                          <td style={{padding:'8px',color:C.warn}}>{(+e.tip||0)>0?f2(e.tip):'—'}</td>
                          <td style={{padding:'8px',fontWeight:700}}>{f2(net)}</td>
                        </tr>
                      );})}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── LOG ── */}
        {view==='log'&&auth?.role!=='va'&&(
          <div style={cardS()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div><div style={lblS()}>Service Log — {prov?.name||""} · {ml}</div><div style={{fontSize:'10px',color:C.muted}}>Net = Retail − Discount. COGs auto-fill from catalog.</div></div>
              <button style={Btn('primary')} onClick={()=>setLogOpen(!logOpen)}>{logOpen?'✕ Cancel':'+ Add Service'}</button>
            </div>
            {logOpen&&(
              <div style={{background:C.bg,borderRadius:'10px',padding:'16px',marginBottom:'16px',border:`1px solid ${C.border}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:'10px',marginBottom:'12px'}}>
                  <div><label style={lblS()}>Date</label><input type="date" value={entry.date} onChange={e=>setEntry(p=>({...p,date:e.target.value}))} style={inp()}/></div>
                  <div><label style={lblS()}>Client *</label><ClientAutocomplete value={entry.client} onChange={v=>setEntry(p=>({...p,client:v}))} clients={clients}/></div>
                  <div style={{gridColumn:'span 2'}}><label style={lblS()}>Service *</label>
                    <select value={entry.serviceId} onChange={e=>{const sv=catalog.find(c=>c.id===e.target.value);setEntry(p=>({...p,serviceId:e.target.value,retailPrice:sv?.price||'',unitsUsed:'',vialsUsed:'',cogsManual:'',cogsOverride:false}));}} style={sel()}>
                      {catalog.filter(c=>c.active).map(c=><option key={c.id} value={c.id}>{c.name} ({c.cat})</option>)}
                    </select>
                  </div>
                  <div><label style={lblS()}>Retail Price ($)</label><input type="number" value={entry.retailPrice} onChange={e=>setEntry(p=>({...p,retailPrice:e.target.value}))} placeholder={`${selSvc?.price||0}`} style={inp()}/></div>
                  <div><label style={lblS()}>Discount ($)</label><input type="number" value={entry.discount} onChange={e=>setEntry(p=>({...p,discount:e.target.value}))} placeholder="0" style={inp()}/></div>
                  <div><label style={lblS()}>Tip ($)</label><input type="number" value={entry.tip} onChange={e=>setEntry(p=>({...p,tip:e.target.value}))} placeholder="0" style={inp()}/></div>
                  {selSvc?.cogsType==='per_unit'&&<div><label style={lblS()}>Units Used</label><input type="number" value={entry.unitsUsed} onChange={e=>setEntry(p=>({...p,unitsUsed:e.target.value}))} placeholder="0" style={inp()}/></div>}
                  {selSvc?.cogsType==='per_vial'&&<div><label style={lblS()}>Vials Used</label><input type="number" value={entry.vialsUsed} onChange={e=>setEntry(p=>({...p,vialsUsed:e.target.value}))} placeholder="0" style={inp()}/></div>}
                  <div>
                    <label style={lblS()}>COGs <span style={{textTransform:'none',fontWeight:400,color:C.muted,letterSpacing:0}}>Auto: {f2(autoCOG)}</span></label>
                    <div style={{display:'flex',gap:'6px'}}>
                      <input type="number" value={entry.cogsOverride?entry.cogsManual:autoCOG.toFixed(2)} onChange={e=>setEntry(p=>({...p,cogsManual:e.target.value,cogsOverride:true}))} style={inp({flex:1})}/>
                      {entry.cogsOverride&&<button onClick={()=>setEntry(p=>({...p,cogsOverride:false,cogsManual:''}))} style={Btn('secondary',{padding:'6px 8px',fontSize:'10px'})}>↺</button>}
                    </div>
                  </div>
                  <div style={{gridColumn:'1/-1'}}><label style={lblS()}>Notes</label><input value={entry.notes} onChange={e=>setEntry(p=>({...p,notes:e.target.value}))} placeholder="Optional" style={inp()}/></div>
                </div>
                <div style={{background:C.successBg,border:`1px solid ${C.success}44`,borderRadius:'8px',padding:'8px 14px',marginBottom:'12px',fontSize:'11px',display:'flex',gap:'16px',flexWrap:'wrap'}}>
                  <span style={{color:C.success,fontWeight:700}}>Preview →</span>
                  <span>Net: <strong>{f2((+entry.retailPrice||selSvc?.price||0)-(+entry.discount||0))}</strong></span>
                  <span>COGs: <strong>{f2(entry.cogsOverride?+entry.cogsManual||0:autoCOG)}</strong></span>
                  <span>Profit: <strong>{f2(((+entry.retailPrice||selSvc?.price||0)-(+entry.discount||0))-(entry.cogsOverride?+entry.cogsManual||0:autoCOG))}</strong></span>
                </div>
                <button style={Btn('primary')} onClick={saveLog}>✓ Save Entry</button>
              </div>
            )}
            {entries.length===0?<div style={{textAlign:'center',padding:'36px',color:C.muted}}>No entries for {ml}. Add the first one above!</div>:(
              <div style={{overflowX:'auto'}}>
                <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'720px'}}>
                  <thead><tr>{['Date','Wk','Client','Service','Retail','Disc','Tip','COGs','Net','Profit','Notes',...(isAdmin?['']:[''])].map(h=><th key={h+Math.random()} style={{textAlign:'left',padding:'5px 7px',fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
                  <tbody>
                    {[...entries].reverse().map(e=>{const sv=catalog.find(c=>c.id===e.serviceId);const net=(+e.retailPrice||0)-(+e.discount||0);const cogs=e.cogsOverride?(+e.cogsManual||0):cogCalc(sv,e.unitsUsed,e.vialsUsed);return(
                      <tr key={e.id} style={{borderBottom:`1px solid ${C.border}`}}>
                        <td style={{padding:'7px'}}>{e.date}</td><td style={{padding:'7px',color:C.muted}}>W{wk(e.date)}</td>
                        <td style={{padding:'7px',fontWeight:600}}>{e.client}</td>
                        <td style={{padding:'7px'}}><Badge cat={sv?.cat||'other'} name={sv?.name||'—'}/></td>
                        <td style={{padding:'7px'}}>{f2(e.retailPrice)}</td>
                        <td style={{padding:'7px',color:(+e.discount||0)>0?C.danger:C.muted}}>{(+e.discount||0)>0?`−${f2(e.discount)}`:'—'}</td>
                        <td style={{padding:'7px',color:C.warn}}>{(+e.tip||0)>0?f2(e.tip):'—'}</td>
                        <td style={{padding:'7px',color:C.muted}}>{f2(cogs)}</td>
                        <td style={{padding:'7px',fontWeight:600}}>{f2(net)}</td>
                        <td style={{padding:'7px',fontWeight:700,color:(net-cogs)>=0?C.success:C.danger}}>{f2(net-cogs)}</td>
                        <td style={{padding:'7px',color:C.muted,maxWidth:'80px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.notes||'—'}</td>
                        {isAdmin&&<td style={{padding:'7px'}}><button onClick={()=>setLogData(p=>({...p,[mk]:(p[mk]||[]).filter(x=>x.id!==e.id)}))} style={{background:'none',border:'none',color:C.muted,cursor:'pointer',fontSize:'13px'}}>✕</button></td>}
                      </tr>
                    );})}
                  </tbody>
                  <tfoot><tr style={{background:C.bg,borderTop:`2px solid ${C.accent}55`}}>
                    <td colSpan={4} style={{padding:'8px 7px',fontWeight:700,fontSize:'10px',color:C.navy}}>TOTALS</td>
                    <td style={{padding:'8px 7px',fontWeight:700}}>{f0(entries.reduce((s,e)=>s+(+e.retailPrice||0),0))}</td>
                    <td style={{padding:'8px 7px',fontWeight:700,color:C.danger}}>−{f0(entries.reduce((s,e)=>s+(+e.discount||0),0))}</td>
                    <td style={{padding:'8px 7px',fontWeight:700,color:C.warn}}>{f0(comm.totTips)}</td>
                    <td style={{padding:'8px 7px',fontWeight:700,color:C.muted}}>{f0(comm.totCogs)}</td>
                    <td style={{padding:'8px 7px',fontWeight:700}}>{f0(comm.svcRev)}</td>
                    <td style={{padding:'8px 7px',fontWeight:700,color:C.success}}>{f0(comm.gp)}</td>
                    <td colSpan={isAdmin?2:1}/>
                  </tr></tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── COMMISSION (admin) ── */}
        {view==='commission'&&isAdmin&&(
          <>
            {prov?.hasHourly&&(
              <div style={cardS()}>
                <div style={lblS()}>Compensation Mode — {prov?.name||""}</div>
                <div style={{fontSize:'10px',color:C.muted,marginBottom:'12px'}}>Toggle anytime — updates all calculations instantly.</div>
                <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  {[{k:'hourly_goal',l:'Mode A: Hourly + Goal Commission',d:`$${prov?.hourlyRate||0}/hr base. Commission only on revenue above goal.`},{k:'commission_first',l:'Mode B: Commission First',d:'No hourly. Commission applies from $0 by category.'}].map(m=>(
                    <button key={m.k} onClick={()=>updProv(prov?.id,{compType:m.k})} style={{...Btn(prov?.compType===m.k?'primary':'secondary'),display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'12px 18px',gap:'3px',flex:1,minWidth:'200px',textAlign:'left'}}>
                      <span>{m.l}</span><span style={{fontSize:'10px',fontWeight:400,opacity:0.6}}>{m.d}</span>
                    </button>
                  ))}
                </div>
                {prov?.compType==='hourly_goal'&&(
                  <div style={{display:'flex',gap:'14px',alignItems:'flex-end',marginTop:'14px',flexWrap:'wrap'}}>
                    <div><label style={lblS()}>Hourly Rate</label><input type="number" value={prov?.hourlyRate||0} onChange={e=>updProv(prov?.id,{hourlyRate:+e.target.value||0})} style={inp({width:'100px'})}/></div>
                    <div><label style={lblS()}>Hours This Month</label><input type="number" value={hrs||''} placeholder="0" onChange={e=>setHrs(e.target.value)} style={inp({width:'100px'})}/></div>
                    <div style={{paddingBottom:'8px'}}>Base Pay: <strong style={{color:C.navy,fontSize:'15px'}}>{f0(comm.basePay)}</strong></div>
                  </div>
                )}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))',gap:'10px',marginBottom:'14px'}}>
              {prov?.compType==='hourly_goal'&&<div style={cardS({marginBottom:0})}><div style={lblS()}>Base Pay</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.basePay)}</div><div style={{fontSize:'10px',color:C.muted}}>${prov?.hourlyRate||0}/hr × {comm.hrs} hrs</div></div>}
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Injectable Comm</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.injC)}</div><div style={{fontSize:'10px',color:C.muted}}>{f0(comm.injRev)} · {comm.iT.rate}% tier</div></div>
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Facial Comm</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.facC)}</div><div style={{fontSize:'10px',color:C.muted}}>{f0(comm.facRev)} · {comm.fT.rate}% tier</div></div>
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Membership Bonuses</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.memB)}</div><div style={{fontSize:'10px',color:C.muted}}>{comm.memCt} × ${prov?.membershipBonus||10}</div></div>
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Retail Commission</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.retComm)}</div><div style={{fontSize:'10px',color:C.muted}}>{f0(comm.retRev)} × {prov?.retailCommRate||0||0}%</div></div>
              <div style={{...cardS({marginBottom:0}),background:C.navy}}><div style={{...lblS(),color:C.accentL}}>Total Pay</div><div style={{fontSize:'26px',fontWeight:300,fontFamily:serif,color:'#fff'}}>{f0(comm.totalPay)}</div></div>
            </div>
            <div style={{marginBottom:'14px'}}>
              <button onClick={()=>{
                const breakdown=`Injectable Revenue: ${f0(comm.injRev)} x ${comm.iT.rate}% = ${f0(comm.injC)}\nFacial Revenue: ${f0(comm.facRev)} x ${comm.fT.rate}% = ${f0(comm.facC)}\nRetail Commission: ${f0(comm.retComm)}\nMembership Bonuses: ${f0(comm.memB)}${prov?.compType==='hourly_goal'?`\nBase Pay: $${prov?.hourlyRate||0}/hr x ${comm.hrs} hrs = ${f0(comm.basePay)}`:''}\n\nTOTAL PAY: ${f0(comm.totalPay)}`;
                const win=window.open('','_blank');
                win.document.write(`<html><head><title>Payroll — ${prov?.name||""} — ${ml}</title><style>body{font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto}h1{font-size:24px;font-weight:300}table{width:100%;border-collapse:collapse;margin:16px 0}td{padding:8px;border-bottom:1px solid #eee}td:last-child{text-align:right;font-weight:600}.total{font-size:18px;font-weight:700;color:#253649}</style></head><body><h1>Payroll Summary</h1><p><strong>${prov?.name||""}</strong> · ${prov?.role||""} · ${ml}</p><table>${breakdown.split('\n').map(l=>`<tr><td colspan="2">${l}</td></tr>`).join('')}</table><p class="total">TOTAL PAY: ${f0(comm.totalPay)}</p><p style="color:#999;font-size:12px;margin-top:40px">Lumé Haus by CornerstoneMD · Dr. Louis Gilbert, MD</p></body></html>`);
                win.document.close();win.print();
              }} style={Btn('secondary',{padding:'8px 18px',fontSize:'11px'})}>🖨️ Print / Save Payroll Summary</button>
            </div>
            <div style={cardS()}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
                {[{l:'💉 Injectable Tiers',tiers:prov?.injectableTiers||[]||[],aR:comm.iT.rate,rev:comm.injRev,key:'injectableTiers'},{l:'✨ Facial Tiers',tiers:prov?.facialTiers||[]||[],aR:comm.fT.rate,rev:comm.facRev,key:'facialTiers'}].map(cat=>(
                  <div key={cat.l}>
                    <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.08em',textTransform:'uppercase',color:C.accent,marginBottom:'6px'}}>{cat.l} — Current: {f0(cat.rev)}</div>
                    {cat.tiers.map((t,i)=>{const from=i===0?0:(cat.tiers[i-1].upTo+1);const curr=cat.aR===t.rate&&cat.rev>0;return(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',borderRadius:'8px',marginBottom:'4px',background:curr?C.accentBg:C.bg,border:`1px solid ${curr?C.accent:C.border}`}}>
                        <span style={{fontSize:'12px'}}>{f0(from)} – {t.upTo>=99999?'∞':f0(t.upTo)}</span>
                        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                          <span style={{padding:'2px 9px',borderRadius:'999px',background:t.rate>=25?C.successBg:t.rate>=20?C.accentBg:C.warnBg,color:t.rate>=25?C.success:t.rate>=20?C.accent:C.warn,fontSize:'10px',fontWeight:700}}>{t.rate}%</span>
                          {curr&&<span style={{fontSize:'9px',fontWeight:700,color:C.accent}}>← Active</span>}
                        </div>
                      </div>
                    );})}
                  </div>
                ))}
              </div>
              <div style={{marginTop:'14px',padding:'10px 14px',background:C.warnBg,borderRadius:'8px',fontSize:'10px',color:C.warn}}>
                💡 Tips ({f0(comm.totTips)}) are tracked but NOT included in commission. · Retail commission = Retail Revenue × {prov?.retailCommRate||0||0}% = {f0(comm.retComm)}
              </div>
            </div>
          </>
        )}

        {/* ── CATALOG (admin) ── */}
        {view==='catalog'&&isAdmin&&(
          <div style={cardS()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
              <div><div style={lblS()}>Service Catalog & COG Pricing</div><div style={{fontSize:'10px',color:C.muted}}>Admin only. COGs: Flat (per session), Per Unit, or Per Vial. Auto-fill in log when selected.</div></div>
              <button style={Btn('primary')} onClick={()=>setSvcOpen(!svcOpen)}>{svcOpen?'✕ Cancel':'+ Add Service'}</button>
            </div>
            {svcOpen&&(
              <div style={{background:C.bg,borderRadius:'10px',padding:'16px',marginBottom:'16px',border:`1px solid ${C.border}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:'10px',marginBottom:'12px'}}>
                  <div><label style={lblS()}>Name</label><input value={newSvc.name} onChange={e=>setNewSvc(p=>({...p,name:e.target.value}))} placeholder="Service name" style={inp()}/></div>
                  <div><label style={lblS()}>Category</label><select value={newSvc.cat} onChange={e=>setNewSvc(p=>({...p,cat:e.target.value}))} style={sel()}>{['injectable','facial','other','membership','retail'].map(c=><option key={c} value={c}>{c}</option>)}</select></div>
                  <div><label style={lblS()}>Retail Price ($)</label><input type="number" value={newSvc.price} onChange={e=>setNewSvc(p=>({...p,price:+e.target.value||0}))} style={inp()}/></div>
                  <div><label style={lblS()}>COG Type</label><select value={newSvc.cogsType} onChange={e=>setNewSvc(p=>({...p,cogsType:e.target.value}))} style={sel()}><option value="flat">Flat</option><option value="per_unit">Per Unit</option><option value="per_vial">Per Vial</option></select></div>
                  {newSvc.cogsType==='flat'&&<div><label style={lblS()}>COG ($)</label><input type="number" value={newSvc.cogsFlat} onChange={e=>setNewSvc(p=>({...p,cogsFlat:+e.target.value||0}))} style={inp()}/></div>}
                  {newSvc.cogsType==='per_unit'&&<div><label style={lblS()}>COG / Unit ($)</label><input type="number" value={newSvc.cogsUnit} onChange={e=>setNewSvc(p=>({...p,cogsUnit:+e.target.value||0}))} style={inp()}/></div>}
                  {newSvc.cogsType==='per_vial'&&<div><label style={lblS()}>COG / Vial ($)</label><input type="number" value={newSvc.cogsVial} onChange={e=>setNewSvc(p=>({...p,cogsVial:+e.target.value||0}))} style={inp()}/></div>}
                  <div><label style={lblS()}>Unit Label</label><input value={newSvc.unit} onChange={e=>setNewSvc(p=>({...p,unit:e.target.value}))} placeholder="session, unit, vial…" style={inp()}/></div>
                </div>
                <button style={Btn('primary')} onClick={saveSvc}>✓ Save Service</button>
              </div>
            )}
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:'11px',minWidth:'640px'}}>
                <thead><tr>{['Service','Category','Retail','COG Type','COG Cost','Unit','Active',''].map(h=><th key={h} style={{textAlign:'left',padding:'6px 8px',fontSize:'9px',fontWeight:700,letterSpacing:'0.06em',textTransform:'uppercase',color:C.muted,borderBottom:`1px solid ${C.border}`}}>{h}</th>)}</tr></thead>
                <tbody>
                  {catalog.map(c=>{const ed=editSvc===c.id;return(
                    <tr key={c.id} style={{borderBottom:`1px solid ${C.border}`,background:ed?C.bg:'transparent'}}>
                      <td style={{padding:'8px'}}>{ed?<input value={c.name} onChange={e=>updSvc(c.id,{name:e.target.value})} style={inp({padding:'4px 7px',fontSize:'11px'})}/>:<strong>{c.name}</strong>}</td>
                      <td style={{padding:'8px'}}><Badge cat={c.cat} name={c.cat}/></td>
                      <td style={{padding:'8px'}}>{ed?<input type="number" value={c.price} onChange={e=>updSvc(c.id,{price:+e.target.value||0})} style={inp({padding:'4px 7px',fontSize:'11px',width:'75px'})}/>:f2(c.price)}</td>
                      <td style={{padding:'8px',color:C.muted,fontSize:'10px'}}>{c.cogsType}</td>
                      <td style={{padding:'8px'}}>{ed?(
                        c.cogsType==='per_unit'?<input type="number" value={c.cogsUnit} onChange={e=>updSvc(c.id,{cogsUnit:+e.target.value||0})} style={inp({padding:'4px 7px',fontSize:'11px',width:'75px'})}/>:
                        c.cogsType==='per_vial'?<input type="number" value={c.cogsVial} onChange={e=>updSvc(c.id,{cogsVial:+e.target.value||0})} style={inp({padding:'4px 7px',fontSize:'11px',width:'75px'})}/>:
                        <input type="number" value={c.cogsFlat} onChange={e=>updSvc(c.id,{cogsFlat:+e.target.value||0})} style={inp({padding:'4px 7px',fontSize:'11px',width:'75px'})}/>
                      ):(c.cogsType==='per_unit'?`${f2(c.cogsUnit)}/unit`:c.cogsType==='per_vial'?`${f2(c.cogsVial)}/vial`:f2(c.cogsFlat))}</td>
                      <td style={{padding:'8px',color:C.muted,fontSize:'10px'}}>{c.unit}</td>
                      <td style={{padding:'8px'}}><input type="checkbox" checked={c.active} onChange={e=>updSvc(c.id,{active:e.target.checked})}/></td>
                      <td style={{padding:'8px',whiteSpace:'nowrap'}}>
                        <button onClick={()=>setEditSvc(ed?null:c.id)} style={Btn('secondary',{padding:'3px 10px',fontSize:'10px',marginRight:'4px'})}>{ed?'Done':'Edit'}</button>
                        <button onClick={()=>setCatalog(p=>p.filter(x=>x.id!==c.id))} style={Btn('danger',{padding:'3px 8px',fontSize:'10px'})}>✕</button>
                      </td>
                    </tr>
                  );})}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── PROVIDERS (admin) ── */}
        {view==='providers'&&isAdmin&&(
          <>
            <div style={cardS()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <div><div style={lblS()}>Provider Management</div><div style={{fontSize:'10px',color:C.muted}}>Edit comp plans, tiers, goals, and staff login credentials. Staff cannot access this section.</div></div>
                <button style={Btn('primary')} onClick={()=>setProvOpen(!provOpen)}>{provOpen?'✕ Cancel':'+ Add Provider'}</button>
              </div>
              {provOpen&&(
                <div style={{background:C.bg,borderRadius:'10px',padding:'16px',border:`1px solid ${C.border}`}}>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:'10px',marginBottom:'12px'}}>
                    <div><label style={lblS()}>Full Name</label><input value={newProv.name} onChange={e=>setNewProv(p=>({...p,name:e.target.value}))} placeholder="Provider name" style={inp()}/></div>
                    <div><label style={lblS()}>Role</label><input value={newProv.role} onChange={e=>setNewProv(p=>({...p,role:e.target.value}))} placeholder="Injector, Esthetician…" style={inp()}/></div>
                    <div><label style={lblS()}>Monthly Goal ($)</label><input type="number" value={newProv.monthlyGoal} onChange={e=>setNewProv(p=>({...p,monthlyGoal:+e.target.value||0}))} style={inp()}/></div>
                    <div><label style={lblS()}>Tab Color</label><input type="color" value={newProv.color} onChange={e=>setNewProv(p=>({...p,color:e.target.value}))} style={{...inp(),padding:'4px',height:'36px'}}/></div>
                    <div><label style={lblS()}>Membership Bonus ($)</label><input type="number" value={newProv.membershipBonus} onChange={e=>setNewProv(p=>({...p,membershipBonus:+e.target.value||0}))} style={inp()}/></div>
                    <div><label style={lblS()}>Hourly Option</label><div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'6px'}}><input type="checkbox" checked={newProv.hasHourly} onChange={e=>setNewProv(p=>({...p,hasHourly:e.target.checked}))}/><span style={{fontSize:'12px',color:C.muted}}>Enable hourly pay</span></div></div>
                    {newProv.hasHourly&&<div><label style={lblS()}>Hourly Rate ($/hr)</label><input type="number" value={newProv.hourlyRate} onChange={e=>setNewProv(p=>({...p,hourlyRate:+e.target.value||0}))} style={inp()}/></div>}
                  </div>
                  <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>Default login: username = first name (lowercase), password = "LH2025". Update in the provider's card after saving.</div>
                  <button style={Btn('primary')} onClick={saveProv}>✓ Add Provider</button>
                </div>
              )}
            </div>
            {providers.map(p=>{
              const ed=editProv===p.id;
              const pc=creds.providers[p.id]||{username:'',password:''};
              return(
                <div key={p.id} style={cardS()}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:ed?'18px':'0'}}>
                    <div style={{display:'flex',gap:'12px',alignItems:'center'}}>
                      <div style={{width:'14px',height:'14px',borderRadius:'50%',background:p.color,flexShrink:0}}/>
                      <div><div style={{fontWeight:700,fontSize:'14px',color:C.navy}}>{p.name}</div><div style={{fontSize:'11px',color:C.muted}}>{p.role} · Goal: {f0(p.monthlyGoal)} · Login: <strong>{pc.username}</strong></div></div>
                    </div>
                    <div style={{display:'flex',gap:'6px'}}>
                      <button style={Btn('secondary',{padding:'6px 14px',fontSize:'11px'})} onClick={()=>setEditProv(ed?null:p.id)}>{ed?'Done':'Edit'}</button>
                      {providers.length>1&&<button style={Btn('danger',{padding:'6px 10px',fontSize:'11px'})} onClick={()=>{if(providers.length>1){setProviders(x=>x.filter(q=>q.id!==p.id));if(sid===p.id)setSid(providers.find(q=>q.id!==p.id)?.id||'');}}}>Remove</button>}
                    </div>
                  </div>
                  {ed&&(
                    <div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:'10px',marginBottom:'16px'}}>
                        <div><label style={lblS()}>Name</label><input value={p.name} onChange={e=>updProv(p.id,{name:e.target.value})} style={inp()}/></div>
                        <div><label style={lblS()}>Role</label><input value={p.role} onChange={e=>updProv(p.id,{role:e.target.value})} style={inp()}/></div>
                        <div><label style={lblS()}>Monthly Goal ($)</label><input type="number" value={p.monthlyGoal} onChange={e=>updProv(p.id,{monthlyGoal:+e.target.value||0})} style={inp()}/></div>
                        <div><label style={lblS()}>Tab Color</label><input type="color" value={p.color} onChange={e=>updProv(p.id,{color:e.target.value})} style={{...inp(),padding:'4px',height:'36px'}}/></div>
                        <div><label style={lblS()}>Membership Bonus ($)</label><input type="number" value={p.membershipBonus} onChange={e=>updProv(p.id,{membershipBonus:+e.target.value||0})} style={inp()}/></div>
                        <div><label style={lblS()}>Retail Commission %</label><input type="number" value={p.retailCommRate||0} onChange={e=>updProv(p.id,{retailCommRate:+e.target.value||0})} style={inp()}/></div>
                        <div><label style={lblS()}>Hourly Option</label><div style={{display:'flex',gap:'8px',alignItems:'center',marginTop:'6px'}}><input type="checkbox" checked={!!p.hasHourly} onChange={e=>updProv(p.id,{hasHourly:e.target.checked})}/><span style={{fontSize:'12px'}}>Enable hourly</span></div></div>
                        {p.hasHourly&&<><div><label style={lblS()}>Hourly Rate ($/hr)</label><input type="number" value={p.hourlyRate} onChange={e=>updProv(p.id,{hourlyRate:+e.target.value||0})} style={inp()}/></div>
                        <div><label style={lblS()}>Comp Mode</label><select value={p.compType} onChange={e=>updProv(p.id,{compType:e.target.value})} style={sel()}><option value="hourly_goal">Mode A: Hourly + Goal</option><option value="commission_first">Mode B: Commission First</option></select></div></>}
                      </div>
                      <div style={{background:C.bg,borderRadius:'10px',padding:'16px',display:'grid',gridTemplateColumns:'1fr 1fr',gap:'24px',marginBottom:'14px'}}>
                        <TierEditor label="💉 Injectable Tiers (Up to $ → Rate %)" tiers={p.injectableTiers||[]} onUpdate={tiers=>updProv(p.id,{injectableTiers:tiers})}/>
                        <TierEditor label="✨ Facial / Skin Tiers (Up to $ → Rate %)" tiers={p.facialTiers||[]} onUpdate={tiers=>updProv(p.id,{facialTiers:tiers})}/>
                      </div>
                      <div style={{background:C.warnBg,border:`1px solid ${C.warn}44`,borderRadius:'10px',padding:'14px'}}>
                        <div style={{fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.warn,marginBottom:'10px'}}>🔑 Staff Login Credentials</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                          <div><label style={{...lblS(),color:C.warn}}>Username</label><input value={pc.username} onChange={e=>setCreds(c=>({...c,providers:{...c.providers,[p.id]:{...pc,username:e.target.value}}}))} style={inp()}/></div>
                          <div><label style={{...lblS(),color:C.warn}}>Password</label><input value={pc.password} onChange={e=>setCreds(c=>({...c,providers:{...c.providers,[p.id]:{...pc,password:e.target.value}}}))} style={inp()}/></div>
                        </div>
                        <div style={{fontSize:'10px',color:C.warn,marginTop:'8px'}}>⚠ Share credentials directly with the provider only. Changes auto-save.</div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            <div style={cardS()}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'10px'}}>
                <div>
                  <div style={lblS()}>🔐 Admin Accounts</div>
                  <div style={{fontSize:'10px',color:C.muted,marginTop:'2px'}}>Admins have full access to all data, pay rates, and settings. Keep credentials secure.</div>
                </div>
                <button style={Btn('primary',{fontSize:'11px'})} onClick={()=>setCreds(c=>({...c,admins:[...(c.admins||[]),{id:uid(),name:'New Admin',username:'admin'+Date.now(),password:'LH2025'}]}))}>+ Add Admin</button>
              </div>
              {(creds.admins||[]).map((admin,i)=>(
                <div key={admin.id} style={{background:C.bg,borderRadius:'10px',padding:'14px',marginBottom:'10px',border:`1px solid ${C.border}`}}>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr auto',gap:'10px',alignItems:'end'}}>
                    <div><label style={lblS()}>Name</label><input value={admin.name} onChange={e=>setCreds(c=>({...c,admins:c.admins.map((a,j)=>j===i?{...a,name:e.target.value}:a)}))} style={inp()}/></div>
                    <div><label style={lblS()}>Username</label><input value={admin.username} onChange={e=>setCreds(c=>({...c,admins:c.admins.map((a,j)=>j===i?{...a,username:e.target.value}:a)}))} style={inp()}/></div>
                    <div><label style={lblS()}>Password</label><input value={admin.password} onChange={e=>setCreds(c=>({...c,admins:c.admins.map((a,j)=>j===i?{...a,password:e.target.value}:a)}))} style={inp()}/></div>
                    <button disabled={(creds.admins||[]).length<=1} onClick={()=>setCreds(c=>({...c,admins:c.admins.filter((_,j)=>j!==i)}))} style={{...Btn('danger',{padding:'8px 10px',fontSize:'11px'}),opacity:(creds.admins||[]).length<=1?0.4:1}}>Remove</button>
                  </div>
                </div>
              ))}
              <div style={{fontSize:'10px',color:C.warn,padding:'8px 12px',background:C.warnBg,borderRadius:'7px',marginTop:'4px'}}>⚠ Must keep at least one admin account. Changes auto-save.</div>
            </div>
          </>
        )}

        {view==='expenses'&&isAdmin&&<ExpensesView expenses={expenses} setExpenses={setExpenses} month={month} payroll={payroll} setPayroll={setPayroll} providers={providers} logData={logData} hoursData={hoursData} retailData={retailData} catalog={catalog}/>}
        {view==='projects'&&isAdmin&&<ProjectsView projects={projects} setProjects={setProjects} providers={providers} vaUsers={vaUsers} setVaUsers={setVaUsers} creds={creds} setCreds={setCreds} emailConfig={emailConfig} month={month} setMonth={setMonth}/>}
        {view==='myprojects'&&auth?.role!=='admin'&&auth?.role!=='va'&&<StaffProjectsView projects={projects} setProjects={setProjects} provId={auth?.providerId} provName={prov?.name}/> }
        {view==='tasks'&&auth?.role!=='admin'&&auth?.role!=='va'&&<TasksView projects={projects} setProjects={setProjects} provId={auth?.providerId} provName={prov?.name} month={month} importantDetails={importantDetails} setImportantDetails={setImportantDetails} emailConfig={emailConfig} providerName={prov?.name} kpiData={kpiData} setKpiData={setKpiData}/>}
        {auth?.role==='va'&&<VAView projects={projects} setProjects={setProjects} auth={auth} vaUsers={vaUsers} setVaUsers={setVaUsers} month={month} importantDetails={importantDetails} setImportantDetails={setImportantDetails} emailConfig={emailConfig}/>}
        {view==='kpi'&&isAdmin&&<KPIView providers={providers} kpiData={kpiData} setKpiData={setKpiData} month={month}/>}
        {view==='analytics'&&isAdmin&&<AnalyticsView expenses={expenses} payroll={payroll} providers={providers} logData={logData} hoursData={hoursData} retailData={retailData} catalog={catalog} month={month}/>}
        {view==='breakeven'&&isAdmin&&<BreakevenView expenses={expenses} payroll={payroll} providers={providers} logData={logData} hoursData={hoursData} retailData={retailData} catalog={catalog}/>}


        {/* PROVIDER KPI VIEW on staff dashboard */}
        {view==='dashboard'&&!isAdmin&&auth?.role!=='va'&&(
          <ProviderKPIView provId={auth?.providerId} provName={prov?.name} kpiData={kpiData} setKpiData={setKpiData}/>
        )}

        {/* PROVIDER DAILY/WEEKLY TASK VIEW on staff dashboard */}
        {view==='dashboard'&&!isAdmin&&auth?.role!=='va'&&(
          <ProviderTaskView projects={projects} setProjects={setProjects} provId={auth?.providerId} provName={prov?.name} month={month}/>
        )}

                <div style={{textAlign:'center',padding:'20px 0 8px',fontSize:'9px',color:C.muted,letterSpacing:'0.12em',fontWeight:700}}>
          LUMÉ HAUS BY CORNERSTONEMD · PHYSICIAN-SUPERVISED · DR. LOUIS GILBERT, MD · LUMEHAUS.HEALTH
        </div>
      </div>
    </div>
  );
}
