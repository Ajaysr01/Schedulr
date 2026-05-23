# Schedulr – Calendly Clone

A full-stack scheduling and booking web application that closely replicates Calendly's design and user experience.

## Tech Stack

| Layer       | Technology                          |
|-------------|-------------------------------------|
| Frontend    | React 18, React Router v6, date-fns |
| Backend     | Python 3.11+, FastAPI, SQLAlchemy   |
| Database    | SQLite (Local dev) / PostgreSQL via Supabase (production) |
| Styling     | Custom CSS with DM Sans font        |

---

## Features

### Core Features: 
- **Event Types Management** — Create, edit, delete event types with name, duration, slug, color, location, buffer time
- **Availability Settings** — Set weekly working hours per day, timezone selection, quick preset buttons
- **Public Booking Page** — Month calendar, time slot selection, booking form, double-booking prevention
- **Meetings Page** — View upcoming/past meetings, cancel meetings with reason

### Additional Improvements: 
- Responsive design (mobile, tablet, desktop)
- Multiple Availability Schedules
- Buffer time before/after meetings
- Date-specific display (today's upcoming-only slots)
- Public profile page (`/john`) listing all event types
- Booking confirmation page with full meeting details

---

## Database Schema

```
event_types
  id, name, slug (unique), duration, description,
  color, location, buffer_before, buffer_after,
  is_active, created_at, updated_at

availability_schedules
  id, name, timezone, is_default, created_at

availability_slots
  id, schedule_id (FK), day_of_week (0=Mon),
  start_time, end_time, is_active

date_overrides
  id, schedule_id (FK), date, start_time,
  end_time, is_available

meetings
  id, event_type_id (FK), invitee_name,
  invitee_email, invitee_notes, start_time,
  end_time, timezone, status (scheduled/cancelled/completed),
  cancellation_reason, location, confirmation_token,
  created_at, updated_at
```

---

## Local Setup

### Prerequisites
- Node.js 18+
- Python 3.11+
- pip

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
  #Mac: source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server (SQLite by default)
uvicorn main:app --reload --port 8000
```

The backend auto-creates tables and seeds sample data on first run.

**API docs**: http://localhost:8000/docs

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy env file
cp .env.example .env
# Edit .env if your backend runs on a different port

# Start development server
npm start
```

App runs at http://localhost:3000

---

## PostgreSQL Configuration

Production deployment uses Supabase PostgreSQL with the Transaction Pooler connection string.

To use PostgreSQL instead of SQLite, set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://user:password@aws-0-region.pooler.supabase.com:6543/postgres"
```

---

## Deployment

### Backend (Render)

1. Set `DATABASE_URL` environment variable to your PostgreSQL connection string from Supabase
2. Set start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
3. Install command: `pip install -r requirements.txt`

### Frontend (Vercel)

1. Set `REACT_APP_API_URL` to your deployed Render backend URL
2. Build command: `npm run build`
3. Publish directory: `build`
4. Routing is handled automatically by Vercel for single-page apps (add `vercel.json` if needed).

---

## Key URLs

| URL                      | Description                        |
|--------------------------|------------------------------------|
| `/dashboard`             | Event types management (admin)     |
| `/meetings`              | Scheduled events (admin)           |
| `/availability`          | Availability settings (admin)      |
| `/john`                  | Public profile page                |
| `/book/:slug`            | Public booking page for event type |

---

## Assumptions

1. **Single user** — The app assumes one host (John Doe). No authentication is required.
2. **Timezone** — Slots are calculated in the host's configured timezone. Invitees can select their own timezone on the booking page.
3. **Slot increments** — Available time slots are generated in 30-minute increments regardless of meeting duration.
4. **Past dates** — Dates in the past cannot be booked. For today, only slots 30+ minutes from now are shown.
5. **Email notifications** — Not implemented (noted as "good to have"). Confirmation token is returned in the booking response for future integration.
6. **Completed status** — Meetings in the past with "scheduled" status are displayed as "Completed" on the UI but the DB still shows `scheduled`.

---

## Sample Data

The seed script creates:
- 4 event types (15min, 30min, 60min, Discovery Call)
- Mon–Fri 9am–5pm availability schedule
- 4 sample meetings (2 upcoming, 1 past completed, 1 cancelled)
