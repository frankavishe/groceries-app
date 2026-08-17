import { LoginForm } from './login-form';

interface LoginPageProps {
  searchParams: Promise<{ verified?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { verified } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Groceries</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Sign in to start shopping.</p>
      </div>
      <LoginForm verified={verified === '1'} />
    </main>
  );
}
