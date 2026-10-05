import { Component } from '@angular/core';
import { Logo } from '../ui/logo';

@Component({
  selector: 'cv-auth-split-layout',
  imports: [Logo],
  template: `
    <div class="cv-auth-shell cv-auth-entry">
      <div class="cv-entry-frame">
        <aside class="cv-entry-brand">
          <cv-logo tone="light" size="lg" class="cv-entry-logo" />
          <div class="cv-entry-story">
            <p class="cv-entry-eyebrow"><span></span> Connected care. Shared purpose.</p>
            <h2>Better care starts with <span>connected people.</span></h2>
            <p class="cv-entry-description">
              Bring care delivery, your workforce and compliance together in one clear workspace.
            </p>
          </div>
          <div class="cv-entry-photo">
            <img
              src="/brand/sign-in-care.jpg"
              alt="A care professional and an older woman sharing a warm smile"
              width="1536"
              height="1024"
            />
          </div>
          <div class="cv-entry-capabilities">
            <p class="cv-entry-capabilities-heading">
              <span aria-hidden="true" class="material-symbols-outlined">hub</span>
              One workspace. Better connected.
            </p>
            <div class="cv-entry-capability-grid">
              @for (item of capabilities; track item.label) {
                <div class="cv-entry-capability">
                  <span aria-hidden="true" class="material-symbols-outlined" [class]="item.tone">{{
                    item.icon
                  }}</span>
                  <span
                    ><strong>{{ item.label }}</strong
                    ><small>{{ item.description }}</small></span
                  >
                </div>
              }
            </div>
          </div>
        </aside>
        <main class="cv-entry-main">
          <div class="cv-entry-mobile-logo"><cv-logo /></div>
          <div class="cv-entry-content cv-enter">
            <ng-content />
            <p class="cv-entry-support">
              Need a hand?
              <a class="cv-auth-link" href="mailto:support@careverity.com"
                >Contact support <span aria-hidden="true">↗</span></a
              >
            </p>
          </div>
          <p class="cv-entry-footer">
            CareVerity <span aria-hidden="true">·</span> People. Purpose. Progress.
          </p>
        </main>
      </div>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
    .cv-auth-entry {
      display: grid;
      min-height: 100svh;
      align-items: center;
      padding: 24px;
      background: radial-gradient(ellipse at top left, #e6f7f5 0, transparent 48%), #f3f6f9;
    }
    .cv-entry-frame {
      display: grid;
      grid-template-columns: 58% 42%;
      width: 100%;
      max-width: 1360px;
      min-height: 744px;
      margin-inline: auto;
      overflow: hidden;
      border: 1px solid #e1e7ed;
      border-radius: 24px;
      background: white;
      box-shadow: 0 20px 70px -28px rgba(15, 45, 74, 0.28);
    }
    .cv-entry-brand {
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
      padding: 40px;
      background: var(--color-navy);
      color: white;
      isolation: isolate;
    }
    .cv-entry-logo {
      position: relative;
      z-index: 2;
      display: block;
    }
    .cv-entry-story {
      position: relative;
      z-index: 2;
      margin-top: 40px;
      max-width: 540px;
    }
    .cv-entry-eyebrow {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 0 18px;
      color: #c4e8e5;
      font-size: 12px;
      font-weight: 500;
      letter-spacing: 0.035em;
    }
    .cv-entry-eyebrow > span {
      height: 6px;
      width: 6px;
      border-radius: 50%;
      background: #49d6c6;
    }
    h2 {
      margin: 0;
      font-size: clamp(36px, 3.5vw, 48px);
      line-height: 1.12;
      letter-spacing: -0.04em;
      font-weight: 600;
    }
    h2 > span {
      color: #83e3d7;
    }
    .cv-entry-description {
      max-width: 405px;
      margin: 18px 0 0;
      color: #d0dde8;
      font-size: 14px;
      line-height: 1.7;
    }
    .cv-entry-photo {
      position: absolute;
      inset: 285px 0 0;
      z-index: 0;
    }
    .cv-entry-photo img {
      height: 100%;
      width: 100%;
      object-fit: cover;
      object-position: 48% 40%;
    }
    .cv-entry-photo::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(
        to bottom,
        var(--color-navy) 0,
        rgba(15, 45, 74, 0.05) 40%,
        rgba(15, 45, 74, 0.85) 100%
      );
    }
    .cv-entry-capabilities {
      position: relative;
      z-index: 2;
      margin-top: auto;
      padding: 18px;
      border: 1px solid rgba(255, 255, 255, 0.2);
      border-radius: 14px;
      background: rgba(15, 45, 74, 0.88);
    }
    .cv-entry-capabilities-heading {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px;
      font-size: 12px;
      color: #dce8f1;
    }
    .cv-entry-capabilities-heading > span {
      color: #83e3d7;
      font-size: 18px;
    }
    .cv-entry-capability-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 12px;
    }
    .cv-entry-capability {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      min-width: 0;
    }
    .cv-entry-capability > .material-symbols-outlined {
      display: grid;
      place-items: center;
      flex-shrink: 0;
      height: 32px;
      width: 32px;
      border-radius: 9px;
      font-size: 19px;
    }
    .care {
      background: rgba(0, 168, 150, 0.2);
      color: #83e3d7;
    }
    .people {
      background: rgba(59, 130, 246, 0.2);
      color: #a6c8ff;
    }
    .evidence {
      background: rgba(173, 143, 255, 0.2);
      color: #d3c1ff;
    }
    .cv-entry-capability strong {
      display: block;
      font-size: 12px;
      font-weight: 600;
      line-height: 1.5;
    }
    .cv-entry-capability small {
      display: block;
      margin-top: 2px;
      color: #c2d1df;
      font-size: 11px;
      line-height: 1.5;
    }
    .cv-entry-main {
      display: flex;
      flex-direction: column;
      justify-content: center;
      position: relative;
      min-width: 0;
      padding: 48px 40px 64px;
    }
    .cv-entry-content {
      width: 100%;
      max-width: 368px;
      margin-inline: auto;
    }
    .cv-entry-mobile-logo {
      display: none;
    }
    .cv-entry-support {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: 6px;
      margin: 24px 0 0;
      padding-top: 20px;
      border-top: 1px solid var(--color-line);
      color: var(--color-slate);
      font-size: 12px;
    }
    .cv-entry-footer {
      position: absolute;
      bottom: 24px;
      inset-inline: 24px;
      display: flex;
      justify-content: center;
      flex-wrap: wrap;
      gap: 8px;
      color: var(--color-slate);
      font-size: 11px;
    }
    @media (min-width: 1280px) {
      .cv-entry-brand {
        padding: 40px 48px;
      }
      .cv-entry-main {
        padding-inline: 48px;
      }
    }
    @media (max-width: 1279px) {
      .cv-entry-capability-grid {
        gap: 10px;
      }
      .cv-entry-capability {
        flex-direction: column;
      }
    }
    @media (max-width: 1023px) {
      .cv-entry-frame {
        display: block;
        max-width: 520px;
        min-height: 0;
        border-radius: 20px;
      }
      .cv-entry-brand {
        display: none;
      }
      .cv-entry-main {
        padding: 32px 40px;
      }
      .cv-entry-mobile-logo {
        display: block;
        width: 100%;
        max-width: 368px;
        margin: 0 auto 32px;
      }
      .cv-entry-footer {
        position: static;
        margin: 28px 0 0;
      }
    }
    @media (max-width: 599px) {
      .cv-auth-entry {
        padding: 0;
        background: white;
        align-items: start;
      }
      .cv-entry-frame {
        min-height: 100svh;
        border: 0;
        border-radius: 0;
        box-shadow: none;
      }
      .cv-entry-main {
        padding: 24px;
        min-height: 100svh;
        justify-content: flex-start;
      }
      .cv-entry-mobile-logo {
        margin-bottom: 24px;
      }
      .cv-entry-support {
        align-items: center;
        margin-top: 16px;
        padding-top: 8px;
      }
      .cv-entry-support a {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        min-height: 40px;
      }
      .cv-entry-footer {
        margin-top: auto;
        padding-top: 24px;
      }
    }
  `,
})
export class AuthSplitLayout {
  protected readonly capabilities = [
    { label: 'Care delivery', description: 'Plans & visits', icon: 'favorite', tone: 'care' },
    { label: 'Your people', description: 'Teams & learning', icon: 'groups', tone: 'people' },
    {
      label: 'Compliance',
      description: 'Records & evidence',
      icon: 'verified_user',
      tone: 'evidence',
    },
  ];
}
