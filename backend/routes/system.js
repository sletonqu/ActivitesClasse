const express = require('express');
const path = require('path');

const router = express.Router();
const backendPackage = require(path.join(__dirname, '..', 'package.json'));

const GITHUB_OWNER = process.env.GITHUB_OWNER || 'sletonqu';
const GITHUB_REPO = process.env.GITHUB_REPO || 'ActivitesClasse';
const GITHUB_BRANCH = process.env.GITHUB_BRANCH || 'main';

let lastUpdateRequest = null;

function normalizeVersion(version) {
  return String(version || '')
    .trim()
    .replace(/^v/i, '')
    .split('-')[0];
}

function compareSemver(left, right) {
  const leftParts = normalizeVersion(left)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = normalizeVersion(right)
    .split('.')
    .map((part) => Number.parseInt(part, 10) || 0);

  const maxLength = Math.max(leftParts.length, rightParts.length);
  for (let index = 0; index < maxLength; index += 1) {
    const leftValue = leftParts[index] || 0;
    const rightValue = rightParts[index] || 0;

    if (leftValue > rightValue) {
      return 1;
    }

    if (leftValue < rightValue) {
      return -1;
    }
  }

  return 0;
}

async function fetchLatestGitHubInfo() {
  const headers = {
    Accept: 'application/vnd.github+json',
    'User-Agent': `${backendPackage.name}/${backendPackage.version}`,
  };

  try {
    const releaseResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
      { headers }
    );

    if (releaseResponse.ok) {
      const release = await releaseResponse.json();
      return {
        source: 'release',
        version: release.tag_name || release.name || null,
        publishedAt: release.published_at || null,
        url: release.html_url || null,
        label: release.name || release.tag_name || 'Dernière release',
      };
    }
  } catch (error) {
    // Fallback below on commit metadata.
  }

  try {
    const commitResponse = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
      { headers }
    );

    if (!commitResponse.ok) {
      throw new Error(`GitHub API ${commitResponse.status}`);
    }

    const commit = await commitResponse.json();
    return {
      source: 'commit',
      version: commit.sha ? commit.sha.slice(0, 7) : null,
      publishedAt: commit.commit?.committer?.date || null,
      url: commit.html_url || null,
      label: commit.commit?.message?.split('\n')[0] || 'Dernier commit',
    };
  } catch (error) {
    return {
      source: 'unavailable',
      version: null,
      publishedAt: null,
      url: null,
      label: 'GitHub indisponible',
      error: error.message || 'Impossible de joindre GitHub.',
    };
  }
}

function getAutomationInfo() {
  const enabled = process.env.ENABLE_ADMIN_UPDATE_TRIGGER === 'true';
  const updaterUrl = process.env.HOST_UPDATER_URL || '';

  return {
    enabled,
    updaterConfigured: Boolean(updaterUrl),
    mode: enabled && updaterUrl ? 'host-updater' : 'manual',
  };
}

router.get('/version', async (req, res) => {
  const currentVersion = process.env.APP_VERSION || backendPackage.version || 'dev';
  const latestGitHub = await fetchLatestGitHubInfo();

  const updateAvailable =
    latestGitHub.source === 'release' && latestGitHub.version
      ? compareSemver(latestGitHub.version, currentVersion) > 0
      : false;

  res.json({
    appName: 'Ma Classe Interactive',
    currentVersion,
    repo: {
      owner: GITHUB_OWNER,
      name: GITHUB_REPO,
      branch: GITHUB_BRANCH,
      url: `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}`,
    },
    latestGitHub,
    updateAvailable,
    automation: getAutomationInfo(),
    lastUpdateRequest,
  });
});

router.post('/request-update', async (req, res) => {
  const automation = getAutomationInfo();
  const updaterUrl = process.env.HOST_UPDATER_URL || '';
  const updaterToken = process.env.UPDATER_TOKEN || '';

  if (!automation.enabled) {
    return res.status(501).json({
      error: "Le déclenchement distant des mises à jour n'est pas activé sur ce poste.",
    });
  }

  if (!automation.updaterConfigured) {
    return res.status(501).json({
      error: 'Aucun service local de mise à jour n\'est configuré sur ce poste.',
    });
  }

  if (!req.body || req.body.confirm !== true) {
    return res.status(400).json({
      error: 'Confirmation manquante pour lancer la mise à jour.',
    });
  }

  const requestedAt = new Date().toISOString();
  lastUpdateRequest = {
    status: 'sending',
    requestedAt,
    message: 'Transmission de la demande en cours...',
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const headers = {
      'Content-Type': 'application/json',
    };

    if (updaterToken) {
      headers.Authorization = `Bearer ${updaterToken}`;
    }

    const updaterResponse = await fetch(updaterUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        requestedAt,
        requestedBy: 'admin-ui',
      }),
      signal: controller.signal,
    });

    const responseType = updaterResponse.headers.get('content-type') || '';
    const responseData = responseType.includes('application/json')
      ? await updaterResponse.json()
      : { message: await updaterResponse.text() };

    if (!updaterResponse.ok) {
      throw new Error(
        responseData.error ||
          responseData.message ||
          'Le service local a refusé la demande de mise à jour.'
      );
    }

    const message =
      responseData.message || 'La demande de mise à jour a bien été envoyée au poste local.';

    lastUpdateRequest = {
      status: 'accepted',
      requestedAt,
      completedAt: new Date().toISOString(),
      message,
    };

    return res.json(lastUpdateRequest);
  } catch (error) {
    const message =
      error.name === 'AbortError'
        ? 'Le service local de mise à jour ne répond pas.'
        : error.message || 'Erreur lors de la demande de mise à jour.';

    lastUpdateRequest = {
      status: 'failed',
      requestedAt,
      completedAt: new Date().toISOString(),
      message,
    };

    return res.status(502).json({ error: message, status: 'failed', requestedAt });
  } finally {
    clearTimeout(timeoutId);
  }
});

module.exports = router;
