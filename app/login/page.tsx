import { Suspense } from "react";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";
import { AppHeader } from "@/components/AppHeader";

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return error ? <p className="ex-error" role="alert">Sign in did not finish. Try again.</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AppHeader links={[]} />
      <main className="ex-main tiny" style={{ paddingTop: "var(--space-16)" }}>
        <div className="ex-hero" style={{ paddingBottom: "var(--space-8)" }}>
          <h1 className="ex-title">Sign in</h1>
          <p className="ex-lede">Use your Google account. I only read your name and email.</p>
        </div>
        <div className="ex-block">
          <div className="pk-row"><GoogleSignInButton /></div>
          <Suspense fallback={null}><LoginError searchParams={searchParams} /></Suspense>
        </div>
      </main>
    </>
  );
}
