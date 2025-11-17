# ScanAndStock Mobile 📱

Application mobile pour la gestion de stock avec scan de codes-barres.

## 🚀 Démarrage rapide

### Installation

```bash
npm install
```

### Configuration de l'environnement

1. Copier le fichier d'exemple :

```bash
copy .env.example .env.development
```

2. Modifier `.env.development` selon vos besoins

3. Lancer l'application :

```bash
npm start
```

## 🌍 Gestion des environnements

L'application supporte 3 environnements :

### Development (local)

```bash
npm run start:dev
# ou
npm start
```

### Staging

```bash
npm run start:staging
```

### Production

```bash
npm run start:prod
```

## 📦 Builds avec EAS

### Preview (Staging)

```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### Production

```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

## 📝 Variables d'environnement

Voir [ENV.md](./ENV.md) pour la documentation complète.

## 🔧 Stack technique

-   **React Native** avec Expo
-   **TypeScript**
-   **Expo Router** pour la navigation
-   **Axios** pour les appels API
-   **Keycloak** pour l'authentification OAuth2/OIDC
-   **expo-secure-store** pour le stockage sécurisé
-   **react-native-toast-message** pour les notifications

-   [development build](https://docs.expo.dev/develop/development-builds/introduction/)
-   [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
-   [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
-   [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

-   [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
-   [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

-   [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
-   [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
