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
    categories?: {
        id: number;
        label: string;
    }[];
    customFields?: {
        basename: string;
        value: string;
    }[];
    permalink?: string;
}
export interface CreateEntryParams {
    blogId: number;
    title: string;
    body: string;
    tags?: string[];
    categories?: number[];
    customFields?: {
        basename: string;
        value: string;
    }[];
    status?: 'Draft' | 'Publish' | 'Review' | 'Future';
}
export interface UpdateEntryParams {
    title?: string;
    body?: string;
    tags?: string[];
    categories?: number[];
    customFields?: {
        basename: string;
        value: string;
    }[];
    status?: 'Draft' | 'Publish' | 'Review' | 'Future';
}
export declare class MTClient {
    private client;
    private accessToken;
    private config;
    private versionPath;
    constructor(config: MTConfig);
    authenticate(): Promise<void>;
    createEntry(params: CreateEntryParams): Promise<MTEntry>;
    updateEntry(blogId: number, entryId: number, params: UpdateEntryParams): Promise<MTEntry>;
    getEntry(blogId: number, entryId: number): Promise<MTEntry>;
    listEntries(blogId: number, options?: {
        status?: string;
        limit?: number;
        offset?: number;
    }): Promise<{
        items: MTEntry[];
        totalResults: number;
    }>;
    listSites(): Promise<{
        id: number;
        name: string;
        url: string;
    }[]>;
    private requestWithRefresh;
    private buildEntryPayload;
}
//# sourceMappingURL=mt-client.d.ts.map