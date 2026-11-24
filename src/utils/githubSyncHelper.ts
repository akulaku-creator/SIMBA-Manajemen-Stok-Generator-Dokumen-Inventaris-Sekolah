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
  branchExists?: boolean;
  availableBranches?: string[];
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

function encodeGitHubFilePath(rawPath: string): string {
  const cleaned = (rawPath || 'data/simba-database.json')
    .replace(/^\/+/, '')
    .trim() || 'data/simba-database.json';
  return cleaned
    .split('/')
    .filter(Boolean)
    .map(segment => encodeURIComponent(segment))
    .join('/');
}

/**
 * Test connection to GitHub API using provided credentials
 */
export async function testGitHubConnection(config: GitHubSyncConfig): Promise<GitHubTestResult> {
  const token = (config.personalAccessToken || '').trim();
  const owner = (config.repoOwner || '').trim();
  const repo = (config.repoName || '').trim();
  const branch = (config.branch || 'main').trim() || 'main';

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

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  try {
    // 1. Fetch Repository Details
    const repoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { method: 'GET', headers }
    );

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
          message: `Repositori "${owner}/${repo}" tidak ditemukan (404). Periksa kembali penulisan username/repo atau pastikan token memiliki akses repositori privat.`,
        };
      }
      if (repoRes.status === 403) {
        return {
          success: false,
          message: 'Akses Ditolak (403): Batas kuota API GitHub tercapai atau token tidak memiliki izin membaca repositori ini.',
        };
      }
      const errJson = await repoRes.json().catch(() => null);
      return {
        success: false,
        message: `Koneksi gagal (${repoRes.status}): ${errJson?.message || repoRes.statusText}`,
      };
    }

    const repoData = await repoRes.json();
    const defaultBranch: string = repoData.default_branch || 'main';

    // 2. Check Branch Existence & list available branches
    const [branchRes, branchesListRes] = await Promise.all([
      fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`,
        { method: 'GET', headers }
      ),
      fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=10`,
        { method: 'GET', headers }
      ).catch(() => null),
    ]);

    let availableBranches: string[] = [];
    if (branchesListRes && branchesListRes.ok) {
      const branchesJson = await branchesListRes.json().catch(() => []);
      if (Array.isArray(branchesJson)) {
        availableBranches = branchesJson.map((b: any) => b?.name).filter(Boolean);
      }
    }

    const branchExists = branchRes.ok;
    let branchWarning = '';
    if (!branchExists && branchRes.status === 404) {
      if (availableBranches.length === 0) {
        branchWarning = ` Catatan: Repositori masih kosong; commit pertama akan dibuat pada branch "${defaultBranch}".`;
      } else {
        branchWarning = ` Peringatan: Branch "${branch}" tidak ditemukan (404). Branch aktif di GitHub: ${availableBranches.join(', ')} (default: "${defaultBranch}").`;
      }
    }

    return {
      success: true,
      branchExists,
      availableBranches,
      message: `Koneksi GitHub berhasil terhubung ke "${repoData.full_name}" (${repoData.private ? 'Private' : 'Public'})!${branchWarning}`,
      repoDetails: {
        fullName: repoData.full_name,
        isPrivate: repoData.private,
        defaultBranch,
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
  resolvedBranch?: string;
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
  let branch = (config.branch || 'main').trim() || 'main';
  const rawFilePath = (config.filePath || 'data/simba-database.json').replace(/^\/+/, '').trim() || 'data/simba-database.json';
  const encodedFilePath = encodeGitHubFilePath(rawFilePath);

  if (!token || !owner || !repo) {
    throw new Error('Konfigurasi GitHub belum lengkap (PAT, Owner, atau Repo belum diisi).');
  }

  const baseHeaders = {
    'Accept': 'application/vnd.github.v3+json',
    'Authorization': `Bearer ${token}`,
    'X-GitHub-Api-Version': '2022-11-28',
  };

  // Step 0: Verify repository & active target branch so legacy "master" doesn't trigger 404 on "main" repos
  let isEmptyRepo = false;
  let repoDefaultBranch = 'main';
  try {
    const repoRes = await fetch(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
      { method: 'GET', headers: baseHeaders }
    );

    if (repoRes.status === 401) {
      throw new Error('Token PAT GitHub tidak valid atau telah kadaluarsa (401).');
    }
    if (repoRes.status === 403) {
      throw new Error('Akses GitHub ditolak (403). Pastikan token memiliki izin akses repositori.');
    }
    if (repoRes.status === 404) {
      throw new Error(`Repositori "${owner}/${repo}" tidak ditemukan di GitHub (404). Periksa kembali Owner, Nama Repo, dan izin token.`);
    }

    if (repoRes.ok) {
      const repoData = await repoRes.json();
      repoDefaultBranch = repoData.default_branch || 'main';

      // Check whether configured branch exists on GitHub
      const branchRes = await fetch(
        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches/${encodeURIComponent(branch)}`,
        { method: 'GET', headers: baseHeaders }
      );

      if (branchRes.status === 404) {
        const branchesListRes = await fetch(
          `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/branches?per_page=10`,
          { method: 'GET', headers: baseHeaders }
        ).catch(() => null);

        let availableBranches: string[] = [];
        if (branchesListRes && branchesListRes.ok) {
          const branchesJson = await branchesListRes.json().catch(() => []);
          if (Array.isArray(branchesJson)) {
            availableBranches = branchesJson.map((b: any) => b?.name).filter(Boolean);
          }
        }

        if (availableBranches.length === 0) {
          // Brand-new empty repository (0 commits): default to repoDefaultBranch (usually 'main')
          isEmptyRepo = true;
          if (branch === 'master' && repoDefaultBranch !== 'master') {
            branch = repoDefaultBranch;
          }
        } else if (branch === 'master' && availableBranches.includes(repoDefaultBranch)) {
          // Seamless migration: legacy 'master' config automatically resolves to GitHub's actual default branch (e.g. 'main')
          branch = repoDefaultBranch;
        } else if (branch === 'master' && availableBranches.includes('main')) {
          branch = 'main';
        } else {
          throw new Error(
            `Branch "${branch}" tidak ditemukan di repositori "${owner}/${repo}" (404). Branch yang tersedia: ${availableBranches.join(', ')} (default: "${repoDefaultBranch}"). Ubah nama branch pada Pengaturan GitHub.`
          );
        }
      }
    }
  } catch (err: any) {
    if (
      err?.message &&
      (err.message.includes('(401)') ||
        err.message.includes('(403)') ||
        err.message.includes('(404)') ||
        err.message.includes('Token PAT'))
    ) {
      throw err;
    }
  }

  const endpointUrl = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/contents/${encodedFilePath}`;
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
  if (!isEmptyRepo) {
    try {
      const getRes = await fetch(`${endpointUrl}?ref=${encodeURIComponent(branch)}`, {
        method: 'GET',
        headers: baseHeaders,
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
      // If 404 (file not yet created in this branch), continue to PUT
    }
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
      ...baseHeaders,
      'Content-Type': 'application/json',
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
      throw new Error(
        `Repositori "${owner}/${repo}" atau branch "${branch}" tidak ditemukan (404), atau token PAT belum memiliki izin tulis ("repo" / "contents:write").`
      );
    }
    throw new Error(`Gagal push ke GitHub (${putRes.status}): ${detail}`);
  }

  const putData = await putRes.json();
  const commitSha = putData.commit?.sha || putData.content?.sha;
  const commitUrl = putData.commit?.html_url || `https://github.com/${owner}/${repo}/commit/${commitSha}`;

  // Update stored config with latest sync metadata (including resolved branch)
  const updatedConfig: GitHubSyncConfig = {
    ...config,
    branch,
    filePath: rawFilePath,
    lastSyncedAt: formattedTime,
    lastCommitSha: commitSha ? commitSha.substring(0, 7) : undefined,
    lastCommitUrl: commitUrl,
  };
  saveStoredGitHubConfig(updatedConfig);

  return {
    success: true,
    message: `Berhasil sinkronisasi dan push versi ke GitHub di branch "${branch}" (${rawFilePath})!`,
    commitSha: commitSha ? commitSha.substring(0, 7) : undefined,
    commitUrl,
    resolvedBranch: branch,
    timestamp: formattedTime,
  };
}
