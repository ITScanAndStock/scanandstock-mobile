import Constants from "expo-constants";

/**
 * Récupère les variables d'environnement depuis expo-constants
 * Ces variables sont définies dans les fichiers .env.*
 */
const env =
  process.env.EXPO_PUBLIC_ENV || Constants.expoConfig?.extra?.env || "staging";

// Fonction helper pour récupérer les variables d'environnement
const getEnvVar = (key: string, defaultValue: string = ""): string => {
  // En développement, process.env est prioritaire
  const envValue = process.env[`EXPO_PUBLIC_${key}`];
  if (envValue) {
    return envValue;
  }

  // Pour les builds EAS, utiliser Constants
  const constantValue = Constants.expoConfig?.extra?.[key];
  if (constantValue) {
    return constantValue;
  }

  console.warn(
    `⚠️ Variable d'environnement ${key} non définie, utilisation de la valeur par défaut: ${defaultValue}`
  );

  return defaultValue;
};

export const keycloakConfig = {
  url: getEnvVar("KEYCLOAK_URL", "https://staging-sso.myscanandstock.fr/"),
  realm: getEnvVar("KEYCLOAK_REALM", "scan-and-stock"),
  clientId: getEnvVar("KEYCLOAK_CLIENT_ID", "scanandstock-mobile"),
};

export const apiConfig = {
  apiUrl: getEnvVar("API_URL", "https://staging-api.myscanandstock.fr/api"),
  coompyUrl: getEnvVar("COOMPY_URL", "https://staging-api.mycoompy.fr/api"),
  myCoompy: getEnvVar("MY_COOMPY_URL", "https://staging.mycoompy.fr"),
};

// Exporter l'environnement actuel
export const currentEnv = env;

if (__DEV__) {
  console.log("🌍 Environment:", env);
  console.log("🔧 Keycloak URL:", keycloakConfig.url);
  console.log("🔧 Keycloak Realm:", keycloakConfig.realm);
  console.log("🔧 Keycloak Client ID:", keycloakConfig.clientId);
  console.log("🔧 API URL:", apiConfig.apiUrl);
  console.log("🔧 Constants.expoConfig?.extra:", Constants.expoConfig?.extra);
}
