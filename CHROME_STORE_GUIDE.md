# 🚀 Chrome Web Store Submission Guide

This guide will help you publish Titleflix to the Chrome Web Store.

## 📋 Prerequisites

1. **Chrome Web Store Developer Account**
   - Visit [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
   - Sign in with your Google account
   - Pay the one-time $5 registration fee

2. **Extension Package**
   - Run `bun run package` to create the zip file
   - This creates `titleflix-v1.0.0.zip` in the project root

## 📦 Preparing Your Extension

### 1. Build and Package
```bash
# Clean previous builds
bun run clean

# Build the extension
bun run build

# Create the submission package
bun run package
```

This creates a zip file named `titleflix-v1.0.0.zip` containing all necessary files.

### 2. Required Assets for Submission

You'll need these items for the Chrome Web Store listing:

#### Icons (Already included)
- ✅ 16x16px icon
- ✅ 32x32px icon  
- ✅ 48x48px icon
- ✅ 128x128px icon

#### Store Listing Images (You need to create)
- **Small promotional tile**: 440x280px
- **Large promotional tile**: 920x680px
- **Marquee promotional tile**: 1400x560px (optional)
- **Screenshots**: 1280x800px or 640x400px (up to 5 images)

## 📝 Store Listing Information

### Basic Information
- **Name**: Titleflix
- **Summary**: Transform Netflix tab titles for better bookmarks
- **Description**: Use the description from our README.md
- **Category**: Productivity
- **Language**: English

### Detailed Description
```
Transform your Netflix browsing experience with meaningful tab titles!

🎯 THE PROBLEM
When you bookmark Netflix pages, they all show up as "Netflix" in your bookmarks, making it impossible to know what you were watching.

💡 THE SOLUTION  
Titleflix automatically detects what you're watching and updates the tab title to something meaningful like "Devil May Cry: E1 Inferno - Netflix" or "Cyberpunk: Edgerunners: E1 Let You Down - Netflix".

🚀 KEY FEATURES
• Smart content detection for movies, TV shows, and episodes
• Meaningful tab titles instead of generic "Netflix"
• Better bookmarks that actually make sense
• Dark/light theme support with adaptive icons
• Simple on/off toggle with theme preferences
• Privacy-focused: only runs on Netflix domains
• Lightweight with minimal performance impact

🎮 HOW TO USE
1. Install the extension
2. Navigate to Netflix
3. Browse or watch content - tab titles update automatically
4. Bookmark with confidence!

⚙️ SETTINGS
Click the Titleflix icon to access:
• Enable/disable toggle (Netflix only)
• Theme selection (Auto, Light, Dark)
• Current status display

🎨 THEME SUPPORT
Icons automatically adapt to your system's dark/light mode preference, or you can manually select your preferred theme.

🛡️ PRIVACY & SECURITY
• Only runs on Netflix domains
• No data collection or tracking
• Minimal permissions (activeTab, storage)
• Open source and transparent
• Full privacy policy available

Transform your Netflix bookmarks today!
```

### Screenshots Ideas
Create screenshots showing:
1. **Before/After comparison** of bookmark lists
2. **Extension popup** with settings
3. **Netflix page** with updated title in browser tab
4. **Dark/light theme** icon variations
5. **Different content types** (movie, TV show episode)

## 🚀 Submission Steps

### 1. Upload Extension
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole/)
2. Click "Add new item"
3. Upload your `titleflix-v1.0.0.zip` file
4. Wait for the upload to complete

### 2. Fill Store Listing
1. **Store listing tab**: Add description, screenshots, icons
2. **Privacy tab**: Fill out privacy practices
3. **Pricing and distribution**: Set to free, select countries

### 3. Privacy Practices
Since Titleflix is privacy-focused:
- **Data collection**: "This item does not collect user data"
- **Data usage**: Not applicable
- **Data sharing**: Not applicable
- **Privacy policy**: Link to your GitHub privacy policy: `https://github.com/doguyilmaz/titleflix/blob/main/PRIVACY_POLICY.md`

### 4. Permissions Justification
If asked about permissions:

**activeTab**: 
> "Required to access the current Netflix tab to update the title with the content being watched. Only activates when user is on Netflix."

**storage**: 
> "Required to save user preferences for theme selection and enable/disable state. Data is stored locally and never transmitted."

**host_permissions (netflix.com)**: 
> "Required to run the content script only on Netflix domains to detect and update tab titles with meaningful content names."

### 5. Review and Submit
1. Review all information for accuracy
2. Click "Submit for review"
3. Wait for Google's review (typically 1-7 days for new items)

## 📊 Post-Submission

### Monitor Your Extension
- Check the Developer Dashboard for review status
- Respond to any review feedback promptly
- Monitor user reviews and ratings

### Updates
When you need to update:
1. Increment version in `manifest.json` and `package.json`
2. Run `bun run package`
3. Upload new zip file to existing listing
4. Submit for review

## 🔍 Common Review Issues

### Potential Issues to Avoid
1. **Keyword stuffing** in description
2. **Misleading functionality** claims
3. **Copyright concerns** (avoid using Netflix branding excessively)
4. **Permissions overreach** (we're good - minimal permissions)

### If Rejected
- Read rejection reason carefully
- Fix the specific issues mentioned
- Resubmit with clear explanation of changes

## 📈 Marketing Tips

### After Approval
1. **Update README** with actual Chrome Web Store link
2. **Social media** announcement
3. **Reddit posts** in relevant communities (r/chrome, r/netflix)
4. **Product Hunt** submission
5. **Ask friends** to try and review

### SEO Optimization
- Use relevant keywords naturally
- Include "chrome extension" in description
- Mention "Netflix" appropriately
- Use "productivity" and "bookmarks" keywords

## ✅ Pre-Submission Checklist

- [ ] Extension builds without errors
- [ ] All functionality tested on Netflix
- [ ] Icons display correctly in different themes
- [ ] Package.json has correct metadata
- [ ] Manifest.json follows best practices
- [ ] Privacy policy considerations addressed
- [ ] Store listing assets prepared
- [ ] Screenshots and promotional images ready
- [ ] Description written and proofread
- [ ] Chrome Web Store developer account set up
- [ ] $5 registration fee paid

## 🎉 Success!

Once approved, your extension will be available at:
`https://chromewebstore.google.com/detail/titleflix/[extension-id]`

Update your README.md and package.json with the actual store URL!

---

**Good luck with your submission! 🚀**