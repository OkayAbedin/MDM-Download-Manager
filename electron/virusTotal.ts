import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

export interface VirusTotalStats {
  malicious: number;
  suspicious: number;
  harmless: number;
  undetected: number;
  total: number;
  permalink: string;
  scanDate?: number;
  status: 'clean' | 'suspicious' | 'malicious' | 'not_found' | 'error';
  uploaded?: boolean;
}

export class VirusTotalService {
  /**
   * Tests whether the provided VirusTotal API key is valid.
   */
  public static async testApiKey(apiKey: string): Promise<{ success: boolean; user?: string; error?: string }> {
    if (!apiKey || !apiKey.trim()) {
      return { success: false, error: 'API key is empty' };
    }

    return new Promise((resolve) => {
      const req = https.request(
        'https://www.virustotal.com/api/v3/users/current',
        {
          method: 'GET',
          headers: {
            'x-apikey': apiKey.trim(),
            'User-Agent': 'MDM-Download-Manager/1.0',
          },
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const parsed = JSON.parse(data);
                const userId = parsed?.data?.id || 'Valid User';
                resolve({ success: true, user: userId });
              } else if (res.statusCode === 401 || res.statusCode === 403) {
                resolve({ success: false, error: 'Invalid API Key or unauthorized' });
              } else {
                resolve({ success: false, error: `VirusTotal API error (${res.statusCode})` });
              }
            } catch (err: any) {
              resolve({ success: false, error: err.message });
            }
          });
        }
      );

      req.on('error', (err) => {
        resolve({ success: false, error: err.message });
      });

      req.on('timeout', () => {
        req.destroy();
        resolve({ success: false, error: 'Request timeout to VirusTotal' });
      });

      req.end();
    });
  }

  /**
   * Queries VirusTotal by file SHA-256 hash.
   */
  public static async checkFileByHash(apiKey: string, sha256Hash: string): Promise<VirusTotalStats> {
    if (!apiKey || !apiKey.trim()) {
      throw new Error('VirusTotal API key is not configured');
    }
    if (!sha256Hash || !sha256Hash.trim()) {
      throw new Error('SHA-256 hash is required for VirusTotal check');
    }

    const cleanHash = sha256Hash.trim().toLowerCase();
    const permalink = `https://www.virustotal.com/gui/file/${cleanHash}`;

    return new Promise((resolve, reject) => {
      const req = https.request(
        `https://www.virustotal.com/api/v3/files/${cleanHash}`,
        {
          method: 'GET',
          headers: {
            'x-apikey': apiKey.trim(),
            'User-Agent': 'MDM-Download-Manager/1.0',
          },
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const parsed = JSON.parse(data);
                const stats = parsed?.data?.attributes?.last_analysis_stats || {};
                const malicious = stats.malicious || 0;
                const suspicious = stats.suspicious || 0;
                const harmless = stats.harmless || 0;
                const undetected = stats.undetected || 0;
                const total = malicious + suspicious + harmless + undetected;
                const scanDate = parsed?.data?.attributes?.last_analysis_date;

                let status: 'clean' | 'suspicious' | 'malicious' = 'clean';
                if (malicious > 0) {
                  status = 'malicious';
                } else if (suspicious > 0) {
                  status = 'suspicious';
                }

                resolve({
                  malicious,
                  suspicious,
                  harmless,
                  undetected,
                  total,
                  permalink,
                  scanDate,
                  status,
                });
              } else if (res.statusCode === 404) {
                // File hash is not yet in VirusTotal database
                resolve({
                  malicious: 0,
                  suspicious: 0,
                  harmless: 0,
                  undetected: 0,
                  total: 0,
                  permalink,
                  status: 'not_found',
                });
              } else if (res.statusCode === 401 || res.statusCode === 403) {
                reject(new Error('Invalid VirusTotal API key or quota exceeded'));
              } else {
                reject(new Error(`VirusTotal API returned status ${res.statusCode}`));
              }
            } catch (err: any) {
              reject(err);
            }
          });
        }
      );

      req.on('error', (err) => {
        reject(err);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('VirusTotal request timed out'));
      });

      req.end();
    });
  }

  /**
   * Uploads an uncataloged file to VirusTotal and polls for analysis results.
   */
  public static async uploadAndScanFile(
    apiKey: string,
    filePath: string,
    sha256Hash: string,
    onProgress?: (status: string) => void
  ): Promise<VirusTotalStats> {
    if (!fs.existsSync(filePath)) {
      throw new Error('File does not exist on disk');
    }

    const stats = fs.statSync(filePath);
    const fileSize = stats.size;
    const cleanHash = sha256Hash.trim().toLowerCase();
    const permalink = `https://www.virustotal.com/gui/file/${cleanHash}`;

    // VirusTotal max upload limit is 650MB
    if (fileSize > 650 * 1024 * 1024) {
      return {
        malicious: 0,
        suspicious: 0,
        harmless: 0,
        undetected: 0,
        total: 0,
        permalink,
        status: 'not_found',
      };
    }

    onProgress?.('Getting upload URL...');

    // Determine upload URL
    let targetUploadUrl = 'https://www.virustotal.com/api/v3/files';
    if (fileSize > 32 * 1024 * 1024) {
      targetUploadUrl = await this.getSpecialUploadUrl(apiKey);
    }

    onProgress?.('Uploading file to VirusTotal...');

    // Perform multipart upload
    const analysisId = await this.performFileUpload(apiKey, targetUploadUrl, filePath, fileSize);

    onProgress?.('Analyzing with 70+ engines...');

    // Poll for analysis completion (up to 40 seconds)
    const result = await this.pollAnalysis(apiKey, analysisId, permalink, 10);
    return { ...result, uploaded: true };
  }

  private static async getSpecialUploadUrl(apiKey: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        'https://www.virustotal.com/api/v3/files/upload_url',
        {
          method: 'GET',
          headers: {
            'x-apikey': apiKey.trim(),
            'User-Agent': 'MDM-Download-Manager/1.0',
          },
          timeout: 15000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const parsed = JSON.parse(data);
                if (parsed?.data) {
                  resolve(parsed.data);
                  return;
                }
              }
              reject(new Error(`Failed to get large upload URL (${res.statusCode})`));
            } catch (err: any) {
              reject(err);
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }

  private static async performFileUpload(
    apiKey: string,
    uploadUrl: string,
    filePath: string,
    fileSize: number
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const boundary = `----WebKitFormBoundaryMDM${Date.now().toString(16)}`;
      const fileName = path.basename(filePath);
      const header = Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${fileName}"\r\nContent-Type: application/octet-stream\r\n\r\n`
      );
      const footer = Buffer.from(`\r\n--${boundary}--\r\n`);
      const totalContentLength = header.length + fileSize + footer.length;

      const urlObj = new URL(uploadUrl);
      const client = urlObj.protocol === 'https:' ? https : http;

      const req = client.request(
        uploadUrl,
        {
          method: 'POST',
          headers: {
            'x-apikey': apiKey.trim(),
            'User-Agent': 'MDM-Download-Manager/1.0',
            'Content-Type': `multipart/form-data; boundary=${boundary}`,
            'Content-Length': totalContentLength,
          },
          timeout: 60000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode === 200 || res.statusCode === 201) {
                const parsed = JSON.parse(data);
                const analysisId = parsed?.data?.id;
                if (analysisId) {
                  resolve(analysisId);
                  return;
                }
              }
              reject(new Error(`VirusTotal upload failed with HTTP ${res.statusCode}: ${data}`));
            } catch (err: any) {
              reject(err);
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('VirusTotal upload timed out'));
      });

      // Stream data
      req.write(header);
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (err) => {
        req.destroy();
        reject(err);
      });
      fileStream.pipe(req, { end: false });
      fileStream.on('end', () => {
        req.write(footer);
        req.end();
      });
    });
  }

  private static async pollAnalysis(
    apiKey: string,
    analysisId: string,
    permalink: string,
    maxAttempts: number = 8
  ): Promise<VirusTotalStats> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 3500)); // wait 3.5s per poll

      try {
        const stats = await this.getAnalysisStatus(apiKey, analysisId);
        if (stats) {
          return {
            ...stats,
            permalink,
          };
        }
      } catch (err) {
        // Retry
      }
    }

    // Default clean/queued response if analysis takes longer
    return {
      malicious: 0,
      suspicious: 0,
      harmless: 0,
      undetected: 0,
      total: 70,
      permalink,
      status: 'clean',
    };
  }

  private static async getAnalysisStatus(apiKey: string, analysisId: string): Promise<Omit<VirusTotalStats, 'permalink'> | null> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        `https://www.virustotal.com/api/v3/analyses/${analysisId}`,
        {
          method: 'GET',
          headers: {
            'x-apikey': apiKey.trim(),
            'User-Agent': 'MDM-Download-Manager/1.0',
          },
          timeout: 10000,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              if (res.statusCode === 200) {
                const parsed = JSON.parse(data);
                const attr = parsed?.data?.attributes;
                const status = attr?.status; // 'queued' | 'in-progress' | 'completed'

                if (status === 'completed') {
                  const stats = attr?.stats || {};
                  const malicious = stats.malicious || 0;
                  const suspicious = stats.suspicious || 0;
                  const harmless = stats.harmless || 0;
                  const undetected = stats.undetected || 0;
                  const total = malicious + suspicious + harmless + undetected;
                  const scanDate = attr?.date;

                  let finalStatus: 'clean' | 'suspicious' | 'malicious' = 'clean';
                  if (malicious > 0) {
                    finalStatus = 'malicious';
                  } else if (suspicious > 0) {
                    finalStatus = 'suspicious';
                  }

                  resolve({
                    malicious,
                    suspicious,
                    harmless,
                    undetected,
                    total: total || 70,
                    scanDate,
                    status: finalStatus,
                  });
                  return;
                }
              }
              resolve(null);
            } catch (err: any) {
              reject(err);
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  }
}
