# Xref.ai

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![Firebase](https://img.shields.io/badge/Firebase-12-FFCA28?logo=firebase)](https://firebase.google.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

An AI-powered content generation platform built with **Next.js 16**, **React 19**, and **Firebase**. Xref.ai helps you create original content for blog posts, essays, marketing copy, product descriptions, and more using advanced AI capabilities.

## 🚀 Features

- **💬 AI Chat** — Real-time conversational AI with streaming responses and conversation memory
- **📝 Text Summarization** — Summarize any topic or scrape websites for content summarization
- **✨ Freestyle Writing** — Generate creative content from custom prompts
- **📖 Text Simplification** — Simplify complex text to different reading levels (1st Grade to PhD)
- **🎨 Image Generation** — Create AI-generated images from text descriptions
- **🎯 Designer Tool** — Mix creative elements (colors, artists, styles) to generate unique visual designs
- **📜 History** — View and manage all your past generations
- **💳 Payments** — Stripe integration for premium features and credits

## 📋 Table of Contents

- [Tech Stack](#-tech-stack)
- [Prerequisites](#-prerequisites)
- [Installation](#-installation)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Features Deep Dive](#-features-deep-dive)
- [Architecture](#-architecture)
- [API Reference](#-api-reference)
- [Contributing](#-contributing)
- [License](#-license)

## 🛠 Tech Stack

### Core Framework

| Package                                       | Version | Purpose                                       |
| --------------------------------------------- | ------- | --------------------------------------------- |
| [Next.js](https://nextjs.org/)                | 16.x    | React framework with App Router and Turbopack |
| [React](https://react.dev/)                   | 19.x    | UI library with latest features               |
| [TypeScript](https://www.typescriptlang.org/) | 5.x     | Type safety and developer experience          |

### AI & Machine Learning

| Package                                                        | Version | Purpose                                      |
| -------------------------------------------------------------- | ------- | -------------------------------------------- |
| [Vercel AI SDK](https://sdk.vercel.ai/)                        | 6.x     | Streaming AI responses and model integration |
| [@ai-sdk/react](https://ai-sdk.dev/docs/ai-sdk-ui)             | 3.x     | UI hooks for streaming chat                  |
| [@ai-sdk/openai](https://sdk.vercel.ai/providers/openai)       | 3.x     | OpenAI provider for text generation          |
| [@ai-sdk/anthropic](https://sdk.vercel.ai/providers/anthropic) | 3.x     | Anthropic provider                           |
| [@ai-sdk/xai](https://sdk.vercel.ai/providers/xai)             | 3.x     | xAI provider                                 |
| [@ai-sdk/google](https://sdk.vercel.ai/providers/google)       | 3.x     | Google provider                              |
| [@ai-sdk/rsc](https://sdk.vercel.ai/docs/ai-sdk-rsc)           | 2.x     | Server Actions streaming                     |

### Backend & Database

| Package                                                        | Version | Purpose                                           |
| -------------------------------------------------------------- | ------- | ------------------------------------------------- |
| [Firebase](https://firebase.google.com/)                       | 12.x    | Authentication, Firestore database, Cloud Storage |
| [Firebase Admin](https://firebase.google.com/docs/admin/setup) | 13.x    | Server-side Firebase operations                   |
| [Stripe](https://stripe.com/)                                  | 20.x    | Payment processing                                |

### UI & Styling

| Package                                                      | Version | Purpose                             |
| ------------------------------------------------------------ | ------- | ----------------------------------- |
| [Tailwind CSS](https://tailwindcss.com/)                     | 4.x     | Utility-first CSS framework         |
| [Lucide React](https://lucide.dev/)                          | 0.562.x | Beautiful icon library              |
| [React Select](https://react-select.com/)                    | 5.x     | Advanced select/dropdown components |
| [React Markdown](https://github.com/remarkjs/react-markdown) | 10.x    | Render markdown content             |
| [React Hot Toast](https://react-hot-toast.com/)              | 2.x     | Toast notifications                 |

### State Management & Utilities

| Package                                  | Version | Purpose                       |
| ---------------------------------------- | ------- | ----------------------------- |
| [Zustand](https://zustand-demo.pmnd.rs/) | 5.x     | Lightweight state management  |
| [Axios](https://axios-http.com/)         | 1.x     | HTTP client for API requests  |
| [Cheerio](https://cheerio.js.org/)       | 1.x     | HTML parsing for web scraping |
| [Lodash](https://lodash.com/)            | 4.x     | Utility functions             |

### Additional Libraries

| Package                 | Purpose                           |
| ----------------------- | --------------------------------- |
| react-scroll-to-bottom  | Auto-scrolling chat container     |
| react-textarea-autosize | Auto-expanding textareas          |
| react-simple-typewriter | Typewriter effect animations      |
| react-cookie-consent    | GDPR cookie consent banner        |
| react-firebase-hooks    | Firebase React hooks              |
| remark-gfm              | GitHub Flavored Markdown support  |
| sharp                   | Image processing and optimization |
| cookies-next            | Cookie management for Next.js     |

## 📦 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18.x or higher
- **npm** 9.x or higher (or yarn/pnpm)
- A **Firebase** project with:
  - Authentication enabled (Email/Password and/or Google)
  - Firestore Database
  - Cloud Storage
- An **OpenAI** API key (optional if you use credits only)
- A **Fireworks AI** API key (for image generation)
- A **Stripe** account (for payments)
  - Optional: Anthropic, xAI, or Google API keys for alternate models

## 🔧 Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/brown2020/xrefaiapp.git
   cd xrefaiapp
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   Fill in your credentials (see [Environment Variables](#-environment-variables))

4. **Run the development server**

   ```bash
   npm run dev
   ```

5. **Open in browser**

   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔐 Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Firebase Client Configuration
NEXT_PUBLIC_FIREBASE_APIKEY=your_firebase_api_key
NEXT_PUBLIC_FIREBASE_AUTHDOMAIN=your_project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECTID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGEBUCKET=your_project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID=your_sender_id
NEXT_PUBLIC_FIREBASE_APPID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENTID=G-XXXXXXXXXX

# Firebase Admin (Server-side)
FIREBASE_TYPE=service_account
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY_ID=your_private_key_id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your_project.iam.gserviceaccount.com
FIREBASE_CLIENT_ID=your_client_id
FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
FIREBASE_CLIENT_CERTS_URL=https://www.googleapis.com/robot/v1/metadata/x509/...

# AI Providers (used when credits are enabled)
OPENAI_API_KEY=sk-...
ANTHROPIC_API_KEY=...
XAI_API_KEY=...
GOOGLE_API_KEY=...

# Fireworks AI (Image Generation)
FIREWORKS_API_KEY=your_fireworks_api_key

# Stripe
NEXT_PUBLIC_STRIPE_KEY=pk_...
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_STRIPE_PRODUCT_NAME=Xref.ai Credits
APP_URL=https://your-production-domain.com

# Optional
NEXT_PUBLIC_COOKIE_NAME=xrefAuthToken

# Optional (native IAP WebView)
IAP_WEBVIEW_SECRET=your_shared_hmac_secret
```

### Getting API Keys

| Service      | Where to Get                                                                |
| ------------ | --------------------------------------------------------------------------- |
| Firebase     | [Firebase Console](https://console.firebase.google.com/) → Project Settings |
| OpenAI       | [OpenAI Platform](https://platform.openai.com/api-keys)                     |
| Fireworks AI | [Fireworks Console](https://fireworks.ai/)                                  |
| Stripe       | [Stripe Dashboard](https://dashboard.stripe.com/apikeys)                    |

## 📁 Project Structure

```
xrefaiapp/
├── public/                 # Static assets
│   └── .well-known/        # App associations (iOS/Android deep links)
├── src/
│   ├── actions/            # Server Actions
│   │   ├── generateAIResponse.ts    # Unified AI text generation
│   │   ├── generateImage.ts         # AI image generation
│   │   ├── confirmIapPurchase.ts    # Native IAP fulfillment
│   │   ├── paymentActions.ts        # Stripe payment handling
│   │   └── suggestTags.ts           # AI tag suggestions
│   │
│   ├── app/                # Next.js App Router pages
│   │   ├── api/proxy/      # Web scraping proxy endpoint
│   │   ├── api/chat/       # AI chat streaming endpoint
│   │   ├── chat/           # AI chat interface
│   │   ├── tools/          # AI writing tools
│   │   ├── history/        # Generation history
│   │   ├── account/        # User account management
│   │   └── ...             # Other pages
│   │
│   ├── components/         # React components
│   │   ├── ui/             # Reusable UI components
│   │   ├── icons/          # SVG icon components
│   │   ├── DesignerPrompt/ # Designer tool components
│   │   └── ...             # Feature components
│   │
│   ├── hooks/              # Custom React hooks
│   │   ├── useChatMessages.ts     # Chat history management
│   │   ├── useHistorySaver.ts     # Save to Firestore
│   │   └── ...
│   │
│   ├── firebase/           # Firebase configuration
│   │   ├── firebaseClient.ts      # Client-side SDK
│   │   └── firebaseAdmin.ts       # Admin SDK (server)
│   │
│   ├── zustand/            # State management stores
│   │   ├── useAuthStore.ts        # Authentication state
│   │   ├── useProfileStore.ts     # User profile state
│   │   └── usePaymentsStore.ts    # Payment/credits state
│   │
│   ├── data/               # Static data (painters, colors, etc.)
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
│
├── .env.example            # Environment variables template
├── next.config.mjs         # Next.js configuration
├── tailwind.config.ts      # Tailwind CSS configuration
└── tsconfig.json           # TypeScript configuration
```

## 🎯 Features Deep Dive

### AI Chat (`/chat`)

A full-featured chat interface with:

- **Streaming responses** — UI streaming via AI SDK `useChat` and `/api/chat`
- **Conversation memory** — AI remembers context from previous messages
- **Persistent history** — Conversations saved to Firestore
- **Load more** — Pagination for older messages

### Tools (`/tools`)

Six AI-powered writing tools:

| Tool                  | Description                                         |
| --------------------- | --------------------------------------------------- |
| **Summarize Website** | Enter a URL to scrape and summarize web content     |
| **Summarize Text**    | Paste text to get a concise summary                 |
| **Freestyle Writing** | Generate creative content from any prompt           |
| **Simplify Writing**  | Convert complex text to simpler reading levels      |
| **Generate Image**    | Create AI images from text descriptions             |
| **Designer Tool**     | Combine creative elements for unique visual designs |

### History (`/history`)

- View all past generations (text and images)
- Search through history
- Copy or download previous outputs
- Expandable conversation view

### Account Management (`/account`)

- View profile information
- Manage credits and payments
- Delete account option

## 🏗 Architecture

### Server Actions & API Routes

Xref.ai uses Server Actions for tools and API routes for chat streaming with AI SDK UI:

```typescript
// Example: /api/chat route (AI SDK UI)
import { streamText } from "ai";
import { openai } from "@ai-sdk/openai";

export async function POST(req: Request) {
  const { messages } = await req.json();
  const result = streamText({
    model: openai("gpt-5.4"),
    messages,
  });

  return result.toUIMessageStreamResponse();
}
```

### State Management (Zustand)

Lightweight, modular stores:

- **useAuthStore** — User authentication state
- **useProfileStore** — User profile and preferences
- **usePaymentsStore** — Credits and payment status

### Firestore Data Model

```
users/
  └── {uid}/
      ├── profile          # User profile document
      ├── summaries/       # Text generation history
      │   └── {docId}
      └── chats/           # Chat conversation history
          └── {docId}
```

## 📡 API Reference

### Web Scraping Proxy

```http
GET /api/proxy?url={encoded_url}
```

Fetches and returns HTML content from the specified URL for summarization.

**Parameters:**

- `url` (required): URL-encoded website address

**Response:** Raw HTML content

### API Routes

| Endpoint                     | Purpose                         | Input                          |
| ---------------------------- | ------------------------------- | ------------------------------ |
| `POST /api/chat`             | Streaming chat responses        | `messages`, `history`, `model` |
| `POST /api/billing/checkout` | Start Stripe checkout session   | `packId`, `redirectPath`       |
| `POST /api/billing/confirm`  | Confirm Stripe checkout session | `sessionId`                    |
| `GET /api/proxy`             | Web scraping proxy              | `url`                          |

### Server Actions

| Action                       | Purpose                            | Input                           |
| ---------------------------- | ---------------------------------- | ------------------------------- |
| `generateResponse`           | Generate text from prompt          | `systemPrompt`, `userPrompt`    |
| `generateResponseWithMemory` | Generate with conversation context | `systemPrompt`, `chatHistory[]` |
| `generateImage`              | Create AI image                    | `prompt`                        |
| `suggestTags`                | Get tag suggestions                | `freestyle`, `tags[]`           |
| `createPaymentIntent`        | Start Stripe payment               | `amount`                        |
| `validatePaymentIntent`      | Verify payment                     | `paymentIntentId`               |

## 🤝 Contributing

We welcome contributions! Here's how to get started:

1. **Fork the repository**

2. **Create a feature branch**

   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add TypeScript types for new code
   - Test your changes locally

4. **Commit your changes**

   ```bash
   git commit -m "Add amazing feature"
   ```

5. **Push to your fork**

   ```bash
   git push origin feature/amazing-feature
   ```

6. **Open a Pull Request**

### Development Guidelines

- Use **TypeScript** for all new code
- Follow **functional components** with hooks
- Use **Tailwind CSS** for styling
- Use **Server Actions** for tool generation and **API routes** for chat streaming
- Use **Zustand** for global state management
- Keep components **modular and reusable**

### Available Scripts

```bash
npm run dev      # Start development server (Turbopack)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

## 📞 Support

- **GitHub Issues**: [Report a bug](https://github.com/brown2020/xrefaiapp/issues)
- **Email**: [info@ignitechannel.com](mailto:info@ignitechannel.com)
- **Website**: [xref.ai](https://xref.ai)

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/brown2020">brown2020</a>
</p>
