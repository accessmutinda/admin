import { Component, input } from '@angular/core';
import { AcademyDate } from './academy-date';
import { AcademyCertificate } from './academy.models';
import { AcademyImage } from './academy-image';
@Component({
  selector: 'cv-academy-certificate',
  imports: [AcademyDate, AcademyImage],
  template: ` <article
    class="certificate"
    [attr.data-template]="certificate().branding.template"
    [style.--certificate-primary]="certificate().branding.primary"
    [style.--certificate-secondary]="certificate().branding.secondary"
    aria-label="Certificate of completion"
  >
    @if (certificate().branding.backgroundId) {
      <cv-academy-image class="background" [id]="certificate().branding.backgroundId" alt="" />
    }
    <div class="certificate-content">
      @if (certificate().branding.logoId) {
        <cv-academy-image class="logo" [id]="certificate().branding.logoId" alt="Issuer logo" />
      } @else {
        <img class="brand-logo" src="/brand/logo-full.png" alt="CareVerity" />
      }
      <p class="issuer">{{ certificate().issuer }}</p>
      <h2>Certificate of Completion</h2>
      <p>This is to certify that</p>
      <h3>{{ certificate().learner }}</h3>
      <p>has successfully completed</p>
      <h4>{{ certificate().courseTitle }}</h4>
      <p>Completed {{ certificate().issuedAt | ukDate: 'd MMM yyyy' : 'Europe/London' }}</p>
      <p>Score {{ certificate().score }}% · {{ certificate().cpdHours }} CPD hours</p>
      @if (certificate().expires) {
        <p>Valid until {{ certificate().expires | ukDate: 'd MMM yyyy' }}</p>
      }
      <div class="signature">
        @if (certificate().branding.signatureId) {
          <cv-academy-image [id]="certificate().branding.signatureId" alt="Authorised signature" />
        }
        <strong>{{ certificate().branding.signatureName }}</strong
        ><span>{{ certificate().branding.signatureRole }}</span>
        @if (certificate().branding.showSignatureDate && certificate().branding.signatureName) {
          <small>{{ certificate().issuedAt | ukDate: 'd MMM yyyy' }}</small>
        }
      </div>
      <small class="reference">{{ certificate().id }}</small
      ><small
        >{{
          certificate().sample ? 'Sample learning completion' : 'Internal learning completion'
        }}
        · No external accreditation is implied.</small
      >
    </div>
  </article>`,
  styleUrl: './academy-certificate.css',
})
export class AcademyCertificateView {
  readonly certificate = input.required<AcademyCertificate>();
}
