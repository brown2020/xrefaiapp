declare global {
  interface Window {
    SpeechRecognition: typeof window.SpeechRecognition;
    webkitSpeechRecognition: typeof window.SpeechRecognition;
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }

  // Extend the Navigator interface
  interface Navigator {
    standalone?: boolean;
  }

  // Use the global type for SpeechRecognition
  type SpeechRecognition = typeof window.SpeechRecognition;
}

export {};

// SVG module declarations — Next.js processes SVGs through its image pipeline
// which exposes a StaticImageData-compatible object (src, height, width).
declare module '*.svg' {
  import type { StaticImageData } from 'next/image';
  const content: StaticImageData;
  export default content;
}
