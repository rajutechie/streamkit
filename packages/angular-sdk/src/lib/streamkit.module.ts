/**
 * `RajutechieStreamKitModule` - Angular module that bootstraps RajutechieStreamKit services.
 *
 * Use `RajutechieStreamKitModule.forRoot(config)` in your root `AppModule` to
 * provide a singleton `RajutechieStreamKitClient` and all associated services
 * (chat, call, meeting) application-wide.
 *
 * @example
 * ```ts
 * @NgModule({
 *   imports: [
 *     RajutechieStreamKitModule.forRoot({
 *       apiKey: 'sk_live_...',
 *       apiUrl: 'https://api.rajutechie-streamkit.io/v1',
 *     }),
 *   ],
 * })
 * export class AppModule {}
 * ```
 */

import {
  NgModule,
  ModuleWithProviders,
  InjectionToken,
} from '@angular/core';
import type { RajutechieStreamKitConfig } from '@rajutechie-streamkit/core';
import { RajutechieStreamKitService } from './services/rajutechie-streamkit.service';
import { RajutechieStreamKitChatService } from './services/chat.service';
import { RajutechieStreamKitCallService } from './services/call.service';
import { RajutechieStreamKitMeetingService } from './services/meeting.service';

// ---------------------------------------------------------------------------
// Injection token for the configuration object
// ---------------------------------------------------------------------------

/** Injection token used to provide `RajutechieStreamKitConfig` at the module root. */
export const RAJUTECHIE_STREAMKIT_CONFIG = new InjectionToken<RajutechieStreamKitConfig>(
  'RAJUTECHIE_STREAMKIT_CONFIG',
);

// ---------------------------------------------------------------------------
// Module
// ---------------------------------------------------------------------------

@NgModule()
export class RajutechieStreamKitModule {
  /**
   * Configure the RajutechieStreamKit SDK at the root of your application.
   *
   * This should only be called once, typically in `AppModule`.
   *
   * @param config - The `RajutechieStreamKitConfig` (at minimum `apiKey`).
   * @returns A `ModuleWithProviders` that registers all RajutechieStreamKit services.
   */
  static forRoot(config: RajutechieStreamKitConfig): ModuleWithProviders<RajutechieStreamKitModule> {
    return {
      ngModule: RajutechieStreamKitModule,
      providers: [
        { provide: RAJUTECHIE_STREAMKIT_CONFIG, useValue: config },
        RajutechieStreamKitService,
        RajutechieStreamKitChatService,
        RajutechieStreamKitCallService,
        RajutechieStreamKitMeetingService,
      ],
    };
  }
}
