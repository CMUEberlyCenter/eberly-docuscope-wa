type GTagData = {
  /** Identifier for the application. */
  app_name: string;
  /** Identifier for the screen, such as a specific page or component name. */
  screen_name: string;
  /** Identifier for the origin of the event, such as a feature or module name. */
  screen_class: string;
  /** Writing task identifier. */
  task_id: string;
  /** Optional name of the expectation being viewed, if applicable. */
  expectation?: string;
  /** Optional hash of the file content, used for tracking unique documents without storing the content. */
  file_hash?: string;
};
const DEFAULT_TAG_DATA: GTagData = {
  app_name: 'myProse',
  screen_name: 'null',
  screen_class: 'null',
  task_id: 'NO_TASK',
};

/**
 * Tracks a screen view event with Google Analytics.
 */
export const trackScreenView = (data: Partial<GTagData>) => {
  const tagdata: GTagData = { ...DEFAULT_TAG_DATA, ...data };
  tagdata.task_id ??= DEFAULT_TAG_DATA.task_id;
  if (window.gtag) {
    window.gtag('event', 'screen_view', tagdata);
  } else {
    console.warn(
      `gtag not available, cannot track screen view: ${JSON.stringify(tagdata)}`
    );
  }
};
