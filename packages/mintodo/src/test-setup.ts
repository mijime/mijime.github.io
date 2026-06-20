if (URL.createObjectURL === undefined) {
  URL.createObjectURL = (_blob: Blob) => `blob:${crypto.randomUUID()}`;
}
if (URL.revokeObjectURL === undefined) {
  URL.revokeObjectURL = (_url: string) => {
    // No-op
  };
}
