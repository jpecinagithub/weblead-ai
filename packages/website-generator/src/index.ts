/**
 * Website generator — Phase 0 skeleton (implemented in Phase 2).
 * Renders a business website from a template + brand config.
 * No invented prices, hours, testimonials or accreditations: every
 * unconfirmed datum is either omitted or labelled as a placeholder.
 */
export type WebsiteGeneratorInput = {
  businessSlug: string;
  templateId: string;
  brandConfig: Record<string, unknown>;
};

export function generateWebsiteStub(input: WebsiteGeneratorInput): { status: string } {
  return { status: `not-implemented: website for ${input.businessSlug} (Phase 2)` };
}
