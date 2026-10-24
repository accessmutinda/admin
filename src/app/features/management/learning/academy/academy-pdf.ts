import { AcademyCertificate } from './academy.models';
import { AcademyAssets } from './academy-assets.service';

export async function downloadAcademyCertificate(
  certificate: AcademyCertificate,
  assets: AcademyAssets,
): Promise<void> {
  const { jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const rgb = (hex: string): [number, number, number] => [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
  const template = certificate.branding.template;
  if (template === 'Minimal') {
    pdf.setDrawColor(210, 225, 235);
    pdf.setLineWidth(0.3);
    pdf.rect(10, 10, 277, 190);
  } else if (template === 'Modern') {
    pdf.setFillColor(...rgb(certificate.branding.primary));
    pdf.rect(10, 10, 5, 190, 'F');
    pdf.setFillColor(...rgb(certificate.branding.secondary));
    pdf.rect(10, 195, 277, 5, 'F');
  } else {
    pdf.setDrawColor(...rgb(certificate.branding.primary));
    pdf.setLineWidth(template === 'Professional' ? 2 : 1);
    pdf.rect(10, 10, 277, 190);
    pdf.setDrawColor(...rgb(certificate.branding.secondary));
    pdf.setLineWidth(0.3);
    pdf.rect(14, 14, 269, 182);
  }
  const image = async (
    id: string,
    fallback: string,
    x: number,
    y: number,
    width: number,
    height: number,
    opacity = 1,
  ) => {
    let url = '';
    try {
      url = id ? await assets.url(id) : fallback;
      const data = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = url;
      });
      const canvas = document.createElement('canvas');
      canvas.width = data.naturalWidth;
      canvas.height = data.naturalHeight;
      const context = canvas.getContext('2d')!;
      context.globalAlpha = opacity;
      context.drawImage(data, 0, 0);
      const scale = Math.min(width / data.naturalWidth, height / data.naturalHeight);
      const w = data.naturalWidth * scale,
        h = data.naturalHeight * scale;
      pdf.addImage(
        canvas.toDataURL('image/png'),
        'PNG',
        x + (width - w) / 2,
        y + (height - h) / 2,
        w,
        h,
        undefined,
        'FAST',
      );
    } finally {
      if (url.startsWith('blob:')) URL.revokeObjectURL(url);
    }
  };
  if (certificate.branding.backgroundId)
    await image(certificate.branding.backgroundId, '', 15, 15, 267, 180, 0.12);
  await image(certificate.branding.logoId, '/brand/logo-full.png', 116, 23, 65, 18);
  const center = (value: string, y: number, size = 12) => {
    pdf.setFontSize(size);
    pdf.setTextColor(18, 51, 82);
    pdf.text(pdf.splitTextToSize(value, 245), 148.5, y, { align: 'center' });
  };
  center(certificate.issuer, 49, 11);
  pdf.setFont(['Modern', 'Minimal'].includes(template) ? 'helvetica' : 'times', 'bold');
  center('Certificate of Completion', 65, 26);
  pdf.setFont('helvetica', 'normal');
  center('This is to certify that', 79, 11);
  pdf.setFont('helvetica', 'bold');
  center(certificate.learner, 92, 22);
  pdf.setFont('helvetica', 'normal');
  center('has successfully completed', 105, 11);
  pdf.setFont('helvetica', 'bold');
  center(certificate.courseTitle, 117, certificate.courseTitle.length > 95 ? 12 : 17);
  pdf.setFont('helvetica', 'normal');
  const date = (value: string) =>
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', dateStyle: 'medium' }).format(
      new Date(value),
    );
  center(
    'Completed ' +
      date(certificate.issuedAt) +
      ' | Score ' +
      certificate.score +
      '% | ' +
      certificate.cpdHours +
      ' CPD hours',
    133,
    11,
  );
  if (certificate.expires)
    center('Valid until ' + date(certificate.expires + 'T12:00:00Z'), 142, 10);
  if (certificate.branding.signatureId)
    await image(certificate.branding.signatureId, '', 124, 147, 49, 13);
  center(certificate.branding.signatureName, 166, 12);
  center(certificate.branding.signatureRole, 173, 10);
  if (certificate.branding.showSignatureDate && certificate.branding.signatureName)
    center(date(certificate.issuedAt), 178, 8);
  center(certificate.id, 185, 8);
  center(
    (certificate.sample ? 'Sample learning completion' : 'Internal learning completion') +
      ' | No external accreditation is implied.',
    190,
    8,
  );
  pdf.save(certificate.id + '.pdf');
}
