import type { NextPageContext } from "next";

interface ErrorPageProps {
  statusCode?: number;
}

export default function ErrorPage({ statusCode }: ErrorPageProps) {
  return (
    <main className="min-h-screen bg-[var(--bg-primary)] px-6 py-16">
      <div className="mx-auto max-w-xl text-center">
        <h1 className="text-3xl font-semibold text-[var(--text-primary)]">
          {statusCode ?? 500}
        </h1>
      </div>
    </main>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res?.statusCode ?? err?.statusCode ?? 500;
  return { statusCode };
};
