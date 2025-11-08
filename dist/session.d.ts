export declare class SessionManager {
    private sessionPath;
    private data;
    constructor();
    init(): Promise<void>;
    save(): Promise<void>;
    setLastEntry(entryId: number, blogId: number): void;
    getLastEntry(): {
        entryId: number;
        blogId: number;
    } | null;
    clear(): void;
}
//# sourceMappingURL=session.d.ts.map