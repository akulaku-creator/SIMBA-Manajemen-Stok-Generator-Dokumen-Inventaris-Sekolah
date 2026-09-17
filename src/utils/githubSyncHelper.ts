import { GitHubSyncConfig } from '../types';

export const GITHUB_CONFIG_KEY = 'simba_github_config';

export const DEFAULT_GITHUB_CONFIG: GitHubSyncConfig = {
  personalAccessToken: '',
  repoOwner: '',
  repoName: '',
  branch: 'main',
  filePath: 'data/simba-database.json',
  lastSyncedAt: undefined,
  lastCommitSha: undefined,
  lastCommitUrl: undefined,
};

/**
 * Retrieve GitHub configuration from localStorage
 */
export function getStoredGitHubConfig(): GitHubSyncConfig {
  try {
    const raw = localStorage.getItem(GITHUB_CONFIG_KEY);
    if (!raw) return { ...DEFAULT_GITHUB_CONFIG };
    const parsed = JSON.parse(raw);
    return {
      personalAccessToken: parsed.personalAccessToken || '',
      repoOwner: parsed.repoOwner || '',
      repoName: parsed.repoName || '',
      branch: parsed.branch || 'main',
      filePath: parsed.filePath || 'data/simba-database.json',
      lastSyncedAt: parsed.lastSyncedAt,
      lastCommitSha: parsed.lastCommitSha,
      lastCommitUrl: parsed.lastCommitUrl,
    };
  } catch {
    return { ...DEFAULT_GITHUB_CONFIG };
  }
}

/**
 * Save GitHub configuration to localStorage
 */
export function saveStoredGitHubConfig(config: GitHubSyncConfig): void {
  try {
    localStorage.setItem(GITHUB_CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save GitHub config to localStorage:', e);
  }
}

/**
 * Safe UTF-8 to Base64 string encoder for browser
 */
export function utf8ToBase64(str: string): string {
  try {
    return btoa(unescape(encodeURIComponent(str)));
  } catch {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}

export interface GitHubTestResult {
  success: boolean;
  message: string;
  repoDetails?: {
    fullName: string;
    isPrivate: boolean;
    defaultBranch: string;
    description: string;
    permissions?: {
      push?: boolean;
      admin?: boolean;
    };
    ownerAvatar?: string;
  };
}

/**
 * Test connection to GitHub API using provided credentials
 */
export async function testGitHubConnection(config: GitHubSyncConfig): Promise<GitHubTestResult> {
  const token = (config.personalAccessToken || '').trim();
  const owner = (config.repoOwner || '').trim();
  const repo = (config.repoName || '').trim();
  const branch = (config.branch || 'main').trim();

  if (!token) {
    return {
      success: false,
      message: 'Personal Access Token (PAT) GitHub belum diisi.',
    };
  }
  if (!owner) {
    return {
      success: false,
      message: 'Repository Owner / Username belum diisi.',
    };
  }
  if (!repo) {
    return {
      success: false,
      message: 'Repository Name belum diisi.',
    };
  }

  try {
    // 1. Fetch Repository Details
    const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (!repoRes.ok) {
      if (repoRes.status === 401) {
        return {
          success: false,
          message: 'Autentikasi Gagal (401): Token PAT tidak valid atau telah kadaluarsa. Pastikan token memiliki scope "repo".',
        };
      }
      if (repoRes.status === 404) {
        return {
          success: false,
          message: `Repositori "${owner}/${repo}" tidak ditemukan (404). Periksa kembali penulisan username/repo atau pastikan token memiliki akses repositori privat jika repo bersifat privat.`,
        };
      }
      if (repoRes.status === 403) {
        return {
          success: false,
          message: 'Akses Ditolak (403): Batas kuota API GitHub tercapai atau token tidak memiliki izin menulis/membaca repositori ini.',
        };
      }
      const errJson = await repoRes.json().catch(() => null);
      return {
        success: false,
        message: `Koneksi gagal (${repoRes.status}): ${errJson?.message || repoRes.statusText}`,
      };
    }

    const repoData = await repoRes.json();

    // 2. Check Branch Existence
    const branchRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    let branchWarning = '';
    if (!branchRes.ok && branchRes.status === 404) {
      branchWarning = ` Catatan: Branch "${branch}" belum ditemukan di repositori (akan dibuat otomatis saat commit pertama atau pilih branch yang sudah ada: ${repoData.default_branch}).`;
    }

    const pushAllowed = repoData.permissions?.push !== false;

    return {
      success: true,
      message: `Koneksi GitHub berhasil terhubung ke "${repoData.full_name}" (${repoData.private ? 'Private' : 'Public'})!${branchWarning}`,
      repoDetails: {
        fullName: repoData.full_name,
        isPrivate: repoData.private,
        defaultBranch: repoData.default_branch,
        description: repoData.description || 'Tidak ada deskripsi',
        permissions: repoData.permissions,
        ownerAvatar: repoData.owner?.avatar_url,
      },
    };
  } catch (err: any) {
    return {
      success: false,
      message: `Terjadi kendala jaringan saat menghubungi GitHub API: ${err?.message || 'Gagal terhubung.'}`,
    };
  }
}

export interface GitHubPushResult {
  success: boolean;
  message: string;
  commitSha?: string;
  commitUrl?: string;
  timestamp: string;
}

/**
 * 1-Click Release: Push application database payload to GitHub via REST API
 */
export async function pushUpdateToGitHub(
  config: GitHubSyncConfig,
  payloadData: any,
  customCommitMsg?: string
): Promise<GitHubPushResult> {
  const token = (config.personalAccessToken || '').trim();
  const owner = (config.repoOwner || '').trim();
  const repo = (config.repoName || '').trim();
  const branch = (config.branch || 'main').trim();
  const filePath = (config.filePath || 'data/simba-database.json').replace(/^\/+/, '').trim();

  if (!token || !owner || !repo) {
    throw new Error('Konfigurasi GitHub belum lengkap (PAT, Owner, atau Repo belum diisi).');
  }

  const endpointUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${filePath}`;
  const now = new Date();
  const formattedTime = now.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  // Step 1: Check existing file SHA in target branch
  let existingSha: string | undefined = undefined;
  try {
    const getRes = await fetch(`${endpointUrl}?ref=${encodeURIComponent(branch)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `Bearer ${token}`,
        'X-GitHub-Api-Version': '2022-11-28',
      },
    });

    if (getRes.ok) {
      const existingData = await getRes.json();
      existingSha = existingData.sha;
    } else if (getRes.status !== 404) {
      if (getRes.status === 401) {
        throw new Error('Token PAT GitHub tidak valid atau tidak memiliki izin akses.');
      }
      if (getRes.status === 403) {
        throw new Error('Akses GitHub ditolak (403). Pastikan token memiliki scope write "repo".');
      }
    }
  } catch (err: any) {
    if (err.message && (err.message.includes('401') || err.message.includes('403') || err.message.includes('Token PAT'))) {
      throw err;
    }
    // If not found or transient error, continue to try PUT
  }

  // Step 2: Format JSON string and convert to safe UTF-8 Base64
  const jsonContent = typeof payloadData === 'string' ? payloadData : JSON.stringify(payloadData, null, 2);
  const base64Content = utf8ToBase64(jsonContent);

  // Step 3: Default automated commit message
  const commitMessage = customCommitMsg && customCommitMsg.trim()
    ? customCommitMsg.trim()
    : `feat(auto-update): sync SIMBA v2.6 Pro data from web [${formattedTime}]`;

  // Step 4: PUT Request to create or update file contents
  const putBody: Record<string, any> = {
    message: commitMessage,
    content: base64Content,
    branch: branch,
  };
  if (existingSha) {
    putBody.sha = existingSha;
  }

  const putRes = await fetch(endpointUrl, {
    method: 'PUT',
    headers: {
      'Accept': 'application/vnd.github.v3+json',
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: JSON.stringify(putBody),
  });

  if (!putRes.ok) {
    const errorJson = await putRes.json().catch(() => null);
    const detail = errorJson?.message || putRes.statusText;
    if (putRes.status === 409) {
      throw new Error(`Konflik SHA (409): File di GitHub telah berubah. Silakan coba klik tombol sync kembali.`);
    }
    if (putRes.status === 404) {
      throw new Error(`Repositori atau branch "${branch}" tidak ditemukan di GitHub (404).`);
    }
    throw new Error(`Gagal push ke GitHub (${putRes.status}): ${detail}`);
  }

  const putData = await putRes.json();
  const commitSha = putData.commit?.sha || putData.content?.sha;
  const commitUrl = putData.commit?.html_url || `https://github.com/${owner}/${repo}/commit/${commitSha}`;

  // Update stored config with latest sync metadata
  const updatedConfig: GitHubSyncConfig = {
    ...config,
    lastSyncedAt: formattedTime,
    lastCommitSha: commitSha ? commitSha.substring(0, 7) : undefined,
    lastCommitUrl: commitUrl,
  };
  saveStoredGitHubConfig(updatedConfig);

  return {
    success: true,
    message: `Berhasil sinkronisasi dan push versi ke GitHub di branch "${branch}" (${filePath})!`,
    commitSha: commitSha ? commitSha.substring(0, 7) : undefined,
    commitUrl,
    timestamp: formattedTime,
  };
}
