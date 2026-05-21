import { useState, useEffect } from 'react';
import { getAllSchedules, updateAvailability, createSchedule, getEventTypes, bulkAssignSchedule, deleteSchedule } from '../utils/api';
import toast from 'react-hot-toast';
import { ChevronDown, Plus, MoreVertical, X } from 'lucide-react';
import './Availability.css';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris',
  'Asia/Tokyo', 'Asia/Calcutta',
  'Australia/Sydney'
];

const TIME_OPTIONS = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');
    const val = `${hStr}:${mStr}`;
    const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    const ampm = h < 12 ? 'AM' : 'PM';
    TIME_OPTIONS.push({ value: val, label: `${hour12}:${mStr} ${ampm}` });
  }
}

export default function Availability() {
  const [schedules, setSchedules] = useState([]);
  const [activeScheduleId, setActiveScheduleId] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [eventTypes, setEventTypes] = useState([]);
  
  const [showScheduleDropdown, setShowScheduleDropdown] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showActiveOnDropdown, setShowActiveOnDropdown] = useState(false);
  const [showMoreDropdown, setShowMoreDropdown] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [newScheduleName, setNewScheduleName] = useState('');
  const [renameScheduleName, setRenameScheduleName] = useState('');

  const [slots, setSlots] = useState({});
  const [timezone, setTimezone] = useState('America/New_York');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [schedRes, eventRes] = await Promise.all([
        getAllSchedules(),
        getEventTypes()
      ]);
      setSchedules(schedRes.data);
      setEventTypes(eventRes.data);
      if (schedRes.data.length > 0) {
        const def = schedRes.data.find(s => s.is_default) || schedRes.data[0];
        setActiveScheduleId(def.id);
        applyScheduleData(def);
      }
    } finally {
      setLoading(false);
    }
  }

  function applyScheduleData(data) {
    setSchedule(data);
    setTimezone(data.timezone);
    const slotsMap = {};
    for (let d = 0; d < 7; d++) {
      const daySlots = data.slots.filter(s => s.day_of_week === d);
      slotsMap[d] = {
        enabled: daySlots.length > 0 && daySlots[0].is_active !== false,
        intervals: daySlots.length > 0 
          ? daySlots.map(s => ({ start: s.start_time, end: s.end_time })) 
          : [{ start: '09:00', end: '17:00' }]
      };
    }
    setSlots(slotsMap);
  }

  function switchSchedule(id) {
    const s = schedules.find(x => x.id === id);
    if (s) {
      setActiveScheduleId(id);
      applyScheduleData(s);
    }
    setShowScheduleDropdown(false);
  }

  function openCreateModal() {
    setNewScheduleName('');
    setShowCreateModal(true);
    setShowScheduleDropdown(false);
  }

  async function handleCreateSchedule() {
    if (!newScheduleName.trim()) return;
    try {
      const { data } = await createSchedule({ name: newScheduleName.trim(), timezone });
      setSchedules([...schedules, data]);
      switchSchedule(data.id);
      setShowCreateModal(false);
      toast.success("Schedule created!");
    } catch {
      toast.error("Failed to create schedule");
    }
  }

  function openRenameModal() {
    if (!schedule) return;
    setRenameScheduleName(schedule.name);
    setShowRenameModal(true);
    setShowMoreDropdown(false);
  }

  async function handleRenameSchedule() {
    if (!renameScheduleName.trim() || !activeScheduleId) return;
    try {
      const { data } = await updateAvailability(activeScheduleId, { name: renameScheduleName.trim() });
      setSchedules(schedules.map(s => s.id === activeScheduleId ? { ...s, name: data.name } : s));
      setSchedule(data);
      setShowRenameModal(false);
      toast.success("Schedule renamed!");
    } catch {
      toast.error("Failed to rename schedule");
    }
  }

  async function handleDeleteSchedule() {
    if (!activeScheduleId) return;
    if (schedule?.is_default) {
      toast.error("Cannot delete the default schedule");
      return;
    }
    
    if (!window.confirm("Are you sure you want to delete this schedule?")) return;
    
    try {
      await deleteSchedule(activeScheduleId);
      setSchedules(schedules.filter(s => s.id !== activeScheduleId));
      
      const def = schedules.find(s => s.is_default);
      if (def) {
        switchSchedule(def.id);
      }
      toast.success("Schedule deleted!");
    } catch {
      toast.error("Failed to delete schedule");
    }
    setShowMoreDropdown(false);
  }

  function toggleDay(day) {
    setSlots(s => ({
      ...s,
      [day]: { ...s[day], enabled: !s[day].enabled }
    }));
  }

  function updateInterval(day, index, field, value) {
    setSlots(s => {
      const newIntervals = [...s[day].intervals];
      newIntervals[index] = { ...newIntervals[index], [field]: value };
      return { ...s, [day]: { ...s[day], intervals: newIntervals } };
    });
  }

  function addInterval(day) {
    setSlots(s => {
      // If it's disabled, enabling it usually comes first, but just in case:
      if (!s[day].enabled) {
        return { ...s, [day]: { enabled: true, intervals: [{ start: '09:00', end: '17:00' }] } };
      }
      return { 
        ...s, 
        [day]: { 
          ...s[day], 
          intervals: [...s[day].intervals, { start: '09:00', end: '17:00' }] 
        } 
      };
    });
  }

  function removeInterval(day, index) {
    setSlots(s => {
      const newIntervals = [...s[day].intervals];
      newIntervals.splice(index, 1);
      // If no intervals left, disable the day
      if (newIntervals.length === 0) {
        return { ...s, [day]: { enabled: false, intervals: [{ start: '09:00', end: '17:00' }] } };
      }
      return { ...s, [day]: { ...s[day], intervals: newIntervals } };
    });
  }

  async function handleSave() {
    if (!activeScheduleId) return;
    setSaving(true);
    try {
      const slotsData = [];
      Object.entries(slots).forEach(([day, dayData]) => {
        if (dayData.enabled) {
          dayData.intervals.forEach(interval => {
            slotsData.push({
              day_of_week: parseInt(day),
              start_time: interval.start,
              end_time: interval.end,
              is_active: true,
            });
          });
        }
      });

      const { data } = await updateAvailability(activeScheduleId, { timezone, slots: slotsData });
      setSchedules(schedules.map(s => s.id === activeScheduleId ? data : s));
      toast.success('Availability saved!');
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  }

  async function toggleEventTypeSchedule(eventId) {
    // If it currently belongs to this schedule, unassign it (set to default/null, or wait, bulkAssign needs a schedule id)
    // Actually, assigning it to activeScheduleId is what we want.
    const isAssigned = eventTypes.find(e => e.id === eventId)?.schedule_id === activeScheduleId;
    
    // For simplicity, if they toggle it off, we might just assign it to the default schedule
    const defaultScheduleId = schedules.find(s => s.is_default)?.id;
    const targetScheduleId = isAssigned ? defaultScheduleId : activeScheduleId;

    if (!targetScheduleId) return;

    try {
      await bulkAssignSchedule({ event_ids: [eventId], schedule_id: targetScheduleId });
      setEventTypes(eventTypes.map(e => e.id === eventId ? { ...e, schedule_id: targetScheduleId } : e));
    } catch (e) {
      toast.error('Failed to update event type');
    }
  }

  if (loading) {
    return (
      <div className="page-inner">
        <div className="loading-skeleton" />
      </div>
    );
  }

  const activeEventTypes = eventTypes.filter(e => {
    // If schedule_id is null, it belongs to the default schedule
    if (e.schedule_id === activeScheduleId) return true;
    if (schedule?.is_default && e.schedule_id === null) return true;
    return false;
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Availability</h1>
          <p className="page-subtitle">Set when you're available for meetings</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? <span className="spinner" /> : null}
          Save Changes
        </button>
      </div>

      <div className="page-inner" style={{ maxWidth: 'none', paddingRight: '40px' }}>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 40 }}>
        {/* Schedule Header / Dropdown UI */}
        <div style={{ padding: '24px 32px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px 8px 0 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, marginBottom: 4 }}>Schedule</div>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: 18, fontWeight: 700, color: 'var(--blue)', border: 'none', background: 'transparent', padding: '0', display: 'flex', alignItems: 'center', gap: 6 }}
                onClick={() => setShowScheduleDropdown(!showScheduleDropdown)}
              >
                {schedule?.name || 'Working hours'} {schedule?.is_default ? '(default)' : ''}
                <ChevronDown size={18} />
              </button>
              
              {showScheduleDropdown && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowScheduleDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 280, zIndex: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      {schedules.map(s => (
                        <button 
                          key={s.id}
                          style={{ padding: '12px 16px', display: 'flex', justifyContent: 'space-between', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: activeScheduleId === s.id ? 'var(--blue)' : 'var(--text-primary)', fontWeight: activeScheduleId === s.id ? 600 : 400, borderBottom: '1px solid var(--border)' }}
                          onClick={() => switchSchedule(s.id)}
                        >
                          <span>{s.name} {s.is_default ? '(default)' : ''}</span>
                          {activeScheduleId === s.id && <span>✓</span>}
                        </button>
                      ))}
                    </div>
                    <button 
                      style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left', fontSize: 14, color: 'var(--text-secondary)' }}
                      onClick={openCreateModal}
                    >
                      <Plus size={16} /> Create schedule
                    </button>
                  </div>
                </>
              )}
            </div>
            
            {/* Active on section */}
            <div style={{ fontSize: 13, color: 'var(--text-primary)', marginTop: 8, position: 'relative' }}>
              Active on: <span style={{ color: 'var(--blue)', fontWeight: 500, cursor: 'pointer' }} onClick={() => setShowActiveOnDropdown(!showActiveOnDropdown)}>
                {activeEventTypes.length === eventTypes.length ? 'All event types' : `${activeEventTypes.length} event types`} <ChevronDown size={12} style={{ verticalAlign: 'middle' }}/>
              </span>
              
              {showActiveOnDropdown && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowActiveOnDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 300, zIndex: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
                      Select which event types use this schedule
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', maxHeight: 300, overflowY: 'auto' }}>
                      {eventTypes.map(e => {
                        const isAssigned = (e.schedule_id === activeScheduleId) || (schedule?.is_default && e.schedule_id === null);
                        return (
                          <label 
                            key={e.id}
                            style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid var(--border)', fontSize: 14 }}
                          >
                            <input 
                              type="checkbox" 
                              checked={isAssigned} 
                              onChange={() => toggleEventTypeSchedule(e.id)} 
                              style={{ width: 16, height: 16 }}
                            />
                            {e.name}
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative' }}>
             <button 
               className="btn btn-secondary" 
               style={{ padding: '8px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', cursor: 'pointer' }}
               onClick={() => setShowMoreDropdown(!showMoreDropdown)}
             >
               <MoreVertical size={18} color="var(--text-secondary)" />
             </button>
             
             {showMoreDropdown && (
                <>
                  <div style={{ position: 'fixed', inset: 0, zIndex: 9 }} onClick={() => setShowMoreDropdown(false)} />
                  <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-lg)', width: 180, zIndex: 10, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <button 
                      style={{ padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}
                      onClick={openRenameModal}
                    >
                      Rename
                    </button>
                    {!schedule?.is_default && (
                      <button 
                        style={{ padding: '12px 16px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 14, color: 'var(--red)' }}
                        onClick={handleDeleteSchedule}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </>
             )}
          </div>
        </div>

        <div className="avail-layout" style={{ borderRadius: '0 0 8px 8px', borderTop: 'none', marginTop: 0, border: '1px solid var(--border)' }}>
          <div className="avail-main card" style={{ borderRadius: '0 0 8px 8px', border: 'none', boxShadow: 'none', width: '100%' }}>
            <div className="avail-section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <h3 style={{ fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.72-5.72"/></svg> Weekly hours</h3>
                <p>Set when you are typically available for meetings</p>
              </div>
            </div>

            <div className="days-list">
              {DAYS.map((name, dayIndex) => (
                <div key={dayIndex} className={`day-row ${slots[dayIndex]?.enabled ? 'enabled' : ''}`} style={{ alignItems: 'flex-start', paddingTop: 16 }}>
                  <label className="day-toggle" style={{ gap: 12, marginTop: 4 }}>
                    <input
                      type="checkbox"
                      checked={slots[dayIndex]?.enabled || false}
                      onChange={() => toggleDay(dayIndex)}
                      className="toggle-input"
                    />
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: slots[dayIndex]?.enabled ? 'var(--text-primary)' : 'var(--text-secondary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                      {name.charAt(0)}
                    </div>
                  </label>

                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 36, marginTop: 2, gap: 16 }}>
                    {slots[dayIndex]?.enabled ? (
                      <div className="time-range" style={{ display: 'flex', alignItems: 'center' }}>
                        <select
                          className="form-input form-select time-select"
                          value={slots[dayIndex].intervals[0].start}
                          onChange={e => updateInterval(dayIndex, 0, 'start', e.target.value)}
                          style={{ width: 120, background: '#f8fafc', border: 'none' }}
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                        <span className="time-dash" style={{ margin: '0 8px' }}>-</span>
                        <select
                          className="form-input form-select time-select"
                          value={slots[dayIndex].intervals[0].end}
                          onChange={e => updateInterval(dayIndex, 0, 'end', e.target.value)}
                          style={{ width: 120, background: '#f8fafc', border: 'none' }}
                        >
                          {TIME_OPTIONS.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="unavailable-label">Unavailable</span>
                    )}
                    
                    <button 
                      onClick={() => toggleDay(dayIndex)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 8, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <Plus 
                        size={20} 
                        style={{ 
                          transform: slots[dayIndex]?.enabled ? 'rotate(45deg)' : 'rotate(0deg)', 
                          transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' 
                        }} 
                      />
                    </button>
                  </div>
                </div>
              ))}

              <div style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--blue)', fontWeight: 600 }}>
                  <span>{timezone.replace('_', ' ')}</span>
                  <ChevronDown size={16} />
                </div>
                <select
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%' }}
                >
                  {TIMEZONES.map(tz => (
                    <option key={tz} value={tz}>{tz.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>

            </div>
          </div>
        </div>
      </div>

      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '12px', width: 440, padding: 32, position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button 
              onClick={() => setShowCreateModal(false)}
              style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
               <X size={24} strokeWidth={1.5} />
            </button>
            <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>Create schedule</h2>
            
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Schedule name</label>
              <input 
                autoFocus
                type="text" 
                className="form-input" 
                placeholder="Working Hours, Exclusive Hours, etc..." 
                value={newScheduleName}
                onChange={e => setNewScheduleName(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', fontSize: 15, borderRadius: 8, border: '1px solid var(--blue)', outline: '2px solid rgba(0, 105, 255, 0.1)' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: 99, fontWeight: 600, color: '#1a1a1a', border: '1px solid var(--border)', justifyContent: 'center' }} onClick={() => setShowCreateModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 99, fontWeight: 600, background: 'var(--blue)', justifyContent: 'center' }} onClick={handleCreateSchedule} disabled={!newScheduleName.trim()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div style={{ background: 'var(--surface)', borderRadius: '12px', width: 440, padding: 32, position: 'relative', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <button 
              onClick={() => setShowRenameModal(false)}
              style={{ position: 'absolute', top: 24, right: 24, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-primary)' }}
            >
               <X size={24} strokeWidth={1.5} />
            </button>
            <h2 style={{ margin: '0 0 24px', fontSize: 24, fontWeight: 700, color: '#1a1a1a', letterSpacing: '-0.02em' }}>Rename schedule</h2>
            
            <div style={{ marginBottom: 32 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#1a1a1a', marginBottom: 8 }}>Schedule name</label>
              <input 
                autoFocus
                type="text" 
                className="form-input" 
                placeholder="New name..." 
                value={renameScheduleName}
                onChange={e => setRenameScheduleName(e.target.value)}
                style={{ width: '100%', padding: '12px 16px', fontSize: 15, borderRadius: 8, border: '1px solid var(--blue)', outline: '2px solid rgba(0, 105, 255, 0.1)' }}
              />
            </div>
            
            <div style={{ display: 'flex', gap: 16 }}>
              <button className="btn btn-secondary" style={{ flex: 1, padding: '12px', borderRadius: 99, fontWeight: 600, color: '#1a1a1a', border: '1px solid var(--border)', justifyContent: 'center' }} onClick={() => setShowRenameModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, padding: '12px', borderRadius: 99, fontWeight: 600, background: 'var(--blue)', justifyContent: 'center' }} onClick={handleRenameSchedule} disabled={!renameScheduleName.trim() || renameScheduleName === schedule?.name}>Save</button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
