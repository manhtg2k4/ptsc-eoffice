import { Component, OnInit, OnDestroy, SecurityContext } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';

interface CollaboraConfig {
  collaboraUrl: string;
  wopiSrc: string;
  accessToken: string;
  action: 'edit' | 'view';
  fileName: string;
}

@Component({
  selector: 'app-collabora-editor',
  template: `
    <div class="collabora-container">
      <!-- Header -->
      <div class="editor-header">
        <h3>{{ fileName || 'Document Editor' }}</h3>
        <div class="actions">
          <button (click)="switchMode('view')" [disabled]="mode === 'view'">
            View Only
          </button>
          <button (click)="switchMode('edit')" [disabled]="mode === 'edit'">
            Edit
          </button>
          <button (click)="closeEditor()">Close</button>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading">
        <div class="spinner"></div>
        <p>Loading document...</p>
      </div>

      <!-- Error State -->
      <div *ngIf="error" class="error">
        <p>{{ error }}</p>
        <button (click)="retry()">Retry</button>
      </div>

      <!-- Collabora Iframe -->
      <iframe
        *ngIf="collaboraUrl && !loading && !error"
        [src]="collaboraUrl"
        class="collabora-iframe"
        frameborder="0"
        allow="clipboard-read; clipboard-write"
        (load)="onIframeLoad()"
      ></iframe>
    </div>
  `,
  styles: [`
    .collabora-container {
      display: flex;
      flex-direction: column;
      height: 100vh;
      width: 100%;
    }

    .editor-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px 20px;
      background: #f5f5f5;
      border-bottom: 1px solid #ddd;
    }

    .editor-header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 500;
    }

    .actions button {
      margin-left: 8px;
      padding: 6px 16px;
      border: 1px solid #ccc;
      background: white;
      border-radius: 4px;
      cursor: pointer;
    }

    .actions button:disabled {
      background: #e0e0e0;
      cursor: not-allowed;
    }

    .actions button:hover:not(:disabled) {
      background: #f0f0f0;
    }

    .collabora-iframe {
      flex: 1;
      width: 100%;
      border: none;
    }

    .loading, .error {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .error {
      color: #d32f2f;
    }

    .error button {
      margin-top: 16px;
      padding: 8px 24px;
      background: #3498db;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
  `]
})
export class CollaboraEditorComponent implements OnInit, OnDestroy {
  fileId: string;
  mode: 'edit' | 'view' = 'edit';
  fileName: string = '';
  
  collaboraUrl: SafeResourceUrl | null = null;
  loading: boolean = false;
  error: string | null = null;

  private tokenRefreshInterval: any;

  constructor(
    private http: HttpClient,
    private sanitizer: DomSanitizer,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    // Get file ID from route
    this.route.params.subscribe(params => {
      this.fileId = params['id'];
      if (this.fileId) {
        this.loadDocument();
      }
    });

    // Get mode from query params
    this.route.queryParams.subscribe(params => {
      if (params['mode']) {
        this.mode = params['mode'];
      }
    });
  }

  ngOnDestroy() {
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }
  }

  async loadDocument() {
    this.loading = true;
    this.error = null;

    try {
      // Get Collabora config from backend
      const config = await this.getCollaboraConfig(this.fileId, this.mode);
      
      // Build Collabora URL
      const params = new URLSearchParams({
        WOPISrc: config.wopiSrc,
        access_token: config.accessToken,
      });

      const url = `${config.collaboraUrl}/loleaflet/dist/loleaflet.html?${params}`;
      
      // Sanitize and set URL
      this.collaboraUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
      this.fileName = config.fileName;

      // Set up token refresh (refresh every 50 minutes, token expires in 60)
      this.setupTokenRefresh();

    } catch (err: any) {
      this.error = err.error?.message || err.message || 'Failed to load document';
      console.error('Error loading document:', err);
    } finally {
      this.loading = false;
    }
  }

  private async getCollaboraConfig(fileId: string, mode: 'edit' | 'view'): Promise<CollaboraConfig> {
    const token = localStorage.getItem('access_token'); // Adjust based on your auth
    
    const headers = new HttpHeaders({
      'Authorization': `Bearer ${token}`
    });

    return this.http.get<CollaboraConfig>(
      `/api/files/collabora/config/${fileId}?mode=${mode}`,
      { headers }
    ).toPromise();
  }

  private setupTokenRefresh() {
    // Clear existing interval
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Refresh token every 50 minutes (before 60-minute expiration)
    this.tokenRefreshInterval = setInterval(() => {
      this.refreshToken();
    }, 50 * 60 * 1000);
  }

  private async refreshToken() {
    try {
      // Reload the document with a new token
      await this.loadDocument();
      console.log('Token refreshed successfully');
    } catch (err) {
      console.error('Failed to refresh token:', err);
    }
  }

  switchMode(mode: 'edit' | 'view') {
    if (this.mode !== mode) {
      this.mode = mode;
      this.loadDocument();
    }
  }

  retry() {
    this.loadDocument();
  }

  closeEditor() {
    // Navigate back or close window
    window.history.back();
  }

  onIframeLoad() {
    console.log('Collabora iframe loaded successfully');
  }
}
