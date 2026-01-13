# K3C Platform Deployment Guide

This guide will help you deploy your K3C Smart Giving Platform for free using Vercel (frontend) and Render (backend).

## Prerequisites

- GitHub account (for deploying from Git)
- MongoDB Atlas database (you already have this)
- Vercel account (free)
- Render account (free)

## Part 1: Deploy Backend to Render

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
   ```bash
   cd /Users/Joshua/k3c-platform
   git init
   git add .
   git commit -m "Initial commit - K3C Platform"
   ```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Create a new repository (e.g., "k3c-platform")
   - Don't initialize with README
   - Push your code:
     ```bash
     git remote add origin https://github.com/YOUR_USERNAME/k3c-platform.git
     git branch -M main
     git push -u origin main
     ```

### Step 2: Deploy to Render

1. **Sign up for Render**:
   - Go to https://render.com
   - Sign up with GitHub

2. **Create a new Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select your "k3c-platform" repo

3. **Configure the service**:
   - **Name**: `k3c-backend` (or any name you prefer)
   - **Region**: Oregon (Free tier)
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. **Add Environment Variables**:
   Click "Advanced" and add these environment variables:

   ```
   NODE_ENV=production
   PORT=10000
   BACKEND_URL=https://YOUR-SERVICE-NAME.onrender.com
   MONGODB_URI=mongodb+srv://oyugiodhiambo1_db_user:Wyku33c2AEWoasMu@cluster0.emmgpbg.mongodb.net/k3c-giving?retryWrites=true&w=majority
   JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long-change-this
   JWT_EXPIRES_IN=7d
   MPESA_CONSUMER_KEY=your-mpesa-consumer-key
   MPESA_CONSUMER_SECRET=your-mpesa-consumer-secret
   MPESA_SHORTCODE=174379
   MPESA_PASSKEY=your-mpesa-passkey
   MPESA_ENVIRONMENT=sandbox
   PAYSTACK_PUBLIC_KEY=your-paystack-public-key
   PAYSTACK_SECRET_KEY=your-paystack-secret-key
   CLOUDINARY_CLOUD_NAME=your-cloud-name
   CLOUDINARY_API_KEY=your-api-key
   CLOUDINARY_API_SECRET=your-api-secret
   FRONTEND_URL=https://YOUR-APP-NAME.vercel.app
   ```

   **IMPORTANT**:
   - Replace `YOUR-SERVICE-NAME` in BACKEND_URL with your actual Render service name
   - Generate a strong JWT_SECRET (at least 32 characters)
   - Update FRONTEND_URL after deploying to Vercel (Step 3)

5. **Deploy**:
   - Click "Create Web Service"
   - Wait for deployment (5-10 minutes)
   - Note your backend URL: `https://YOUR-SERVICE-NAME.onrender.com`

### Step 3: Test Backend

Once deployed, test your backend:
```bash
curl https://YOUR-SERVICE-NAME.onrender.com/health
```

You should see:
```json
{
  "status": "ok",
  "message": "K3C Smart Giving Platform API is running",
  "timestamp": "...",
  "environment": "production"
}
```

## Part 2: Deploy Frontend to Vercel

### Step 1: Sign Up for Vercel

1. Go to https://vercel.com
2. Sign up with GitHub

### Step 2: Deploy Frontend

1. **Import Project**:
   - Click "Add New..." → "Project"
   - Import your GitHub repository

2. **Configure Project**:
   - **Framework Preset**: Next.js (auto-detected)
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build` (auto-filled)
   - **Output Directory**: `.next` (auto-filled)

3. **Add Environment Variables**:
   ```
   NEXT_PUBLIC_API_URL=https://YOUR-BACKEND-NAME.onrender.com/api
   NEXT_PUBLIC_SOCKET_URL=https://YOUR-BACKEND-NAME.onrender.com
   ```

   **Replace** `YOUR-BACKEND-NAME` with your actual Render service name from Part 1.

4. **Deploy**:
   - Click "Deploy"
   - Wait for deployment (2-3 minutes)
   - Your app will be live at: `https://YOUR-APP-NAME.vercel.app`

### Step 3: Update Backend CORS

Now that you have your Vercel URL, update your backend:

1. Go to Render Dashboard → Your Backend Service
2. Go to "Environment" tab
3. Update `FRONTEND_URL` to your Vercel URL:
   ```
   FRONTEND_URL=https://YOUR-APP-NAME.vercel.app
   ```
4. Click "Save Changes" (this will redeploy your backend)

## Part 3: Verify Everything Works

### Test the Full Flow:

1. **Visit your frontend**: `https://YOUR-APP-NAME.vercel.app`
2. **Try registering a new user**
3. **Try viewing campaigns**
4. **Check real-time updates** (Socket.io should work)

### Troubleshooting:

If something doesn't work:

1. **Check backend logs**:
   - Go to Render Dashboard → Your Service → Logs

2. **Check frontend logs**:
   - Go to Vercel Dashboard → Your Project → Deployments → Latest → View Function Logs

3. **Common issues**:
   - **CORS errors**: Make sure FRONTEND_URL in Render matches your Vercel URL
   - **API not connecting**: Check NEXT_PUBLIC_API_URL in Vercel env vars
   - **Socket.io not working**: Make sure NEXT_PUBLIC_SOCKET_URL is set correctly
   - **Backend sleeping**: Render free tier sleeps after 15 min inactivity (first request will be slow)

## Important Notes

### Render Free Tier Limitations:
- Service sleeps after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- 750 hours per month (enough for one service running 24/7)

### Vercel Free Tier Limitations:
- 100 GB bandwidth per month
- Unlimited deployments
- Perfect for this project

### Keep Backend Awake (Optional):
To prevent backend from sleeping, you can use a service like:
- **Cron-job.org**: Schedule a ping to your `/health` endpoint every 10 minutes
- **UptimeRobot**: Free monitoring service that pings your backend

## Environment Variables Summary

### Backend (Render):
```
NODE_ENV=production
PORT=10000
BACKEND_URL=https://YOUR-BACKEND.onrender.com
MONGODB_URI=your-mongodb-atlas-connection-string
JWT_SECRET=min-32-characters-secret
JWT_EXPIRES_IN=7d
MPESA_CONSUMER_KEY=your-key
MPESA_CONSUMER_SECRET=your-secret
MPESA_SHORTCODE=your-shortcode
MPESA_PASSKEY=your-passkey
MPESA_ENVIRONMENT=sandbox
PAYSTACK_PUBLIC_KEY=your-key
PAYSTACK_SECRET_KEY=your-secret
CLOUDINARY_CLOUD_NAME=your-name
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret
FRONTEND_URL=https://YOUR-APP.vercel.app
```

### Frontend (Vercel):
```
NEXT_PUBLIC_API_URL=https://YOUR-BACKEND.onrender.com/api
NEXT_PUBLIC_SOCKET_URL=https://YOUR-BACKEND.onrender.com
```

## Continuous Deployment

Both Vercel and Render support automatic deployments:

- **Push to GitHub** → Automatic deployment to both services
- **Main branch** → Production deployment
- **Other branches** → Preview deployments (Vercel only)

## Custom Domain (Optional)

### Vercel (Frontend):
1. Go to Project Settings → Domains
2. Add your custom domain
3. Update DNS records as instructed

### Render (Backend):
1. Go to Service Settings → Custom Domain
2. Add your custom domain
3. Update DNS records as instructed

## Next Steps

1. Test your application thoroughly
2. Monitor logs for any errors
3. Set up monitoring with UptimeRobot (optional)
4. Configure custom domains (optional)
5. Update payment gateway credentials from sandbox to production when ready

## Support

If you encounter issues:
- Check Render logs
- Check Vercel deployment logs
- Verify environment variables are correct
- Test backend health endpoint
- Check browser console for frontend errors

Your K3C Platform is now live! 🚀
