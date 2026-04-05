import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const NETKEIBA_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Referer: "https://db.netkeiba.com/",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** EUC-JP / Shift-JIS 対応デコード（db.netkeiba.com はEUC-JP） */
async function decodeBuffer(buffer: ArrayBuffer): Promise<string> {
  const sniff = new TextDecoder("utf-8", { fatal: false }).decode(buffer.slice(0, 2000));
  const cs = (sniff.match(/charset=["']?\s*([a-zA-Z0-9_-]+)/i)?.[1] || "utf-8")
    .toLowerCase().replace(/[_-]/g, "");
  if (cs === "eucjp" || cs === "xeucjp") return new TextDecoder("euc-jp").decode(buffer);
  if (cs === "shiftjis" || cs === "xsjis" || cs === "sjis" || cs === "windows31j")
    return new TextDecoder("shift_jis").decode(buffer);
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

/**
 * netkeibaの結果ページから複勝払い戻しと着順を取得する
 */
async function fetchRaceResult(
  raceId: string,
  playerNum: number
): Promise<{ hit: boolean; returnAmount: number; actualPos: number } | null> {
  const url = `https://db.netkeiba.com/race/${raceId}/`;
  let html = "";
  try {
    const res = await fetch(url, { headers: NETKEIBA_HEADERS });
    if (!res.ok) {
      console.error(`fetchRaceResult: HTTP ${res.status} for race ${raceId}`);
      return null;
    }
    // db.netkeiba.com はEUC-JPのためarrayBufferで受け取ってデコード
    const buf = await res.arrayBuffer();
    html = await decodeBuffer(buf);
  } catch (e) {
    console.error(`fetchRaceResult: fetch error for ${raceId}:`, e);
    return null;
  }

  // ── 着順取得 ──
  // db.netkeiba.com の結果テーブル: <tr class="tan_win"><td>1</td><td>馬番</td>...
  // または通常の結果テーブル race_table_01 の1列目=着順、2列目=馬番
  let actualPos = 0;

  // パターン1: tan_win / niban_win / sanban_win クラスのtr
  const winPatterns = [
    { cls: "tan_win", pos: 1 },
    { cls: "niban_win", pos: 2 },
    { cls: "sanban_win", pos: 3 },
    { cls: "yonban_win", pos: 4 },
  ];
  for (const { cls, pos } of winPatterns) {
    const trMatch = html.match(
      new RegExp(`<tr[^>]+class=["'][^"']*${cls}[^"']*["'][^>]*>([\\s\\S]*?)</tr>`, "i")
    );
    if (trMatch) {
      // 2番目のtdが馬番
      const tds = trMatch[1].match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
      if (tds.length >= 2) {
        const horseNumText = (tds[1].match(/<td[^>]*>([\s\S]*?)<\/td>/i)?.[1] ?? "").replace(
          /<[^>]+>/g,
          ""
        ).trim();
        if (parseInt(horseNumText, 10) === playerNum) {
          actualPos = pos;
          break;
        }
      }
    }
  }

  // パターン2: race_table_01 テーブルから全行をスキャン
  if (actualPos === 0) {
    const tableMatch = html.match(
      /<table[^>]+class=["'][^"']*race_table_01[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
    );
    if (tableMatch) {
      const rows = tableMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
      for (const row of rows) {
        const tds = row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) ?? [];
        if (tds.length >= 2) {
          const td0 = tds[0] as string;
          const td1 = tds[1] as string;
          const posTdMatch = td0.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          const numTdMatch = td1.match(/<td[^>]*>([\s\S]*?)<\/td>/i);
          const posText = (posTdMatch?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
          const numText = (numTdMatch?.[1] ?? "").replace(/<[^>]+>/g, "").trim();
          if (parseInt(numText, 10) === playerNum && /^\d+$/.test(posText)) {
            actualPos = parseInt(posText, 10);
            break;
          }
        }
      }
    }
  }

  // 着順が取れない場合はレース未確定かページ構造不一致
  if (actualPos === 0) {
    console.warn(`fetchRaceResult: actualPos not found for race=${raceId} playerNum=${playerNum}`);
    // 払い戻しのみ試みる
  }

  // ── 複勝払い戻し取得 ──
  let returnAmount = 0;

  // パターン1: <table class="pay_block"> の複勝行
  const payBlockMatch = html.match(
    /<table[^>]+class=["'][^"']*pay_block[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
  );
  if (payBlockMatch) {
    const rows = payBlockMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
    for (const row of rows) {
      if (/複勝/.test(row)) {
        // 馬番と払い戻し額をペアで抽出
        const numMatches = row.match(/(\d+)番/g) ?? [];
        const amountMatches = row.match(/[¥￥]?([\d,]+)円?/g) ?? [];
        for (let i = 0; i < numMatches.length; i++) {
          const num = parseInt(numMatches[i].replace("番", ""), 10);
          if (num === playerNum && i < amountMatches.length) {
            const amtStr = amountMatches[i].replace(/[¥￥,円]/g, "");
            returnAmount = parseInt(amtStr, 10);
            break;
          }
        }
        break;
      }
    }
  }

  // パターン2: <dl class="pay_block_list">
  if (returnAmount === 0) {
    const dlMatch = html.match(
      /<dl[^>]+class=["'][^"']*pay_block_list[^"']*["'][^>]*>([\s\S]*?)<\/dl>/gi
    );
    if (dlMatch) {
      for (const dl of dlMatch) {
        if (/複勝/.test(dl)) {
          // "3番 670円 / 5番 470円" のような形式を解析
          const ddMatch = dl.match(/<dd[^>]*>([\s\S]*?)<\/dd>/i);
          if (ddMatch) {
            const ddText = ddMatch[1].replace(/<[^>]+>/g, "");
            const entries = ddText.split("/");
            for (const entry of entries) {
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
  }

  // パターン3: pay_result テーブル（別形式）
  if (returnAmount === 0) {
    const payResultMatch = html.match(
      /<table[^>]+class=["'][^"']*pay_result[^"']*["'][^>]*>([\s\S]*?)<\/table>/i
    );
    if (payResultMatch) {
      const rows2 = payResultMatch[1].match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
      for (const row of rows2) {
        if (/複勝/.test(row)) {
          const numMatches = row.match(/(\d+)番/g) ?? [];
          const amountMatches = row.match(/([\d,]+)/g) ?? [];
          const amounts = amountMatches.filter((a) => parseInt(a.replace(",", ""), 10) >= 100);
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
    // レース結果が取れない（レース未確定、またはページ構造が違う）
    return null;
  }

  return { hit, returnAmount, actualPos };
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // recommendation='buy' AND hit IS NULL のレコードを最大30件取得
  const { data: pendingRows, error: fetchError } = await supabase
    .from("keiba_prediction_logs")
    .select("id, race_id, horse_num, race_date")
    .eq("recommendation", "buy")
    .is("hit", null)
    .order("created_at", { ascending: true })
    .limit(50);

  if (fetchError) {
    console.error("fetch pending error:", fetchError.message);
    return NextResponse.json({ error: fetchError.message }, { status: 500 });
  }

  if (!pendingRows || pendingRows.length === 0) {
    return NextResponse.json({ ok: true, message: "No pending records", updated: 0 });
  }

  let updatedCount = 0;
  let skippedCount = 0;
  const results: { id: string; raceId: string; hit: boolean; returnAmount: number }[] = [];

  for (const row of pendingRows) {
    const { id, race_id, horse_num, race_date } = row as {
      id: string;
      race_id: string;
      horse_num: number | null;
      race_date: string;
    };

    if (!race_id || horse_num == null) {
      skippedCount++;
      continue;
    }

    // レース日が今日以降ならスキップ（結果未確定）
    const today = new Date().toISOString().slice(0, 10);
    if (race_date >= today) {
      skippedCount++;
      continue;
    }

    const result = await fetchRaceResult(race_id, horse_num);

    if (result === null) {
      skippedCount++;
      // 1秒待機してから次のリクエスト
      await sleep(1000);
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
      console.error(`update error for id=${id}:`, updateError.message);
      skippedCount++;
    } else {
      updatedCount++;
      results.push({
        id,
        raceId: race_id,
        hit: result.hit,
        returnAmount: result.returnAmount,
      });
    }

    // 1秒待機（netkeibaへの負荷軽減）
    await sleep(1000);
  }

  return NextResponse.json({
    ok: true,
    updated: updatedCount,
    skipped: skippedCount,
    results,
  });
}
