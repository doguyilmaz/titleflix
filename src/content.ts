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
    // Try multiple selectors for the video title during playback
    const selectors = [
      '.video-title h4',
      '.video-title',
      '[data-uia="video-title"]',
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

  private updateTitle(): void {
    const pageInfo = this.detectPageType();
    let newTitle = 'Netflix';

    switch (pageInfo.type) {
      case 'watch':
        newTitle = pageInfo.title ? `▶️ ${pageInfo.title}` : 'Netflix - Watching';
        break;
      case 'title':
        newTitle = pageInfo.title ? `🎬 ${pageInfo.title}` : 'Netflix - Title';
        break;
      case 'search':
        newTitle = pageInfo.title ? `🔍 ${pageInfo.title}` : 'Netflix - Search';
        break;
      case 'browse':
        newTitle = '🏠 Netflix - Browse';
        break;
      default:
        newTitle = 'Netflix';
    }

    if (document.title !== newTitle) {
      document.title = newTitle;
      console.log('Titleflix: Updated title to:', newTitle);
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
        setTimeout(() => this.updateTitle(), 500);
      }
    });

    this.observer.observe(document, {
      childList: true,
      subtree: true,
      attributes: false
    });

    // Also listen for popstate events (back/forward navigation)
    window.addEventListener('popstate', () => {
      setTimeout(() => this.updateTitle(), 100);
    });

    // Listen for pushstate/replacestate (SPA navigation)
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function(...args) {
      originalPushState.apply(history, args);
      setTimeout(() => new TitleflixContentScript().updateTitle(), 100);
    };

    history.replaceState = function(...args) {
      originalReplaceState.apply(history, args);
      setTimeout(() => new TitleflixContentScript().updateTitle(), 100);
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