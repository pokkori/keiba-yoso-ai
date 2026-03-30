export function TrustBadge() {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-white/70">
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
        登録不要
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
        30秒で完成
      </span>
      <span className="flex items-center gap-1">
        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 13l4 4L19 7"/></svg>
        毎日3回まで無料
      </span>
    </div>
  );
}
