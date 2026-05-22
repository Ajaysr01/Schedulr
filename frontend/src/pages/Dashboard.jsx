import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Plus, Clock, MoreHorizontal, Copy, ExternalLink, Pencil, Trash2, Link as LinkIcon } from 'lucide-react';
import { getEventTypes, createEventType, updateEventType, deleteEventType, getAllSchedules } from '../utils/api';
import EventTypePanel from '../components/events/EventTypeModal';
import toast from 'react-hot-toast';
import './Dashboard.css';

const COLOR_OPTIONS = [
  '#0069ff', '#7c3aed', '#059669', '#d97706',
  '#dc2626', '#0891b2', '#be185d', '#374151'
];

export default function Dashboard() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [panelOpen, setPanelOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [deleteEvent, setDeleteEvent] = useState(null);
  const [schedules, setSchedules] = useState([]);
  const [searchParams, setSearchParams] = useSearchParams();

  useEffect(() => {
    fetchEvents();
    fetchSchedules();
  }, []);

  // Open create panel when navigated via sidebar Create button
  useEffect(() => {
    if (searchParams.get('create') === 'true') {
      setEditingEvent(null);
      openPanel();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Toggle body class for sidebar collapse when panel is open
  useEffect(() => {
    if (panelOpen) {
      document.body.classList.add('panel-active');
    } else {
      document.body.classList.remove('panel-active');
    }
    return () => document.body.classList.remove('panel-active');
  }, [panelOpen]);

  async function fetchEvents() {
    try {
      const { data } = await getEventTypes();
      setEvents(data);
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedules() {
    try {
      const { data } = await getAllSchedules();
      setSchedules(data);
    } catch {
      // Schedules fetch is optional — don't block UI
    }
  }

  function openPanel() {
    setPanelOpen(true);
  }

  function closePanel() {
    setPanelOpen(false);
    setEditingEvent(null);
  }

  function openCreate() {
    setEditingEvent(null);
    openPanel();
  }

  function openEdit(event) {
    setEditingEvent(event);
    openPanel();
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
      closePanel();
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
        <button className="btn btn-primary" onClick={openCreate} style={{ borderRadius: 999 }}>
          <Plus size={16} />
          Create
        </button>
      </div>

      <div className={`page-inner dashboard-content ${panelOpen ? 'panel-open' : ''}`} style={{ maxWidth: 'none' }}>

      {loading ? (
        <div className="loading-list">
          {[1, 2, 3].map(i => <div key={i} className="event-row-skeleton" />)}
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
        <div className="events-list">
          {events.map(event => (
            <div
              key={event.id}
              className="event-row"
              style={{ borderLeft: `4px solid ${event.color}` }}
              onClick={() => openEdit(event)}
            >
              {/* Event Info */}
              <div className="event-row-info">
                <div className="event-row-name">{event.name}</div>
                <div className="event-row-meta">
                  <span className="event-row-duration">
                    <Clock size={13} />
                    {event.duration} min
                  </span>
                  {event.location && (
                    <span className="event-row-location">{event.location}</span>
                  )}
                </div>
                {event.description && (
                  <div className="event-row-desc">{event.description}</div>
                )}
              </div>

              {/* Actions */}
              <div className="event-row-actions">
                <button
                  className="event-row-copy-btn"
                  onClick={(e) => { e.stopPropagation(); copyLink(event.slug); }}
                  title="Copy link"
                >
                  <Copy size={13} />
                  <span>Copy link</span>
                </button>

                <a
                  href={`/book/${event.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="event-row-link-btn"
                  title="View booking page"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink size={15} />
                </a>

                <div className="event-menu-wrapper" onClick={(e) => e.stopPropagation()}>
                  <button
                    className="event-row-menu-btn"
                    onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === event.id ? null : event.id); }}
                    title="More options"
                  >
                    <MoreHorizontal size={18} />
                  </button>

                  {activeMenu === event.id && (
                    <>
                      <div className="menu-backdrop" onClick={() => setActiveMenu(null)} />
                      <div className="dropdown-menu">
                        <a
                          href={`/book/${event.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="dropdown-item"
                        >
                          <LinkIcon size={14} /> View Booking Page
                        </a>
                        <button className="dropdown-item" onClick={() => openEdit(event)}>
                          <Pencil size={14} /> Edit
                        </button>
                        <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                        <button
                          className="dropdown-item danger"
                          onClick={() => { setDeleteEvent(event); setActiveMenu(null); }}
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Side Panel for Create/Edit */}
      <EventTypePanel
        event={editingEvent}
        onSave={handleSave}
        onClose={closePanel}
        colors={COLOR_OPTIONS}
        schedules={schedules}
        isOpen={panelOpen}
      />

      {/* Delete Confirmation Modal */}
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
