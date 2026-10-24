# 公開記録 — しば日和 3D / 3d-v7.3（最新）

- 公開日: 2026-10-24。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-24-3d-v7.3、Deployment: 44fd6afc
- 変更: おつかいの間隔（終了後3分・ことわり後1分、頼む子は1匹）、吹き出しとおつかいのひらがな化、拾いものを地面に置いて口で運ぶ、つりざおと魚20種・図鑑、犬小屋に入れる。ビルド・テストはNode.js v24.22.1。
- テスト: core 25/25、smoke 64/64、iPad想定 16/16、JSON引き継ぎ 18/18、本番 7/7。配信中の6ファイルは手元とSHA256一致。

---

# 公開記録 — しば日和 3D / 3d-v7.2

- 公開日: 2026-10-24。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-24-3d-v7.2
- 変更: NPCの首の装備をやめた、川の橋と向こう岸、水着（海と川で犬かき）。ビルド・テストはNode.js v24.22.1。
- テスト: core 22/22、smoke 58/58、iPad想定 16/16、JSON引き継ぎ 18/18、本番 7/7。

---

# 公開記録 — しば日和 3D / 3d-v7.1（最新）

- 公開日: 2026-10-24。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-24-3d-v7.1
- 変更: NPCのキャラクター分け（服装・大きさ・速さ・しぐさ）、自分のエリア中心の行動、輪郭をくっきり。ビルド・テストはNode.js v24.22.1。
- テスト: core 21/21、smoke 54/54、iPad想定 16/16、JSON引き継ぎ 18/18、本番 7/7。

---

# 公開記録 — しば日和 3D / 3d-v7（最新）

- 公開日: 2026-10-24。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-24-3d-v7、この版のURL: https://9e44a3ff.shiba-biyori-20261010.pages.dev
- ビルド・テスト: Node.js v24.22.1（修正版）。
- 変更: 羽の付け根・植木などのちらつき修正、NPCの柴犬5匹とおつかい20種、JSON読み込みの受け付け拡大（BOM付きも可）。保存形式は互換（前の版のJSONも読める）。
- 本番の / と service-worker.js は手元とSHA256一致。テスト: core 21/21、smoke 54/54、iPad想定 16/16、公開版JSON→新しい版の引き継ぎ 18/18、本番 7/7。

---

# 公開記録 — しば日和 3D / 3d-v6（最新）

- 公開日: 2026-10-23。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-23-3d-v6、この版のURL: https://70787301.shiba-biyori-20261010.pages.dev
- ビルド・テスト環境: Node.js v24.22.1（2026-10-21のセキュリティ更新の修正版）。修正前のNode.jsではビルドが止まる。
- 変更: 道路と公園・町・海・川、犬らしいしつけ、お肉・お魚、おもちゃを口で運ぶ、初回500コイン。保存形式は変更なし（記録は引き継ぎ）。
- 本番の / と service-worker.js は手元とSHA256一致。テスト: core 18/18、smoke 51/51、iPad想定 16/16、本番 7/7。

---

# 公開記録 — しば日和 3D / 3d-v5（最新）

- 公開日: 2026-10-23。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-23-3d-v5、この版のURL: https://25e17644.shiba-biyori-20261010.pages.dev
- 変更: 毛色選択、茶柴・白柴の全ポーズ（黒柴の絵の色変え）、しつけの動作、ごはんの立体、見まわし、おもちゃ6種、クローゼット、お庭・原っぱ、ひみつ道具での解放、新しい遊び6種・おさんぽ3コース、パタパタ羽（胴体）。
- 本番の / と service-worker.js は手元とSHA256一致。本番確認 7/7。

---

# 公開記録 — しば日和 3D / 3d-v4.2（最新）

- 公開日: 2026-10-22。ユーザーの明示的な許可に基づく。RELEASE: 2026-10-22-3d-v4.2、この版のURL: https://d9ac69ec.shiba-biyori-20261010.pages.dev
- 変更: 首輪を廃止（表示しない・ショップから外す・初期装備なし。以前の記録はそのまま読める）。
- 本番の / と service-worker.js は手元とSHA256一致。本番確認 7/7。

---

# 公開記録 — しば日和 3D / 3d-v4.1（最新・修正版）

- 公開日: 2026-10-22。ユーザーがこの修正版の反映を明示的に選んだ許可に基づく。RELEASE: 2026-10-22-3d-v4.1
- この版のURL: https://8100e239.shiba-biyori-20261010.pages.dev （公開URLは同じ https://shiba-biyori-20261010.pages.dev/ ）
- 修正内容: 実機iPadでの報告に対応（首輪・きせかえを画像の頭の位置に合わせる、選択パネルを選んだあと閉じる／小さなバーにする、茶柴・白柴でも食べる・技の動作を見せる、縦向きの散歩などで犬が見切れないカメラ、古いSafari向けの互換性）。
- 本番の / と service-worker.js は手元とSHA256一致。本番確認 `tests/v4/public.test.cjs` 7/7（v4.1のキャッシュを確認）。

---

# 公開記録 — しば日和 3D / 3d-v4（最新）

- 公開URL: https://shiba-biyori-20261010.pages.dev/ （プロジェクト shiba-biyori-20261010、Production / branch main）
- RELEASE: 2026-10-22-3d-v4
- この版のURL: https://1a17b84e.shiba-biyori-20261010.pages.dev
- 公開日: 2026-10-22。ユーザーがこの版と既存の公開先への反映を明示的に選んだ許可に基づく。
- 方法: PCに既存のWrangler 4.125.0とOAuth接続で `wrangler pages deploy pwa`。認証・アカウント・権限・設定の変更はなし。
- 配信したのは `pwa/` の7ファイルのみ（index.html、manifest.webmanifest、service-worker.js、pwa.js、icon-192.png、icon-512.png、_headers）。
- 本番の `/`・service-worker.js・pwa.js・manifest・アイコン2つは手元のファイルとSHA256一致、CSPヘッダあり。
- 本番確認（`tests/v4/public.test.cjs`、iPadのUA・1180×820・DPR2・タッチを模したChrome）: 起動、オフライン準備、v4キャッシュ、通信遮断で再起動して記録保持と3D表示、オフラインでゲーム完走、別ホスト通信ゼロ、実行時エラーゼロ — 7/7。
- 旧版（v2記録）からの引き継ぎはローカルで確認済み（`tests/v4/smoke.test.cjs`）。実iPad / Safari / ホーム画面での確認は未実施。

---

# 公開記録 — しば日和 / touch3d-v3

公開URL: https://shiba-biyori-20261010.pages.dev/

- プロジェクト: shiba-biyori-20261010
- 環境: Production / branch main
- RELEASE: 2026-10-10-touch3d-v3
- Deployment ID: 29f73077-33c1-4559-8592-53ffe15e94c1
- この版のURL: https://29f73077.shiba-biyori-20261010.pages.dev
- 公開日: 2026-10-10
- ユーザーが今回版と既存宛先を指定した03:29:15 UTCの新しい明示許可に基づいて更新しました。
- PCに既存の正規Wrangler 4.125.0 / OAuth接続を使用。認証、アカウント、購入、権限・セキュリティ設定の拡張は行っていません。

## 公開内容と同一性

公開ステージとcloudflare-upload.zipの７ファイルだけを配布しました。

index.html、manifest.webmanifest、service-worker.js、pwa.js、icon-192.png、icon-512.png、_headers。

ユーザーのセーブ・写真、研究ファイル、編集ソース、README、QA証跡、完全版ZIP、素材出典メタデータ、未使用プレビューはアップロードしていません。３枚の使用画像は承認された元のバイト列をHTMLへ埋め込み、色替えしていません。

- PWA HTML SHA256: a35dfe7c7a0875ed33bac1535ae7200b5737f41566fd694c91304fc400020101
- Service Worker SHA256: ed6575964745c1b958c48040eab1374e922320c90d4694d939242e969a19d009
- 公開用ZIP SHA256: 15d9b0c58d85cb3facc0b7be32a8c7f173a5cbb4a0b89e7ea64b9353fb726e18

配信６ファイルはすべて200、納品PWAとSHA256一致。_headersは設定として適用され、CSP、カメラのみ/マイクなし、SW等のno-cacheを確認しました。

## 本番検証

６グループの新規HTTPS起動・食事・毛色・保存・散歩・ジャンプ・写真合成・オフラインと、５グループの実際の旧公開QAプロファイルからの更新試験を通過しました。旧v1をオフラインで開いた後、更新ボタンでv3へ移り、名前・毛色・回数・XP・年齢を保持しました。更新後の実タッチ追従、ミルクのドラッグ・段階消費、オフライン再起動、実WebGLを確認。console/runtimeエラー0、別ホストのエンドポイント0、GET以外の写真/セーブ送信0です。

証跡: evidence/public-http.json、public-browser-tests.json、public-upgrade-tests.json、26〜29/46〜49の画面。ローカル74、本番11の合計85検証グループ。

実iPad/Safariホーム画面、実カメラ、iPadの写真/JSON保存は未確認です。犬は3Dステージ内の透過スプライトで、3D犬モデルではありません。茶柴・白柴は承認済み１枚絵で全ポーズ未実装です。

## 更新履歴

以前のv1: ce7e741e-485e-4714-9af6-97edc2a34a36。今回の初回v2: f5dd3465-603c-45f5-aa66-fd12fa97d5a2。

初回v2の本番QAで、Cloudflareのindex.htmlリダイレクトを保存したResponseによるSW再読み込み失敗を発見しました。v3で正規ルートのResponseを保存するよう修正し、壊れたv2キャッシュだけを自動回復。旧v1の通常更新は明示ボタンのままです。保存はschemaVersion 2 / shiba-pocket-save-v2を維持。修正の再現・回復・保存保持・オフライン試験４グループも通過しています。

最初の公開操作と追送原文での再試行は自動承認レビューに拒否され、コマンドは開始されませんでした。ユーザーが今回版と公開先を改めて指定した新規許可で解決しました。過去の拒否はevidence/publication-blocked.jsonに履歴として残し、現在はresolved=trueです。旧公開QA証跡はevidence/previous-publication/。既存ファイルはbackups/pre-touch-3d-20261010-022546.zipに保全しています。
