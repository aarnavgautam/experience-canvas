## Experience Canvas

Private-by-default “Experience Canvas” built with Next.js 14 App Router, Supabase, Tailwind, and `react-konva`. It lets you:

- **Upload photos/videos** exported from Lightroom (or anywhere)
- **Add journal entries + voice notes**
- **Auto-group into Experiences by user-chosen date range + optional location**
- **Assemble a collage/storyboard canvas** per experience and **export as PNG**

Everything is tied to **Supabase Auth**; only the authenticated user can access their content unless you later add explicit sharing.

---

### Tech stack

- **Next.js 14+ App Router** (TypeScript)
- **Supabase** (Auth + Postgres + Storage)
- **Tailwind CSS**
- **React Hook Form + Zod**
- **`react-konva` / `konva`** for the collage canvas
- **PWA** via `next-pwa`

---

## Getting started

### 1. Install dependencies

From the project root:

```bash
pnpm install
```

> You can also use `npm install` or `yarn`, but the repo is configured for `pnpm`.

### 2. Create a Supabase project

1. Go to [Supabase dashboard](https://supabase.com/).
2. Create a **new project**.
3. In **Project Settings → API**, copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public key` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configure environment variables

Create `.env.local` in the project root:

```bash
cp .env.example .env.local  # if you create one, or just make it manually
```

Then add:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Get the service role key from **Project Settings → API** → **service_role** (secret). The app uses it on the server only for storage uploads and signed URLs, so storage works even if you can’t add bucket RLS policies (e.g. “must be owner of table objects”). Never expose this key to the client.

Optionally you can also set:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

On Vercel, you’ll set these in the **Project → Settings → Environment Variables** UI.

### 4. Run the SQL migration

In the Supabase dashboard:

1. Go to **SQL Editor**.
2. Create a **new query**.
3. Copy-paste the contents of:

`supabase/migrations/001_init.sql`

4. Run it. This will:

- Create tables:
  - `experiences`
  - `assets`
  - `journal_entries`
  - `collage_pages`
- Enable **Row Level Security** on all tables.
- Add policies enforcing **user_id = auth.uid()** for SELECT/INSERT/UPDATE/DELETE.
- Create a private **`user_uploads`** storage bucket and RLS policies that:
  - Require each object path to be prefixed with `${userId}/...`
  - Allow users to select/insert/update/delete only their own files.

> All tables set `user_id default auth.uid()`, so you do not need to send `user_id` from the client when inserting rows.

### 5. Verify Auth setup

In Supabase:

1. Under **Authentication → Providers**, keep **Email** enabled.
2. Under **Authentication → URL Configuration**, add:
   - `http://localhost:3000/auth/callback` as a redirect URL for local dev.
   - Your production URL (e.g. `https://your-vercel-app.vercel.app/auth/callback`) for production.

Magic-link emails will redirect back to `/auth/callback`, where the app exchanges the code for a session and sends the user to `/app`.

---

## Hosting (free)

### Option 1: Vercel (recommended for Next.js)

1. **Push your code to GitHub** (or GitLab/Bitbucket). Make sure `.env.local` is in `.gitignore` (it is) and never commit secrets.

2. **Sign up at [vercel.com](https://vercel.com)** and connect your Git provider.

3. **Import the repo** as a new project. Vercel will detect Next.js and set the build command (`next build`) and output automatically.

4. **Add environment variables** in the Vercel dashboard:
   - **Project → Settings → Environment Variables**
   - Add each variable from `.env.example`:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `SUPABASE_SERVICE_ROLE_KEY`
   - Optionally: `NEXT_PUBLIC_SITE_URL` = your Vercel URL (e.g. `https://your-app.vercel.app`).

5. **Configure Supabase for production**:
   - In Supabase **Authentication → URL Configuration**, add your Vercel URL under **Redirect URLs**:
     - `https://your-app.vercel.app/auth/callback`
   - If you use a custom domain later, add that too (e.g. `https://yourdomain.com/auth/callback`).

6. **Deploy.** Each push to your main branch will trigger a new deployment. The free tier is enough for personal use (serverless functions, bandwidth limits apply).

**Note:** If your project folder path contains special characters (e.g. an apostrophe), the PWA build may be disabled automatically to avoid build errors. The app works fine without it.

### Option 2: Netlify

1. Push code to Git, sign up at [netlify.com](https://netlify.com), and connect the repo.
2. Use the **Next.js** preset when adding the site (build command and publish dir are set automatically).
3. Add the same env vars in **Site settings → Environment variables**.
4. Add your Netlify URL in Supabase **Authentication → URL Configuration** as above.

### Option 3: Cloudflare Pages

Supports Next.js via **@cloudflare/next-on-pages**. You’ll need to adapt the build (see [Cloudflare Next.js docs](https://developers.cloudflare.com/pages/framework-guides/nextjs/)). More setup than Vercel/Netlify but free and fast at the edge.

### After going live

- Use your production URL in Supabase redirect URLs so magic-link login works.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only in the host’s env (Vercel/Netlify); never expose it in client code or in the repo.

---

## App structure & routes

Key files/folders:

- `app/layout.tsx` – Root layout (global styles, shell)
- `app/page.tsx` – Redirects to `/login`
- `app/login/page.tsx` – Email magic-link login (Supabase Auth)
- `app/auth/callback/route.ts` – Exchanges magic link code for a Supabase session
- `app/auth/signout/route.ts` – Signs the user out
- `middleware.ts` – Protects `/app` routes using Supabase session from cookies
- `app/app/layout.tsx` – Shell for authenticated area
- `app/app/page.tsx` – **Dashboard** listing Experiences
- `app/app/experience/new/page.tsx` – Create new experience (title, date range, location)
- `app/app/experience/[id]/page.tsx` – Experience detail:
  - Upload photos/videos
  - Record voice notes
  - Add journal entries
  - View media + journal timeline
- `app/app/experience/[id]/collage/page.tsx` – Collage editor for this experience:
  - Uses `react-konva`
  - Add image/video thumbnail/text elements
  - Drag, resize, snap to grid
  - Save elements JSON to `collage_pages`
  - Export canvas as PNG (client-side)

Supporting code:

- `lib/supabaseClient.ts` – Browser Supabase client (`@supabase/auth-helpers-nextjs` + Supabase JS)
- `lib/supabaseServer.ts` – Helper for server components (uses cookies)
- `lib/types/database.ts` – Typed Supabase schema + `CollageElement` type
- `components/experience/AssetUpload.tsx` – Upload images/videos → Supabase Storage + `assets` rows
- `components/experience/VoiceRecorder.tsx` – Record audio via MediaRecorder API → upload as `audio/*`
- `components/experience/JournalForm.tsx` – Add text journal entries (`react-hook-form` + `zod`)
- `components/collage/CollageEditor.tsx` – Konva-based canvas editor with PNG export

---

## Auth & privacy model

- **Supabase Auth** with **email magic link**:
  - `/login` → user enters email → Supabase sends magic link.
  - Clicking the link hits `/auth/callback`, which exchanges the code for a session.
  - After that, the user is redirected to `/app`.
- **Middleware-based protection**:
  - `middleware.ts` checks for a Supabase session on each request.
  - Unauthenticated access to `/app/**` redirects to `/login`.
  - Authenticated access to `/login` redirects to `/app`.
- **Row Level Security** (RLS) on all domain tables + storage:
  - Every row includes `user_id` with `default auth.uid()`.
  - Policies enforce `user_id = auth.uid()` for all operations.
  - Storage paths are prefixed with `${userId}/...`, and policies restrict access to that folder.

Result: **all content is private to the authenticated user by default**; there are no sharing endpoints.

---

## Collage canvas

- Implemented with **`react-konva`** / `konva`.
- Elements match this schema (stored in `collage_pages.elements` JSONB):

```ts
type CollageElement = {
  id: string;
  type: 'image' | 'video' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  assetId?: string;
  publicPreviewUrl?: string; // signed at runtime
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  color?: string;
  align?: 'left' | 'center' | 'right';
};
```

Behaviors:

- **Add Photo / Video Thumbnail**: pick from the experience’s media list. The app:
  - Generates a **signed URL** for private Supabase Storage files.
  - Caches preview URLs in component state.
- **Add Text**: creates a text box you can drag; double-click to edit text.
- **Drag & resize**:
  - All elements are draggable.
  - Snaps to a small **grid** (`GRID = 10`) on drag end.
  - Resizing images uses Konva transforms.
- **Save**:
  - Persists `width`, `height`, `background`, and `elements` into `collage_pages`.
- **Export PNG**:
  - Uses `stage.toDataURL()` to generate a PNG and triggers a download on the client.

---

## Local development

1. Install deps:

   ```bash
   pnpm install
   ```

2. Run dev server:

   ```bash
   pnpm dev
   ```

3. Open `http://localhost:3000`.
4. Go to `/login`, enter an email, and follow the magic link.
5. After login you’ll land on `/app`:
   - Create a **New Experience**.
   - Upload photos/videos / record voice notes / add journal entries.
   - Click **Create Collage** to arrange elements and export PNG.

---

## PWA

- PWA is configured via:
  - `next-pwa` in `next.config.mjs`
  - `public/manifest.json`
  - `public/sw.js` (placeholder; final SW is generated at build)
- Replace `public/icons/placeholder.txt` with real icons:
  - `public/icons/icon-192.png`
  - `public/icons/icon-512.png`
- On production (e.g. Vercel) the app will be installable as a **PWA** on mobile and desktop.

---

## Deploying to Vercel

1. Push this project to a Git repo (GitHub, GitLab, etc.).
2. In Vercel, **Import Project** from that repo.
3. In Vercel project settings, set environment variables:

   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - (optional) `NEXT_PUBLIC_SITE_URL=https://your-vercel-domain.vercel.app`

4. Deploy.
5. In Supabase Auth settings, ensure the redirect URL includes your production URL:

   - `https://your-vercel-domain.vercel.app/auth/callback`

You should now be able to:

- Log in via magic link.
- Use `/app` on mobile/desktop.
- Install as a PWA.
- Confidently know that all content is **private-by-default** to the authenticated user.

