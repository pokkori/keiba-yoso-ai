export default function Loading() {
  return (
    <div className="min-h-screen p-4 md:p-8 animate-pulse">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="h-10 w-48 rounded-lg bg-gray-200" />
        <div className="h-5 w-72 rounded bg-gray-200" />
        <div className="rounded-2xl bg-gray-100 p-6 space-y-4">
          <div className="h-5 w-24 rounded bg-gray-200" />
          <div className="h-12 w-full rounded bg-gray-200" />
          <div className="h-5 w-32 rounded bg-gray-200" />
          <div className="h-32 w-full rounded bg-gray-200" />
          <div className="h-12 w-full rounded-xl bg-gray-200" />
        </div>
      </div>
    </div>
  );
}
