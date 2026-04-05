/**
 * keiba-backfill.mjs
 *
 * Supabase の keiba_prediction_logs テーブルから
 * recommendation='buy' AND hit IS NULL の全レコードを取得し、
 * NetKeiba をスクレイピングして着順・複勝払い戻しを更新する。
 *
 * 使い方:
 *   node scripts/keiba-backfill.mjs
 *
 * 環境変数 (GitHub Secrets / .env.local):
 *   SUPABASE_URL              ... Supabase プロジェクト URL
 *   SUPABASE_SERVICE_ROLE_KEY ... Supabase サービスロールキー
 *
 * Node.js 18+ の fetch を使用（node-fetch 不要）
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// ── .env.local 読み込み（ローカル実行時用） ──────────────────────────────
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "../.env.local");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
  console.log("[init] .env.local loaded");
}

// ── 環境変数チェック ─────────────────────────────────────────────────────
const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "[error] 環境変数 SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY が必要です"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ── 定数 ────────────────────────────────────────────────────────────────
const NETKEIBA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://db.netkeiba.com/",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

const SLEEP_MS = 1000;        // NetKeiba への負荷軽減: 1件1秒
const PROGRESS_INTERVAL = 10; // 10件ごとに進捗ログ
const SUPABASE_PAGE_SIZE = 1000; // Supabase の1回あたり取得上限

// ── ユーティリティ ───────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** EUC-JP / Shift-JIS 対応デコード（db.netkeiba.com は EUC-JP） */
async function decodeBuffer(buffer) {
  const sniff = new TextDecoder("utf-8", { fatal: false }).decode(
    buffer.slice(0, 2000)
  );
  const cs = (
    sniff.match(/charset=["']?\s*([a-zA-Z0-9_-]+)/i)?.[1] || "utf-8"
  )
    .toLowerCase()
    .replace(/[_-]/g, "");
  if (cs === "eucjp" || cs === "xeucjp")
    return new TextDecoder("euc-jp").decode(buffer);
  if (
    cs === "shiftjis" ||
    cs === "xsjis" ||
    cs === "sjis" ||
    cs === "windows31j"
  )
    return new TextDecoder("shift_jis").decode(buffer);
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

// ── NetKeiba スクレイピング ──────────────────────────────────────────────
/**
 * NetKeiba の結果ページから複勝払い戻しと着順を取得する。
 * @param {string} raceId
 * @param {number} playerNum 馬番
 * @returns {{ hit: boolean; returnAmount: number; actualPos: number } | null}
 */
async function fetchRaceResult(raceId, playerNum) {
  const url = `https://db.netkeiba.com/race/${raceId}/`;
  let html = "";
  try {
    const res = await fetch(url, { headers: NETKEIBA_HEADERS });
    if (!res.ok) {
      console.error(`[fetch] HTTP ${res.status} race=${raceId}`);
      return null;
    }
    const buf = await res.arrayBuffer();
    html = await decodeBuffer(buf);
  } catch (e) {
    console.error(`[fetch] error race=${raceId}:`, e.message);
    return null;
  }

  // ── 着順取得 ──
  let actualPos = 0;

  // パターン1: tan_win / niban_win / sanban_win / yonban_win クラスの tr
  const winPatterns = [
    { cls: "tan_win", pos: 1 },
    { cls: "niban_win", pos: 2 },
    { cls: "sanban_win", pos: 3 },
    { cls: "yonban_win", pos: 4 },
  ];
  for (const { cls, pos } of winPatterns) {
    const trMatch = html.match(
      new RegExp(
        `<tr[^>]+class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)</tr>`,
        "i"
      )
    );
    if (trMatch) {
      const tds = trMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
      if (tds.length >= 2) {
        const horseNumText = (
          tds[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? ""
        )
          .replace(/<[^>]+>/g, "")
          .trim();
        if (parseInt(horseNumText, 10) === playerNum) {
          actualPos = pos;
          break;
        }
      }
    }
  }

  // パターン2: race_table_01 テーブルから全行スキャン
  if (actualPos === 0) {
    const tableMatch = html.match(
      /<table[^>]+class=["'][^"']*race_table_01[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
    );
    if (tableMatch) {
      const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
      for (const row of rows) {
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
        if (tds.length >= 2) {
          const posTdMatch = tds[0].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          const numTdMatch = tds[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          const posText = (posTdMatch?.[1] ?? "")
            .replace(/<[^>]+>/g, "")
            .trim();
          const numText = (numTdMatch?.[1] ?? "")
            .replace(/<[^>]+>/g, "")
            .trim();
          if (
            parseInt(numText, 10) === playerNum &&
            /^\d+$/.test(posText)
          ) {
            actualPos = parseInt(posText, 10);
            break;
          }
        }
      }
    }
  }

  if (actualPos === 0) {
    console.warn(
      `[warn] actualPos not found race=${raceId} playerNum=${playerNum}`
    );
  }

  // ── 複勝払い戻し取得 ──
  let returnAmount = 0;

  // パターン1: <table class="pay_block">
  const payBlockMatch = html.match(
    /<table[^>]+class=["'][^"']*pay_block[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
  );
  if (payBlockMatch) {
    const rows = payBlockMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
    for (const row of rows) {
      if (/複勝/.test(row)) {
        const numMatches = row.match(/(\d+)番/g) ?? [];
        const amountMatches = row.match(/[¥￥]?([\d,]+)円?/g) ?? [];
        for (let i = 0; i < numMatches.length; i++) {
          const num = parseInt(numMatches[i].replace("番", ""), 10);
          if (num === playerNum && i < amountMatches.length) {
            returnAmount = parseInt(
              amountMatches[i].replace(/[¥￥,円]/g, ""),
              10
            );
            break;
          }
        }
        break;
      }
    }
  }

  // パターン2: <dl class="pay_block_list">
  if (returnAmount === 0) {
    const dlMatches =
      html.match(
        /<dl[^>]+class=["'][^"']*pay_block_list[^"']*["'][^>]*>([\s\S]*?)<\/dl>/gi
      ) ?? [];
    for (const dl of dlMatches) {
      if (/複勝/.test(dl)) {
        const ddMatch = dl.match(/<dd[^>]*>([\s\S]*?)<\/dd>/i);
        if (ddMatch) {
          const ddText = ddMatch[1].replace(/<[^>]+>/g, "");
          for (const entry of ddText.split("/")) {
            const numMatch = entry.match(/(\d+)番/);
            const amtMatch = entry.match(/([\d,]+)円/);
            if (
              numMatch &&
              amtMatch &&
              parseInt(numMatch[1], 10) === playerNum
            ) {
              returnAmount = parseInt(amtMatch[1].replace(",", ""), 10);
              break;
            }
          }
        }
        break;
      }
    }
  }

  // パターン3: pay_result テーブル（別形式）
  if (returnAmount === 0) {
    const payResultMatch = html.match(
      /<table[^>]+class=["'][^"']*pay_result[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
    );
    if (payResultMatch) {
      const rows2 =
        payResultMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
      for (const row of rows2) {
        if (/複勝/.test(row)) {
          const numMatches = row.match(/(\d+)番/g) ?? [];
          const amountMatches = row.match(/([\d,]+)/g) ?? [];
          const amounts = amountMatches.filter(
            (a) => parseInt(a.replace(",", ""), 10) >= 100
          );
          for (let i = 0; i < numMatches.length; i++) {
            const num = parseInt(numMatches[i].replace("番", ""), 10);
            if (num === playerNum && i < amounts.length) {
              returnAmount = parseInt(amounts[i].replace(",", ""), 10);
              break;
            }
          }
          break;
        }
      }
    }
  }

  const hit = actualPos > 0 ? actualPos <= 3 : returnAmount > 0;

  if (actualPos === 0 && returnAmount === 0) {
    return null;
  }

  return { hit, returnAmount, actualPos };
}

// ── Supabase 全件取得（ページング） ─────────────────────────────────────
async function fetchAllPendingRows() {
  const today = new Date().toISOString().slice(0, 10);
  const allRows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("keiba_prediction_logs")
      .select("id, race_id, horse_num, race_date")
      .eq("recommendation", "buy")
      .is("hit", null)
      .lt("race_date", today) // 今日以降はスキップ（結果未確定）
      .order("created_at", { ascending: true })
      .range(from, from + SUPABASE_PAGE_SIZE - 1);

    if (error) {
      console.error("[supabase] fetch error:", error.message);
      break;
    }
    if (!data || data.length === 0) break;

    allRows.push(...data);
    console.log(`[supabase] 取得: ${allRows.length} 件目まで完了`);

    if (data.length < SUPABASE_PAGE_SIZE) break; // 最終ページ
    from += SUPABASE_PAGE_SIZE;
  }

  return allRows;
}

// ── メイン ───────────────────────────────────────────────────────────────
async function main() {
  console.log("=== keiba-backfill 開始 ===");
  console.log(`開始時刻: ${new Date().toISOString()}`);

  // 全件取得
  const rows = await fetchAllPendingRows();
  console.log(`\n対象レコード合計: ${rows.length} 件\n`);

  if (rows.length === 0) {
    console.log("更新対象なし。終了します。");
    return;
  }

  // 推定時間を表示
  const estimatedMinutes = Math.ceil((rows.length * SLEEP_MS) / 1000 / 60);
  console.log(`推定処理時間: 約 ${estimatedMinutes} 分\n`);

  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const { id, race_id, horse_num, race_date } = rows[i];

    if (!race_id || horse_num == null) {
      skippedCount++;
      continue;
    }

    const result = await fetchRaceResult(race_id, horse_num);

    if (result === null) {
      console.warn(`[skip] race=${race_id} num=${horse_num} → 結果取得不可`);
      skippedCount++;
      await sleep(SLEEP_MS);
      continue;
    }

    const { error: updateError } = await supabase
      .from("keiba_prediction_logs")
      .update({
        hit: result.hit,
        return_amount: result.returnAmount,
        actual_pos: result.actualPos > 0 ? result.actualPos : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (updateError) {
      console.error(`[error] update id=${id}:`, updateError.message);
      errorCount++;
    } else {
      updatedCount++;
      if (updatedCount % PROGRESS_INTERVAL === 0) {
        console.log(
          `[progress] ${i + 1}/${rows.length} 件処理完了 | 更新: ${updatedCount} | スキップ: ${skippedCount} | エラー: ${errorCount}`
        );
      }
    }

    await sleep(SLEEP_MS);
  }

  console.log("\n=== keiba-backfill 完了 ===");
  console.log(`終了時刻: ${new Date().toISOString()}`);
  console.log(`更新: ${updatedCount} 件`);
  console.log(`スキップ: ${skippedCount} 件`);
  console.log(`エラー: ${errorCount} 件`);
  console.log(`合計: ${rows.length} 件`);
}

main().catch((e) => {
  console.error("[fatal]", e);
  process.exit(1);
});
