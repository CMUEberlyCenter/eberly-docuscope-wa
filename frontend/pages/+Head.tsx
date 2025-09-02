// https://vike.dev/Head

import type { FC } from "react";
import logoUrl from "../src/app/assets/logo.svg";
import { usePageContext } from "vike-react/usePageContext";

const HeadDefault: FC = () => {
  const pageContext = usePageContext();
  const analytics = pageContext.google?.analytics;
  return (
    <>
      <meta name="robots" content="none" />

      <link rel="icon" href={logoUrl} />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@300;400&display=swap"
        rel="stylesheet"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,200..900;1,8..60,200..900&display=swap"
        rel="stylesheet"
      />
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons"
      />
      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${analytics}`}
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${analytics}');`,
        }}
      ></script>
    </>
  );
};
export default HeadDefault;
