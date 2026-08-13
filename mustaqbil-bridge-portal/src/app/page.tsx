import Image from 'next/image';
import Link from 'next/link';

const stages = [
  { label: 'To do', note: 'Queued' },
  { label: 'In progress', note: 'Owned' },
  { label: 'In review', note: 'Checked' },
  { label: 'Done', note: 'Approved' },
];

const lightLogoStyle = {
  filter: 'brightness(0) saturate(100%) invert(15%) sepia(66%) saturate(1848%) hue-rotate(192deg) brightness(92%) contrast(101%)',
};

export default function Home() {
  return (
    <main
      className="min-h-screen text-[#101828]"
      style={{
        background:
          'radial-gradient(circle at top left, rgba(255, 193, 7, 0.16), transparent 30%), linear-gradient(180deg, #ffffff 0%, #f5f7fa 100%)',
      }}
    >
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between gap-4">
          <Image src="/MB_Logo.svg" alt="Mustaqbil Bridge" width={184} height={64} style={lightLogoStyle} priority />
          <Link
            href="/login"
            className="inline-flex items-center justify-center rounded-full bg-[#FFC107] px-5 py-2.5 text-sm font-semibold text-[#0F3F7F] shadow-[0_10px_30px_-16px_rgba(15,63,127,0.5)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-18px_rgba(15,63,127,0.55)]"
          >
            Sign in
          </Link>
        </header>

        <section className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[1.08fr_0.92fr] lg:py-12">
          <div className="page-fade space-y-8">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#0F3F7F]/10 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.26em] text-[#0F3F7F] shadow-sm">
              Invite-only internal portal
            </p>

            <div className="space-y-4">
              <h1 className="max-w-2xl font-heading text-5xl font-semibold leading-[1.02] tracking-tight text-[#101828] md:text-6xl">
                A clear bridge from assigned work to approved results.
              </h1>
              <p className="max-w-2xl text-lg leading-8 text-[#64748B]">
                Mustaqbil Bridge keeps volunteers, managers, and admin inside one secure workflow for tasks,
                comments, questions, and progress tracking.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-[#0F3F7F] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_-18px_rgba(15,63,127,0.55)] transition hover:-translate-y-0.5 hover:bg-[#123f79]"
              >
                Sign in
              </Link>
              <span className="inline-flex items-center rounded-full border border-[#D8E0EA] bg-white/70 px-4 py-3 text-sm text-[#64748B]">
                Secure access for invited team members only
              </span>
            </div>
          </div>

          <aside className="page-fade rounded-[2rem] border border-[#D8E0EA] bg-white/90 p-6 shadow-[0_30px_90px_-45px_rgba(15,63,127,0.35)] backdrop-blur-sm">
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#0F3F7F]">Task bridge</p>
                  <h2 className="mt-2 font-heading text-2xl font-semibold text-[#101828]">A calm, focused workflow</h2>
                </div>
                <div className="rounded-full bg-[#FFF4CC] px-3 py-1 text-xs font-semibold text-[#0F3F7F]">
                  Live flow
                </div>
              </div>

              <div className="relative py-6">
                <div className="absolute left-4 right-4 top-1/2 h-px -translate-y-1/2 rounded-full bg-[#D8E0EA]">
                  <div className="bridge-line h-px rounded-full bg-[#0F3F7F]" />
                </div>

                <div className="relative grid grid-cols-4 gap-3">
                  {stages.map((stage, index) => (
                    <div
                      key={stage.label}
                      className="bridge-node rounded-2xl border border-[#D8E0EA] bg-[#F5F7FA] p-3 text-center shadow-sm"
                      style={{ animationDelay: `${index * 120}ms` }}
                    >
                      <div className="mx-auto mb-3 flex h-9 w-9 items-center justify-center rounded-full bg-white text-sm font-semibold text-[#0F3F7F] shadow-sm">
                        {index + 1}
                      </div>
                      <p className="text-sm font-semibold text-[#101828]">{stage.label}</p>
                      <p className="mt-1 text-xs text-[#64748B]">{stage.note}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 border-t border-[#D8E0EA] pt-5 sm:grid-cols-3">
                {[
                  ['Secure access', 'Invite-only auth and protected routes'],
                  ['Task control', 'Assign, review, and approve in one place'],
                  ['Volunteer clarity', 'Comments, questions, and status updates'],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-2xl bg-[#F5F7FA] p-4">
                    <p className="text-sm font-semibold text-[#0F3F7F]">{title}</p>
                    <p className="mt-1 text-sm leading-6 text-[#64748B]">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
