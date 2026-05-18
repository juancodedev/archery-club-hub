# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## How can I deploy this project?

Simply open [Lovable](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and click on Share -> Publish.

## Can I connect a custom domain to my Lovable project?

Yes, you can!

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)

---

# 🎯 Attendance Module: Fixed QR Code + GPS Geolocation

This project incorporates a **Smart and Secure Attendance Checking Module** designed specifically for archery clubs. It combines a **Fixed QR Code** located in the club's physical facilities with **real-time GPS geographic validation (Geofencing)** to prevent fraudulent attendance check-ins ("remote markings") from outside the premises.

The system consists of two main workflows natively integrated with Supabase roles and Row Level Security (RLS):
1. **Coach/Administrator Console (Web)**: Programming of GPS-validated training sessions using an **Interactive Map Picker** (OpenStreetMap/Leaflet), customizable geofence radius settings, and detailed attendance auditing with geolocation maps per archer.
2. **Archer Experience (Mobile-First)**: Scanning the club's physical QR code, rapid authentication/login, automatic real-time browser GPS coordinates fetching, geofence radius checks, and custom dark-theme map display (Premium Gold & Black aesthetic).

---

## 🏗️ Database Architecture & Core Schema

Geofenced attendance verification is supported by two main PostgreSQL tables in Supabase:

### 1. Geofenced Sessions Table (`trainings`)
Defines the active time windows and official coordinates of training sessions.
```sql
CREATE TABLE public.trainings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    club_id uuid NOT NULL REFERENCES public.clubs(id) ON DELETE CASCADE,
    title text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    location_lat double precision NOT NULL,
    location_lng double precision NOT NULL,
    allowed_radius_meters integer DEFAULT 100 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- RLS enabled by club_id
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
```

### 2. Registered Attendance Table (`training_attendance`)
Logs archers' check-ins along with comprehensive geographical and client-agent audit data.
```sql
CREATE TABLE public.training_attendance (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
    member_id uuid NOT NULL REFERENCES public.members(id) ON DELETE CASCADE,
    attended_at timestamp with time zone DEFAULT now() NOT NULL,
    distance_meters double precision,
    ip_address text,
    user_agent text,
    latitude double precision,
    longitude double precision
);

-- RLS enabled by club_id via joins or lookup
ALTER TABLE public.training_attendance ENABLE ROW LEVEL SECURITY;
```

---

## 🛠️ Operational Flow & Technical Implementation

### 1. Archer Flow (Scan & Geolocation Check-in)
- **Route**: `/attendance-checkin`
- **Operation**:
  1. The archer scans the physical **Fixed QR Code** located inside the club with their smartphone, which redirects them to the check-in interface.
  2. If they are not logged in, a clean login screen in a premium dark gold-accented style is displayed.
  3. Once authenticated, the browser requests location permissions and grabs the current device coordinates via the HTML5 Geolocation API (`navigator.geolocation`) with high-accuracy settings (`enableHighAccuracy: true`).
  4. The client transmits these coordinates to Supabase, which determines the archer's exact distance to the geofence center using an optimized **Haversine Formula** calculation:
     $$\Delta\sigma = 2 \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
  5. **Geofence Check**:
     - **In-Range (Success)**: Records the attendance successfully with audit data (IP, browser agent, calculated distance, and recorded coordinates) and renders an interactive confirmation map.
     - **Out-of-Range (Blocked)**: Rejects the check-in, shows an error notification, and displays a dynamic dark-mode map showcasing the official geofence circle in gold alongside a red marker of their current remote position, preventing remote-marking cheating.

### 2. Coach/Admin Flow (Interactive Map Picker & Auditing)
- **Route**: `/training-sessions` (Tab: **Asistencia GPS / QR**)
- **Scheduling Workspace**:
  - **Interactive Geofence Map Picker**: The creation modal embeds a dynamic, highly responsive Leaflet map (100% free of external Google Maps API key charges).
  - Opening the modal queries the coach's local browser location to center the map.
  - The trainer can click directly on the map or drag the official pin marker to manually adjust the training's center coordinates (`latitude` and `longitude`), instantly syncing the form fields.
  - Features an interactive slider to customize the allowed geofence georaduis in meters.
- **Audit Center**:
  - Coaches can see active and past GPS sessions, click them to load the attendee list, and audit individual logs.
  - Clicking **"🗺️ Ver Mapa"** on any attendee card expands an interactive dark-themed map centered on the exact coordinates where the archer registered their check-in, allowing seamless verification.

---

## 🎨 Premium Dark Theme Visual Integration
To maintain a high-impact, cohesive design without licensing costs, both archer and admin maps incorporate a custom CSS inversion filter to perfectly match **QuiverApp's** sleek gold-and-black palette:
```css
/* Custom CSS Dark-Mode filter applied to Leaflet OpenStreetMap layers */
.leaflet-tile-container {
  filter: invert(0.9) hue-rotate(180deg) opacity(0.8);
}
```
This ensures maps are visually consistent with the rest of the application.
