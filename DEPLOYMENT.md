# Deployment Guide: GitHub to Netlify

This guide explains how to set up automatic deployment from GitHub to Netlify for the Leading Age caregiving app.

## Prerequisites

- GitHub repository with your code
- Netlify account (free tier available)
- OpenAI API key

## Setup Steps

### 1. Connect GitHub to Netlify

1. Go to [netlify.com](https://netlify.com) and log in
2. Click **"Add new site"** → **"Import an existing project"**
3. Choose **"Deploy with GitHub"**
4. Authorize Netlify to access your repositories
5. Select the `leading-age` repository

### 2. Configure Build Settings

Use these settings when prompted:

- **Base directory**: (leave empty)
- **Build command**: `npm run build`
- **Publish directory**: `build`
- **Node version**: `18`

### 3. Add Environment Variables

1. In Netlify Dashboard → Your site → **Site settings** → **Environment variables**
2. Click **"Add variable"**
3. Add:
   - **Key**: `REACT_APP_OPENAI_API_KEY`
   - **Value**: Your OpenAI API key

### 4. Deploy

1. Click **"Deploy site"**
2. Netlify will automatically build and deploy your site
3. You'll get a random URL like `https://amazing-name-123456.netlify.app`

## Automatic Deployments

Once set up, every push to your main branch will automatically:

1. Trigger a new build on Netlify
2. Run `npm run build`
3. Deploy the updated site
4. Update your live URL

## Custom Domain (Optional)

To use a custom domain:

1. In Netlify Dashboard → **Domain settings**
2. Click **"Add custom domain"**
3. Follow the DNS configuration instructions

## Configuration Files

This repository includes:

- `netlify.toml` - Netlify configuration with optimizations
- Build settings for React app deployment
- Security headers and caching rules
- SPA redirect rules for React Router

## Monitoring

- **Build logs**: Available in Netlify Dashboard → Deploys
- **Deploy previews**: Automatic for pull requests
- **Branch deploys**: Can be enabled for feature branches

## Troubleshooting

### Build Fails
- Check build logs in Netlify Dashboard
- Ensure all dependencies are in `package.json`
- Verify environment variables are set

### App Doesn't Load
- Check browser console for errors
- Verify API keys are properly set
- Check network requests in browser dev tools

### Routing Issues
- The `netlify.toml` includes SPA redirect rules
- All routes should work with React Router

## Performance Optimizations

The `netlify.toml` includes:

- Asset caching (1 year for static files)
- CSS/JS minification
- Security headers
- Image optimization

## Support

- [Netlify Documentation](https://docs.netlify.com/)
- [React Deployment Guide](https://create-react-app.dev/docs/deployment/) 