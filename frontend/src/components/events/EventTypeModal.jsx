import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import './EventTypePanel.css';

export default function EventTypePanel({ event, onSave, onClose, colors, schedules, isOpen }) {
  // Pick the default schedule
  const defaultSchedule = schedules?.find(s => s.is_default);
  const defaultScheduleId = defaultSchedule ? defaultSchedule.id : (schedules?.length > 0 ? schedules[0].id : '');

  const [form, setForm] = useState({
    name: '',
    slug: '',
    duration: 30,
    description: '',
    color: '#0069ff',
    location: '',
    buffer_before: 0,
    buffer_after: 0,
    schedule_id: defaultScheduleId,
  });
  const [saving, setSaving] = useState(false);

  // Reset form when event changes or panel opens
  useEffect(() => {
    if (isOpen) {
      setForm({
        name: event?.name || '',
        slug: event?.slug || '',
        duration: event?.duration || 30,
        description: event?.description || '',
        color: event?.color || '#0069ff',
        location: event?.location || '',
        buffer_before: event?.buffer_before || 0,
        buffer_after: event?.buffer_after || 0,
        schedule_id: event?.schedule_id || defaultScheduleId,
      });
    }
  }, [event, isOpen, defaultScheduleId]);

  function handleChange(e) {
    const { name, value } = e.target;
    setForm(f => ({ ...f, [name]: value }));

    // Auto-generate slug from name
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
    const payload = {
      ...form,
      duration: parseInt(form.duration),
      buffer_before: parseInt(form.buffer_before) || 0,
      buffer_after: parseInt(form.buffer_after) || 0,
    };
    // Only include schedule_id if selected
    if (form.schedule_id) {
      payload.schedule_id = parseInt(form.schedule_id);
    } else {
      delete payload.schedule_id;
    }
    await onSave(payload);
    setSaving(false);
  }

  return (
    <>
      {/* Overlay */}
      <div
        className={`panel-overlay ${isOpen ? 'visible' : ''}`}
        onClick={onClose}
      />

      {/* Side Panel */}
      <div className={`event-side-panel ${isOpen ? 'open' : ''}`}>
        <button className="panel-close-btn" onClick={onClose} type="button">
          <X size={18} />
        </button>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="panel-content">
            <h2 className="panel-title">
              {event ? 'Edit Event Type' : 'New Event Type'}
            </h2>

            {/* Event Name */}
            <div className="panel-form-group">
              <label className="panel-form-label">Event Name *</label>
              <input
                className="panel-form-input"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. 30 Minute Meeting"
                required
                autoFocus={isOpen && !event}
              />
            </div>

            {/* URL Slug */}
            <div className="panel-form-group">
              <label className="panel-form-label">URL Slug *</label>
              <div className="panel-slug-wrapper">
                <span className="panel-slug-prefix">/book/</span>
                <input
                  className="panel-form-input panel-slug-input"
                  name="slug"
                  value={form.slug}
                  onChange={handleChange}
                  placeholder="30min"
                  required
                />
              </div>
            </div>

            {/* Duration + Location row */}
            <div className="panel-row">
              <div className="panel-form-group">
                <label className="panel-form-label">Duration *</label>
                <select
                  className="panel-form-input panel-form-select"
                  name="duration"
                  value={form.duration}
                  onChange={handleChange}
                >
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                </select>
              </div>

              <div className="panel-form-group">
                <label className="panel-form-label">Location</label>
                <input
                  className="panel-form-input"
                  name="location"
                  value={form.location}
                  onChange={handleChange}
                  placeholder="Zoom, Google Meet..."
                />
              </div>
            </div>

            {/* Description */}
            <div className="panel-form-group">
              <label className="panel-form-label">Description</label>
              <textarea
                className="panel-form-input panel-form-textarea"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="What's this meeting about?"
              />
            </div>

            {/* Buffers row */}
            <div className="panel-row">
              <div className="panel-form-group">
                <label className="panel-form-label">Buffer Before (min)</label>
                <input
                  className="panel-form-input"
                  type="number"
                  name="buffer_before"
                  value={form.buffer_before}
                  onChange={handleChange}
                  min={0}
                  max={60}
                />
              </div>
              <div className="panel-form-group">
                <label className="panel-form-label">Buffer After (min)</label>
                <input
                  className="panel-form-input"
                  type="number"
                  name="buffer_after"
                  value={form.buffer_after}
                  onChange={handleChange}
                  min={0}
                  max={60}
                />
              </div>
            </div>

            <div className="panel-divider" />

            {/* Availability Schedule */}
            <div className="panel-form-group">
              <label className="panel-form-label">Availability Schedule</label>
              <select
                className="panel-availability-select"
                name="schedule_id"
                value={form.schedule_id}
                onChange={handleChange}
              >
                {(schedules || []).map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.is_default ? '(default)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="panel-divider" />

            {/* Color Picker */}
            <div className="panel-form-group">
              <label className="panel-form-label">Color</label>
              <div className="panel-colors">
                {colors.map(c => (
                  <button
                    key={c}
                    type="button"
                    className={`panel-color-swatch ${form.color === c ? 'selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="panel-footer">
            <button type="button" className="panel-btn-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="panel-btn-save" disabled={saving}>
              {saving ? <span className="spinner" /> : null}
              {event ? 'Save Changes' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
