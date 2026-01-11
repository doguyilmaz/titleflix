interface NetflixPageType {
  type: 'watch' | 'browse' | 'title' | 'search' | 'unknown';
  title?: string;
}

class TitleflixContentScript {
  private originalTitle: string;
  private observer: MutationObserver | null = null;
  private lastSetTitle: string | null = null;
  private hasValidTitle: boolean = false;
  private periodicCheckInterval: number | null = null;

  constructor() {
    this.originalTitle = document.title;
    this.init();
  }

  private init(): void {
    this.updateTitle();
    this.setupObserver();
    this.setupPeriodicCheck();
  }

  private setupPeriodicCheck(): void {
    // Check every 3 seconds to ensure title is still correct
    // This helps catch cases where Netflix changes the title or DOM structure
    this.periodicCheckInterval = window.setInterval(() => {
      const currentTitle = document.title;
      const isInvalid = this.isTitleInvalid(currentTitle);

      // If title is invalid or we're on a watch page, try to update
      if (isInvalid || window.location.pathname.match(/^\/watch\/(\d+)/)) {
        this.updateTitle().catch(() => {});
      }
    }, 3000);
  }

  private isTitleInvalid(title: string): boolean {
    if (!title) return true;

    // Remove " - Netflix" suffix for checking
    const titleWithoutSuffix = title.replace(/\s*-\s*Netflix$/i, '').trim();

    // Check for rating patterns
    if (titleWithoutSuffix.match(/^(RATED\s+)?\d+\+?$/i)) return true;
    if (titleWithoutSuffix.match(/^(TV-[A-Z0-9]+|PG-?\d+|R|NC-17|G)$/i)) return true;

    // Check for duration patterns
    if (titleWithoutSuffix.match(/^(\d+h\s+\d+m|\d+\s*min|\d+\s*h(our)?s?)$/i)) return true;

    // Check for year-only
    if (titleWithoutSuffix.match(/^\d{4}$/)) return true;

    // Check for just "Netflix" or empty
    if (titleWithoutSuffix.match(/^(Netflix|)$/i)) return true;

    // Check for mostly numbers and symbols
    if (titleWithoutSuffix.match(/^[\d\s\+\-]+$/)) return true;

    // Check for common UI text
    if (titleWithoutSuffix.match(/^(You're watching|Paused|Playing|Loading|Buffering)$/i))
      return true;

    return false;
  }

  private detectPageType(): NetflixPageType {
    const pathname = window.location.pathname;

    // Only work on watch pages with video IDs (e.g., /watch/81713948)
    const watchMatch = pathname.match(/^\/watch\/(\d+)/);
    if (watchMatch) {
      const title = this.extractWatchTitle();
      return { type: 'watch', title };
    }

    return { type: 'unknown' };
  }

  private extractWatchTitle(): string | undefined {
    // Helper function to extract text from an element, checking headings and direct text
    const extractTextFromElement = (element: Element): string | null => {
      // First check for heading elements (h1, h2, h3, h4) - these are most reliable
      const heading = element.querySelector('h1, h2, h3, h4');
      if (heading?.textContent?.trim()) {
        const text = heading.textContent.trim();
        // Use the comprehensive validation function
        if (text && isValidTitle(text)) {
          return text;
        }
      }

      // If no heading, check direct textContent (but filter out common non-title text)
      const directText = element.textContent?.trim();
      if (directText && isValidTitle(directText)) {
        return directText;
      }

      return null;
    };

    // Helper function to check if text looks like a valid title
    const isValidTitle = (text: string): boolean => {
      if (!text || text.length < 2) return false;

      const trimmed = text.trim();

      // Filter out rating patterns (e.g., "RATED 18+", "18+", "TV-MA", "PG-13", etc.)
      if (trimmed.match(/^(RATED\s+)?\d+\+?$/i)) return false;
      if (trimmed.match(/^(TV-[A-Z0-9]+|PG-?\d+|R|NC-17|G)$/i)) return false;
      if (trimmed.match(/^\d+\+?\s*-\s*Netflix$/i)) return false;

      // Filter out duration patterns
      if (trimmed.match(/^(\d+h\s+\d+m|\d+\s*min|\d+\s*h(our)?s?)$/i)) return false;

      // Filter out just symbols
      if (trimmed.match(/^[○△□\s]+$/)) return false;

      // Filter out common UI text
      if (trimmed.match(/^(You're watching|Paused|Playing|Loading|Buffering)$/i)) return false;

      // Filter out if it's just "Netflix" or starts with "-"
      if (trimmed.match(/^(Netflix|-\s*Netflix)$/i)) return false;

      // Filter out year-only patterns (e.g., "2025")
      if (trimmed.match(/^\d{4}$/)) return false;

      // Filter out if it's mostly numbers and symbols
      if (trimmed.match(/^[\d\s\+\-]+$/)) return false;

      return true;
    };

    // Primary: Look for video-title container in multiple locations
    const videoTitleSelectors = [
      '[data-uia="video-title"]',
      '.watch-video--bottom-controls-container [data-uia="video-title"]',
      '.watch-video--player-view [data-uia="video-title"]',
      '.ltr-1m81c36 [data-uia="video-title"]',
    ];

    for (const selector of videoTitleSelectors) {
      const videoTitleContainer = document.querySelector(selector);
      if (videoTitleContainer) {
        const titleText = extractTextFromElement(videoTitleContainer);
        if (titleText && isValidTitle(titleText)) {
          // Check for episode info in spans
          const spans = videoTitleContainer.querySelectorAll('span');
          const episodeParts: string[] = [];

          for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            if (span) {
              const spanText = span.textContent?.trim();
              if (spanText && spanText !== titleText && isValidTitle(spanText)) {
                episodeParts.push(spanText);
              }
            }
          }

          if (episodeParts.length > 0) {
            const fullEpisodeInfo = episodeParts.join(' ');
            return `${titleText}: ${fullEpisodeInfo}`;
          }

          return titleText;
        }
      }
    }

    // Secondary: Look for evidence overlay (appears when paused after some time)
    const evidenceOverlay = document.querySelector('[data-uia="evidence-overlay"]');
    if (evidenceOverlay) {
      const h2 = evidenceOverlay.querySelector('h2');
      if (h2?.textContent?.trim()) {
        const titleText = h2.textContent.trim();
        if (isValidTitle(titleText)) {
          return titleText;
        }
      }
    }

    // Fallback: Look for other title containers
    const fallbackSelectors = [
      '.watch-video--flag-container h4',
      '.ltr-gpipej h4',
      '.video-title h4',
      '.player-overlay h4',
      '.video-overlay h4',
      '.watch-video--player-view h4',
      '.ltr-1nvcw39 h4',
      'h4[data-uia*="title"]',
    ];

    for (const selector of fallbackSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        const titleText = element.textContent.trim();
        if (isValidTitle(titleText)) {
          return titleText;
        }
      }
    }

    return undefined;
  }

  private async updateTitle(): Promise<void> {
    try {
      // Check if extension is enabled
      const isEnabled = await this.getExtensionState();
      if (!isEnabled) {
        return;
      }

      const pageInfo = this.detectPageType();

      if (pageInfo.type === 'watch') {
        // Check if current title is invalid (e.g., "RATED 18+ - Netflix", "TV-MA - Netflix", etc.)
        const currentTitle = document.title;
        const isCurrentTitleInvalid = this.isTitleInvalid(currentTitle);

        if (pageInfo.title) {
          const newTitle = `${pageInfo.title} - Netflix`;
          this.hasValidTitle = true;
          this.lastSetTitle = newTitle;

          // Always update if title changed or if current title is invalid
          if (document.title !== newTitle || isCurrentTitleInvalid) {
            document.title = newTitle;
          }

          // Send current watching info to storage for popup
          await this.setStorageData({
            currentlyWatching: pageInfo.title,
            isWatching: true,
          });
        } else {
          // If we can't find a title but current title is invalid, keep trying
          if (isCurrentTitleInvalid || !this.hasValidTitle || this.lastSetTitle === null) {
            // Retry after a delay
            setTimeout(() => this.updateTitle(), 1000);
          }
          // If we had a valid title but can't find it now, don't change the title
          // (might be temporary DOM change)
        }
      } else {
        // Reset when not on a watch page
        this.hasValidTitle = false;
        await this.setStorageData({
          currentlyWatching: null,
          isWatching: false,
        });
      }
    } catch (error) {
      // Extension context invalidated - silently stop operations
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        this.destroy();
        return;
      }
      console.error('TitleFlix error:', error);
    }
  }

  private async getExtensionState(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['titleflixEnabled']);
      return result.titleflixEnabled !== false; // Default to enabled
    } catch (error) {
      // Extension context invalidated
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        throw error;
      }
      return true; // Default to enabled if storage fails
    }
  }

  private async setStorageData(data: any): Promise<void> {
    try {
      await chrome.storage.local.set(data);
    } catch (error) {
      // Extension context invalidated
      if (error instanceof Error && error.message.includes('Extension context invalidated')) {
        throw error;
      }
      // Silently fail for other storage errors
    }
  }

  private setupObserver(): void {
    // Clean up existing observer
    if (this.observer) {
      this.observer.disconnect();
    }

    // Watch for DOM changes that might indicate navigation or content changes
    this.observer = new MutationObserver((mutations) => {
      let shouldUpdate = false;

      for (const mutation of mutations) {
        // Check for URL changes (SPA navigation)
        if (mutation.type === 'childList' && mutation.target === document.body) {
          shouldUpdate = true;
          break;
        }

        // Check specifically for video title element changes
        if (mutation.target instanceof Element) {
          const target = mutation.target;
          if (
            target.matches('[data-uia="video-title"]') ||
            target.closest('[data-uia="video-title"]') ||
            target.matches('[data-uia="evidence-overlay"]') ||
            target.closest('[data-uia="evidence-overlay"]') ||
            target.matches('.watch-video--evidence-overlay-container') ||
            target.closest('.watch-video--evidence-overlay-container')
          ) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {
        // Debounce updates
        setTimeout(() => this.updateTitle().catch(() => {}), 500);
      }
    });

    this.observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: false,
    });

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.updateTitle().catch(() => {}), 100);
    });

    // Listen for pushstate/replacestate (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;

    history.pushState = function (...args) {
      originalPushState.apply(history, args);
      // Reset title state on navigation
      self.hasValidTitle = false;
      setTimeout(() => self.updateTitle().catch(() => {}), 100);
    };

    history.replaceState = function (...args) {
      originalReplaceState.apply(history, args);
      // Reset title state on navigation
      self.hasValidTitle = false;
      setTimeout(() => self.updateTitle().catch(() => {}), 100);
    };
  }

  public destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    if (this.periodicCheckInterval !== null) {
      clearInterval(this.periodicCheckInterval);
      this.periodicCheckInterval = null;
    }
    document.title = this.originalTitle;
  }
}

// Initialize the extension
if (window.location.hostname.includes('netflix.com')) {
  new TitleflixContentScript();
}
