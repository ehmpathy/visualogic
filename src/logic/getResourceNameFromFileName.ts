export const getResourceNameFromFileName = (fileName: string): string =>
  fileName.split('/').slice(-1)[0]!.split('.').slice(0, -1).join('.');
