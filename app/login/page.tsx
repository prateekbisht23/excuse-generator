import { Suspense } from "react";
import { Header } from "prateek-design-system";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

async function LoginError({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const { error } = await searchParams;
  return error ? <p className="ex-error" role="alert">Sign in did not finish. Try again.</p> : null;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <div className="pk-page">
      <Header name="Excuse generator" links={[]} />
      <div className="pk-hero">
        <h1 className="pk-name" style={{ fontSize: 32, lineHeight: "40px" }}>Sign in</h1>
        <p className="pk-lede">Use your Google account. I only read your name and email.</p>
      </div>
      <div className="ex-stack" style={{ marginTop: "var(--space-8)" }}>
        <div className="pk-row"><GoogleSignInButton /></div>
        <Suspense fallback={null}><LoginError searchParams={searchParams} /></Suspense>
      </div>
    </div>
  );
}
