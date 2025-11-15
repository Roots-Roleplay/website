# Discord Embed Debugging Guide

## Problem: Image not showing in Discord

Discord's crawler might not execute JavaScript, so `document.write()` might not work. Here's how to debug and fix it.

## Quick Fix: Manual Absolute URL

If Discord doesn't execute JavaScript, you need to manually set the absolute URL in the HTML:

1. **Find your website's domain** (e.g., `https://yourusername.github.io` or `https://yourdomain.com`)
2. **Edit `index.html`** and add these meta tags RIGHT AFTER line 16 (before the script):

```html
<!-- MANUAL FIX: Set absolute URL for Discord (if document.write() doesn't work) -->
<!-- Replace YOUR-DOMAIN.com with your actual domain -->
<meta property="og:image" content="https://YOUR-DOMAIN.com/public/whitelist/roots_choice.png">
<meta property="og:image:secure_url" content="https://YOUR-DOMAIN.com/public/whitelist/roots_choice.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
<meta property="og:image:alt" content="Roots Roleplay - Alles beginnt mit einer Entscheidung">
<meta property="og:url" content="https://YOUR-DOMAIN.com/">
<meta name="twitter:image" content="https://YOUR-DOMAIN.com/public/whitelist/roots_choice.png">
<link rel="canonical" href="https://YOUR-DOMAIN.com/">
```

**Important:** Replace `YOUR-DOMAIN.com` with your actual domain (e.g., `username.github.io` or `yourdomain.com`)

## Step 1: Verify the Image URL

1. Open your website in a browser
2. Open Developer Console (F12)
3. Look for the log message: `Discord Embed Image URL: [URL]`
4. Copy that URL and test it directly in your browser
5. The image should load - if it doesn't, the path is wrong

## Step 2: Check the HTML Source

1. View Page Source (Ctrl+U or Right-click → View Page Source)
2. Search for `og:image`
3. Check if the meta tag has an absolute URL (starts with `https://` or `http://`)
4. If you see `content=""` or a relative path, the `document.write()` didn't work

## Step 3: Test with Discord's Debugger

1. Go to: https://discord.com/developers/docs/resources/channel#embed-object
2. Or use Discord's link preview feature
3. Share your URL in Discord
4. If it still doesn't work, Discord might be caching

## Step 4: Force Discord to Re-crawl

1. Add a query parameter to your URL: `?v=2` or `?t=1234567890`
2. Share the new URL in Discord
3. This forces Discord to fetch a fresh version

## Step 5: Verify Image Requirements

Discord requires:
- ✅ Absolute URL (starts with `https://` or `http://`)
- ✅ Publicly accessible (no authentication)
- ✅ Valid image format (PNG, JPG, etc.)
- ✅ Image file extension in URL (`.png`, `.jpg`, etc.)
- ✅ HTTPS preferred (but HTTP works too)
- ✅ Image dimensions: At least 512x512 (we use 1200x630)

## Step 6: Manual Fix (If Needed)

If `document.write()` doesn't work for Discord, you can manually set the absolute URL:

1. Find your website's domain (e.g., `https://yourusername.github.io` or `https://yourdomain.com`)
2. Edit `index.html` and replace the `document.write()` script with static meta tags:

```html
<meta property="og:image" content="https://YOUR-DOMAIN.com/public/whitelist/roots_choice.png">
<meta property="og:image:secure_url" content="https://YOUR-DOMAIN.com/public/whitelist/roots_choice.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:type" content="image/png">
```

Replace `YOUR-DOMAIN.com` with your actual domain.

## Current Implementation

The current code uses `document.write()` to generate absolute URLs dynamically. This works for:
- ✅ Browsers (JavaScript enabled)
- ✅ Most modern crawlers
- ❌ Discord (might not execute JavaScript)

## Alternative Solution

If Discord still doesn't work, consider:
1. Using a build step to inject the domain at build time
2. Using a server-side solution (if you have a backend)
3. Manually setting the absolute URL in the HTML (see Step 6)

## Testing Checklist

- [ ] Image URL is accessible in browser
- [ ] Image URL is absolute (starts with `https://` or `http://`)
- [ ] Meta tags appear in HTML source with correct URLs
- [ ] Tried sharing URL with query parameter (`?v=2`) to force refresh
- [ ] Waited a few minutes for Discord cache to clear
- [ ] Tested in a new Discord channel (cache might be per-channel)

