interface NetflixPageType {
  type: 'watch' | 'browse' | 'title' | 'search' | 'unknown';
  title?: string;
}

class TitleflixContentScript {
  private originalTitle: string;
  private observer: MutationObserver | null = null;

  constructor() {
    this.originalTitle = document.title;
    this.init();
  }

  private init(): void {
    this.updateTitle();
    this.setupObserver();
  }

  private detectPageType(): NetflixPageType {
    const url = window.location.href;
    const pathname = window.location.pathname;

    // Watch page - when actually watching content
    if (pathname.includes('/watch/')) {
      const title = this.extractWatchTitle();
      return { type: 'watch', title };
    }

    // Title details page
    if (pathname.includes('/title/')) {
      const title = this.extractTitlePageTitle();
      return { type: 'title', title };
    }

    // Search results
    if (pathname.includes('/search')) {
      const query = new URLSearchParams(window.location.search).get('q');
      return { type: 'search', title: query ? `Search: ${query}` : 'Search' };
    }

    // Browse pages (genre, home, etc.)
    if (pathname === '/' || pathname.includes('/browse')) {
      return { type: 'browse', title: 'Browse' };
    }

    return { type: 'unknown' };
  }

  private extractWatchTitle(): string | undefined {
    // Try the specific Netflix video title structure first
    const videoTitleContainer = document.querySelector('[data-uia="video-title"]');
    if (videoTitleContainer) {
      const title = this.parseVideoTitleContainer(videoTitleContainer);
      if (title) return title;
    }

    // Try multiple selectors for the video title during playback
    const selectors = [
      '.video-title h4',
      '.video-title',
      '.watch-video--title-text',
      '.PlayerControlsNeo__all-controls .video-title'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
    }

    // Fallback: try to extract from page URL or metadata
    const urlMatch = window.location.pathname.match(/\/watch\/(\d+)/);
    if (urlMatch) {
      return `Watching (ID: ${urlMatch[1]})`;
    }

    return undefined;
  }

  private parseVideoTitleContainer(container: Element): string | undefined {
    try {
      // Look for h4 (main title) and spans (episode info)
      const h4 = container.querySelector('h4');
      const spans = container.querySelectorAll('span');
      
      if (!h4?.textContent?.trim()) return undefined;
      
      const mainTitle = h4.textContent.trim();
      
      if (spans.length === 0) {
        return mainTitle;
      }
      
      // Extract episode information from spans
      const episodeInfo = Array.from(spans)
        .map(span => span.textContent?.trim())
        .filter(text => text && text.length > 0)
        .join(' ');
      
      if (episodeInfo) {
        // Format: "Show Title: Episode Info"
        return `${mainTitle}: ${episodeInfo}`;
      }
      
      return mainTitle;
    } catch (error) {
      console.error('Error parsing video title container:', error);
      return undefined;
    }
  }

  private extractTitlePageTitle(): string | undefined {
    // Try multiple selectors for title page
    const selectors = [
      '[data-uia="title-info-title"]',
      '.title-info-title',
      'h1[data-uia="title-info-title"]',
      '.previewModal--player-titleTreatment-logo img',
      '.about-header h1'
    ];

    for (const selector of selectors) {
      const element = document.querySelector(selector);
      if (element?.textContent?.trim()) {
        return element.textContent.trim();
      }
      // Check for alt text in logo images
      if (element?.tagName === 'IMG') {
        const alt = (element as HTMLImageElement).alt;
        if (alt?.trim()) return alt.trim();
      }
    }

    return undefined;
  }

  private async updateTitle(): Promise<void> {
    // Check if extension is enabled
    const isEnabled = await this.getExtensionState();
    if (!isEnabled) {
      return;
    }

    const pageInfo = this.detectPageType();
    let newTitle = 'Netflix';

    switch (pageInfo.type) {
      case 'watch':
        newTitle = pageInfo.title ? `${pageInfo.title} - Netflix` : 'Netflix - Watching';
        break;
      case 'title':
        newTitle = pageInfo.title ? `${pageInfo.title} - Netflix` : 'Netflix - Title';
        break;
      case 'search':
        newTitle = pageInfo.title ? `${pageInfo.title} - Netflix` : 'Netflix - Search';
        break;
      case 'browse':
        newTitle = 'Netflix - Browse';
        break;
      default:
        newTitle = 'Netflix';
    }

    if (document.title !== newTitle) {
      document.title = newTitle;
      console.log('Titleflix: Updated title to:', newTitle);
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
        
        // Check for title element changes
        if (mutation.target instanceof Element) {
          const target = mutation.target;
          if (target.matches('[data-uia*="title"]') || 
              target.closest('[data-uia*="title"]') ||
              target.matches('.video-title') ||
              target.closest('.video-title')) {
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
      setTimeout(async () => await self.updateTitle(), 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
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