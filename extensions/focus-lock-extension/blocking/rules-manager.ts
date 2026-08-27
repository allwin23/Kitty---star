import { BrowserAdapter } from './adapter';
import { PREDEFINED_CATEGORIES } from '../shared/constants';

export class BlockingRuleManager {
  private adapter: BrowserAdapter;

  constructor(adapter: BrowserAdapter) {
    this.adapter = adapter;
  }

  /**
   * Resolves selected category IDs and custom domains to a flat, unique list of domains.
   */
  resolveDomains(
    categories: string[],
    customDomains: string[],
    profileEmail: string = "",
    studyEmail: string = ""
  ): string[] {
    const domainsSet = new Set<string>();

    categories.forEach((catId) => {
      const match = PREDEFINED_CATEGORIES.find((cat) => cat.id === catId);
      if (match) {
        match.defaultDomains.forEach((domain) => domainsSet.add(domain));
      }
    });

    customDomains.forEach((domain) => {
      const clean = domain.trim().toLowerCase();
      if (clean) domainsSet.add(clean);
    });

    // YouTube Study Profile Exception
    const hasActiveStudyEmail = profileEmail && studyEmail &&
      profileEmail.trim().toLowerCase() === studyEmail.trim().toLowerCase();

    if (hasActiveStudyEmail) {
      console.log(`[RuleManager] Study profile match detected (${profileEmail}). Allowing YouTube.`);
      domainsSet.delete('youtube.com');
      domainsSet.delete('www.youtube.com');
      domainsSet.delete('youtu.be');
    }

    return Array.from(domainsSet);
  }

  /**
   * Enables website blocking for the selected categories and custom domains.
   */
  async enableRules(categories: string[], customDomains: string[]): Promise<void> {
    const profileEmail = await this.adapter.getProfileEmail();
    const studyEmail = (await this.adapter.getStorage('studyEmail')) || "";
    const domains = this.resolveDomains(categories, customDomains, profileEmail, studyEmail);
    await this.adapter.updateBlockingRules(domains);
  }

  /**
   * Disables all blocking rules.
   */
  async disableRules(): Promise<void> {
    await this.adapter.clearBlockingRules();
  }
}
