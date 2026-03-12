import { ScanJob } from './scan';

export interface DatabaseService {
  getScan(id: string): Promise<ScanJob | null>;
  saveScan(scan: ScanJob): Promise<void>;
  findScanByUrl(normalizedUrl: string, maxAgeMs?: number): Promise<ScanJob | null>;
}

export interface CheckoutSession {
  id: string;
  scanId: string;
  amount: number;
  currency: string;
  url: string;
}

export interface PaymentService {
  createCheckout(scanId: string): Promise<CheckoutSession>;
  verifyPayment(sessionId: string): Promise<{ paid: boolean; scanId: string }>;
}

export interface AIService {
  generateLlmsTxt(context: {
    url: string;
    title: string;
    description: string;
    pages: { url: string; title: string; description: string }[];
  }): Promise<string>;
}
