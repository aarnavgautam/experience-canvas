import Link from 'next/link';
import { getSupabaseServerClient } from '@/lib/supabaseServer';

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user }
  } = await supabase.auth.getUser();

  const { data: experiences } = await supabase
    .from('experiences')
    .select('*')
    .order('start_at', { ascending: false });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Your Experiences</h1>
          <p className="text-xs text-slate-300">
            Private-by-default. Only {user?.email ?? 'you'} can view these.
          </p>
        </div>
        <Link
          href="/app/experience/new"
          className="rounded-md bg-sky-500 px-3 py-2 text-xs font-medium text-slate-950 hover:bg-sky-400"
        >
          New Experience
        </Link>
      </div>

      {experiences && experiences.length > 0 ? (
        <ul className="grid gap-3 md:grid-cols-2">
          {experiences.map((exp) => (
            <li
              key={exp.id}
              className="flex flex-col rounded-lg border border-slate-800 bg-slate-900/70 p-3"
            >
              <Link
                href={`/app/experience/${exp.id}`}
                className="text-sm font-medium hover:underline"
              >
                {exp.title}
              </Link>
              <div className="mt-1 text-xs text-slate-300">
                <span>
                  {new Date(exp.start_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  {exp.end_at
                    ? ` – ${new Date(exp.end_at).toLocaleDateString()}`
                    : ''}
                </span>
                {exp.location_name && (
                  <span className="ml-2 text-slate-400">
                    • {exp.location_name}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-slate-300">
          No experiences yet. Create one to start assembling your story.
        </p>
      )}
    </div>
  );
}

