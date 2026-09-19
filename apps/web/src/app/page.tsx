import { Button } from '@app/ui';

/**
 * A placeholder, not an example. It exists so the app shell, Tailwind, the
 * `@app/ui` cross-package import and the build all have something to render.
 * Replace it with your first real route.
 *
 * The route-group convention — `(marketing)` for public pages, `(dash)` for
 * anything behind a session — is described in the README rather than scaffolded
 * as empty directories.
 */
export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-6 px-6">
      <h1 className="text-3xl font-semibold tracking-tight">
        {process.env.APP_NAME ?? 'app'}
      </h1>
      <p className="text-gray-600">
        The shell is wired. Start with a DTO in <code className="font-mono">packages/contracts</code>,
        a module in <code className="font-mono">apps/api/src/modules</code>, and a route here.
      </p>
      <div className="flex gap-3">
        <Button>Primary</Button>
        <Button variant="ghost">Ghost</Button>
      </div>
    </main>
  );
}
