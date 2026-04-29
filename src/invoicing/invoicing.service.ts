import { Injectable, Logger } from '@nestjs/common';

const SZAMLAZZ_API = 'https://www.szamlazz.hu/szamla/';

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  private get apiKey(): string {
    const key = process.env.SZAMLAZZ_API_KEY;
    if (!key) throw new Error('SZAMLAZZ_API_KEY is not configured');
    return key;
  }

  private escapeXml(str: string | null | undefined): string {
    return (str ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private buildXml(params: {
    customerEmail: string;
    customerName: string;
    amountEur: number;
    description: string;
    countryCode: string;
    today: string;
  }): string {
    const { customerEmail, customerName, amountEur, description, countryCode, today } = params;

    // HU: 27% ÁFA. EU non-HU B2C: EU rate placeholder — confirm with accountant for OSS.
    const vatKey = countryCode === 'HU' ? '27' : 'EU';
    const nettoEgysegAr = countryCode === 'HU'
      ? Math.round((amountEur / 1.27) * 100) / 100
      : amountEur;
    const afaErtek = Math.round((amountEur - nettoEgysegAr) * 100) / 100;

    return `<?xml version="1.0" encoding="UTF-8"?>
<xmlszamla xmlns="http://www.szamlazz.hu/xmlszamla"
           xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
           xsi:schemaLocation="http://www.szamlazz.hu/xmlszamla https://www.szamlazz.hu/szamla/docs/xsds/agent/xmlszamla.xsd">
  <beallitasok>
    <szamlaagentkulcs>${this.apiKey}</szamlaagentkulcs>
    <eszamla>true</eszamla>
    <valaszVerzio>2</valaszVerzio>
  </beallitasok>
  <fejlec>
    <keltDatum>${today}</keltDatum>
    <teljesitesDatum>${today}</teljesitesDatum>
    <fizetesiHataridoDatum>${today}</fizetesiHataridoDatum>
    <fizmod>Online bankkártya</fizmod>
    <penznem>EUR</penznem>
    <szamlaNyelve>hu</szamlaNyelve>
    <arfolyamBank>MNB</arfolyamBank>
    <arfolyam>0</arfolyam>
  </fejlec>
  <elado>
    <emailReplyto>hello@mysouschef.com</emailReplyto>
    <emailTargy>Számla – MySousChef</emailTargy>
    <emailSzoveg>Kérjük, találja mellékelve a számlát. / Please find your invoice attached.</emailSzoveg>
  </elado>
  <vevo>
    <nev>${this.escapeXml(customerName || customerEmail)}</nev>
    <irsz>-</irsz>
    <telepules>-</telepules>
    <cim>-</cim>
    <email>${this.escapeXml(customerEmail)}</email>
    <sendEmail>true</sendEmail>
  </vevo>
  <tetelek>
    <tetel>
      <megnevezes>${this.escapeXml(description)}</megnevezes>
      <mennyiseg>1</mennyiseg>
      <mennyisegiEgyseg>hó</mennyisegiEgyseg>
      <nettoEgysegAr>${nettoEgysegAr}</nettoEgysegAr>
      <afakulcs>${vatKey}</afakulcs>
      <nettoErtek>${nettoEgysegAr}</nettoErtek>
      <afaErtek>${afaErtek}</afaErtek>
      <bruttoErtek>${amountEur}</bruttoErtek>
    </tetel>
  </tetelek>
</xmlszamla>`;
  }

  async createInvoice(params: {
    customerEmail: string;
    customerName: string;
    amountEur: number;
    description: string;
    countryCode: string;
  }): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const xml = this.buildXml({ ...params, today });

    const form = new FormData();
    form.append(
      'action-xmlagentxmlfile',
      new Blob([xml], { type: 'application/xml' }),
      'invoice.xml',
    );

    const res = await fetch(SZAMLAZZ_API, { method: 'POST', body: form });
    const text = await res.text();

    if (!res.ok || text.includes('<sikeres>false</sikeres>')) {
      const msg = text.match(/<hibauzenet>(.*?)<\/hibauzenet>/)?.[1] ?? text;
      throw new Error(`Számlázz.hu error: ${msg}`);
    }

    const invoiceNum = text.match(/<szamlaszam>(.*?)<\/szamlaszam>/)?.[1] ?? 'unknown';
    this.logger.log(`Számlázz.hu invoice ${invoiceNum} created for ${params.customerEmail}`);
  }
}
