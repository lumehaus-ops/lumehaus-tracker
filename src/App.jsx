import { useState, useEffect, useMemo } from "react";
import * as XLSX from 'xlsx';
import { dbGet, dbSet } from './supabase.js';

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
const DEF_CREDS={adminUser:'admin',adminPass:'LumeAdmin2025',providers:{lauren:{username:'lauren',password:'Lauren2025'},emy:{username:'emy',password:'Emy2025'},megan:{username:'megan',password:'Megan2025'}}};

function calcComm(entries,prov,catalog,hrs,retail){
  const rows=entries.map(e=>{const s=catalog.find(c=>c.id===e.serviceId);const net=Math.max(0,(+e.retailPrice||0)-(+e.discount||0));const cogs=e.cogsOverride?(+e.cogsManual||0):cogCalc(s,e.unitsUsed,e.vialsUsed);return{...e,net,cogs,tip:+e.tip||0,cat:s?.cat||'other'};});
  const injRev=rows.filter(r=>r.cat==='injectable').reduce((s,r)=>s+r.net,0);
  const facRev=rows.filter(r=>r.cat==='facial').reduce((s,r)=>s+r.net,0);
  const svcRev=rows.reduce((s,r)=>s+r.net,0);
  const retRev=+retail?.rev||0,retCogs=+retail?.cogs||0;
  const totRev=svcRev+retRev,totCogs=rows.reduce((s,r)=>s+r.cogs,0)+retCogs;
  const totTips=rows.reduce((s,r)=>s+r.tip,0),memCt=rows.filter(r=>r.cat==='membership').length;
  const memB=memCt*(prov.membershipBonus||10);
  const retComm=retRev*((prov.retailCommRate||0)/100);
  const gp=totRev-totCogs;
  const iT=(prov.injectableTiers||[]).find(t=>injRev<=t.upTo)||{rate:0};
  const fT=(prov.facialTiers||[]).find(t=>facRev<=t.upTo)||{rate:0};
  let basePay=0,injC=0,facC=0,above=0;
  if(prov.compType==='hourly_goal'){basePay=(+hrs||0)*(+prov.hourlyRate||0);above=Math.max(0,svcRev-(prov.monthlyGoal||0));if(above>0&&svcRev>0){injC=(above*(injRev/svcRev))*(iT.rate/100);facC=(above*(facRev/svcRev))*(fT.rate/100);}}
  else{injC=injRev*(iT.rate/100);facC=facRev*(fT.rate/100);}
  return{totRev,svcRev,injRev,facRev,retRev,totCogs,retCogs,gp,totTips,memCt,memB,retComm,basePay,iT,fT,injC,facC,totC:injC+facC+memB+retComm,totalPay:basePay+injC+facC+memB+retComm,above,hrs:+hrs||0};
}

function LoginScreen({providers,creds,onLogin}){
  const[user,setUser]=useState(''),pass=useState(''),show=useState(false),err=useState('');
  const[pw,setPw]=pass,[showPw,setShow]=show,[errMsg,setErr]=err;
  function attempt(){
    if(user.trim()===creds.adminUser&&pw===creds.adminPass){onLogin({role:'admin',providerId:null});return;}
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
  const stats=providers.map(p=>{const mk=`${p.id}:${month}`;return{p,c:calcComm(logData[mk]||[],p,catalog,hoursData[mk]||0,retailData[mk]||{})};});
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
        const cr=await dbGet('lh4:creds');if(cr)setCreds(JSON.parse(cr));
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

  const isAdmin=auth?.role==='admin';
  const prov=providers.find(p=>p.id===(isAdmin?sid:auth?.providerId))||providers[0];
  const mk=prov?`${prov.id}:${month}`:'none';
  const entries=logData[mk]||[];
  const hrs=hoursData[mk]||0;
  const retail=retailData[mk]||{rev:0,cogs:0};
  const comm=useMemo(()=>prov?calcComm(entries,prov,catalog,hrs,retail):{totRev:0,svcRev:0,injRev:0,facRev:0,retRev:0,totCogs:0,retCogs:0,gp:0,totTips:0,memCt:0,memB:0,retComm:0,basePay:0,iT:{rate:0},fT:{rate:0},injC:0,facC:0,totC:0,totalPay:0,above:0,hrs:0},[entries,prov,catalog,hrs,retail]);

  if(!ready)return<div style={{minHeight:'100vh',background:C.navy,display:'flex',alignItems:'center',justifyContent:'center',color:C.accentL,fontFamily:sans}}>Loading…</div>;
  if(!auth)return<LoginScreen providers={providers} creds={creds} onLogin={a=>{setAuth(a);if(a.role==='staff'){setSid(a.providerId);setView('dashboard');}else setView('combined');}}/>;
  const selSvc=catalog.find(c=>c.id===entry.serviceId);
  const autoCOG=cogCalc(selSvc,entry.unitsUsed,entry.vialsUsed);
  const ml=new Date(month+'-02').toLocaleString('default',{month:'long',year:'numeric'});
  const gPct=pct(comm.svcRev,prov.monthlyGoal);
  const weeks=[1,2,3,4,5].map(w=>({w,rev:entries.filter(e=>wk(e.date)===w).reduce((s,e)=>s+Math.max(0,(+e.retailPrice||0)-(+e.discount||0)),0),cnt:entries.filter(e=>wk(e.date)===w).length}));
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

    XLSX.writeFile(wb, `LumeHaus_${isAdmin?'AllProviders':prov.name.replace(/ /g,'_')}_${month}.xlsx`);
  }

  function saveLog(){
    if(!entry.client||!entry.serviceId)return;
    const e2={...entry,id:uid(),retailPrice:+entry.retailPrice||(selSvc?.price||0),discount:+entry.discount||0,tip:+entry.tip||0,cogsManual:entry.cogsOverride?(+entry.cogsManual||0):autoCOG};
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

  const navItems=isAdmin?['combined','dashboard','log','commission','catalog','providers']:['dashboard','log'];
  const navLabels={'combined':'👥 All Providers','dashboard':'Dashboard','log':'Log','commission':'Commission','catalog':'Catalog','providers':'Providers'};

  return(
    <div style={{background:C.bg,minHeight:'100vh',fontFamily:sans,color:C.text}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@300;400;600&family=Montserrat:wght@300;400;500;600&display=swap" rel="stylesheet"/>
      {/* TOP BAR */}
      <div style={{background:C.navy,padding:'12px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',position:'sticky',top:0,zIndex:100,boxShadow:'0 2px 8px rgba(0,0,0,0.2)',flexWrap:'wrap',gap:'8px'}}>
        <div style={{fontFamily:serif,fontSize:'18px',fontWeight:300,letterSpacing:'0.1em',color:'#fff'}}>
          <span style={{color:C.accentL}}>Lumé Haus</span>
          {isAdmin&&<span style={{fontFamily:sans,fontSize:'10px',fontWeight:700,background:'rgba(255,255,255,0.12)',color:C.accentL,padding:'2px 8px',borderRadius:'999px',marginLeft:'10px'}}>ADMIN</span>}
          {!isAdmin&&<span style={{fontFamily:sans,fontSize:'11px',color:'rgba(255,255,255,0.4)',marginLeft:'10px'}}>Welcome, {prov.name}</span>}
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

      <div style={{maxWidth:'1140px',margin:'0 auto',padding:'18px 16px'}}>
        {/* PROVIDER TABS (admin) */}
        {isAdmin&&(
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
        {view==='combined'&&isAdmin&&<CombinedView providers={providers} logData={logData} hoursData={hoursData} retailData={retailData} catalog={catalog} month={month}/>}

        {/* ── DASHBOARD ── */}
        {view==='dashboard'&&(
          <>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(145px,1fr))',gap:'10px',marginBottom:'14px'}}>
              {[{l:'Total Revenue',v:f0(comm.totRev),s:'Net after discounts'},{l:isAdmin?'Total Pay':'Est. Pay',v:f0(comm.totalPay),s:prov.compType==='hourly_goal'?'Base + commission':'Commission',hi:true},{l:'Total COGs',v:f0(comm.totCogs),s:'Services + retail'},{l:'Gross Profit',v:f0(comm.gp),s:'Revenue − COGs'},{l:'% to Goal',v:`${gPct.toFixed(0)}%`,s:`Goal: ${f0(prov.monthlyGoal)}`},{l:'Tips',v:f0(comm.totTips),s:'Not in commission'}].map((k,i)=>(
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
                  <span style={{fontWeight:700,fontSize:'13px',color:C.navy}}>{prov.name} · {ml}</span>
                  {prov.hasHourly&&<span style={{fontSize:'10px',padding:'2px 9px',borderRadius:'999px',background:prov.compType==='hourly_goal'?C.accentBg:C.successBg,color:prov.compType==='hourly_goal'?C.accent:C.success,fontWeight:700}}>{prov.compType==='hourly_goal'?'Mode A: Hourly + Goal':'Mode B: Commission First'}</span>}
                </div>
                <span style={{fontWeight:700,color:C.navy}}>{f0(comm.svcRev)} / {f0(prov.monthlyGoal)}</span>
              </div>
              <div style={{background:C.bg,borderRadius:'999px',height:'10px',overflow:'hidden'}}><div style={{height:'100%',borderRadius:'999px',width:`${gPct}%`,background:gPct>=100?C.success:gPct>=70?prov.color:C.warn,transition:'width 0.5s'}}/></div>
              {gPct>=100&&<div style={{fontSize:'11px',color:C.success,marginTop:'5px',fontWeight:700}}>🎉 Monthly goal reached!</div>}
              {prov.hasHourly&&prov.compType==='hourly_goal'&&comm.above>0&&<div style={{fontSize:'11px',color:C.success,marginTop:'5px'}}>✓ {f0(comm.above)} above goal — commission active on overage</div>}
              {prov.hasHourly&&prov.compType==='hourly_goal'&&!comm.above&&comm.svcRev>0&&<div style={{fontSize:'11px',color:C.warn,marginTop:'5px'}}>⏳ {f0((prov.monthlyGoal||0)-comm.svcRev)} away from goal — commission activates then</div>}
            </div>
            {/* HOURLY (admin, Mode A) */}
            {isAdmin&&prov.hasHourly&&prov.compType==='hourly_goal'&&(
              <div style={cardS({padding:'14px 18px'})}>
                <label style={lblS()}>Hours Worked — {ml}</label>
                <div style={{fontSize:'10px',color:C.muted,marginBottom:'10px'}}>Base Pay = Hourly Rate × Hours. Commission only activates on service revenue above goal.</div>
                <div style={{display:'flex',gap:'16px',alignItems:'flex-end',flexWrap:'wrap'}}>
                  <div><label style={lblS()}>Hours This Month</label><input type="number" value={hrs||''} placeholder="0" onChange={e=>setHrs(e.target.value)} style={inp({width:'110px'})}/></div>
                  <div style={{paddingBottom:'8px',fontSize:'12px',color:C.muted}}>× ${prov.hourlyRate}/hr</div>
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
        {view==='log'&&(
          <div style={cardS()}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'12px'}}>
              <div><div style={lblS()}>Service Log — {prov.name} · {ml}</div><div style={{fontSize:'10px',color:C.muted}}>Net = Retail − Discount. COGs auto-fill from catalog.</div></div>
              <button style={Btn('primary')} onClick={()=>setLogOpen(!logOpen)}>{logOpen?'✕ Cancel':'+ Add Service'}</button>
            </div>
            {logOpen&&(
              <div style={{background:C.bg,borderRadius:'10px',padding:'16px',marginBottom:'16px',border:`1px solid ${C.border}`}}>
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(135px,1fr))',gap:'10px',marginBottom:'12px'}}>
                  <div><label style={lblS()}>Date</label><input type="date" value={entry.date} onChange={e=>setEntry(p=>({...p,date:e.target.value}))} style={inp()}/></div>
                  <div><label style={lblS()}>Client *</label><input value={entry.client} onChange={e=>setEntry(p=>({...p,client:e.target.value}))} placeholder="Client name" style={inp()}/></div>
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
            {prov.hasHourly&&(
              <div style={cardS()}>
                <div style={lblS()}>Compensation Mode — {prov.name}</div>
                <div style={{fontSize:'10px',color:C.muted,marginBottom:'12px'}}>Toggle anytime — updates all calculations instantly.</div>
                <div style={{display:'flex',gap:'10px',flexWrap:'wrap'}}>
                  {[{k:'hourly_goal',l:'Mode A: Hourly + Goal Commission',d:`$${prov.hourlyRate}/hr base. Commission only on revenue above goal.`},{k:'commission_first',l:'Mode B: Commission First',d:'No hourly. Commission applies from $0 by category.'}].map(m=>(
                    <button key={m.k} onClick={()=>updProv(prov.id,{compType:m.k})} style={{...Btn(prov.compType===m.k?'primary':'secondary'),display:'flex',flexDirection:'column',alignItems:'flex-start',padding:'12px 18px',gap:'3px',flex:1,minWidth:'200px',textAlign:'left'}}>
                      <span>{m.l}</span><span style={{fontSize:'10px',fontWeight:400,opacity:0.6}}>{m.d}</span>
                    </button>
                  ))}
                </div>
                {prov.compType==='hourly_goal'&&(
                  <div style={{display:'flex',gap:'14px',alignItems:'flex-end',marginTop:'14px',flexWrap:'wrap'}}>
                    <div><label style={lblS()}>Hourly Rate</label><input type="number" value={prov.hourlyRate} onChange={e=>updProv(prov.id,{hourlyRate:+e.target.value||0})} style={inp({width:'100px'})}/></div>
                    <div><label style={lblS()}>Hours This Month</label><input type="number" value={hrs||''} placeholder="0" onChange={e=>setHrs(e.target.value)} style={inp({width:'100px'})}/></div>
                    <div style={{paddingBottom:'8px'}}>Base Pay: <strong style={{color:C.navy,fontSize:'15px'}}>{f0(comm.basePay)}</strong></div>
                  </div>
                )}
              </div>
            )}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(148px,1fr))',gap:'10px',marginBottom:'14px'}}>
              {prov.compType==='hourly_goal'&&<div style={cardS({marginBottom:0})}><div style={lblS()}>Base Pay</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.basePay)}</div><div style={{fontSize:'10px',color:C.muted}}>${prov.hourlyRate}/hr × {comm.hrs} hrs</div></div>}
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Injectable Comm</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.injC)}</div><div style={{fontSize:'10px',color:C.muted}}>{f0(comm.injRev)} · {comm.iT.rate}% tier</div></div>
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Facial Comm</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.facC)}</div><div style={{fontSize:'10px',color:C.muted}}>{f0(comm.facRev)} · {comm.fT.rate}% tier</div></div>
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Membership Bonuses</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.memB)}</div><div style={{fontSize:'10px',color:C.muted}}>{comm.memCt} × ${prov.membershipBonus}</div></div>
              <div style={cardS({marginBottom:0})}><div style={lblS()}>Retail Commission</div><div style={{fontSize:'22px',fontWeight:300,fontFamily:serif,color:C.navy}}>{f0(comm.retComm)}</div><div style={{fontSize:'10px',color:C.muted}}>{f0(comm.retRev)} × {prov.retailCommRate||0}%</div></div>
              <div style={{...cardS({marginBottom:0}),background:C.navy}}><div style={{...lblS(),color:C.accentL}}>Total Pay</div><div style={{fontSize:'26px',fontWeight:300,fontFamily:serif,color:'#fff'}}>{f0(comm.totalPay)}</div></div>
            </div>
            <div style={cardS()}>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
                {[{l:'💉 Injectable Tiers',tiers:prov.injectableTiers||[],aR:comm.iT.rate,rev:comm.injRev,key:'injectableTiers'},{l:'✨ Facial Tiers',tiers:prov.facialTiers||[],aR:comm.fT.rate,rev:comm.facRev,key:'facialTiers'}].map(cat=>(
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
                💡 Tips ({f0(comm.totTips)}) are tracked but NOT included in commission. · Retail commission = Retail Revenue × {prov.retailCommRate||0}% = {f0(comm.retComm)}
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
              <div style={lblS()}>🔐 Admin Credentials</div>
              <div style={{fontSize:'10px',color:C.muted,marginBottom:'12px'}}>Admin has full access to all data, pay rates, and settings. Keep these secure.</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'10px'}}>
                <div><label style={lblS()}>Admin Username</label><input value={creds.adminUser} onChange={e=>setCreds(c=>({...c,adminUser:e.target.value}))} style={inp()}/></div>
                <div><label style={lblS()}>Admin Password</label><input value={creds.adminPass} onChange={e=>setCreds(c=>({...c,adminPass:e.target.value}))} style={inp()}/></div>
              </div>
            </div>
          </>
        )}

        <div style={{textAlign:'center',padding:'20px 0 8px',fontSize:'9px',color:C.muted,letterSpacing:'0.12em',fontWeight:700}}>
          LUMÉ HAUS BY CORNERSTONEMD · PHYSICIAN-SUPERVISED · DR. LOUIS GILBERT, MD · LUMEHAUS.HEALTH
        </div>
      </div>
    </div>
  );
}
