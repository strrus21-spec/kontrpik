/** Имя героя → slug для файлов и URL: "Nature's Prophet" → "natures-prophet". */
export const slug = (name: string): string =>
  name.toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
