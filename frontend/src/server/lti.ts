import {
  BadRequestError,
  ForbiddenError,
  UnprocessableContentError,
} from '#lib/ProblemDetails.js';
import { DbWritingTask, isWritingTask } from '#lib/WritingTask.js';
import { validateWritingTask } from '#lib/schemaValidate.js';
// import cors from 'cors';
import { NextFunction, Request, Response, urlencoded } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { ContentItem, IdToken, PlatformConfig, Provider } from 'ltijs';
import { join } from 'path';
import { logger } from './logger';
import {
  LTI_DB,
  LTI_HOSTNAME,
  LTI_KEY,
  LTI_OPTIONS,
  PLATFORMS_PATH,
  PRODUCT,
} from './settings';

// Hack to ensure that LTI is only initialized once in hot reload environments.
const LTI_SETUP_KEY = Symbol.for('myprose.lti.setup_complete');
const globalRef = globalThis as typeof globalThis & {
  [LTI_SETUP_KEY]?: boolean;
};

export async function ensureLTIInitialized() {
  if (
    process.env.NODE_ENV === 'production' ||
    !(LTI_SETUP_KEY in globalRef && globalRef[LTI_SETUP_KEY])
  ) {
    globalRef[LTI_SETUP_KEY] = true;
    initializeLTI();
    await Provider.deploy({ serverless: true });
    await registerPlatforms();
  }
  return Provider.app;
}

function initializeLTI() {
  // Initialize LTI provider and middleware
  Provider.setup(LTI_KEY, LTI_DB, LTI_OPTIONS);

  Provider.onConnect(async (token: IdToken, req: Request, res: Response) => {
    if (token) {
      // if LTI token is present
      if (token.platformContext.custom?.tool) {
        // if tool is specified in deep linking settings, redirect accordingly
        return Provider.redirect(res, `/${token.platformContext.custom.tool}`);
      }
      // default to non-specified writing type drafting tool.
      return Provider.redirect(res, '/draft');
    }
    if (req.query.writing_task) {
      return Provider.redirect(res, `/myprose/${req.query.writing_task}/`);
    }
    Provider.redirect(res, '/draft');
    // Provider.redirect(res, '/index'); //'/index.html');
  });
  // Could be used to provide a custom response for invalid tokens
  // Provider.onInvalidToken(async (req: Request, res: Response) => {
  //   console.log('InvalidToken');
  //   return res.sendFile(join(PUBLIC, 'index.html'));
  // })
  Provider.onDeepLinking(
    async (_token: IdToken, _req: Request, res: Response) =>
      // Provider.redirect(res, '/deeplink', { newResource: true })
      Provider.redirect(res, '/deeplink')
  );
  Provider.app.post(
    '/deeplink',
    urlencoded({ extended: true }),
    // TODO validate(checkSchema({})),
    async (request: Request, response: Response, next: NextFunction) => {
      try {
        const task = request.body.file
          ? (JSON.parse(request.body.file) as DbWritingTask)
          : null;
        const tool = ['draft', 'review'].includes(request.body.tool)
          ? request.body.tool
          : 'draft';
        const url = new URL(tool, LTI_HOSTNAME);
        const custom: {
          tool: string;
          writing_task_id?: string;
          writing_task?: string;
        } = { tool };
        if (task) {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { _id, ...writing_task } = task;
          const valid = validateWritingTask(writing_task);
          if (!valid) {
            throw new UnprocessableContentError(
              validateWritingTask.errors ?? ['Unknown validation error.'],
              'Invalid JSON'
            );
          }
          if (!isWritingTask(writing_task)) {
            throw new UnprocessableContentError(
              ['Failed type checking!'],
              'Invalid JSON'
            );
          }
          custom.writing_task = JSON.stringify(writing_task);
        }
        const { t } = request.i18n;
        const items: ContentItem[] = [
          {
            type: 'ltiResourceLink',
            // title: writing_task.info.name ?? response.locals.token.platformContext.deepLinkingSettings.title,
            // text: writing_task.rules.overview ?? response.locals.token.platformContext.deepLinkingSettings.text,
            title:
              response.locals.token.platformContext.deepLinkingSettings.title, // #236
            text: t('deeplinking.description', {
              context: task ? 'task' : undefined,
              interpolation: { skipOnVariables: false },
              tool: `$t(deeplinking.option.${tool})`,
              task,
            }),
            url: url.toString(),
            icon: {
              url: new URL('logo.svg', LTI_HOSTNAME).toString(),
              width: 500,
              height: 160,
            },
            custom,
          },
        ];
        const form = await Provider.DeepLinking.createDeepLinkingForm(
          response.locals.token,
          items
        );
        // { message: 'Success' });
        response.send(form);
      } catch (err) {
        next(err);
      }
    }
  );

  // Handle LTI dynamic registration requests
  Provider.onDynamicRegistration(
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        if (!req.query.openid_configuration) {
          throw new BadRequestError(
            'Missing parameter: "openid_configuration".'
          );
        }
        const message = await Provider.DynamicRegistration.register(
          req.query.openid_configuration,
          req.query.registration_token,
          // this custom object overwrites the default lti-tool-configuration messages
          {
            // Ref: https://www.imsglobal.org/spec/lti-dr/v1p0#lti-configuration-0
            'https://purl.imsglobal.org/spec/lti-tool-configuration': {
              messages: [
                // Messages used to configure the tool in the LMS.  LMS should select the most appropriate one based on type and placement.
                // Ref: https://developerdocs.instructure.com/services/canvas/external-tools/lti/file.registration#lti-message-schema
                {
                  // Required base message type for LTI 1.3 resource link launches.
                  type: 'LtiResourceLinkRequest',
                  preferred_presentation: 'window',
                },
                {
                  // Canvas's course navigation placement.
                  type: 'LtiResourceLinkRequest',
                  label: `${PRODUCT} Review`,
                  'label#es': `${PRODUCT} Reseñar`,
                  'label#fr': `${PRODUCT} Réviser`,
                  icon_uri: new URL('/logo.svg', LTI_HOSTNAME).toString(),
                  placements: ['course_navigation'],
                  preferred_presentation: 'window', // Apparently, this is ignored by Canvas for course navigation placement.
                  custom_parameters: {
                    course_id: '$Canvas.course.id',
                    course_name: '$Canvas.course.name',
                    placement: 'course_navigation', // For future use in case we want to know that this was launched from the course navigation placement.
                    tool: 'review',
                  },
                  // Canvas specific extension to open the course navigation target in a new window.
                  'https://canvas.instructure.com/lti/display_type':
                    'new_window',
                },
                {
                  type: 'LtiDeepLinkingRequest',
                  label: PRODUCT,
                  icon_uri: new URL('/logo.svg', LTI_HOSTNAME).toString(),
                  placements: [
                    'ContentArea',
                    'assignment_selection', // Canvas uses this for assignment selection.
                    'link_selection', // Canvas uses this for link selection.
                  ],
                  // preferred_presentation: 'iframe', // leave as default to let LMS decide.
                  iframe: {
                    // Canvas uses this if preferred_presentation is not set.
                    width: 800,
                    height: 800,
                  },
                  window: {
                    // Canvas uses this if preferred_presentation is not set and iframe is not set.
                    width: 800,
                    height: 800,
                  },
                  supported_types: ['LtiResourceLink'], // match what is produced in deep linking
                },
              ],
            },
          }
        );
        res.setHeader('Content-type', 'text/html');
        res.send(message);
      } catch (err) {
        if (
          err instanceof Error &&
          err.message === 'PLATFORM_ALREADY_REGISTERED'
        ) {
          return next(new ForbiddenError('Platform already registered.'));
        }
        next(err);
      }
    }
  );

  /**
   * Endpoint to retrieve the Canvas LTI configuration for the tool.
   */
  Provider.app.get(
    '/lti/configuration',
    async (_req: Request, res: Response) => {
      const placement_defaults = {
        icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
        message_type: 'LtiDeepLinkingRequest',
        target_link_uri: new URL(Provider.appRoute(), LTI_HOSTNAME).toString(),
      };
      res.json({
        title: PRODUCT,
        description: 'myProse Editing and Review tools',
        oidc_initiation_url: new URL(
          Provider.loginRoute(),
          LTI_HOSTNAME
        ).toString(),
        target_link_uri: new URL(Provider.appRoute(), LTI_HOSTNAME).toString(),
        scopes: [
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem',
          'https://purl.imsglobal.org/spec/lti-ags/scope/result.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/score',
          'https://purl.imsglobal.org/spec/lti-nrps/scope/contextmembership.readonly',
          'https://purl.imsglobal.org/spec/lti-ags/scope/lineitem.readonly',
          // "https://purl.imsglobal.org/spec/lti/scope/noticehandlers",
          'https://canvas.instructure.com/lti/public_jwk/scope/update',
        ],
        extensions: [
          {
            domain: LTI_HOSTNAME.hostname.split('.').slice(-2).join('.'),
            tool_id: PRODUCT,
            platform: 'canvas.instructure.com',
            privacy_level: 'public',
            settings: {
              text: 'myProse Drafting and Review tools',
              labels: {
                en: 'myProse Drafting and Review tools',
                es: 'myProse Herramientas de Redacción y Revisión',
              },
              icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
              selection_height: 800,
              selection_width: 800,
              placements: [
                {
                  ...placement_defaults,
                  text: `${PRODUCT} Assignment Selection Placement`,
                  placement: 'assignment_selection',
                },
                {
                  ...placement_defaults,
                  text: `${PRODUCT} Link Selection Placement`,
                  placement: 'link_selection',
                },
                {
                  ...placement_defaults,
                  text: `${PRODUCT} Course Navigation Placement`,
                  placement: 'course_navigation',
                  message_type: 'LtiResourceLinkRequest',
                  target_link_uri: new URL(
                    Provider.appRoute(),
                    LTI_HOSTNAME
                  ).toString(),
                  windowTarget: '_blank',
                  custom_fields: {
                    course_id: '$Canvas.course.id',
                    course_name: '$Canvas.course.name',
                    tool: 'review',
                  },
                },
              ],
            },
          },
        ],
        public_jwk_url: new URL(
          Provider.keysetRoute(),
          LTI_HOSTNAME
        ).toString(),
      });
    }
  );

  Provider.whitelist(
    Provider.appRoute(),
    /\w+\.html$/,
    '/genlink', // Eventually to be moved to admin endpoint.  TODO: Public access via LTI only.
    /draft/, // TODO: Eventually to be removed so only available in LTI
    /review/, // TODO: Eventually to be removed so only available in LTI
    /\/snapshot/, // Snapshot viewing.  TODO: This will eventually be the only public tool.
    '/', // TODO: Eventually to be replaced by welcome page with no tools.
    /locales/, // Localization files need to be public
    /myprose/, // These should be the "public" tools.
    /metrics/, // Prometheus metrics endpoint.
    /lti/, // additional public lti "well-known" endpoints
    /admin/, // Admin routes, security should be handled outside LTI
    /_telefunc/ // Telefunc endpoint, should be protected in the future if used for non-public actions.
  );
}

async function registerPlatforms() {
  // Register manually configured platforms.
  // Run after Provider.deploy()
  try {
    const files = await readdir(PLATFORMS_PATH);
    for (const file of files) {
      const path = join(PLATFORMS_PATH, file);
      const stats = await stat(path);
      if (stats.isFile() && file.endsWith('.json')) {
        const content = await readFile(path, { encoding: 'utf8' });
        const json = JSON.parse(content) as PlatformConfig;
        await Provider.registerPlatform(json);
        logger.info(
          `Registered platform for ${json.url}, clientId: ${json.clientId} from ${path}`,
          { platformId: json.clientId, url: json.url, path }
        );
      }
    }
  } catch (err) {
    logger.error(err);
  } finally {
    const platforms = await Provider.getAllPlatforms();
    platforms.forEach(async (platform) => {
      const platformId = await platform.platformId();
      const name = await platform.platformName();
      const url = await platform.platformUrl();
      const active = await platform.platformActive();
      logger.info(
        `LTI Registered platform: ${active ? '+' : 'o'} ${name} (${platformId}), URL: ${url}, Active: ${active}`,
        { platformId, name, url, active }
      );
    });
  }
}
