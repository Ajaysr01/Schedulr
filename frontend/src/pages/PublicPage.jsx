import { useState, useEffect } from 'react';
import { getEventTypes } from '../utils/api';
import { Clock, Video, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './PublicPage.css';

export default function PublicPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    getEventTypes()
      .then(({ data }) => setEvents(data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="public-wrapper">
      <div className="public-container">
        <div className="public-profile">
          <div className="public-avatar">JD</div>
          <h1 className="public-name">John Doe</h1>
          <p className="public-bio">Welcome! Please select an event to schedule a meeting with me.</p>
        </div>

        {loading ? (
          <div style={{ display: 'flex', gap: 12, flexDirection: 'column' }}>
            {[1, 2, 3].map(i => <div key={i} style={{ height: 90, borderRadius: 12, background: 'var(--surface-2)', animation: 'shimmer 1.5s infinite', backgroundSize: '200% 100%' }} />)}
          </div>
        ) : events.length === 0 ? (
          <div className="public-empty">
            <Calendar size={32} />
            <p>No events available</p>
          </div>
        ) : (
          <div className="public-events">
            {events.map(event => (
              <div
                key={event.id}
                className="public-event-card"
                onClick={() => navigate(`/book/${event.slug}`)}
              >
                <div className="public-event-left">
                  <div className="pub-color-dot" style={{ background: event.color }} />
                  <div>
                    <div className="pub-event-name">{event.name}</div>
                    <div className="pub-event-meta">
                      <Clock size={12} />
                      {event.duration} min
                      {event.location && <><span>·</span><Video size={12} />{event.location}</>}
                    </div>
                    {event.description && (
                      <div className="pub-event-desc">{event.description}</div>
                    )}
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={e => { e.stopPropagation(); navigate(`/book/${event.slug}`); }}
                >
                  Book
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-light)' }}>
        Powered by <strong>Schedulr</strong>
      </div>
    </div>
  );
}
