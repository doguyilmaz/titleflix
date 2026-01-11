/**
 * Google Analytics 4 integration for Chrome Extension
 * Uses Measurement Protocol for tracking events
 */

// Google Analytics 4 Measurement ID
const GA4_MEASUREMENT_ID = 'G-XBJ2XL77DT';
const GA4_API_SECRET = ''; // Optional: For enhanced measurement

interface AnalyticsEvent {
  name: string;
  params?: Record<string, any>;
}

class Analytics {
  private clientId: string | null = null;
  private enabled: boolean = true;

  constructor() {
    this.init();
  }

  private async init(): Promise<void> {
    // Get or create client ID
    this.clientId = await this.getOrCreateClientId();

    // Check if analytics is enabled (respect user privacy)
    const settings = await chrome.storage.local.get(['analyticsEnabled']);
    this.enabled = settings.analyticsEnabled !== false; // Default to enabled
  }

  private async getOrCreateClientId(): Promise<string> {
    try {
      const result = await chrome.storage.local.get(['ga_client_id']);
      if (result.ga_client_id) {
        return result.ga_client_id;
      }

      // Generate a new client ID (UUID v4 format)
      const clientId = this.generateClientId();
      await chrome.storage.local.set({ ga_client_id: clientId });
      return clientId;
    } catch {
      // Fallback if storage fails
      return this.generateClientId();
    }
  }

  private generateClientId(): string {
    // Generate a UUID v4-like client ID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * Send an event to Google Analytics
   */
  async trackEvent(event: AnalyticsEvent): Promise<void> {
    if (!this.enabled || !GA4_MEASUREMENT_ID) {
      return; // Don't track if disabled or not configured
    }

    try {
      const payload = {
        client_id: this.clientId || (await this.getOrCreateClientId()),
        events: [
          {
            name: event.name,
            params: {
              ...event.params,
              engagement_time_msec: 100,
            },
          },
        ],
      };

      // Use Measurement Protocol
      const url = GA4_API_SECRET
        ? `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}&api_secret=${GA4_API_SECRET}`
        : `https://www.google-analytics.com/mp/collect?measurement_id=${GA4_MEASUREMENT_ID}`;

      const response = await fetch(url, {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        console.warn('[Analytics] Tracking failed:', response.status, response.statusText);
      } else {
        console.log('[Analytics] Event tracked:', event.name);
      }
    } catch (error) {
      // Silently fail - don't break extension functionality
      console.warn('[Analytics] Tracking error:', error);
    }
  }

  /**
   * Track page view (for extension pages)
   */
  async trackPageView(page: string): Promise<void> {
    await this.trackEvent({
      name: 'page_view',
      params: {
        page_title: page,
        page_location: `chrome-extension://${chrome.runtime.id}/${page}`,
      },
    });
  }

  /**
   * Track extension installation
   */
  async trackInstall(): Promise<void> {
    await this.trackEvent({
      name: 'extension_installed',
      params: {
        extension_version: chrome.runtime.getManifest().version,
      },
    });
  }

  /**
   * Track extension enabled/disabled
   */
  async trackToggle(enabled: boolean): Promise<void> {
    await this.trackEvent({
      name: 'extension_toggled',
      params: {
        enabled,
      },
    });
  }

  /**
   * Track theme change
   */
  async trackThemeChange(theme: string): Promise<void> {
    await this.trackEvent({
      name: 'theme_changed',
      params: {
        theme,
      },
    });
  }

  /**
   * Track title update
   */
  async trackTitleUpdate(title: string): Promise<void> {
    await this.trackEvent({
      name: 'title_updated',
      params: {
        title_length: title.length,
        // Don't send full title for privacy
      },
    });
  }
}

// Export singleton instance
export const analytics = new Analytics();
