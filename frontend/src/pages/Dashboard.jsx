import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Link, Pencil, Trash2, Clock, MoreHorizontal, Copy, ExternalLink } from 'lucide-react';
import { getEventTypes, createEventType, updateEventType, deleteEventType } from '../utils/api';
import EventTypeModal from '../components/events/EventTypeModal';
import toast from 'react-hot-toast';
import './Dashboard.css';

const COLOR_OPTIONS = [
  '#0069ff', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#be185d', '#374151'
];

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchEvents();
  }, []);

  // Open create modal when navigated via sidebar Create button
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingEvent(null);
      setModalOpen(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function fetchEvents() {
    try {
      const { data } = await getEventTypes();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }

  function openCreate() {
    setEditingEvent(null);
    setModalOpen(true);
  }

  function openEdit(event) {
    setEditingEvent(event);
    setModalOpen(true);
    setActiveMenu(null);
  }

  async function confirmDelete() {
    if (!deleteEvent) return;
    try {
      await deleteEventType(deleteEvent.id);
      setEvents(ev => ev.filter(e => e.id !== deleteEvent.id));
      toast.success('Deleted meeting');
    } catch {
      toast.error('Failed to delete');
    }
    setDeleteEvent(null);
  }

  function copyLink(slug) {
    const url = `${window.location.origin}/book/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success('Link copied!');
    setActiveMenu(null);
  }

  async function handleSave(data) {
    try {
      if (editingEvent) {
        const { data: updated } = await updateEventType(editingEvent.id, data);
        setEvents(ev => ev.map(e => e.id === updated.id ? updated : e));
        toast.success('Event type updated');
      } else {
        const { data: created } = await createEventType(data);
        setEvents(ev => [...ev, created]);
        toast.success('Event type created!');
      }
      setModalOpen(false);
    } catch (err) {
      const msg = err?.response?.data?.detail || 'Failed to save';
      toast.error(msg);
    }
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Scheduling</h1>
          <p className="page-subtitle">Create events that people can schedule with you</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <Plus size={16} />
          New Event Type
        </button>
      </div>

      <div className="page-inner">

      {loading ? (
        <div className="loading-grid">
          {[1, 2, 3].map(i => <div key={i} className="event-card-skeleton" />)}
        </div>
      ) : events.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            <Clock size={28} />
          </div>
          <div className="empty-state-title">No event types yet</div>
          <div className="empty-state-desc">Create your first event type to start accepting bookings</div>
          <button className="btn btn-primary" onClick={openCreate}>
            <Plus size={16} /> Create Event Type
          </button>
        </div>
      ) : (
        <div className="events-grid">
          {events.map(event => (
            <div key={event.id} className="event-card card" style={{ borderTop: `4px solid ${event.color}` }}>
              <div className="event-card-body">
                <div className="event-card-header">
                  <h3 className="event-card-name">{event.name}</h3>
                  <div className="event-menu-wrapper">
                    <button
                      className="btn btn-ghost btn-sm icon-btn"
                      onClick={() => setActiveMenu(activeMenu === event.id ? null : event.id)}
                    >
                      <MoreHorizontal size={16} />
                    </button>
                    {activeMenu === event.id && (
                      <>
                        <div className="menu-backdrop" onClick={() => setActiveMenu(null)} />
                        <div className="dropdown-menu">
                          <button className="dropdown-item" onClick={() => openEdit(event)}>
                            <Pencil size={14} /> Edit
                          </button>
                          <button className="dropdown-item" onClick={() => copyLink(event.slug)}>
                            <Copy size={14} /> Copy Link
                          </button>
                          <a
                            href={`/book/${event.slug}`}
                            target="_blank"
                            rel="noreferrer"
                            className="dropdown-item"
                          >
                            <ExternalLink size={14} /> Preview
                          </a>
                          <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                          <button className="dropdown-item danger" onClick={() => { setDeleteEvent(event); setActiveMenu(null); }}>
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="event-meta">
                  <span className="event-duration">
                    <Clock size={13} />
                    {event.duration} min
                  </span>
                  {event.location && (
                    <span className="event-location">{event.location}</span>
                  )}
                </div>

                {event.description && (
                  <p className="event-description">{event.description}</p>
                )}
              </div>

              <div className="event-card-footer">
                <a
                  href={`/book/${event.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="event-link"
                >
                  <Link size={13} />
                  View Booking Page
                </a>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => copyLink(event.slug)}
                >
                  Copy Link
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <EventTypeModal
          event={editingEvent}
          onSave={handleSave}
          onClose={() => setModalOpen(false)}
          colors={COLOR_OPTIONS}
        />
      )}

      {deleteEvent && (
        <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && setDeleteEvent(null)}>
          <div className="modal" style={{ maxWidth: 420, borderRadius: 8 }}>
            <div className="modal-body" style={{ padding: '32px' }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                Delete {deleteEvent.name}?
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
                Users will be unable to schedule further meetings with deleted event types. Meetings previously scheduled will not be affected.
              </p>
              <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1, borderRadius: 99, padding: '12px', justifyContent: 'center' }}
                  onClick={() => setDeleteEvent(null)}
                >
                  Cancel
                </button>
                <button 
                  className="btn" 
                  style={{ flex: 1, borderRadius: 99, padding: '12px', background: '#d53b00', color: 'white', justifyContent: 'center', border: 'none' }}
                  onClick={confirmDelete}
                >
                  Yes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </>
  );
}
