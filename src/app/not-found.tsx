import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
      <div className="text-6xl mb-4">🔍</div>
      <h1 className="text-2xl font-bold text-white mb-2">ページが見つかりません</h1>
      <p className="text-gray-400 mb-8">お探しのページは存在しないか、移動した可能性があります。</p>
      <Link href="/" className="bg-yellow-600 px-6 py-3 rounded-full font-bold text-white">
        トップに戻る
      </Link>
    </main>
  );
}
