// https://vike.dev/Head

import { FC } from "react";
import logoUrl from "../src/app/assets/logo.svg";

const HeadDefault: FC = () => {
  return (
    <>
      <link rel="icon" href={logoUrl} />

      <script
        async
        src={`https://www.googletagmanager.com/gtag/js?id=${import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS}`}
      ></script>
      <script
        dangerouslySetInnerHTML={{
          __html: `window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());

          gtag('config', '${import.meta.env.PUBLIC_ENV__GOOGLE_ANALYTICS}');`,
        }}
      ></script>
    </>
  );
}
export default HeadDefault;
