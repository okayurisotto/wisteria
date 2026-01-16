[wisteria]: https://github.com/okayurisotto/wisteria
[misskey]: https://github.com/misskey-dev/misskey/releases/tag/2024.2.0

# [Wisteria](wisteria)

[Wisteria](wisteria)は[Misskey@2024.2.0](misskey)からハードフォークされた分散型SNSです。主に個人での利用を念頭に、SNSとして最低限必要の機能のみをうまく動作させることに注力し、開発・導入・保守にかかるコストを下げることを目的に開発されています。

## Misskeyとの主な違い（WIP）

### ユーザ向け

以下の機能は削除されました。

- Deck UI
- チャンネル
- ドライブクリーナー
- 画像のcropping
- テーマエディター
- プラグイン及びAiScript環境
- 季節のエフェクト
- メール通知
- オンラインステータス表示
- re2を使ったサーバサイドでの正規表現の評価
	- センシティブワード機能での正規表現の使用
	- 禁止ワード機能での正規表現の使用

ビルトインのテーマはMisskey LightとMisskey Darkの2種類に減らされました。

角の丸さが全体的に調整されました。操作可能なボタン等は最大限の丸みで、操作不可能なコンテナ要素の丸みなどは最小限に抑えられています。

### 管理者向け

`node:cluster`を使ったクラスタリングは行われなくなりました。これは、多くの場面においてクラスタリングは必要なく、クラスタリングが必要な場面ではそもそも`node:cluster`よりKubernetesなどを使うべきであるという思想に基づいています。

アカウント登録時にメール認証を必須とする機能、メールを介して通知を送信する機能、メールを介してパスワードをリセットする機能を削除しました。これらは、メールをある種の超法規的な認証システムにすべきではないという思想に基づいています。

広告機能は削除されました。

Prometheusなどのためのメトリクスデータが`/metrics`にて配信されるようになりました。ただしこれは実験的な機能です。

### 開発者向け

PostgreSQLのデータベース構造は、今のところMisskey@2024.2.0と変わりません。

Fanout Timeline Technology（Redis上でListを用いてタイムラインをキャッシュする技術）は廃止されました。現在タイムライン構築にRedisを活用している場面は、アンテナ等に限られ、そこではSorted Setが使われています。

サーバライブラリはFastifyからHonoに置き換えられました。

AjvによるAPIリクエストのバリデーションはZodに置き換えられました。

多言語対応のためのロケールファイルをJSONとしては配信しなくなりました。現在はmonorepo内の`locales`パッケージにあるJSONをモジュールとして読み込む形になっています。

トークン管理の実装に問題のあった、OAuth2実装は削除されました。

Wisteriaはサードパーティクライアントから使われることを想定していません。現在のところMiAuth機能は削除されてはいませんが、将来的な維持は保証されません。

## サーバ構成

詳細は`compose.example.yaml`を確認してください。

- Wisteria
	- SNSとして動くWebサーバです。
	- デフォルトでは3000番ポートでHTTPリクエストを受け付けます。本番環境ではリバースプロキシと合わせてセットアップすることを強く推奨します。
- PostgreSQL 15
	- WisteriaはPostgreSQLをデータベースとして使用します。
- Redis 7
	- WisteriaはRedisをインメモリデータベースとして使用します。
	- 他の多くのソフトウェアと異なり、WisteriaはRedis上に保存したデータが揮発することを想定していません。よって、サーバ管理者はRedis上のデータが再起動や障害によって消失しないように対策を講じる必要があります。
	- WisteriaはValkeyには対応しておらず、サポートは提供されません。Valkeyでも動作はするだろうと考えられますが、Redisは7.4からValkeyとは互換性のないファイル形式を使用するようになりました。ご注意ください。
- なんらかのCAPTCHA（任意）
	- WisteriaはCAPTCHAをサポートしています。必須ではありませんが、公開サーバではいずれかのCAPTCHAを設定することを強く推奨します。現在、reCAPTCHA、hCaptcha、mCaptcha、Turnstileをサポートしています。
- Prometheus（任意）
	- Wisteriaは、実験的機能として、PrometheusやVictoriaMetricsのためにメトリクスデータを公開する機能を実装しています。
	- 詳細については`.config/prometheus.example.yml`と`.config/example.yml`を参照してください。

## 内部構成

Wisteriaを構成するコンポーネントは、おおまかに次の3つに分けて捉えることができます。

- `backend`
	- HTTP APIの提供と`frontend`や`sw`の配信を行う。
	- Node.jsで動かされる。
- `frontend`
	- Webからアクセスできるフロントエンド。
	- Vue.jsによって開発され、Viteによって出力される。
- `sw`
	- プッシュ通知機能のためのServiceWorker。

これらとこれらの依存する内部パッケージは、このリポジトリの`packages`ディレクイトリ下でそれぞれ開発されています（いわゆるmonorepo構成）。

依存関係はおおまかに次のようになっています。

```
backend
  -> hono-serve-static
  -> http-signature
    -> parcom
  -> identicon-generator
  -> misskey-js
  -> zod2spec
frontend
  -> locales
  -> misskey-js
sw
  -> misskey-js
```

`hono-serve-static`は、Hono（サーバライブラリ）にて、単一のファイルやディレクトリ内のファイルを簡単に静的にサーブできるようにするためのライブラリです。

`http-signature`は、ActivityPubでPOSTリクエスト送信者を認証する際に使われる技術である、HTTP SignatureをTypeScriptから扱う際のライブラリです。

`identicon-generator`は、プロフィール画像が設定されていないユーザの、仮のプロフィール画像を生成するライブラリです。

`locales`は、`frontend`の多言語対応のためのライブラリです。従来のMisskeyでは、`backend`が各言語についてのJSONファイルを配信し、`frontend`がそれをfetchするようになっていましたが、現在のWisteriaでは、モジュール読み込みとして実装されています。

`misskey-js`は、Wisteriaが提供するHTTP / WebSocket APIを扱うためのSDKです。HTTP APIの型定義は`backend`の出力するOpenAPIスキーマから生成されます。

`parcom`は、正規表現を便利に使えるようにするためのライブラリで、簡易的なパーサコンビネータのようなものです。

`zod2spec`は、`backend`にてZod（バリデーションライブラリ）からOpenAPIスキーマを生成するためのライブラリです。

## 主な外部依存

JavaScriptランタイムとしてNode.jsを使用します。バージョンは`.node-version`ファイルを参照してください。

パッケージマネージャマネージャとしてCorepackを使用します。これはNode.jsに標準搭載されたソフトウェアです。

パッケージマネージャとしてpnpmを使用します。バージョンは`package.json`内の`packageManager`の値を参照してください。

`frontend`はViteを、その他の内部パッケージはtsupをビルドに使用します。これらは内部でesbuildを使用して、TypeScriptからJavaScriptを生成します。

`backend`では、DIライブラリとしてNestJSを使用します。ただし`backend`でのDIの仕方には（Misskey時代から）問題があり、各コンポーネントは疎結合になるどころか巨大な一つの塊と化しています。Wisteriaではリファクタリングを進めていますが、根本的な解決には時間を要しています。

`backend`では、ORMとしてTypeORMを使用します。Prismaなどの型安全なORMへ移行する試みが模索されています。

`backend`では、サーバライブラリとしてHonoを使用します。（Misskey時代にはFastifyが使われていました。）

`backend`では、SSRにPugを使用します。`frontend`はSPAであり、ほとんどすべてのDOMはJavaScriptによって構築されますが、最低限のmetaタグやOGPの設定、`frontend`起動前の調整のためにSSRが行われています。

`frontend`では、フレームワークとしてVue.jsを使用します。ただし`frontend`の各コンポーネントは純粋関数的でなく、また、独自実装されたrouter（`nirax`）や独自実装されたstore（`pizzax`）の設計上の問題点もあり、非常に入り組んでいます。Wisteriaではリファクタリングを進めていますが、根本的な解決には時間を要しています。
