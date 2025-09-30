import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: sw }} />

        {/* <ScrollViewStyleReset /> */}
      </head>
      <body>{children}</body>
    </html>
  );
}

const sw = `
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
`;

