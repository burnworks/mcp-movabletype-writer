import axios from 'axios';
const DEFAULT_TIMEOUT_MS = 30000;
export class MTClient {
    client;
    accessToken = null;
    config;
    versionPath;
    requestTimeoutMs;
    constructor(config, options = {}) {
        this.config = config;
        const normalizedBaseUrl = config.apiUrl.replace(/\/+$/, '');
        const normalizedVersion = config.apiVersion.replace(/^v/i, '');
        const configuredTimeout = typeof options.requestTimeoutMs === 'number' && options.requestTimeoutMs > 0
            ? options.requestTimeoutMs
            : DEFAULT_TIMEOUT_MS;
        if (!normalizedVersion) {
            throw new Error('MT API version is required (e.g. "5" or "v5").');
        }
        this.versionPath = `v${normalizedVersion}`;
        this.requestTimeoutMs = configuredTimeout;
        this.client = axios.create({
            baseURL: `${normalizedBaseUrl}/${this.versionPath}`,
            timeout: this.requestTimeoutMs,
            headers: {
                'X-MT-Requested-By': this.config.clientId,
                Accept: 'application/json'
            }
        });
    }
    async authenticate() {
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
        }
        catch (error) {
            if (previousAuthHeader) {
                this.client.defaults.headers.common['X-MT-Authorization'] = previousAuthHeader;
            }
            else {
                delete this.client.defaults.headers.common['X-MT-Authorization'];
            }
            throw new Error(`Authentication failed: ${error}`);
        }
    }
    async createEntry(params) {
        try {
            const payload = this.buildEntryPayload({
                title: params.title,
                body: params.body,
                status: params.status || 'Draft',
                tags: params.tags || [],
                categories: params.categories?.map(id => ({ id })) || [],
                customFields: params.customFields || []
            });
            const response = await this.requestWithRefresh(() => this.client.post(`/sites/${params.blogId}/entries`, payload, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }));
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to create entry: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    async updateEntry(blogId, entryId, params) {
        try {
            const updateData = { entry: {} };
            if (params.title !== undefined)
                updateData.entry.title = params.title;
            if (params.body !== undefined)
                updateData.entry.body = params.body;
            if (params.status !== undefined)
                updateData.entry.status = params.status;
            if (params.tags !== undefined)
                updateData.entry.tags = params.tags;
            if (params.categories !== undefined) {
                updateData.entry.categories = params.categories.map(id => ({ id }));
            }
            if (params.customFields !== undefined) {
                updateData.entry.customFields = params.customFields;
            }
            const payload = this.buildEntryPayload(updateData.entry);
            const response = await this.requestWithRefresh(() => this.client.put(`/sites/${blogId}/entries/${entryId}`, payload, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }));
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to update entry: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    async getEntry(blogId, entryId) {
        try {
            const response = await this.requestWithRefresh(() => this.client.get(`/sites/${blogId}/entries/${entryId}`));
            return response.data;
        }
        catch (error) {
            throw new Error(`Failed to get entry: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    async listEntries(blogId, options) {
        try {
            const params = {
                status: options?.status || 'Draft',
                limit: options?.limit || 10,
                offset: options?.offset || 0,
                sortBy: 'modified_on',
                sortOrder: 'descend'
            };
            const response = await this.requestWithRefresh(() => this.client.get(`/sites/${blogId}/entries`, { params }));
            return {
                items: response.data.items || [],
                totalResults: response.data.totalResults || 0
            };
        }
        catch (error) {
            throw new Error(`Failed to list entries: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    async listSites() {
        try {
            const response = await this.requestWithRefresh(() => this.client.get('/sites'));
            return response.data.items.map((site) => ({
                id: site.id,
                name: site.name,
                url: site.url
            }));
        }
        catch (error) {
            throw new Error(`Failed to list sites: ${error.response?.data?.error?.message || error.message}`);
        }
    }
    async requestWithRefresh(operation, hasRetried = false) {
        try {
            return await operation();
        }
        catch (error) {
            const status = error.response?.status;
            if (status === 401 && !hasRetried) {
                await this.authenticate();
                return this.requestWithRefresh(operation, true);
            }
            throw error;
        }
    }
    buildEntryPayload(entry) {
        return new URLSearchParams({
            entry: JSON.stringify(entry)
        }).toString();
    }
}
//# sourceMappingURL=mt-client.js.map