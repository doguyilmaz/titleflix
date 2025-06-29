interface NetflixPageType {
  type: 'watch' | 'browse' | 'title' | 'search' | 'unknown';
  title?: string;
}

class TitleflixContentScript {
  private originalTitle: string;
  private observer: MutationObserver | null = null;
  private lastSetTitle: string | null = null;
  private hasValidTitle: boolean = false;

  constructor() {
    this.originalTitle = document.title;
    this.init();
  }

  private init(): void {
    this.updateTitle();
    this.setupObserver();
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
    // Primary: Look for video-title container with h4 and span
    const videoTitleContainer = document.querySelector('[data-uia="video-title"]');
    if (videoTitleContainer) {
      const h4 = videoTitleContainer.querySelector('h4');
      const span = videoTitleContainer.querySelector('span');

      if (h4?.textContent?.trim()) {
        const showTitle = h4.textContent.trim();
        const episodeTitle = span?.textContent?.trim();

        if (episodeTitle) {
          return `${showTitle}: ${episodeTitle}`;
        }
        return showTitle;
      }
    }

    // Fallback 1: Look for episode info in various overlay structures
    const episodeContainers = [
      // Bottom overlay patterns when controls are visible
      '.watch-video--bottom-controls-container [data-uia="video-title"]',
      '.ltr-1m81c36 [data-uia="video-title"]',
      // Info overlay patterns when visible
      '.watch-video--flag-container',
      '.ltr-gpipej',
      // General player overlay patterns
      '.watch-video--player-view [data-uia="video-title"]',
      '.ltr-bjn8wh',
      '.video-title',
    ];

    for (const selector of episodeContainers) {
      const container = document.querySelector(selector);
      if (container) {
        const h4 = container.querySelector('h4');

        if (h4?.textContent?.trim()) {
          const showTitle = h4.textContent.trim();

          // Look for episode info in span elements - combine all spans for full episode info
          const spans = container.querySelectorAll('span');
          const episodeParts: string[] = [];

          for (let i = 0; i < spans.length; i++) {
            const span = spans[i];
            if (span) {
              const spanText = span.textContent?.trim();
              if (spanText && spanText !== showTitle) {
                episodeParts.push(spanText);
              }
            }
          }

          if (episodeParts.length > 0) {
            // Join all episode parts (e.g., "E5" + "○△□" = "E5 ○△□")
            const fullEpisodeInfo = episodeParts.join(' ');
            return `${showTitle}: ${fullEpisodeInfo}`;
          }

          return showTitle;
        }
      }
    }

    // Fallback 2: Look for any visible title elements
    const titleSelectors = [
      'h4[data-uia*="title"]',
      '.player-overlay h4',
      '.video-overlay h4',
      '[class*="title"] h4',
      '.watch-video--player-view h4',
      '.ltr-1nvcw39 h4',
    ];

    for (const selector of titleSelectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
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
        if (pageInfo.title) {
          const newTitle = `${pageInfo.title} - Netflix`;
          this.hasValidTitle = true;
          this.lastSetTitle = newTitle;

          if (document.title !== newTitle) {
            document.title = newTitle;
          }

          // Send current watching info to storage for popup
          await this.setStorageData({
            currentlyWatching: pageInfo.title,
            isWatching: true,
          });
        } else if (!this.hasValidTitle) {
          // Only try again if we haven't found a valid title yet
          setTimeout(() => this.updateTitle(), 1000);
        }
        // If we already have a valid title, don't override it
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
            target.closest('[data-uia="video-title"]')
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
    document.title = this.originalTitle;
  }
}

// Initialize the extension
if (window.location.hostname.includes('netflix.com')) {
  new TitleflixContentScript();
}
