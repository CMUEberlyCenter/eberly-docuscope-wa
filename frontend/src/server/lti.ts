import {
  BadRequestError,
  ServiceUnavailableError,
  UnprocessableContentError,
} from '#lib/ProblemDetails.js';
import { DbWritingTask, isWritingTask } from '#lib/WritingTask';
import { validateWritingTask } from '#lib/schemaValidate';
// import cors from 'cors';
import { Request, Response, Router } from 'express';
import { readdir, readFile, stat } from 'fs/promises';
import { ContentItem, HttpHandler, HttpMethod, PlatformRegistrationInput, Provider } from 'ltijs';
import { join } from 'path';
import { logger } from './logger';
import { LTI_DB, LTI_HOSTNAME, PLATFORMS_PATH, PRODUCT } from './settings';

// Hack to ensure that LTI is only initialized once in hot reload environments.
const LTI_SETUP_KEY = Symbol.for('myprose.lti.setup_complete');
const globalRef = globalThis as typeof globalThis & {
  [LTI_SETUP_KEY]?: boolean;
};

export async function ensureLTIInitialized(
  httpHandler: HttpHandler
): Promise<Provider> {
  // if (
  // process.env.NODE_ENV === 'production' ||
  // !(LTI_SETUP_KEY in globalRef && globalRef[LTI_SETUP_KEY])
  // ) {
  // globalRef[LTI_SETUP_KEY] = true;
  const provider = initializeLTI(httpHandler);
  // await Provider.deploy({ serverless: true });
  // await registerPlatforms();
  // }
  return provider;
}

type DeepLinkingRequestDTO = {
  ltik: string; // LTI token for the current session
  file: string; // JSON stringified writing task
  tool: '' | 'draft' | 'review'; // 'draft' or 'review'
};
function isDeepLinkingRequestDTO(obj: unknown): obj is DeepLinkingRequestDTO {
  if (typeof obj !== 'object' || obj === null) return false;
  const dto = obj as DeepLinkingRequestDTO;
  return (
    typeof dto.ltik === 'string' &&
    typeof dto.file === 'string' &&
    (dto.tool === '' || dto.tool === 'draft' || dto.tool === 'review')
  );
}
function initializeLTI(httpHandler: HttpHandler) {
  const provider = new Provider({
    database: LTI_DB,
    dynamicRegistration: {
      name: PRODUCT,
      url: LTI_HOSTNAME.toString(),
      autoActivate: true,
      useDeepLinking: true,
      logo: new URL('/logo.svg', LTI_HOSTNAME).toString(),
    },
    httpHandler,
  });
  // Initialize LTI provider and middleware
  // Provider.setup(LTI_KEY, LTI_DB, LTI_OPTIONS);

  provider.onResourceLink(async (context, request, response) => {
    if (context.idToken.launch) {
      // if LTI token is present
      if (context.idToken.launch.custom?.tool) {
        // if tool is specified in deep linking settings, redirect accordingly
        return context.redirect(
          response,
          `/${context.idToken.launch.custom.tool}`
        );
      }
      // default to non-specified writing type drafting tool.
      return context.redirect(response, '/draft');
    }
    if (request.query.writing_task) {
      return context.redirect(
        response,
        `/myprose/${request.query.writing_task}/`
      );
    }
    context.redirect(response, '/draft');
    // Provider.redirect(res, '/index'); //'/index.html');
  });
  // Could be used to provide a custom response for invalid tokens
  // Provider.onInvalidToken(async (req: Request, res: Response) => {
  //   console.log('InvalidToken');
  //   return res.sendFile(join(PUBLIC, 'index.html'));
  // })
  provider.onDeepLinking(async (context, _request, response) =>
    // Provider.redirect(res, '/deeplink', { newResource: true })
    context.redirect(response, '/deeplink')
  );
  provider.httpHandler.registerRoute(
    '/deeplink',
    [HttpMethod.Post],
    // urlencoded({ extended: true }),
    // TODO validate(checkSchema({})),
    async (request, response) => {
      if (!isDeepLinkingRequestDTO(request.body)) {
        throw new BadRequestError('Invalid request body.');
      }
      const { file } = request.body;
      let { ltik, tool } = request.body;
      ltik ||= Array.isArray(request.query.ltik)
        ? request.query.ltik[0]
        : request.query.ltik;
      if (!ltik) {
        throw new BadRequestError('Missing parameter: "ltik".');
      }
      const context = await provider.getLaunchContext(ltik);
      if (!context.deepLinking.isAvailable()) {
        throw new ServiceUnavailableError(
          'Deep linking is not available for this launch.'
        );
      }
      const task = file ? (JSON.parse(file) as DbWritingTask) : null;
      tool = ['draft', 'review'].includes(tool) ? tool : 'draft';
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
      const items: ContentItem[] = [
        {
          type: 'ltiResourceLink',
          // title: writing_task.info.name ?? response.locals.token.platformContext.deepLinkingSettings.title,
          // text: writing_task.rules.overview ?? response.locals.token.platformContext.deepLinkingSettings.text,
          title: context.idToken.services.deepLinking.title, // #236
          text: `myProse ${tool === 'draft' ? 'Draft' : 'Review'}`,
          'text#es': `myProse ${tool === 'draft' ? 'Borrador' : 'Reseñar'}`,
          url: url.toString(),
          icon: {
            url: new URL('logo.svg', LTI_HOSTNAME).toString(),
            width: 500,
            height: 160,
          },
          custom,
        },
      ];
      const form = await context.deepLinking.createDeepLinkingForm(items);
      // { message: 'Success' });
      response.html(form);
    }
  );

  // Handle LTI dynamic registration requests
  provider.onDynamicRegistration(async (request, response) => {
    const openidConfig = Array.isArray(request.query.openid_configuration)
      ? (request.query.openid_configuration.at(0) ?? '')
      : request.query.openid_configuration;
    if (!openidConfig) {
      throw new BadRequestError('Missing parameter: "openid_configuration".');
    }
    const registrationToken = Array.isArray(request.query.registration_token)
      ? (request.query.registration_token.at(0) ?? '')
      : request.query.registration_token;
    if (!registrationToken) {
      throw new BadRequestError('Missing parameter: "registration_token".');
    }
    if (!provider.dynamicRegistrationService) {
      throw new ServiceUnavailableError(
        'Dynamic registration service is not available.'
      );
    }
    const config =
      await provider.dynamicRegistrationService.getOpenIDConfiguration(
        openidConfig
      );
    if (!config) {
      throw new BadRequestError(
        `Invalid platform configuration for openid_configuration: ${openidConfig}`
      );
    }
    try {
      await provider.dynamicRegistrationService.performRegistration(
        config,
        registrationToken,
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
                'https://canvas.instructure.com/lti/display_type': 'new_window',
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
      response.html(
        provider.dynamicRegistrationService.FINALIZE_REGISTRATION_HTML_SNIPPET
      );
    } catch (err) {
      console.error('Error during dynamic registration:', err);
      throw new ServiceUnavailableError(
        'Error during dynamic registration. Please check the server logs for details.', { cause: err }
      );
    }
  });

  /**
   * Endpoint to retrieve the Canvas LTI configuration for the tool.
   */

  // Provider.whitelist(
  //   Provider.appRoute(),
  //   /\w+\.html$/,
  //   '/genlink', // Eventually to be moved to admin endpoint.  TODO: Public access via LTI only.
  //   /draft/, // TODO: Eventually to be removed so only available in LTI
  //   /review/, // TODO: Eventually to be removed so only available in LTI
  //   /\/snapshot/, // Snapshot viewing.  TODO: This will eventually be the only public tool.
  //   '/', // TODO: Eventually to be replaced by welcome page with no tools.
  //   /locales/, // Localization files need to be public
  //   /myprose/, // These should be the "public" tools.
  //   /metrics/, // Prometheus metrics endpoint.
  //   /lti/, // additional public lti "well-known" endpoints
  //   /admin/, // Admin routes, security should be handled outside LTI
  //   /_telefunc/ // Telefunc endpoint, should be protected in the future if used for non-public actions.
  // );
  return provider;
}

async function registerPlatforms(provider: Provider) {
  // Register manually configured platforms.
  // Run after provider.databaseManager.connect() to ensure that the database is ready for platform registration.
  try {
    const files = await readdir(PLATFORMS_PATH);
    for (const file of files) {
      const path = join(PLATFORMS_PATH, file);
      const stats = await stat(path);
      if (stats.isFile() && file.endsWith('.json')) {
        const content = await readFile(path, { encoding: 'utf8' });
        const json = JSON.parse(content) as PlatformRegistrationInput;
        await provider.platformManager.registerPlatform(json);
        logger.info(
          `Registered platform for ${json.url}, clientId: ${json.clientId} from ${path}`,
          { platformId: json.clientId, url: json.url, path }
        );
      }
    }
  } catch (err) {
    logger.error(err);
  } finally {
    const platforms = await provider.platformManager.getPlatforms();
    platforms.forEach(async ({ id, name, url, active }) => {
      logger.info(
        `LTI Registered platform: ${active ? '+' : 'o'} ${name} (${id}), URL: ${url}, Active: ${active}`,
        { id, name, url, active }
      );
    });
  }
}

export const lti_configuration_router = Router();
lti_configuration_router.get(
  '/lti/configuration',
  async (_req: Request, res: Response) => {
    const placement_defaults = {
      icon_url: new URL('/logo.svg', LTI_HOSTNAME).toString(),
      message_type: 'LtiDeepLinkingRequest',
      target_link_uri: LTI_HOSTNAME.toString(),
    };
    res.json({
      title: PRODUCT,
      description: 'myProse Editing and Review tools',
      oidc_initiation_url: new URL('/lti/login' /*provider.loginRoute*/, LTI_HOSTNAME).toString(),
      target_link_uri: LTI_HOSTNAME.toString(),
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
                target_link_uri: LTI_HOSTNAME.toString(),
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
      public_jwk_url: new URL('/lti/keys' /*provider.keysRoute*/, LTI_HOSTNAME).toString(),
    });
  }
);
