# Website Rebuild - Setup Instructions

I've successfully rebuilt your website with the following changes:

## ✅ Completed Changes

### 1. Profile Picture - Changed from Circular to Square
- **File Modified**: `_pages/about.md`
- **Change**: Set `image_circular: false`
- **Result**: Your profile picture now displays with subtle rounded corners (8px border-radius) instead of a full circle

### 2. Default Theme - Set to Light Mode
- **Files**: Already configured in `_sass/_themes.scss`
- **Setting**: `color-scheme: light` is the default
- **Result**: Website loads in light/white mode by default

### 3. Design Improvements
- **New File**: `_sass/_custom.scss` - Custom styles for cleaner design
- **Modified**: `assets/css/main.scss` - Added custom styles import
- **Improvements**:
  - Better typography with increased line-height (1.8)
  - Improved spacing and readability
  - Cleaner profile image presentation
  - Enhanced post header styling

### 4. Header Banner Integration
- **File Modified**: `_layouts/about.liquid`
- **Added**: Header banner section that will display your quantum computation image
- **Design**: Subtle overlay effect with gradient background

## 🔧 Final Step Required: Add Your Header Image

To add the quantum computation/qubit calculation image you showed me:

1. **Save the image** to: `/workspaces/aibyhana.github.io/assets/img/header-banner.jpg`
   - You can name it `header-banner.jpg`, `quantum-header.jpg`, or any name you prefer

2. **Update your about page** (`_pages/about.md`) to include the header image by adding this line after the `subtitle:` line:

```yaml
---
layout: about
title: home
permalink: /
subtitle: <b>Data and AI Engineer</b> • <b>AI Safety Researcher</b> • <b>NeurIPS Ethics Reviewer</b>
header_image: header-banner.jpg  # Add this line (use whatever filename you saved)
profile:
  align: right
  image: prof_pic.jpg
  image_circular: false
  more_info: >
---
```

## 🎨 Design Notes

The header banner styling includes:
- **Height**: 200px banner at the top of your homepage
- **Background**: Subtle gradient (light blue/gray) as fallback
- **Image Effect**: Your image will display with 15% opacity and slight desaturation for a subtle, professional look
- **Overlay**: Soft gradient overlay to ensure the image doesn't overpower your content

If you want to adjust the styling (height, opacity, colors), edit `_sass/_custom.scss`.

## 🚀 Build and Deploy

After adding your header image:

```bash
# Clear cache (already done)
rm -rf .jekyll-cache _site

# Build the site locally (if you want to preview)
bundle exec jekyll serve

# Commit and push to deploy
git add .
git commit -m "Rebuild website with updated design"
git push
```

## 📋 Summary of All Changes

1. ✅ Profile picture: circular → square with rounded corners
2. ✅ Default theme: light mode
3. ✅ Design improvements: better typography, spacing, cleaner layout
4. ✅ Header banner system: ready for your quantum image
5. ✅ External posts: removed (cache cleared)
6. ✅ Books section: AI safety books added, uncategorized labels removed
7. ✅ Blog posts: Stanford ethics post added, only showing your content

Your website now has a cleaner, more professional design focused on AI safety research!
