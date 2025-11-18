# Guide de diagnostic - Problème de navigation vers login

## Modifications apportées

J'ai ajouté des logs détaillés dans toute l'application pour identifier pourquoi vous n'êtes pas redirigé vers la page de login. Ces logs s'afficheront maintenant **même dans les builds de production** (APK).

### Fichiers modifiés

1. **`config/KeycloakConfig.ts`** - Ajout de logs pour vérifier les variables d'environnement
2. **`context/AuthContext.tsx`** - Ajout de logs pour suivre le cycle d'authentification
3. **`services/AuthService.ts`** - Ajout de logs dans `isTokenValid()`
4. **`app/RootNavigator.tsx`** - Ajout de logs pour comprendre la navigation

## Comment diagnostiquer

### 1. Rebuilder l'application

```bash
eas build --profile preview --platform android
```

### 2. Installer l'APK et lancer l'app

### 3. Consulter les logs

#### Sur Android (via logcat)

Connectez votre téléphone en USB et exécutez :

```bash
# Afficher tous les logs de l'app
adb logcat | grep -E "(ReactNativeJS|Expo)"

# Ou filtrer par nos émojis de log
adb logcat | grep -E "🔍|🚀|✅|❌|🔧|🌍|🎯|⏳"
```

#### Via Expo Dev Tools

Si vous avez activé le mode développement, vous pouvez aussi secouer votre téléphone et activer les logs.

### 4. Analyser les logs attendus

Vous devriez voir cette séquence au démarrage :

```
🌍 Environment: staging
🔧 Keycloak URL: https://staging-sso.myscanandstock.fr/
🔧 Keycloak Realm: scan-and-stock
🔧 Keycloak Client ID: scanandstock-mobile
🔧 API URL: https://staging-api.myscanandstock.fr/api
🔧 Constants.expoConfig?.extra: { ... }

🚀 AuthContext - Initialisation de l'authentification...
🔍 AuthContext - checkAuth appelé
🔍 AuthService - Vérification de la validité du token...
🔍 AuthService - tokenExpiry: absent
🔍 AuthService - refreshToken: absent
❌ AuthService - Pas de token ou expiry trouvé
🔍 AuthContext - Token valide: false
✅ AuthContext - Initialisation terminée

🔍 RootNavigator - isLoading: false, isAuthenticated: false
🎨 Masquage du splash screen
🎯 RootNavigator - Affichage de la navigation, isAuthenticated: false
```

## Scénarios possibles

### Scénario 1 : Variables d'environnement non chargées

**Symptôme :** Vous voyez dans les logs :

```
⚠️ Variable d'environnement KEYCLOAK_URL non définie
🔧 Keycloak URL: https://staging-sso.myscanandstock.fr/
```

**Solution :** Les valeurs par défaut sont utilisées, donc ça devrait fonctionner. Si non, le problème est ailleurs.

### Scénario 2 : Navigation ne se déclenche pas

**Symptôme :** Vous voyez :

```
🔍 RootNavigator - isLoading: false, isAuthenticated: false
```

Mais vous n'êtes PAS sur la page de login.

**Cause probable :** Problème de routing Expo Router. Vérifiez que :

-   Le fichier `app/login.tsx` existe bien
-   Il n'y a pas de redirection forcée vers `index`

### Scénario 3 : isLoading reste bloqué à true

**Symptôme :** Vous voyez uniquement :

```
⏳ RootNavigator - Affichage du loader
```

Et rien d'autre.

**Cause :** L'initialisation de l'auth ne se termine jamais. Problème probable dans `AuthContext`.

### Scénario 4 : isAuthenticated reste à true alors que vous n'êtes pas connecté

**Symptôme :** Vous voyez :

```
🔍 AuthContext - Token valide: true
🔍 RootNavigator - isAuthenticated: true
```

**Cause :** Un ancien token est toujours stocké. **Solution :** Désinstallez complètement l'app et réinstallez.

## Actions correctives selon les logs

### Si les variables d'environnement sont vides

Vérifiez que `app.config.js` est bien utilisé :

```bash
# Dans le terminal
node -e "const c = require('./app.config.js'); console.log(c.default.expo.extra)"
```

### Si la navigation ne fonctionne pas

Modifiez temporairement `RootNavigator.tsx` pour forcer l'affichage :

```tsx
// Remplacer temporairement la condition
{isAuthenticated ? (
  // ... tabs
) : (
  <Stack.Screen name="login" />
)}

// Par un affichage forcé de login
{false ? (
  // ... tabs
) : (
  <Stack.Screen name="login" />
)}
```

### Si vous voulez réinitialiser complètement l'app

Sur votre téléphone :

1. Désinstallez l'application complètement
2. Allez dans Paramètres > Apps > Stockage > Effacer les données
3. Réinstallez l'APK

## Prochaines étapes

1. ✅ Rebuild avec `eas build --profile preview --platform android`
2. ✅ Installez l'APK
3. ✅ Récupérez les logs via `adb logcat`
4. ✅ Partagez-moi les logs pour que je puisse identifier le problème exact

## Commande rapide pour capturer les logs

```bash
# Créer un fichier avec les logs
adb logcat -d | grep -E "🔍|🚀|✅|❌|🔧|🌍|🎯|⏳" > app-logs.txt
```

Ensuite, ouvrez `app-logs.txt` et vous verrez exactement ce qui se passe.
