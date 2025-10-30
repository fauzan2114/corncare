# Frontend - React + Vite + TypeScript Application

This is the frontend application for CornCare - an AI-powered corn plant disease detection system.

## Features

- Upload corn leaf images for disease detection
- Get instant predictions with confidence scores
- View treatment recommendations and prevention tips
- Bilingual support (English/Hindi)
- Mobile-responsive design
- Accessibility features

## Tech Stack

- React 18
- TypeScript
- Vite
- Tailwind CSS
- React Router
- React-i18next
- Axios

## Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment variables:
   ```bash
   cp .env.example .env
   ```
4. Start development server:
   ```bash
   npm run dev
   ```

## Development

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Project Structure

```
src/
├── components/     # Reusable UI components
├── i18n/          # Translations
│   └── locales/   # Language files
├── lib/           # API and utilities
├── pages/         # Route components
├── routes/        # Route definitions
└── styles/        # Global styles
```

## Environment Variables

- `VITE_API_BASE` - Backend API URL

## Deployment

1. Build the project:
   ```bash
   npm run build
   ```
2. Deploy the `dist` folder to your hosting service

### Deployment Platforms

- Vercel
  - Connect GitHub repository
  - Set environment variables
  - Auto-deploys on push

- Netlify
  - Connect GitHub repository
  - Set build command: `npm run build`
  - Set publish directory: `dist`
  - Set environment variables

## License

MIT
