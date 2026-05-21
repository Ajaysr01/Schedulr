import { useState } from 'react';
import { X } from 'lucide-react';

export default function EventTypeModal({ event, onSave, onClose, colors }) {
  const [form, setForm] = useState({
    name: event?.name || '',
    slug: event?.slug || '',
    duration: event?.duration || 30,
    description: event?.description || '',
    color: event?.color || '#0069ff',
    location: event?.location || '',
    buffer_before: event?.buffer_before || 0,
    buffer_after: event?.buffer_after || 0,
  });
  const [saving, setSaving] = useState(false);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));

    // Auto-generate slug from name (both create and edit)
    if (name === 'name') {
      const slug = value.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
      setForm(f => ({ ...f, name: value, slug }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.slug || !form.duration) return;
    setSaving(true);
    await onSave({ ...form, duration: parseInt(form.duration) });
    setSaving(false);
  }

  return (
    <div className="modal-backdrop" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{event ? 'Edit Event Type' : 'New Event Type'}</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Event Name *</label>
              <input
                className="form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. 30 Minute Meeting"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">URL Slug *</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                <span style={{
                  padding: '10px 12px',
                  background: 'var(--surface-2)',
                  border: '1.5px solid var(--border)',
                  borderRight: 'none',
                  borderRadius: 'var(--radius) 0 0 var(--radius)',
                  fontSize: 13,
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}>
                  /book/
                </span>
                <input
                  className="form-input"
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="30min"
                  required

                  style={{ borderRadius: '0 var(--radius) var(--radius) 0' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Duration (minutes) *</label>
                <select className="form-input form-select" name="duration" value={form.duration} onChange={handleChange}>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Location</label>
                <input
                  className="form-input"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Zoom, Google Meet..."
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea
                className="form-input form-textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What's this meeting about?"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Buffer Before (min)</label>
                <input
                  className="form-input"
                  type="number"
                  name="buffer_before"
                  value={form.buffer_before}
                  onChange={handleChange}
                  min={0}
                  max={60}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Buffer After (min)</label>
                <input
                  className="form-input"
                  type="number"
                  name="buffer_after"
                  value={form.buffer_after}
                  onChange={handleChange}
                  min={0}
                  max={60}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: c,
                      border: form.color === c ? '3px solid var(--text-primary)' : '3px solid transparent',
                      outline: form.color === c ? '2px solid white' : 'none',
                      outlineOffset: -4,
                      cursor: 'pointer',
                      transition: 'transform 0.1s',
                      transform: form.color === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {event ? 'Save Changes' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
