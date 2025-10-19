# CertifyChain Frontend

A modern Web3 certificate verification platform built with React, TypeScript, and TailwindCSS.

## Features

- 🎨 **Modern UI/UX**: Futuristic design with dark/light theme support
- 📱 **Responsive Design**: Works seamlessly on desktop and mobile devices
- 🔗 **Web3 Integration Ready**: Prepared for blockchain functionality
- 🎯 **Three Main Pages**:
  - Landing Page with hero section and features
  - Mint Certificate Page with step-by-step process
  - All Certificates Page with search and filtering

## Tech Stack

- **React 19** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **React Router** for navigation
- **Lucide React** for icons
- **Context API** for theme management

## Getting Started
1. If you want to use your own smart contract, change it in `src/constants.ts`

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Card.tsx
│   ├── Navigation.tsx
│   └── StepIndicator.tsx
├── contexts/           # React contexts
│   └── ThemeContext.tsx
├── pages/              # Main application pages
│   ├── LandingPage.tsx
│   ├── MintCertificatePage.tsx
│   └── AllCertificatesPage.tsx
├── utils/              # Utility functions
│   └── cn.ts
├── App.tsx             # Main app component
├── main.tsx            # Application entry point
└── index.css           # Global styles with TailwindCSS
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## Design System

The application uses a consistent design system with:

- **Colors**: Purple and teal gradients for primary actions
- **Typography**: Clean, modern sans-serif fonts
- **Components**: Reusable, accessible UI components
- **Themes**: Dark mode by default with light mode support
- **Animations**: Smooth transitions and hover effects