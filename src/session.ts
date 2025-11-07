import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface SessionData {
  lastEntryId: number | null;
  lastBlogId: number | null;
  lastUpdated: string | null;
}

export class SessionManager {
  private sessionPath: string;
  private data: SessionData;

  constructor() {
    const configDir = path.join(os.homedir(), '.mcp-mt');
    this.sessionPath = path.join(configDir, 'session.json');
    this.data = {
      lastEntryId: null,
      lastBlogId: null,
      lastUpdated: null
    };
  }

  async init(): Promise<void> {
    try {
      const dir = path.dirname(this.sessionPath);
      await fs.mkdir(dir, { recursive: true });
      
      try {
        const content = await fs.readFile(this.sessionPath, 'utf-8');
        this.data = JSON.parse(content);
      } catch (error) {
        // セッションファイルが存在しない場合は新規作成
        await this.save();
      }
    } catch (error) {
      console.error('Failed to initialize session:', error);
    }
  }

  async save(): Promise<void> {
    try {
      await fs.writeFile(this.sessionPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }

  setLastEntry(entryId: number, blogId: number): void {
    this.data.lastEntryId = entryId;
    this.data.lastBlogId = blogId;
    this.data.lastUpdated = new Date().toISOString();
    this.save();
  }

  getLastEntry(): { entryId: number; blogId: number } | null {
    if (this.data.lastEntryId && this.data.lastBlogId) {
      return {
        entryId: this.data.lastEntryId,
        blogId: this.data.lastBlogId
      };
    }
    return null;
  }

  clear(): void {
    this.data = {
      lastEntryId: null,
      lastBlogId: null,
      lastUpdated: null
    };
    this.save();
  }
}
