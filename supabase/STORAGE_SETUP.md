# Storage setup (Supabase Dashboard)

The SQL migration does **not** create the storage bucket or policies. Do the following in the Dashboard.

## 1. Create the bucket (required)

1. In Supabase: **Storage** → **New bucket**.
2. **Name:** `user_uploads` (must match exactly).
3. **Public bucket:** leave **OFF** (private).
4. Click **Create bucket**.

You do **not** need to add any RLS policies on `storage.objects` for the app to work. The app uses the **service role** on the server for uploads and signed URLs, so it bypasses storage RLS.

---

## 2. (Optional) Add RLS policies on the bucket

If the Dashboard lets you create policies (no “must be owner of table objects” error), you can add them for defense-in-depth. If you get that error, skip this step and rely on the service role (see below).

Go to **Storage** → click **user_uploads** → **Policies**. Add these four policies:

### Policy 1: Users can upload to their own folder

- **Policy name:** `Users can upload to own folder`
- **Allowed operation:** `INSERT`
- **WITH CHECK expression:**

```sql
bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 2: Users can view their own files

- **Policy name:** `Users can view own files`
- **Allowed operation:** `SELECT`
- **USING expression:**

```sql
bucket_id = 'user_uploads' AND (storage.foldername(name))[1] = auth.uid()::text
```

### Policy 3: Users can update their own files

- **Policy name:** `Users can update own files`
- **Allowed operation:** `UPDATE`
- **USING expression:** same as Policy 2.

### Policy 4: Users can delete their own files

- **Policy name:** `Users can delete own files`
- **Allowed operation:** `DELETE`
- **USING expression:** same as Policy 2.

---

## If you get “must be owner of table objects”

Some Supabase projects don’t allow creating policies on `storage.objects` from the Dashboard or SQL Editor (the table is owned by an internal role).

**You can still run the app:**

1. Create only the **bucket** `user_uploads` (step 1 above). Do **not** add any policies.
2. In your project, set the **service role** key in `.env.local`:
   ```bash
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
   Get it from Supabase: **Project Settings** → **API** → **service_role** (secret).

3. The app uses this key only on the server to:
   - Upload files and insert asset rows (server action).
   - Record voice notes (server action).
   - Generate signed URLs for the collage editor (server component).

Access is still restricted: the server checks the user’s session and only allows uploads/reads for that user’s experiences. The service role key must **never** be exposed to the client (no `NEXT_PUBLIC_` prefix).

---

The app stores files under paths like `{userId}/{experienceId}/{timestamp}-{filename}`, so the first path segment is always the user’s ID.
