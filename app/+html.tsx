import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no"
        />
        <meta name="apple-itunes-app" content="app-id=6749312723" />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Service worker registration */}
        <script dangerouslySetInnerHTML={{ __html: sw }} />

        {/* On hard refresh, always start from index (/) to let app route appropriately */}
        <script dangerouslySetInnerHTML={{ __html: forceIndexOnReload }} />
        <style>{`
          html, body, #root { height: 100%; }
          body { overflow: auto; }
        `}</style>

        <style type="text/css">{`
              @font-face {
                font-family: 'MaterialDesignIcons';
                src: url(${require("@react-native-vector-icons/material-design-icons/fonts/MaterialDesignIcons.ttf")}) format('truetype');
              }
            `}</style>

        <ScrollViewStyleReset />
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

const forceIndexOnReload = `
(function(){
  try {
    var navEntries = (performance && performance.getEntriesByType) ? performance.getEntriesByType('navigation') : [];
    var nav = navEntries && navEntries[0];
    var isReload = nav ? nav.type === 'reload' : (performance && performance.navigation && performance.navigation.type === 1);
    if (isReload && window.location && window.location.pathname !== '/') {
      try { sessionStorage.setItem('originalPath', window.location.pathname + window.location.search + window.location.hash); } catch(e) {}
      window.history.replaceState(null, '', '/');
    }
  } catch (e) {}
})();
`;
