# GitHub Pages Deployment Guide

This guide explains how to set up automatic deployment of steamgirl to GitHub Pages using the included GitHub Actions workflow.

## What's Included

The repository now contains:

1. **Updated Vite Configuration** (`vite.config.ts`)
   - Added `base: '/steamgirl/'` to ensure assets load correctly on GitHub Pages.

2. **GitHub Actions Workflow** (Manual Setup Required)
   - Due to security restrictions, I couldn't push the `.github/workflows/deploy.yml` file directly.
   - Please create this file manually in your repository to enable automatic deployment.

## Setup Instructions

### Step 1: Create the Workflow File
Create a file at `.github/workflows/deploy.yml` with the following content:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches:
      - master

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v3
        with:
          version: 9

      - name: Install dependencies
        run: pnpm install

      - name: Build project
        run: pnpm run build

      - name: Setup Pages
        uses: actions/configure-pages@v4

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Step 2: Enable GitHub Pages
1. Go to your repository on GitHub: `https://github.com/charlotte-xie/steamgirl`
2. Click on **Settings** tab.
3. In the left sidebar, click on **Pages**.
4. Under **Source**, select **GitHub Actions** from the dropdown.

### Step 3: Access Your Site
Your site will be available at:
```
https://charlotte-xie.github.io/steamgirl/
```
