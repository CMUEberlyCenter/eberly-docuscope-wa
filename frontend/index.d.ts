import { i18n, TFunction } from "i18next";

declare global {
  namespace Vike {
    interface PageData {
      i18n: i18n;
      t: TFunction;
    }
  }
}
