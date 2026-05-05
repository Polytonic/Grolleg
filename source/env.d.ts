interface HotModule {
    accept(callback?: () => void): void;
    dispose(callback: (data: Record<string, unknown>) => void): void;
    data: Record<string, unknown>;
}

declare const module: { hot?: HotModule };
