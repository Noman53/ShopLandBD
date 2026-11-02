import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import "./index.css";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error('The app root element "#root" was not found.');
}

const root = createRoot(rootElement);

function startupNotice(message: string) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 text-foreground">
      <section className="w-full max-w-lg">
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-primary">ShopLandBD</p>
        <h1 className="mb-3 text-2xl font-bold">Supabase setup required</h1>
        <p className="mb-5 text-muted-foreground">{message}</p>
        <p className="mb-2 text-sm font-medium">Add these public project settings to `.env.local`:</p>
        <pre className="overflow-x-auto rounded-md bg-muted p-4 text-sm">
          VITE_SUPABASE_URL=https://&lt;project-ref&gt;.supabase.co{"\n"}
          VITE_SUPABASE_PUBLISHABLE_KEY=&lt;publishable-or-anon-key&gt;
        </pre>
        <p className="mt-4 text-sm text-muted-foreground">
          Restart `npm run dev` after adding them. See the Local development section in README.md.
        </p>
      </section>
    </main>
  );
}

if (!supabaseUrl || !supabasePublishableKey) {
  root.render(startupNotice("The required Supabase environment variables are missing."));
} else {
  const preconnect = document.createElement("link");
  preconnect.rel = "preconnect";
  try {
    preconnect.href = new URL(supabaseUrl).origin;
  } catch {
    root.render(startupNotice("VITE_SUPABASE_URL must be a valid Supabase project URL."));
  }
  preconnect.crossOrigin = "anonymous";
  document.head.appendChild(preconnect);

  if (preconnect.href) {
    import("./App.tsx").then(({ default: App }) => {
      root.render(
        <HelmetProvider>
          <App />
        </HelmetProvider>
      );
    });
  }
}
