import axios, { AxiosInstance } from 'axios';

export interface MTConfig {
  apiUrl: string;
  username: string;
  password: string;
  apiVersion: string;
  clientId: string;
  rememberSession: boolean;
}

export interface MTEntry {
  id: number;
  title: string;
  body: string;
  status: string;
  date?: string;
  modifiedDate?: string;
  tags?: string[];
  categories?: { id: number; label: string }[];
  customFields?: { basename: string; value: string }[];
  permalink?: string;
}

export interface CreateEntryParams {
  blogId: number;
  title: string;
  body: string;
  tags?: string[];
  categories?: number[];
  customFields?: { basename: string; value: string }[];
  status?: 'Draft' | 'Publish' | 'Review' | 'Future';
}

export interface UpdateEntryParams {
  title?: string;
  body?: string;
  tags?: string[];
  categories?: number[];
  customFields?: { basename: string; value: string }[];
  status?: 'Draft' | 'Publish' | 'Review' | 'Future';
}

export class MTClient {
  private client: AxiosInstance;
  private accessToken: string | null = null;
  private config: MTConfig;
  private versionPath: string;

  constructor(config: MTConfig) {
    this.config = config;
    const normalizedBaseUrl = config.apiUrl.replace(/\/+$/, '');
    const normalizedVersion = config.apiVersion.replace(/^v/i, '');

    if (!normalizedVersion) {
      throw new Error('MT API version is required (e.g. "5" or "v5").');
    }

    this.versionPath = `v${normalizedVersion}`;

    this.client = axios.create({
      baseURL: `${normalizedBaseUrl}/${this.versionPath}`,
      timeout: 30000,
      headers: {
        'X-MT-Requested-By': this.config.clientId,
        Accept: 'application/json'
      }
    });
  }

  async authenticate(): Promise<void> {
    const previousAuthHeader = this.client.defaults.headers.common['X-MT-Authorization'];
    delete this.client.defaults.headers.common['X-MT-Authorization'];

    try {
      const payload = new URLSearchParams({
        username: this.config.username,
        password: this.config.password,
        clientId: this.config.clientId,
        remember: this.config.rememberSession ? '1' : '0'
      });

      const response = await this.client.post('/authentication', payload.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      this.accessToken = response.data.accessToken;
      this.client.defaults.headers.common['X-MT-Authorization'] = 
        `MTAuth accessToken=${this.accessToken}`;
    } catch (error) {
      if (previousAuthHeader) {
        this.client.defaults.headers.common['X-MT-Authorization'] = previousAuthHeader;
      } else {
        delete this.client.defaults.headers.common['X-MT-Authorization'];
      }
      throw new Error(`Authentication failed: ${error}`);
    }
  }

  async createEntry(params: CreateEntryParams): Promise<MTEntry> {
    try {
      const payload = this.buildEntryPayload({
        title: params.title,
        body: params.body,
        status: params.status || 'Draft',
        tags: params.tags || [],
        categories: params.categories?.map(id => ({ id })) || [],
        customFields: params.customFields || []
      });

      const response = await this.requestWithRefresh(() =>
        this.client.post(
          `/sites/${params.blogId}/entries`,
          payload,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create entry: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async updateEntry(blogId: number, entryId: number, params: UpdateEntryParams): Promise<MTEntry> {
    try {
      const updateData: any = { entry: {} };

      if (params.title !== undefined) updateData.entry.title = params.title;
      if (params.body !== undefined) updateData.entry.body = params.body;
      if (params.status !== undefined) updateData.entry.status = params.status;
      if (params.tags !== undefined) updateData.entry.tags = params.tags;
      if (params.categories !== undefined) {
        updateData.entry.categories = params.categories.map(id => ({ id }));
      }
      if (params.customFields !== undefined) {
        updateData.entry.customFields = params.customFields;
      }

      const payload = this.buildEntryPayload(updateData.entry);

      const response = await this.requestWithRefresh(() =>
        this.client.put(
          `/sites/${blogId}/entries/${entryId}`,
          payload,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        )
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to update entry: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async getEntry(blogId: number, entryId: number): Promise<MTEntry> {
    try {
      const response = await this.requestWithRefresh(() =>
        this.client.get(`/sites/${blogId}/entries/${entryId}`)
      );
      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to get entry: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async listEntries(blogId: number, options?: { 
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: MTEntry[]; totalResults: number }> {
    try {
      const params: any = {
        status: options?.status || 'Draft',
        limit: options?.limit || 10,
        offset: options?.offset || 0,
        sortBy: 'modified_on',
        sortOrder: 'descend'
      };

      const response = await this.requestWithRefresh(() =>
        this.client.get(`/sites/${blogId}/entries`, { params })
      );

      return {
        items: response.data.items || [],
        totalResults: response.data.totalResults || 0
      };
    } catch (error: any) {
      throw new Error(`Failed to list entries: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  async listSites(): Promise<{ id: number; name: string; url: string }[]> {
    try {
      const response = await this.requestWithRefresh(() => this.client.get('/sites'));
      return response.data.items.map((site: any) => ({
        id: site.id,
        name: site.name,
        url: site.url
      }));
    } catch (error: any) {
      throw new Error(`Failed to list sites: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  private async requestWithRefresh<T>(
    operation: () => Promise<T>,
    hasRetried = false
  ): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401 && !hasRetried) {
        await this.authenticate();
        return this.requestWithRefresh(operation, true);
      }
      throw error;
    }
  }

  private buildEntryPayload(entry: Record<string, unknown>): string {
    return new URLSearchParams({
      entry: JSON.stringify(entry)
    }).toString();
  }
}
