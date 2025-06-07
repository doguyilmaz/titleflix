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
    // Look for the exact structure from the HTML: data-uia="video-title" with h4 and span
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

    // No fallback - return undefined if we can't find the proper video title element
    return undefined;
  }


  private async updateTitle(): Promise<void> {
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
      } else if (!this.hasValidTitle) {
        // Only try again if we haven't found a valid title yet
        setTimeout(() => this.updateTitle(), 1000);
      }
      // If we already have a valid title, don't override it
    } else {
      // Reset when not on a watch page
      this.hasValidTitle = false;
    }
  }

  private async getExtensionState(): Promise<boolean> {
    try {
      const result = await chrome.storage.local.get(['titleflixEnabled']);
      return result.titleflixEnabled !== false; // Default to enabled
    } catch {
      return true; // Default to enabled if storage fails
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
          if (target.matches('[data-uia="video-title"]') || 
              target.closest('[data-uia="video-title"]')) {
            shouldUpdate = true;
            break;
          }
        }
      }

      if (shouldUpdate) {
        // Debounce updates
        setTimeout(async () => await this.updateTitle(), 500);
      }
    });

    this.observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: false
    });

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(async () => await this.updateTitle(), 100);
    });

    // Listen for pushstate/replacestate (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;
    const self = this;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      // Reset title state on navigation
      self.hasValidTitle = false;
      setTimeout(async () => await self.updateTitle(), 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      // Reset title state on navigation
      self.hasValidTitle = false;
      setTimeout(async () => await self.updateTitle(), 100);
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