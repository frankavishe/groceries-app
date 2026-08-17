import { VerifyOtpForm } from './verify-otp-form';

interface VerifyOtpPageProps {
  searchParams: Promise<{ phone?: string }>;
}

export default async function VerifyOtpPage({ searchParams }: VerifyOtpPageProps) {
  const { phone } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center gap-6 px-4">
      <div>
        <h1 className="text-2xl font-semibold">Verify your phone</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Enter the code we sent to {phone ?? 'your phone'}.
        </p>
      </div>
      <VerifyOtpForm phone={phone ?? ''} />
    </main>
  );
}
