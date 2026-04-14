import React, { useEffect, useState } from "react";
import { API_URL } from "../config/api";
import useAutoDismissMessage from "../hooks/useAutoDismissMessage";

function formatDate(value) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("fr-FR");
}

const SystemUpdatePanel = ({ hideTitle = false }) => {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loadingInfo, setLoadingInfo] = useState(false);
  const [requestingUpdate, setRequestingUpdate] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const { show: showMessage, fade: fadeMessage } = useAutoDismissMessage(message, setMessage);

  const loadSystemInfo = async () => {
    setLoadingInfo(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/system/version`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la récupération des informations système");
      }

      setSystemInfo(data);
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setLoadingInfo(false);
    }
  };

  useEffect(() => {
    loadSystemInfo();
  }, []);

  const handleRequestUpdate = async () => {
    const confirmUpdate = window.confirm(
      "Demander immédiatement la mise à jour de l'application sur ce poste ?"
    );
    if (!confirmUpdate) {
      return;
    }

    setRequestingUpdate(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/system/request-update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Erreur lors de la demande de mise à jour");
      }

      setMessage(data.message || "Demande de mise à jour envoyée");
      await loadSystemInfo();
    } catch (err) {
      setError(err.message || "Erreur inconnue");
    } finally {
      setRequestingUpdate(false);
    }
  };

  const automationEnabled = Boolean(
    systemInfo?.automation?.enabled && systemInfo?.automation?.updaterConfigured
  );

  const updateStatusClassName =
    systemInfo?.latestGitHub?.source === "unavailable"
      ? "border-slate-200 bg-slate-50 text-slate-700"
      : systemInfo?.updateAvailable
        ? "border-amber-200 bg-amber-50 text-amber-800"
        : "border-emerald-200 bg-emerald-50 text-emerald-800";

  const updateStatusText =
    systemInfo?.latestGitHub?.source === "unavailable"
      ? "Impossible de joindre GitHub pour vérifier les mises à jour sur ce poste."
      : systemInfo?.updateAvailable
        ? "Une version plus récente est disponible sur GitHub."
        : "Aucune nouvelle release détectée pour la version installée.";

  return (
    <section id="system-update-section" className="w-full bg-white rounded-xl shadow p-6 mb-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          {!hideTitle && (
            <h3 id="system-update-title" className="text-xl font-bold text-slate-800">
              Version et mise à jour
            </h3>
          )}
          <p id="system-update-description" className="text-sm text-slate-500 mt-1">
            Vérifie la version publiée sur GitHub et peut déclencher une mise à jour locale si le poste est configuré.
          </p>
        </div>

        <div id="system-update-actions" className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={loadSystemInfo}
            disabled={loadingInfo}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-60"
          >
            {loadingInfo ? "Vérification..." : "Vérifier les mises à jour"}
          </button>

          <button
            type="button"
            onClick={handleRequestUpdate}
            disabled={!automationEnabled || requestingUpdate}
            className="px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-60"
          >
            {requestingUpdate ? "Demande en cours..." : "Demander la mise à jour"}
          </button>
        </div>
      </div>

      <div id="system-update-status" className="mt-4 grid gap-3 md:grid-cols-2 text-sm text-slate-700">
        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
          <div><strong>Version installée :</strong> {systemInfo?.currentVersion || "—"}</div>
          <div><strong>Dépôt :</strong> {systemInfo?.repo?.owner}/{systemInfo?.repo?.name}</div>
          <div><strong>Branche :</strong> {systemInfo?.repo?.branch || "—"}</div>
        </div>

        <div className="rounded-lg border border-slate-200 p-3 bg-slate-50">
          <div>
            <strong>Source GitHub :</strong> {systemInfo?.latestGitHub?.label || "Aucune information"}
          </div>
          <div>
            <strong>Version / commit :</strong> {systemInfo?.latestGitHub?.version || "—"}
          </div>
          <div>
            <strong>Date :</strong> {formatDate(systemInfo?.latestGitHub?.publishedAt)}
          </div>
        </div>
      </div>

      <div
        id="system-update-availability"
        className={`mt-4 rounded-lg border p-3 text-sm ${updateStatusClassName}`}
      >
        {updateStatusText}
      </div>

      <div id="system-update-automation" className="mt-4 text-sm text-slate-600">
        <div>
          <strong>Automatisation :</strong>{" "}
          {automationEnabled
            ? "activée via un service local sur le poste"
            : "non configurée — le script PowerShell manuel reste disponible"}
        </div>
        <div className="mt-1">
          Script manuel recommandé : <code>powershell -ExecutionPolicy Bypass -File .\scripts\update-application.ps1</code>
        </div>
        {systemInfo?.lastUpdateRequest?.requestedAt && (
          <div className="mt-1">
            Dernière demande : {systemInfo.lastUpdateRequest.status || "—"} le {formatDate(systemInfo.lastUpdateRequest.requestedAt)}
          </div>
        )}
      </div>

      {showMessage && (
        <div
          id="system-update-success"
          className={`mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800 transition-opacity duration-500 ${
            fadeMessage ? "opacity-0" : "opacity-100"
          }`}
        >
          {message}
        </div>
      )}

      {error && (
        <div
          id="system-update-error"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700"
        >
          {error}
        </div>
      )}
    </section>
  );
};

export default SystemUpdatePanel;
