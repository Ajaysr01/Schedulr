import { useState, useEffect } from 'react';
import { getMeetings, cancelMeeting } from '../utils/api';
import { format, parseISO, isPast } from 'date-fns';
import { Calendar, Clock, User, MapPin, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import './Meetings.css';

export default function Meetings() {
  const [tab, setTab] = useState('upcoming');
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelModal, setCancelModal] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    fetchMeetings();
  }, [tab]);

  async function fetchMeetings() {
    setLoading(true);
    try {
      const params = tab === 'upcoming' ? { upcoming: true } : { upcoming: false };
      const { data } = await getMeetings(params);
      setMeetings(data);
    } finally {
      setLoading(false);
    }
  }

  async function handleCancel() {
    if (!cancelModal) return;
    setCancelling(true);
    try {
      await cancelMeeting(cancelModal.id, cancelReason);
      toast.success('Meeting cancelled');
      setCancelModal(null);
      setCancelReason('');
      fetchMeetings();
    } catch {
      toast.error('Failed to cancel');
    } finally {
      setCancelling(false);
    }
  }

  function getStatusBadge(m) {
    if (m.status === 'cancelled') return <span className="badge badge-red">Cancelled</span>;
    if (m.status === 'completed' || isPast(parseISO(m.start_time)))
      return <span className="badge badge-gray">Completed</span>;
    return <span className="badge badge-green">Scheduled</span>;
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Meetings</h1>
          <p className="page-subtitle">Manage your upcoming and past meetings</p>
        </div>
      </div>

      <div className="page-inner" style={{ maxWidth: 'none', paddingRight: '40px' }}>

      <div className="meetings-outer-box">
        {/* Tabs bar inside the outer box */}
        <div className="meetings-tabs-bar">
          <div className="meetings-tabs">
            <button className={`meetings-tab ${tab === 'upcoming' ? 'active' : ''}`} onClick={() => setTab('upcoming')}>
              Upcoming
            </button>
            <button className={`meetings-tab ${tab === 'past' ? 'active' : ''}`} onClick={() => setTab('past')}>
              Past
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="meetings-content">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {[1, 2, 3].map(i => <div key={i} className="meeting-skeleton" />)}
            </div>
          ) : meetings.length === 0 ? (
            <div className="meetings-empty">
              <div className="empty-state-icon">
                <Calendar size={28} />
              </div>
              <div className="empty-state-title">
                {tab === 'upcoming' ? 'No upcoming meetings' : 'No past meetings'}
              </div>
              <div className="empty-state-desc">
                {tab === 'upcoming'
                  ? 'Share your booking link to start receiving meetings'
                  : 'Completed meetings will appear here'}
              </div>
            </div>
          ) : (
            <div className="meetings-list">
              {meetings.map(m => (
                <div key={m.id} className="meeting-card-box">
                  <div className="meeting-color-dot" style={{ background: m.event_type?.color || 'var(--blue)' }} />
                  <div className="meeting-row-body">
                    <div className="meeting-row-main">
                      <div className="meeting-row-left">
                        <h3 className="meeting-row-title">{m.event_type?.name}</h3>
                        <div className="meeting-row-meta">
                          <span><Calendar size={12} /> {format(parseISO(m.start_time + (m.start_time.includes('Z') ? '' : 'Z')), 'EEE, MMM d, yyyy')}</span>
                          <span><Clock size={12} /> {format(parseISO(m.start_time + (m.start_time.includes('Z') ? '' : 'Z')), 'h:mm a')} ({m.event_type?.duration} min)</span>
                          {m.location && <span><MapPin size={12} /> {m.location}</span>}
                        </div>
                      </div>
                      <div className="meeting-row-center">
                        <div className="invitee-avatar-sm">
                          {m.invitee_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="invitee-name-sm">{m.invitee_name}</span>
                          <span className="invitee-email-sm">{m.invitee_email}</span>
                        </div>
                      </div>
                      <div className="meeting-row-right">
                        {getStatusBadge(m)}
                        {m.status === 'scheduled' && !isPast(parseISO(m.start_time + (m.start_time.includes('Z') ? '' : 'Z'))) && (
                          <button
                            className="btn btn-ghost btn-sm cancel-btn"
                            onClick={() => setCancelModal(m)}
                          >
                            <X size={14} /> Cancel
                          </button>
                        )}
                      </div>
                    </div>
                    {m.invitee_notes && (
                      <div className="meeting-row-notes">
                        <AlertCircle size={12} />
                        {m.invitee_notes}
                      </div>
                    )}
                    {m.status === 'cancelled' && m.cancellation_reason && (
                      <div className="cancellation-note">
                        Cancelled: {m.cancellation_reason}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {cancelModal && (
        <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && setCancelModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h2 className="modal-title">Cancel Meeting</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setCancelModal(null)} style={{ padding: '6px' }}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Cancel your meeting with <strong>{cancelModal.invitee_name}</strong>?
              </p>
              <div className="form-group">
                <label className="form-label">Reason (optional)</label>
                <textarea
                  className="form-input form-textarea"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="Let them know why..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setCancelModal(null)}>Keep Meeting</button>
              <button className="btn btn-danger" onClick={handleCancel} disabled={cancelling}>
                {cancelling ? <span className="spinner" /> : null}
                Cancel Meeting
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
