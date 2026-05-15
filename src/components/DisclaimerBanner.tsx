"use client";

/**
 * 景品表示法（第5条1号・優良誤認表示防止）対応 免責バナー
 * 競馬予想AI 専用
 * - バックテスト実績の表示根拠を明示
 * - 断定表現・保証表現を否定する免責文言
 * - 20歳未満利用不可の警告
 */

interface DisclaimerBannerProps {
  /** バックテスト集計期間（例: "2023年〜2025年"） */
  backtestPeriod?: string;
  /** バックテスト対象レース数（例: "11,031件"） */
  backtestSampleSize?: string;
  /** 的中率（例: "21.0%"）。未集計の場合は未指定 */
  hitRate?: string;
  /** 回収率（例: "82%"）。未集計の場合は未指定 */
  roi?: string;
  /** フッター固定表示にするか（デフォルト: false） */
  fixed?: boolean;
}

export function DisclaimerBanner({
  backtestPeriod = "2023年〜2025年",
  backtestSampleSize = "11,031件",
  hitRate,
  roi,
  fixed = false,
}: DisclaimerBannerProps) {
  const baseClass =
    "w-full bg-yellow-50 border-t-2 border-yellow-400 px-4 py-3 text-center";
  const fixedClass = fixed
    ? "fixed bottom-0 left-0 right-0 z-50 shadow-lg"
    : "";

  return (
    <div
      className={`${baseClass} ${fixedClass}`}
      role="note"
      aria-label="免責事項"
    >
      <p className="text-xs text-gray-700 leading-relaxed">
        <span className="font-bold text-yellow-700">【免責事項】</span>
        {hitRate || roi
          ? ` 表示の的中率${hitRate ? `（${hitRate}）` : ""}・回収率${roi ? `（${roi}）` : ""}は、${backtestPeriod}・${backtestSampleSize}を対象としたバックテスト集計結果です。`
          : ` 的中率・回収率の数値はバックテスト（${backtestPeriod}・${backtestSampleSize}）の集計結果です。`}
        過去の実績であり、将来の的中・回収を保証するものではありません。
        本サービスは予想情報の提供であり、馬券の購入を推奨するものではありません。
        馬券の購入はご自身の判断と責任で行ってください。
        公営競技は余裕資金でお楽しみください。
        <span className="ml-2 font-bold text-red-600">20歳未満の方はご利用いただけません。</span>
      </p>
    </div>
  );
}

export default DisclaimerBanner;
