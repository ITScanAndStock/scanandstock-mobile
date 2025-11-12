export const keycloakConfig = {
  url: 'https://staging-sso.myscanandstock.fr/',
  realm: 'scan-and-stock',
  clientId: 'scanandstock-mobile',
  redirectUri: 'exp://localhost:8081', // Pour développement
  // redirectUri: 'myapp://callback', // Pour production
};

export const apiConfig = {
  apiUrl: 'https://staging-api.myscanandstock.fr/api',
  coompyUrl: 'https://staging-api.mycoompy.fr/api',
  myCoompy: 'https://staging.mycoompy.fr'
};