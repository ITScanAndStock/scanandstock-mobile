# Configuration des environnements

Ce projet utilise des variables d'environnement pour gérer les différentes configurations (développement, staging, production).

## Architecture

L'application utilise `app.config.js` (au lieu de `app.json`) pour injecter dynamiquement les variables d'environnement dans le build. Les variables définies dans `eas.json` sont lues pendant le build et injectées dans `Constants.expoConfig.extra`.

## Fichiers d'environnement

-   `.env.development` - Environnement de développement local (non commité)
-   `.env.staging` - Environnement de staging (commité)
-   `.env.production` - Environnement de production (commité)
-   `app.config.js` - Configuration Expo qui injecte les variables d'environnement
-   `eas.json` - Définit les variables pour chaque profil de build EAS

## Variables disponibles

```bash
EXPO_PUBLIC_ENV=development|staging|production

# Keycloak
EXPO_PUBLIC_KEYCLOAK_URL=https://sso.myscanandstock.fr/
EXPO_PUBLIC_KEYCLOAK_REALM=scan-and-stock
EXPO_PUBLIC_KEYCLOAK_CLIENT_ID=scanandstock-mobile

# API
EXPO_PUBLIC_API_URL=https://api.myscanandstock.fr/api
EXPO_PUBLIC_COOMPY_URL=https://api.mycoompy.fr/api
EXPO_PUBLIC_MY_COOMPY_URL=https://mycoompy.fr
```

## Utilisation en développement local

1. Créer un fichier `.env.development` à la racine du projet
2. Copier les variables depuis `.env.staging` ou `.env.production`
3. Modifier les URLs selon vos besoins locaux
4. Redémarrer le serveur Expo

```bash
npm start
```

## Utilisation avec EAS Build

Les environnements sont automatiquement sélectionnés selon le profil de build défini dans `eas.json`. Les variables sont injectées via `app.config.js` dans l'application finale.

```bash
# Development (utilise les variables du profil development dans eas.json)
eas build --profile development

# Staging (utilise les variables du profil preview dans eas.json)
eas build --profile preview

# Production (utilise les variables du profil production dans eas.json)
eas build --profile production
```

### Important pour les builds

Les variables d'environnement doivent être définies dans **deux endroits** :

1. Dans `eas.json` sous la clé `env` de chaque profil de build
2. Dans les fichiers `.env.*` pour le développement local

⚠️ **Si vous modifiez les URLs ou les configurations**, mettez à jour à la fois :

-   Le fichier `.env.staging` ou `.env.production`
-   La section `env` correspondante dans `eas.json`

## Accéder aux variables dans le code

```typescript
import { keycloakConfig, apiConfig, currentEnv } from '@/config/KeycloakConfig';

console.log(currentEnv); // 'development' | 'staging' | 'production'
console.log(keycloakConfig.url);
console.log(apiConfig.apiUrl);
```

## Notes importantes

⚠️ **Sécurité** :

-   Ne jamais commiter `.env.development` (contient vos configurations locales)
-   Les fichiers `.env.staging` et `.env.production` peuvent être commités car ils ne contiennent pas de secrets
-   Les vraies secrets doivent être configurés dans EAS Secrets

⚠️ **Préfixe EXPO*PUBLIC*** :

-   Toutes les variables d'environnement doivent commencer par `EXPO_PUBLIC_`
-   C'est une exigence d'Expo pour exposer les variables au client
