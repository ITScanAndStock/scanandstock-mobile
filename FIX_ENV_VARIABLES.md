# Fix : Problème de connexion et données manquantes sur APK Preview

## Problème identifié

Lors du build EAS en mode preview, l'application ne pouvait pas se connecter et n'avait aucune donnée car les variables d'environnement n'étaient pas correctement injectées dans le build final.

### Cause

L'ancien `app.json` utilisait des placeholders `${EXPO_PUBLIC_...}` qui ne sont **pas** remplacés lors des builds EAS. Les variables définies dans `eas.json` sont disponibles uniquement pendant le **processus de build**, pas dans l'application finale.

## Solution appliquée

### 1. Migration de `app.json` vers `app.config.js`

Créé `app.config.js` qui lit dynamiquement les variables d'environnement pendant le build et les injecte dans `Constants.expoConfig.extra`.

### 2. Enrichissement de `eas.json`

Ajouté toutes les variables d'environnement nécessaires dans chaque profil de build :

```json
{
	"build": {
		"preview": {
			"env": {
				"EXPO_PUBLIC_ENV": "staging",
				"EXPO_PUBLIC_KEYCLOAK_URL": "https://staging-sso.myscanandstock.fr/",
				"EXPO_PUBLIC_KEYCLOAK_REALM": "scan-and-stock",
				"EXPO_PUBLIC_KEYCLOAK_CLIENT_ID": "scanandstock-mobile",
				"EXPO_PUBLIC_API_URL": "https://staging-api.myscanandstock.fr/api",
				"EXPO_PUBLIC_COOMPY_URL": "https://staging-api.mycoompy.fr/api",
				"EXPO_PUBLIC_MY_COOMPY_URL": "https://staging.mycoompy.fr"
			}
		}
	}
}
```

### 3. Comment ça fonctionne maintenant

1. **Pendant le build EAS** :

    - EAS lit `eas.json` et définit les variables d'environnement (`EXPO_PUBLIC_*`)
    - `app.config.js` est exécuté et lit ces variables via `process.env`
    - Les valeurs sont injectées dans `expo.extra` de la config

2. **Dans l'application finale** :
    - `KeycloakConfig.ts` lit les valeurs depuis `Constants.expoConfig.extra`
    - Les URLs et configurations sont disponibles

## Étapes pour rebuilder

```bash
# 1. Supprimer app.json (déjà remplacé par app.config.js)
# Note: app.json est toujours présent mais sera ignoré au profit de app.config.js

# 2. Lancer un nouveau build preview
eas build --profile preview --platform android

# 3. Tester l'APK sur le téléphone
```

## Vérification

Pour vérifier que les variables sont bien injectées, ajoutez temporairement dans votre app :

```typescript
import Constants from 'expo-constants';
console.log('Config:', Constants.expoConfig?.extra);
```

Vous devriez voir toutes vos variables d'environnement.

## Points importants

✅ **app.config.js** est prioritaire sur app.json
✅ Les variables doivent être dans **eas.json** pour les builds EAS
✅ Les fichiers `.env.*` sont toujours utilisés pour le développement local
✅ Les valeurs par défaut dans `app.config.js` servent de fallback

## Fichiers modifiés

-   ✅ Créé `app.config.js` (nouvelle config dynamique)
-   ✅ Modifié `eas.json` (ajout des variables complètes)
-   ✅ Mis à jour `ENV.md` (documentation)
-   ⚠️ `app.json` est toujours présent mais ne sera plus lu

## Note importante

⚠️ Vous pouvez supprimer `app.json` si vous voulez, mais ce n'est pas obligatoire. Expo donnera la priorité à `app.config.js` s'il existe.
