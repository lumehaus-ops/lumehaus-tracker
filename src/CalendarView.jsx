import { useState } from 'react';

const C={bg:'#f0f4f7',card:'#fff',navy:'#253649',accent:'#7a9fa3',accentBg:'#eaf2f3',text:'#1a2a35',muted:'#6b8090',border:'#dce4ea',success:'#2e9e68',successBg:'#e6f5ee',warn:'#b87d00',warnBg:'#fef5dc',danger:'#c03030',dangerBg:'#fdeaea',shadow:'0 1px 4px rgba(37,54,73,0.1)'};
const sans="'Montserrat',sans-serif",serif="'Cormorant Garamond',Georgia,serif";
const cardS=(ex={})=>({background:C.card,borderRadius:'12px',padding:'18px',boxShadow:C.shadow,border:`1px solid ${C.border}`,marginBottom:'14px',...ex});
const lblS=(ex={})=>({fontSize:'9px',fontWeight:700,letterSpacing:'0.1em',textTransform:'uppercase',color:C.accent,marginBottom:'4px',display:'block',...ex});
const Btn=(v,ex={})=>{const m={primary:{background:C.navy,color:'#fff',border:'none'},secondary:{background:'#fff',color:C.navy,border:`1px solid ${C.border}`}};return{padding:'8px 16px',borderRadius:'8px',cursor:'pointer',fontFamily:sans,fontWeight:600,fontSize:'12px',...(m[v]||m.primary),...ex};};

const STATUS_COLORS={
  'Not Started':'#888',
  'In Progress':C.accent,
  'Assistance Needed':C.danger,
  'Approval Needed':'#7a4fa3',
  'Complete':C.success,
};

export function CalendarView({ projects, month, setMonth, providers }) {
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
