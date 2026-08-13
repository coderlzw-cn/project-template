declare const module: {
  hot?: {
    accept(): void;
    dispose(callback: () => Promise<void>): void;
  };
};
