#!/usr/bin/env node

/**
 * Script d'automatisation pour enrichir les phrases enregistrées en base SQLite
 * avec le temps ("temps") et l'infinitif ("infinitif") de chaque mot de type verbe.
 *
 * Utilisation :
 *   node scripts/enrich_verb_tenses.js [--provider=gemini|openai|mistral] [--batch=20] [--limit=50]
 */

const path = require('path');
const fs = require('fs');

// Charger les variables d'environnement si un fichier .env existe localement
const envCandidates = [
  path.resolve(__dirname, '../../.env'),
  path.resolve(__dirname, '../.env'),
];
for (const envPath of envCandidates) {
  if (fs.existsSync(envPath)) {
    const dotenv = require('fs').readFileSync(envPath, 'utf8');
    dotenv.split('\n').forEach((line) => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [k, ...v] = trimmed.split('=');
        const key = k.trim();
        const val = v.join('=').trim().replace(/^['"](.*)['"]$/, '$1');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    });
    break;
  }
}

const { processVerbEnrichment } = require('../routes/ai');

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    provider: 'gemini',
    batchSize: 20,
    limit: 0,
  };

  for (const arg of args) {
    if (arg === '--help' || arg === '-h') {
      console.log(`
Usage: node scripts/enrich_verb_tenses.js [options]

Options :
  --provider=<gemini|openai|mistral>  Fournisseur d'IA à utiliser (défaut: gemini)
  --batch=<nombre>                   Taille du lot de phrases par appel API (défaut: 20)
  --limit=<nombre>                   Nombre maximal de phrases à traiter (0 = toutes, défaut: 0)
  --help                             Affiche cette aide
      `);
      process.exit(0);
    }

    if (arg.startsWith('--provider=')) {
      options.provider = arg.split('=')[1].trim().toLowerCase();
    } else if (arg.startsWith('--batch=')) {
      options.batchSize = Number(arg.split('=')[1].trim()) || 20;
    } else if (arg.startsWith('--limit=')) {
      options.limit = Number(arg.split('=')[1].trim()) || 0;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs();

  console.log('====================================================');
  console.log("Enrichissement automatique du temps des verbes (IA)");
  console.log('====================================================');
  console.log(`Fournisseur sélectionné : ${options.provider}`);
  console.log(`Taille des lots         : ${options.batchSize}`);
  console.log(`Limite demandée         : ${options.limit > 0 ? options.limit : 'Toutes les phrases éligibles'}`);
  console.log('----------------------------------------------------');

  try {
    const startTime = Date.now();
    const result = await processVerbEnrichment({
      providerId: options.provider,
      batchSize: options.batchSize,
      limit: options.limit,
      onProgress: ({ processed, total, enriched }) => {
        const percent = total > 0 ? Math.round((processed / total) * 100) : 100;
        console.log(`[Progression] ${processed}/${total} phrases traitées (${percent}%) — ${enriched} enrichie(s)`);
      },
    });

    const elapsedSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

    console.log('----------------------------------------------------');
    console.log(`Total de phrases avec verbes sans temps trouvées : ${result.totalFound}`);
    console.log(`Phrases analysées lors de ce run                 : ${result.processedSentences}`);
    console.log(`Phrases enrichies avec succès                    : ${result.enrichedSentences}`);
    console.log(`Phrases restant à enrichir                       : ${result.remainingCount}`);
    console.log(`Durée d'exécution                                : ${elapsedSeconds}s`);

    if (result.errors && result.errors.length > 0) {
      console.warn(`\nAvertissements / Erreurs sur ${result.errors.length} lot(s) :`);
      result.errors.forEach((err) => {
        console.warn(`  - Lot ${err.batchIndex} : ${err.message}`);
      });
    }

    console.log('====================================================');
    process.exit(0);
  } catch (err) {
    console.error('\nErreur critique lors de l\'enrichissement :', err.message);
    process.exit(1);
  }
}

main();
