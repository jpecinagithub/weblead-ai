/**
 * Website templates — Phase 0 skeleton (implemented in Phase 2).
 * Template catalogue for generated business sites (responsive, SEO,
 * legal notices). Phase 0 ships one placeholder entry only.
 */
export type WebsiteTemplate = {
  id: string;
  name: string;
  description: string;
};

export const TEMPLATES: WebsiteTemplate[] = [
  { id: 'placeholder', name: 'Placeholder', description: 'Phase 0 placeholder — real templates land in Phase 2.' },
];
