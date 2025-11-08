import fs from 'fs/promises';
import path from 'path';
import os from 'os';
export class SessionManager {
    sessionPath;
    data;
    constructor() {
        const configDir = path.join(os.homedir(), '.mcp-mt');
        this.sessionPath = path.join(configDir, 'session.json');
        this.data = {
            lastEntryId: null,
            lastBlogId: null,
            lastUpdated: null
        };
    }
    async init() {
        try {
            const dir = path.dirname(this.sessionPath);
            await fs.mkdir(dir, { recursive: true });
            try {
                const content = await fs.readFile(this.sessionPath, 'utf-8');
                this.data = JSON.parse(content);
            }
            catch (error) {
                // セッションファイルが存在しない場合は新規作成
                await this.save();
            }
        }
        catch (error) {
            console.error('Failed to initialize session:', error);
        }
    }
    async save() {
        try {
            await fs.writeFile(this.sessionPath, JSON.stringify(this.data, null, 2), 'utf-8');
        }
        catch (error) {
            console.error('Failed to save session:', error);
        }
    }
    setLastEntry(entryId, blogId) {
        this.data.lastEntryId = entryId;
        this.data.lastBlogId = blogId;
        this.data.lastUpdated = new Date().toISOString();
        this.save();
    }
    getLastEntry() {
        if (this.data.lastEntryId && this.data.lastBlogId) {
            return {
                entryId: this.data.lastEntryId,
                blogId: this.data.lastBlogId
            };
        }
        return null;
    }
    clear() {
        this.data = {
            lastEntryId: null,
            lastBlogId: null,
            lastUpdated: null
        };
        this.save();
    }
}
//# sourceMappingURL=session.js.map