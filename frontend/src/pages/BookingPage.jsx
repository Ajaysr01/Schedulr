import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getEventTypeBySlug, getAvailableSlots, createBooking } from '../utils/api';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameMonth, isSameDay, isPast, startOfDay,
  parseISO, isToday, getDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Clock, Globe, Video, ArrowLeft, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import './BookingPage.css';

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Calcutta', 'Australia/Sydney',
];

export default function BookingPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [eventType, setEventType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const defaultTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  const [timezone, setTimezone] = useState(defaultTz);
  const [step, setStep] = useState('calendar'); // calendar | form | confirm
  const [form, setForm] = useState({ name: '', email: '', notes: '' });
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const { data } = await getEventTypeBySlug(slug);
        setEventType(data);

        // Auto-select today (or next available weekday) and pre-fetch slots
        let autoDate = new Date();
        // If today is in the past or not selectable, advance to the next selectable day
        for (let i = 0; i < 60; i++) {
          if (isDateSelectable(autoDate)) break;
          autoDate = new Date(autoDate.getTime() + 86400000);
        }
        setSelectedDate(autoDate);

        // Pre-fetch slots immediately without waiting for state + re-render
        setSlotsLoading(true);
        try {
          const dateStr = format(autoDate, 'yyyy-MM-dd');
          const { data: slotsData } = await getAvailableSlots(slug, dateStr, timezone);
          setSlots(slotsData.slots || []);
        } catch {
          setSlots([]);
        } finally {
          setSlotsLoading(false);
        }
      } catch {
        // not found
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [slug]);

  useEffect(() => {
    if (selectedDate && eventType) {
      loadSlots(selectedDate);
    }
  }, [timezone]);

  async function loadSlots(date) {
    setSlotsLoading(true);
    setSlots([]);
    setSelectedTime(null);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const { data } = await getAvailableSlots(slug, dateStr, timezone);
      setSlots(data.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }

  function buildCalendarDays() {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });

    // Pad start
    const startDow = getDay(start); // 0=Sun
    const padStart = startDow === 0 ? 6 : startDow - 1; // convert to Mon-first
    const padded = [];
    for (let i = 0; i < padStart; i++) padded.push(null);
    return [...padded, ...days];
  }

  function isDateSelectable(date) {
    if (!date) return false;
    if (isPast(startOfDay(date)) && !isToday(date)) return false;
    return true;
  }

  function handleDateClick(date) {
    if (!isDateSelectable(date)) return;
    setSelectedDate(date);
    setSelectedTime(null);
    loadSlots(date);
  }

  function handleTimeSelect(time) {
    setSelectedTime(time);
  }

  async function handleBook() {
    if (!form.name || !form.email) return;
    setSubmitting(true);

    try {
      const [h, m] = selectedTime.split(':').map(Number);
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const hh = String(h).padStart(2, '0');
      const mm = String(m).padStart(2, '0');
      const localDtStr = `${year}-${month}-${day}T${hh}:${mm}:00`;

      const { data } = await createBooking({
        event_type_id: eventType.id,
        invitee_name: form.name,
        invitee_email: form.email,
        invitee_notes: form.notes,
        start_time: localDtStr,
        timezone,
      });

      setBooking(data);
      setStep('confirm');
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Booking failed. Please try again.';
      toast.error(msg);
      if (err?.response?.status === 409) {
        loadSlots(selectedDate);
        setStep('calendar');
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="booking-loading">
        <div className="spinner" style={{ width: 32, height: 32 }} />
      </div>
    );
  }

  if (!eventType) {
    return (
      <div className="booking-notfound">
        <div style={{ fontSize: 48, marginBottom: 16 }}>🗓️</div>
        <h2>Event not found</h2>
        <p>This booking link doesn't exist or has been deactivated.</p>
      </div>
    );
  }

  if (step === 'confirm' && booking) {
    return <BookingConfirmation booking={booking} eventType={eventType} timezone={timezone} />;
  }

  const calDays = buildCalendarDays();
  const displayTimezones = TIMEZONES.includes(timezone) ? TIMEZONES : [timezone, ...TIMEZONES];

  return (
    <div className="booking-wrapper">
      <div className="booking-container">
        {/* Left panel - event info */}
        <div className="booking-info-panel">
          <div className="booking-host">
            <div className="booking-avatar">JD</div>
            <div className="booking-host-name">John Doe</div>
          </div>

          <div className="booking-event-accent" style={{ background: eventType.color }} />

          <h1 className="booking-event-name">{eventType.name}</h1>

          <div className="booking-details">
            <div className="booking-detail">
              <Clock size={15} />
              <span>{eventType.duration} minutes</span>
            </div>
            {eventType.location && (
              <div className="booking-detail">
                <Video size={15} />
                <span>{eventType.location}</span>
              </div>
            )}
            <div className="booking-detail">
              <Globe size={15} />
              <span>{timezone}</span>
            </div>
          </div>

          {eventType.description && (
            <p className="booking-event-desc">{eventType.description}</p>
          )}

          <div className="tz-picker">
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Timezone
            </label>
            <select
              className="form-input form-select"
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              style={{ fontSize: 13, marginTop: 6 }}
            >
              {displayTimezones.map(tz => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Right panel */}
        <div className="booking-right-panel">
          {step === 'calendar' && (
            <div className="booking-calendar-panel">
              {/* Month selector */}
              <div className="calendar-header">
                <h2 className="calendar-month-title">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="calendar-nav">
                  <button
                    className="cal-nav-btn"
                    onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                    disabled={isSameMonth(currentMonth, new Date())}
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    className="cal-nav-btn"
                    onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>

              {/* Day labels */}
              <div className="calendar-dow">
                {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map(d => (
                  <div key={d} className="dow-label">{d}</div>
                ))}
              </div>

              {/* Days grid */}
              <div className="calendar-grid">
                {calDays.map((day, i) => (
                  <button
                    key={i}
                    className={[
                      'cal-day',
                      !day ? 'cal-day-empty' : '',
                      day && !isDateSelectable(day) ? 'cal-day-disabled' : '',
                      day && isToday(day) ? 'cal-day-today' : '',
                      day && selectedDate && isSameDay(day, selectedDate) ? 'cal-day-selected' : '',
                    ].filter(Boolean).join(' ')}
                    onClick={() => day && handleDateClick(day)}
                    disabled={!day || !isDateSelectable(day)}
                  >
                    {day ? format(day, 'd') : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Time slots panel */}
          {step === 'calendar' && selectedDate && (
            <div className="booking-slots-panel">
              <div className="slots-header">
                <div className="slots-date">{format(selectedDate, 'EEEE, MMMM d')}</div>
              </div>

              {slotsLoading ? (
                <div className="slots-loading">
                  <div className="spinner" />
                </div>
              ) : slots.length === 0 ? (
                <div className="no-slots">
                  <p>No available times</p>
                  <span>Try another day</span>
                </div>
              ) : (
                <div className="slots-list">
                  {slots.map(time => {
                    const isSelected = selectedTime === time;
                    return isSelected ? (
                      <div key={time} style={{ display: 'flex', gap: 8, width: '100%' }}>
                        <button
                          className="slot-btn"
                          style={{ flex: 1, background: '#666', color: 'white', borderColor: '#666', pointerEvents: 'none' }}
                        >
                          {formatTime12(time)}
                        </button>
                        <button
                          className="slot-btn"
                          style={{ flex: 1, background: 'var(--blue)', color: 'white', borderColor: 'var(--blue)' }}
                          onClick={() => setStep('form')}
                        >
                          Next
                        </button>
                      </div>
                    ) : (
                      <button
                        key={time}
                        className="slot-btn"
                        style={{ border: '1px solid rgba(0, 105, 255, 0.4)' }}
                        onClick={() => handleTimeSelect(time)}
                      >
                        {formatTime12(time)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Booking form */}
          {step === 'form' && (
            <div className="booking-form-panel">
              <button className="back-btn" onClick={() => setStep('calendar')}>
                <ArrowLeft size={16} /> Back
              </button>

              <div className="form-date-summary">
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                </div>
                <div style={{ fontSize: 14, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {formatTime12(selectedTime)} · {eventType.duration} min
                </div>
              </div>

              <div className="booking-form">
                <div className="form-group">
                  <label className="form-label">Your Name *</label>
                  <input
                    className="form-input"
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="Full name"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={form.email}
                    onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="email@example.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Additional Notes</label>
                  <textarea
                    className="form-input form-textarea"
                    value={form.notes}
                    onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    placeholder="Anything you'd like to share?"
                  />
                </div>

                <button
                  className="btn btn-primary btn-lg"
                  style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={handleBook}
                  disabled={!form.name || !form.email || submitting}
                >
                  {submitting ? <span className="spinner" /> : null}
                  Confirm Booking
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="booking-footer">
        Powered by <strong>Schedulr</strong>
      </div>
    </div>
  );
}

function formatTime12(time) {
  if (!time) return '';
  const [h, m] = time.split(':').map(Number);
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const ampm = h < 12 ? 'am' : 'pm';
  return `${hour12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function BookingConfirmation({ booking, eventType, timezone }) {
  const startUtc = booking.start_time.endsWith('Z') ? booking.start_time : booking.start_time + 'Z';
  const startDate = parseISO(startUtc);

  return (
    <div className="booking-wrapper">
      <div className="confirm-container">
        <div className="confirm-check">
          <Check size={32} color="white" />
        </div>
        <h1 className="confirm-title">You're scheduled!</h1>
        <p className="confirm-subtitle">
          A calendar invitation has been sent to your email address.
        </p>

        <div className="confirm-card card">
          <div className="confirm-event-bar" style={{ background: eventType.color }} />
          <div className="confirm-card-body">
            <div className="confirm-event-name">{eventType.name}</div>
            <div className="confirm-details">
              <div className="confirm-detail">
                <Clock size={15} />
                <span>
                  {format(startDate, 'EEEE, MMMM d, yyyy')} ·{' '}
                  {format(startDate, 'h:mm a')} ({eventType.duration} min)
                </span>
              </div>
              {eventType.location && (
                <div className="confirm-detail">
                  <Video size={15} />
                  <span>{eventType.location}</span>
                </div>
              )}
              <div className="confirm-detail">
                <Globe size={15} />
                <span>{timezone}</span>
              </div>
            </div>

            <div className="confirm-divider" />

            <div className="confirm-invitee">
              <div className="invitee-avatar" style={{ background: '#e8f0ff', color: 'var(--blue)' }}>
                {booking.invitee_name.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{booking.invitee_name}</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{booking.invitee_email}</div>
              </div>
            </div>
          </div>
        </div>

        <a href="/" className="btn btn-secondary" style={{ display: 'inline-flex', marginTop: 24 }}>
          Back to Homepage
        </a>
      </div>

      <div className="booking-footer">
        Powered by <strong>Schedulr</strong>
      </div>
    </div>
  );
}
