# Configuration des environnements

Ce projet utilise des variables d'environnement pour gérer les différentes configurations (développement, staging, production).

## Fichiers d'environnement

-   `.env.development` - Environnement de développement local (non commité)
-   `.env.staging` - Environnement de staging (commité)
-   `.env.production` - Environnement de production (commité)

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

Les environnements sont automatiquement sélectionnés selon le profil de build :

```bash
# Development (utilise .env.development)
eas build --profile development

# Staging (utilise .env.staging)
eas build --profile preview

# Production (utilise .env.production)
eas build --profile production
```

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
