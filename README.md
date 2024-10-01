# Xref.ai: A Next.js 14 AI-Powered Application for Text, Image, and Product Design

Welcome to **Xref.ai**, a cutting-edge application built using **Next.js 14** with **TypeScript**, **Tailwind CSS**, and **Firebase**. Xref.ai leverages powerful **AI capabilities** to provide features like text summarization, image generation, product design, and even scraping web content for creating summaries.

## Table of Contents

- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Features](#features)
  - [Text Summarization with Web Scraping](#text-summarization-with-web-scraping)
  - [Image Generation](#image-generation)
  - [Designer Prompt](#designer-prompt)
  - [Chat Interface](#chat-interface)
- [API Routes](#api-routes)
  - [Web Scraping Proxy API](#web-scraping-proxy-api)
- [Server Actions](#server-actions)
  - [What are Server Actions in Next.js 14?](#what-are-server-actions-in-nextjs-14)
  - [generateImage](#generateimage)
  - [generateResponse](#generateresponse)
  - [generateResponseWithMemory](#generateresponsewithmemory)
  - [Stripe Payment Actions](#stripe-payment-actions)
- [License](#license)

## Key Features

1. **Text Summarization**: Summarize topics or scrape websites for content to summarize.
2. **Text Simplification**: Simplify complex paragraphs into more straightforward text.
3. **Freestyle Prompt**: Provide a custom prompt for creative, freeform AI responses.
4. **Image Generation**: Create AI-generated images based on user prompts.
5. **Product Design**: Combine various design elements (e.g., colors, painters, ice creams) to generate unique visual prompts.
6. **Website Scraping for Summarization**: Enter a URL to scrape its content for summarization, providing focused summaries of web content.
7. **Real-time Chat**: A chatbot interface that streams AI responses with memory of previous conversations.
8. **Payment Integration**: Payments handled through **Stripe** for premium services.

## Technology Stack

- **Next.js 14**: The primary framework for server-side rendering, client-side routing, and API routes.
- **TypeScript**: For strong typing and better maintainability.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Firebase**: Used for authentication, Firestore for database storage, and Cloud Storage for images.
- **Stripe**: To handle payments and subscriptions.
- **React Select**: Used for interactive dropdowns in the designer tool.
- **AI SDKs**: Integration with OpenAI and Fireworks API for generating text and images.

## Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/brown2020/xrefaiapp.git
   ```

2. Navigate into the project directory:

   ```bash
   cd xrefaiapp
   ```

3. Install the dependencies:

   ```bash
   npm install
   ```

4. Set up environment variables:

   Create a `.env` file by copying the `.env.example`:

   ```bash
   cp .env.example .env
   ```

5. Fill in the required fields in the `.env` file with your Firebase, OpenAI, Stripe, and other keys.

6. Start the development server:

   ```bash
   npm run dev
   ```

## Environment Variables

Ensure the following environment variables are set correctly in your `.env` file:

```plaintext
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_APIKEY=your_api_key
NEXT_PUBLIC_FIREBASE_AUTHDOMAIN=your_auth_domain
NEXT_PUBLIC_FIREBASE_PROJECTID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGEBUCKET=your_storage_bucket
NEXT_PUBLIC_FIREBASE_MESSAGINGSENDERID=your_messaging_sender_id
NEXT_PUBLIC_FIREBASE_APPID=your_app_id
NEXT_PUBLIC_FIREBASE_MEASUREMENTID=your_measurement_id

# OpenAI API Key
OPENAI_API_KEY=your_openai_api_key
OPENAI_ORG_ID=your_openai_org_id

# Fireworks API Key for Image Generation
FIREWORKS_API_KEY=your_fireworks_api_key

# Stripe Keys for Payment Processing
NEXT_PUBLIC_STRIPE_KEY=your_stripe_key
STRIPE_SECRET_KEY=your_stripe_secret_key
NEXT_PUBLIC_STRIPE_PRODUCT_NAME=your_stripe_product_name
```

## Features

### Text Summarization with Web Scraping

Xref.ai allows users to summarize topics or even scrape web content to generate accurate summaries. This is done using the **SummarizeTopic** tool, which can:

- Accept a user-provided topic or URL.
- Scrape the provided URL for text content.
- Generate a summary using OpenAI's text generation model.

#### Example Usage:

1. Enter a topic or a website URL.
2. The tool scrapes the website’s content using the `/proxy` API route and then summarizes it.
3. The summary can be copied to the clipboard or saved to Firebase for future reference.

### Image Generation

The **ImagePrompt** tool lets users generate images based on text prompts using the Fireworks API. The images are stored securely in Firebase Storage and can be retrieved with a signed URL.

#### Example Usage:

1. Enter a description, such as "A futuristic city at sunset."
2. The app generates the image, saves it, and displays it to the user.

### Designer Prompt

The **DesignerPrompt** tool allows users to mix various creative elements (colors, painters, ice creams, etc.) to generate a visual prompt that the AI will turn into an image.

#### Example Usage:

1. Select design elements (such as "blue" as a color and "Vincent van Gogh" as an artist).
2. Enter a freestyle prompt to further guide the AI’s design.
3. The generated design is displayed and saved for future use.

### Chat Interface

The **Chat** component allows users to interact with an AI chatbot, which maintains memory of past conversations to generate contextually relevant responses. The chat history is stored in Firebase, and users can load previous messages.

#### Example Usage:

1. Enter a question or a conversation prompt.
2. The AI responds based on the context of the current and past conversations.

## API Routes

### Web Scraping Proxy API

The `/proxy` API route is responsible for scraping web content. It fetches the content from a given URL and sends it back to the client. The scraped content is used to generate summaries or provide additional context for the AI model.

#### `/api/proxy`

- **Method**: `GET`
- **Query Parameter**: `url` (The website URL to scrape)
- **Response**: Raw HTML content from the specified website.

Example:

```bash
GET /api/proxy?url=https://example.com
```

```ts
import { NextRequest, NextResponse } from "next/server";
import axios from "axios";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return NextResponse.json(
      { error: "URL parameter is required." },
      { status: 400 }
    );
  }

  try {
    const response = await axios.get(url);
    return new NextResponse(response.data, { status: 200 });
  } catch (error) {
    console.error("Error fetching the URL:", error);
    return NextResponse.json(
      { error: "Failed to fetch the content." },
      { status: 500 }
    );
  }
}
```

## Server Actions

### What are Server Actions in Next.js 14?

Server Actions in **Next.js 14** allow you to run asynchronous tasks directly on the server. These actions can be used in components and invoked from both the client and server, streamlining the process of interacting with the server-side logic. This removes the need to define separate API routes for every server-side interaction, making the application more efficient and simplifying the overall architecture.

#### Key Benefits:

- **Secure**: Server actions are executed entirely on the server, keeping sensitive data safe from client exposure.
- **Efficient**: No need for extra API routes or boilerplate; actions are invoked directly from the client-side components.
- **Integrated**: They work seamlessly with Next.js’s App Router, integrating server-side logic into your components.

---

### `generateImage`

The `generateImage` server action generates an image using the Fireworks API and saves it to Firebase. The action returns a signed URL to access the image.

- **Input**: User prompt for the image.
- **Output**: Generated image saved to Firebase and URL returned.

### `generateResponse`

This server action sends user prompts to OpenAI's GPT model for generating responses (e.g., summaries, simplified text). The response is streamed back to the client in real-time.

- **Input**: User's input and system prompt.
- **Output**: Text response from OpenAI.

### `generateResponseWithMemory`

This action works similarly to `generateResponse` but includes the chat history. It sends previous conversation entries to the AI model to maintain context.

- **Input**: A list of user prompts and AI responses (chat history).
- **Output**: AI response based on the current context and past interactions.

### Stripe Payment Actions

- **`createPaymentIntent`**: Handles the creation of payment intents via Stripe for purchases or subscriptions.
- **`validatePaymentIntent`**: Validates the payment intent by checking the status and processing the outcome.

## License

This

project is licensed under the **MIT License**.

---

For more information, please visit the project repository at [xrefaiapp on GitHub](https://github.com/brown2020/xrefaiapp) or contact us at [info@ignitechannel.com](mailto:info@ignitechannel.com).
