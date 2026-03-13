# PR チェックリスト

## 変更の概要
<!-- 何を変更したか・なぜ変更したかを簡潔に記載 -->


## 変更種別
- [ ] バグ修正
- [ ] 新機能
- [ ] LP/コピー変更
- [ ] 決済フロー変更
- [ ] その他:

---

## ✅ リリース前必須チェックゲート（全項目クリアするまでマージ禁止）

### Gate 1: コンプライアンス
- [ ] **compliance-scanner承認**: 薬機法・景表法・景品表示法に問題なし
- [ ] **legal-shield確認**: 免責文・グレー表現のチェック済み
- [ ] LPコピー・サンプル文に効果訴求の誇大表現がない
- [ ] 虚偽の社会的証明（「〇万人が利用」等）がない

### Gate 2: ユーザー体験
- [ ] **user-empathy確認**: ターゲットユーザーが読んで不快にならない
- [ ] **brand-copy確認**: ファーストビューのコピーが完成している（仮置きテキストなし）

### Gate 3: 技術品質
- [ ] **engineer確認**: PayjpModal・環境変数・metadataが正しく設定されている
- [ ] Cookie に `httpOnly: true, secure: true, sameSite: "lax"` が設定されている
- [ ] `export const dynamic = "force-dynamic"` が必要な APIルートに設定されている
- [ ] 他アプリのテキスト・APP_ID・cookie名がコピペされていない（混入確認）
- [ ] `NEXT_PUBLIC_*` に秘密鍵が含まれていない

### Gate 4: 決済フロー（決済関連変更時のみ）
- [ ] **qa-automation確認**: PAY.JP決済→cookie設定→プレミアム機能開放の動作確認済み
- [ ] iOS Safari / Android Chrome でのスマホ表示確認済み

---

## テスト確認
- [ ] ローカルで動作確認済み
- [ ] Vercel Preview URLで確認済み（URL: ）

## 関連Issue / 背景
<!-- 関連するIssueや変更の背景を記載 -->
