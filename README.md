# mcp-movabletype-writer

[日本語](./README.ja.md)

MCP server for Movable Type.

It lets MCP-compatible AI tools such as Claude Desktop work with Movable Type so that AI-generated drafts can be created and edited directly inside MT.

You can brainstorm articles with an AI assistant, store the result as a Movable Type draft, and iterate on the same draft by asking the AI to revise sections.

## Features

- 🤖 **AI integration**: Post drafts to Movable Type straight from Claude Desktop or any MCP client.
- 💾 **Session tracking**: Remembers the last edited draft so multi-step rewrites stay in context.
- ✏️ **Rewrite ready**: “Fix this paragraph” style prompts update the current draft in place.
- 📝 **Draft management**: List drafts and inspect individual draft details.

For safety this server intentionally focuses on collaborative draft creation. It does **not** allow:

- Deleting drafts or published entries.
- Publishing drafts.
- Editing already published entries or reverting them to drafts.

## Requirements

- Node.js 22.7.5 or newer (current LTS 24.x is recommended).
- Movable Type 7 r.53xx or newer with Data API enabled.
  - Tested with Data API v4 and later.

## Installation

> If you intend to run it via `npx`, you can skip this section and jump to “Using with npx”.

```bash
git clone https://github.com/burnworks/mcp-movabletype-writer.git
cd mcp-movabletype-writer
npm install
npm run build
```

or simply install from npm:

```bash
npm install mcp-movabletype-writer
```

## Configuration

### 1. Prepare Movable Type

1. In both the system dashboard and the target website/blog dashboard enable **Tools → Web Services → Data API**.
2. Open the MT user profile that will run the API calls and note the **username** and **Web Services Password** (this is *different* from the regular CMS login password).
3. Confirm the Data API endpoint URL (e.g. `https://example.com/your_mt_path/mt-data-api.cgi`).

### 2. Configure Claude Desktop

Open `claude_desktop_config.json`.

#### File locations

- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`

You can also open the file from **Claude Desktop → Settings → Administrator**.

#### Example configuration for a local build

Append the following block. `args` must contain the full path to `dist/index.js`.  
On Windows, escape backslashes such as `mcp-movabletype-writer\\dist\\index.js`.

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

- `MT_API_URL`: URL to `mt-data-api.cgi`.
- `MT_USERNAME`: Movable Type username.
- `MT_PASSWORD`: *Web Services Password* from the MT user profile (do **not** use the normal login password).
- `MT_API_VERSION`: Data API version in use, e.g. `5`, `6`, `7`.
- `MT_CLIENT_ID`: Any identifier composed of letters, `_`, or `-` (e.g. `mcp-movabletype-writer`).
- `MT_REMEMBER`: `remember` flag (`0`/`1`). Leave it at `1` to keep sessions active until sign-out. Use `0` only if you need very short-lived tokens.

Changing `MT_API_VERSION` lets you point the same binary at MT Data API v4/v5/v6/v7 without rebuilding. `MT_CLIENT_ID` must be set; the server exits if it’s missing. Keeping `MT_REMEMBER=1` reduces the chance of token expiry mid-session.

#### Using with npx

You can run the published package with `npx`. In that case point `command` to `npx`:

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

Use `mcp-movabletype-writer@1.0.0` if you prefer to pin a specific version. The `env` settings are identical to a local build.

### Advanced settings (power users)

Fine-tuning knobs that aren’t meant for day-to-day users live in `internal-config.json`. Copy `internal-config.example.json` to the project root (or wherever you run the server from), rename it to `internal-config.json`, and adjust the values.

- `requestTimeoutMs`: Timeout (milliseconds) for Movable Type HTTP requests. Defaults to `30000`.

If the file is missing or contains invalid JSON the server falls back to the built-in defaults, so it’s safe to experiment.

## Usage

### Basic flow

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

### Tips

- If you manage multiple blogs, ask Claude to run `list_sites` and choose the correct `blog_id` from the result.
- Claude may default to HTML output; if you prefer Markdown drafts, explicitly request “save in Markdown”.
- Within a single conversation the server remembers the latest draft, so follow-up edits usually don’t require specifying `entry_id`.
- To edit another draft, ask for `list_recent_drafts`, pick an ID from the list, and provide it to `update_draft`.

See the tool descriptions below for details.

### Available tools

#### `list_sites`
Returns available blogs/sites.

```
Claude: list_sitesで確認...
→ ID: 1, Name: "Tech Blog"
→ ID: 2, Name: "News"
```

#### `create_draft`
Create a new draft.

- Required: `blog_id`, `title`, `body`
- Optional: `tags`, `categories`

#### `update_last_draft`
Update the most recently created/edited draft.

- All parameters are optional; only supplied fields are changed.

#### `update_draft`
Update a draft by explicit ID.

- Required: `blog_id`, `entry_id`
- Optional: `title`, `body`, `tags`, `categories`

#### `get_draft`
Fetch draft details.

- Required: `blog_id`, `entry_id`

#### `list_recent_drafts`
List recent drafts.

- Required: `blog_id`
- Optional: `limit` (default 10)

## Session storage

Information about the most recent draft is stored at `~/.mcp-mt/session.json`:

```json
{
  "lastEntryId": 123,
  "lastBlogId": 1,
  "lastUpdated": "2025-11-07T10:00:00.000Z"
}
```

This lets `update_last_draft` run without specifying `entry_id`.

## For developers

### Using environment variables with `npm run dev`

If you want to iterate with `npm run dev` (tsx) instead of `npm run build`, copy the example env file:

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

Then run:

```bash
npm install
npm run dev
```

For debugging, tools like [@modelcontextprotocol/inspector](https://github.com/modelcontextprotocol/inspector) make it easy to connect and exercise the MCP server while you develop.

## Troubleshooting

### Authentication errors

- Ensure `MT_USERNAME`, `MT_PASSWORD` (Web Services Password), and `MT_CLIENT_ID` are correct.
- Verify the Data API is enabled and that `mt-data-api.cgi` is accessible.

### Cannot find drafts

- Use `list_sites` to confirm the correct `blog_id`.
- Run `list_recent_drafts` to see available drafts and their IDs.

### Session keeps resetting

- Check that `~/.mcp-mt/session.json` still exists.
- Restarting Claude Desktop starts a new MCP session (and thus a blank `session.json`).

## License

MIT

## References

- [Movable Type Data API Document](https://www.movabletype.jp/developers/data-api/)
- [Model Context Protocol](https://modelcontextprotocol.io/)
