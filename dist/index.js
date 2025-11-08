#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import dotenv from 'dotenv';
import { MTClient } from './mt-client.js';
import { SessionManager } from './session.js';
// 環境変数の読み込み（dotenv 17 以降の実行時ログを抑制）
dotenv.config({ quiet: true });
// 設定の取得
const config = {
    apiUrl: process.env.MT_API_URL || '',
    username: process.env.MT_USERNAME || '',
    password: process.env.MT_PASSWORD || '',
    apiVersion: process.env.MT_API_VERSION || '5',
    clientId: process.env.MT_CLIENT_ID || '',
    rememberSession: (process.env.MT_REMEMBER ?? '1') !== '0'
};
// 設定の検証
if (!config.apiUrl || !config.username || !config.password || !config.apiVersion || !config.clientId) {
    console.error('Error: Missing required environment variables');
    console.error('Required: MT_API_URL, MT_USERNAME, MT_PASSWORD, MT_API_VERSION, MT_CLIENT_ID');
    process.exit(1);
}
// クライアントとセッションマネージャーの初期化
const mtClient = new MTClient(config);
const sessionManager = new SessionManager();
// MCPサーバーの作成
const server = new Server({
    name: 'mcp-movabletype-writer',
    version: '1.0.0',
}, {
    capabilities: {
        tools: {},
    },
});
// ツール定義
const TOOLS = [
    {
        name: 'create_draft',
        description: 'Movable Typeに新しい下書き記事を作成します。作成した記事は自動的にセッションに記憶され、update_last_draftで編集可能になります。',
        inputSchema: {
            type: 'object',
            properties: {
                blog_id: {
                    type: 'number',
                    description: 'ブログID（サイトID）'
                },
                title: {
                    type: 'string',
                    description: '記事のタイトル'
                },
                body: {
                    type: 'string',
                    description: '記事本文（HTML可）'
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'タグの配列（オプション）'
                },
                categories: {
                    type: 'array',
                    items: { type: 'number' },
                    description: 'カテゴリーIDの配列（オプション）'
                }
            },
            required: ['blog_id', 'title', 'body']
        }
    },
    {
        name: 'update_last_draft',
        description: '最後に作成または編集した下書き記事を更新します。タイトル、本文、タグなどを部分的に更新できます。',
        inputSchema: {
            type: 'object',
            properties: {
                title: {
                    type: 'string',
                    description: '新しいタイトル（オプション）'
                },
                body: {
                    type: 'string',
                    description: '新しい本文（オプション）'
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '新しいタグの配列（オプション）'
                },
                categories: {
                    type: 'array',
                    items: { type: 'number' },
                    description: '新しいカテゴリーIDの配列（オプション）'
                }
            }
        }
    },
    {
        name: 'update_draft',
        description: '指定したIDの下書き記事を更新します。明示的に記事IDを指定して編集したい場合に使用します。',
        inputSchema: {
            type: 'object',
            properties: {
                blog_id: {
                    type: 'number',
                    description: 'ブログID（サイトID）'
                },
                entry_id: {
                    type: 'number',
                    description: '記事ID'
                },
                title: {
                    type: 'string',
                    description: '新しいタイトル（オプション）'
                },
                body: {
                    type: 'string',
                    description: '新しい本文（オプション）'
                },
                tags: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '新しいタグの配列（オプション）'
                },
                categories: {
                    type: 'array',
                    items: { type: 'number' },
                    description: '新しいカテゴリーIDの配列（オプション）'
                }
            },
            required: ['blog_id', 'entry_id']
        }
    },
    {
        name: 'get_draft',
        description: '指定したIDの下書き記事の詳細を取得します。',
        inputSchema: {
            type: 'object',
            properties: {
                blog_id: {
                    type: 'number',
                    description: 'ブログID（サイトID）'
                },
                entry_id: {
                    type: 'number',
                    description: '記事ID'
                }
            },
            required: ['blog_id', 'entry_id']
        }
    },
    {
        name: 'list_recent_drafts',
        description: '最近の下書き記事の一覧を取得します。記事IDやタイトルを確認できます。',
        inputSchema: {
            type: 'object',
            properties: {
                blog_id: {
                    type: 'number',
                    description: 'ブログID（サイトID）'
                },
                limit: {
                    type: 'number',
                    description: '取得する記事数（デフォルト: 10）',
                    default: 10
                }
            },
            required: ['blog_id']
        }
    },
    {
        name: 'list_sites',
        description: '利用可能なブログ（サイト）の一覧を取得します。blog_idを確認する際に使用します。',
        inputSchema: {
            type: 'object',
            properties: {}
        }
    }
];
// ツール一覧の提供
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return { tools: TOOLS };
});
// ツール実行の処理
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const { name, arguments: args } = request.params;
        // 認証（初回のみ）
        if (!mtClient['accessToken']) {
            await mtClient.authenticate();
        }
        switch (name) {
            case 'create_draft': {
                const { blog_id, title, body, tags, categories } = args;
                const entry = await mtClient.createEntry({
                    blogId: blog_id,
                    title,
                    body,
                    tags,
                    categories,
                    status: 'Draft'
                });
                // セッションに保存
                sessionManager.setLastEntry(entry.id, blog_id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                entry_id: entry.id,
                                blog_id: blog_id,
                                title: entry.title,
                                status: entry.status,
                                message: `下書き記事を作成しました（ID: ${entry.id}）`
                            }, null, 2)
                        }
                    ]
                };
            }
            case 'update_last_draft': {
                const lastEntry = sessionManager.getLastEntry();
                if (!lastEntry) {
                    return {
                        content: [
                            {
                                type: 'text',
                                text: JSON.stringify({
                                    success: false,
                                    error: '最後に作成/編集した記事が見つかりません。先にcreate_draftで記事を作成するか、update_draftでIDを指定してください。'
                                }, null, 2)
                            }
                        ]
                    };
                }
                const { title, body, tags, categories } = args;
                const entry = await mtClient.updateEntry(lastEntry.blogId, lastEntry.entryId, { title, body, tags, categories });
                // セッションを更新
                sessionManager.setLastEntry(entry.id, lastEntry.blogId);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                entry_id: entry.id,
                                blog_id: lastEntry.blogId,
                                title: entry.title,
                                message: `記事を更新しました（ID: ${entry.id}）`
                            }, null, 2)
                        }
                    ]
                };
            }
            case 'update_draft': {
                const { blog_id, entry_id, title, body, tags, categories } = args;
                const entry = await mtClient.updateEntry(blog_id, entry_id, { title, body, tags, categories });
                // セッションを更新
                sessionManager.setLastEntry(entry.id, blog_id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                entry_id: entry.id,
                                blog_id: blog_id,
                                title: entry.title,
                                message: `記事を更新しました（ID: ${entry.id}）`
                            }, null, 2)
                        }
                    ]
                };
            }
            case 'get_draft': {
                const { blog_id, entry_id } = args;
                const entry = await mtClient.getEntry(blog_id, entry_id);
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                entry: {
                                    id: entry.id,
                                    title: entry.title,
                                    body: entry.body,
                                    status: entry.status,
                                    tags: entry.tags,
                                    categories: entry.categories,
                                    date: entry.date,
                                    modifiedDate: entry.modifiedDate
                                }
                            }, null, 2)
                        }
                    ]
                };
            }
            case 'list_recent_drafts': {
                const { blog_id, limit } = args;
                const result = await mtClient.listEntries(blog_id, {
                    status: 'Draft',
                    limit: limit || 10
                });
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                total: result.totalResults,
                                drafts: result.items.map(entry => ({
                                    id: entry.id,
                                    title: entry.title,
                                    status: entry.status,
                                    modifiedDate: entry.modifiedDate
                                }))
                            }, null, 2)
                        }
                    ]
                };
            }
            case 'list_sites': {
                const sites = await mtClient.listSites();
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: true,
                                sites: sites
                            }, null, 2)
                        }
                    ]
                };
            }
            default:
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify({
                                success: false,
                                error: `Unknown tool: ${name}`
                            }, null, 2)
                        }
                    ],
                    isError: true
                };
        }
    }
    catch (error) {
        return {
            content: [
                {
                    type: 'text',
                    text: JSON.stringify({
                        success: false,
                        error: error.message
                    }, null, 2)
                }
            ],
            isError: true
        };
    }
});
// サーバー起動
async function main() {
    await sessionManager.init();
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('Movable Type Writer MCP Server running on stdio');
}
main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
});
//# sourceMappingURL=index.js.map