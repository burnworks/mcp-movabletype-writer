# mcp-movabletype-writer

[English](./README.md)

Movable Type 用の MCP サーバ。

Claude Desktop など、MCP に対応した AI ツールと Movable Type を連携させ、AI 生成記事の下書き作成・編集を行います。

AI に相談しながらブログやコラムの記事案を作成し、それをそのまま Movable Type の下書き記事として保存したり、保存した下書き記事を AI に修正してもらったりすることができます。

## 特徴

- 🤖 **AI連携**: Claude Desktop などから 直接 Movable Type に下書き記事を投稿
- 💾 **セッション管理**: 最後に編集した下書き記事を記憶し、リライト依頼など連続編集をスムーズに
- ✏️ **リライト対応**: 「ここを直して」の指示で下書き記事を更新可能
- 📝 **下書き管理**: 下書き一覧の取得、個別下書き記事の詳細確認

安全のため、以下のことはできないようになっています。つまり、記事の「下書き」を AI と共同で作ることに特化した MCP サーバです。

- 記事の削除（下書き記事 / 公開記事問わず、記事の削除は不可）
- 下書き記事を公開すること
- 公開済みの記事を編集したり下書きにしたりすること

## 前提条件

- Node.js 22.7.5 以上（LTS 推奨）
- Movable Type 7 r.53xx 以上（Data API 有効化済み）
  - Data API v4 以降で動作確認

## インストール

※ `npx` で使用する場合は不要です。後述する「npx での使用」セクションを確認してください。

```bash
git clone https://github.com/burnworks/mcp-movabletype-writer.git
cd mcp-movabletype-writer
npm install
npm run build
```

もしくは

```bash
npm install mcp-movabletype-writer
```

## 設定

### 1. Movable Type 側の準備

1. システム管理画面、および編集対象とするウェブサイトやブログの設定画面で「ツール」→「Webサービス」→「Data API」を有効化
2. ログインに使用するユーザーの設定画面から「ユーザー名」と「Webサービスパスワード」を取得（通常の管理画面ログインに使用するパスワードではなく「Webサービスパスワード」ですので間違えないようにしてください）
3. API エンドポイントの URL を確認（例: `https://example.com/your_mt_path/mt-data-api.cgi`）

### 2. Claude Desktop の設定例

Claude Desktop の設定ファイル (`claude_desktop_config.json`) を開きます。

#### 設定ファイルの場所

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

※ Claude Desktop の「設定」→「管理者」からも設定ファイルを開くことができます。

#### 設定ファイルの例

Claude Desktop の設定ファイル (`claude_desktop_config.json`) も以下のように追記します。`args` には、`dist/index.js` までのフルパスを記述します。

Windows 環境でファイルパスに `\` を含む場合は、`mcp-movabletype-writer\\dist\\index.js` のように `\` でエスケープしてください。

```json
{
  "mcpServers": {
    "movabletype-writer": {
      "command": "node",
      "args": [
        "/full_path_to/mcp-movabletype-writer/dist/index.js"
      ],
      "env": {
        "MT_API_URL": "https://example.com/your_mt_path/mt-data-api.cgi",
        "MT_USERNAME": "your_username",
        "MT_PASSWORD": "your_webservice_password",
        "MT_API_VERSION": "5",
        "MT_CLIENT_ID": "your_client_id",
        "MT_REMEMBER": "1"
      }
    }
  }
}
```

- `MT_API_URL` は `mt-data-api.cgi` の URL を指定します。
- `MT_USERNAME` は Movable Type にログインするユーザー名を指定します。
- `MT_PASSWORD` は Movable Type にログインするユーザーのパスワードですが、ログインパスワードではなく、ユーザー情報の編集画面から取得できる「Webサービスパスワード」を指定します。
- `MT_API_VERSION` には利用中の Movable Type Data API のバージョン番号（例: `5`, `6` など）を設定してください。
- `MT_CLIENT_ID` はアプリケーション固有の任意のキーを指定します。例えば `mcp-movabletype-writer` のように識別しやすい、アルファベット、(_)アンダースコア、(-)ダッシュ、で構成された任意の文字列を指定できます。
- `MT_REMEMBER` は認証時の `remember` パラメータ（`0` or `1`）です。デフォルト値 `1` のままの場合、サインアウトするまでセッションを維持できます。明示的に短命なトークンを使いたいときのみ `0` にしてください。

`MT_API_VERSION` を変更することで、将来的に Movable Type 側で Data API のバージョンを切り替えた際も Claude 側の設定のみで追随できます。`MT_CLIENT_ID` は Data API への認証時に必須なので、未設定の場合はサーバー起動時にエラーになります。`MT_REMEMBER` を `1` のままにしておくと Claude からの操作中にトークンが失効しにくくなります。

#### npx での使用

`npx` コマンドでも動作します。その場合は以下のように Claude Desktop の設定ファイル (`claude_desktop_config.json`) を記述してください。

`args` の設定は、`mcp-movabletype-writer@1.0.0` のように特定のバージョンを指定して固定することもできます。`env` 部分の設定は上記のローカルでビルドする場合と同じです。

```json
{
  "mcpServers": {
    "movabletype-writer": {
      "command": "npx",
      "args": [
        "mcp-movabletype-writer"
      ],
      "env": {
        "MT_API_URL": "https://example.com/your_mt_path/mt-data-api.cgi",
        "MT_USERNAME": "your_username",
        "MT_PASSWORD": "your_webservice_password",
        "MT_API_VERSION": "5",
        "MT_CLIENT_ID": "mcp-movabletype-writer",
        "MT_REMEMBER": "1"
      }
    }
  }
}
```

### 上級者向け設定

通常利用では不要な微調整用の設定は、プロジェクト直下に置く `internal-config.json` にまとめています。`internal-config.example.json` をコピーしてファイル名を `internal-config.json` に変更し、必要な値を書き換えてください。

- `requestTimeoutMs`: Movable Type への HTTP リクエストのタイムアウト時間（ミリ秒）。初期値は `30000`。

ファイルが存在しない場合や JSON の記述に誤りがある場合は自動的に組み込みの初期値へフォールバックするため、安心して試せます。

## 使い方

### 基本的な使用例

```
User: ブログID 1に「MTプラグイン開発入門」という記事の下書きを作成して

Claude: create_draftを実行...
→ 下書きを作成しました（ID: 123）

User: タイトルを「初心者向けMTプラグイン開発」に変更して

Claude: update_last_draftを実行...
→ 記事を更新しました（ID: 123）

User: 本文に「はじめに」のセクションを追加して

Claude: update_last_draftを実行...
→ 記事を更新しました（ID: 123）
```

### ヒント

- Movable Type 上に複数のブログがある場合は投稿するブログのIDを指定しましょう。AI にブログの一覧を出してと指示すればリスト化してくれますので、そこから選択すると早いです。
- 特に指定しないと Claude は記事を HTML 形式で作成するかもしれません。Movable Type にはマークダウン形式で投稿したい場合は、「マークダウン形式で保存して」などと指示するとよいでしょう。
- 1つの会話の流れの中では直前に編集した記事を覚えておいてくれるようにしてありますので、通常は特に記事IDをわざわざ指定しなくても、続けて修正、加筆などを指示するだけでスムーズに進むと思います。
- 別の下書き記事を編集させたい場合は、まず下書き記事の一覧を表示するように指示し、一覧に表示された記事IDを指定して、修正などを指示すればよいでしょう。

詳しくは以下のツールの説明をご確認ください。

### 利用可能なツール

#### `list_sites`
利用可能なブログ（サイト）の一覧を取得

```
Claude: list_sitesで確認...
→ ID: 1, Name: "技術ブログ"
→ ID: 2, Name: "お知らせサイト"
```

#### `create_draft`
新しい下書き記事を作成

- 必須: `blog_id`, `title`, `body`
- オプション: `tags`, `categories`

#### `update_last_draft`
最後に作成/編集した記事を更新

- すべてのパラメータがオプション
- 指定した項目のみ更新される

#### `update_draft`
ID指定で記事を更新

- 必須: `blog_id`, `entry_id`
- オプション: `title`, `body`, `tags`, `categories`

#### `get_draft`
記事の詳細を取得

- 必須: `blog_id`, `entry_id`

#### `list_recent_drafts`
最近の下書き一覧を取得

- 必須: `blog_id`
- オプション: `limit` (デフォルト: 10)

## セッション管理

最後に作成/編集した記事の情報は `~/.mcp-mt/session.json` に保存されます。

```json
{
  "lastEntryId": 123,
  "lastBlogId": 1,
  "lastUpdated": "2025-11-07T10:00:00.000Z"
}
```

この情報により、`update_last_draft` で記事IDを指定せずに最後に編集していた記事を編集対象にできます。

## 開発者向け

以下は開発者向け情報です。

### テスト実行用 環境変数の設定

`npm run build` せず、`npm run dev` で MCP サーバを立ち上げたい場合は環境変数が使用できます。

`.env.example` を `.env` にコピーして編集します。

```bash
cp .env.example .env
```

```.env
MT_API_URL=https://example.com/your_mt_path/mt-data-api.cgi
MT_USERNAME=your_username
MT_PASSWORD=your_webservice_password
MT_API_VERSION=5
MT_CLIENT_ID=your_client_id
MT_REMEMBER=1
```

- `MT_API_URL` は `mt-data-api.cgi` の URL を指定します。
- `MT_USERNAME` は Movable Type にログインするユーザー名を指定します。
- `MT_PASSWORD` は Movable Type にログインするユーザーのパスワードですが、ログインパスワードではなく、ユーザー情報の編集画面から取得できる「Webサービスパスワード」を指定します。
- `MT_API_VERSION` には利用中の Movable Type Data API のバージョン番号（例: `5`, `6` など）を設定してください。
- `MT_CLIENT_ID` はアプリケーション固有の任意のキーを指定します。例えば `mcp-movabletype-writer` のように識別しやすい、アルファベット、(_)アンダースコア、(-)ダッシュ、で構成された任意の文字列を指定できます。
- `MT_REMEMBER` は認証時の `remember` パラメータ（`0` or `1`）です。デフォルト値 `1` のままの場合、サインアウトするまでセッションを維持できます。明示的に短命なトークンを使いたいときのみ `0` にしてください。

```bash
npm install
npm run dev
```

その後、別ターミナルで `npx @modelcontextprotocol/inspector` （[modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector)）などすると、動作確認しながら開発を進めることができて便利です。

## トラブルシューティング

### 認証エラー

- `MT_USERNAME`、`MT_PASSWORD`（Webサービスパスワード）が正しいか、`MT_CLIENT_ID` が正しくセットされているか確認
- Movable Type の Data API が有効化されているか確認（管理画面設定、および `mt-data-api.cgi` のパーミッション確認）

### 記事が見つからない

- `list_sites` で `blog_id` を確認
- `list_recent_drafts` で記事一覧を確認

### セッションがリセットされる

- `~/.mcp-mt/session.json` が削除されていないか確認
- Claude Desktop を再起動すると新しいセッションが開始されます

## ライセンス

MIT

## 参考

- [Movable Type Data API Document](https://www.movabletype.jp/developers/data-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
