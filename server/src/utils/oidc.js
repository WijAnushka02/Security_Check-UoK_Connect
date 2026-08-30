const { discovery, buildAuthorizationUrl, calculatePKCECodeChallenge, randomPKCECodeVerifier, randomState, authorizationCodeGrant, fetchUserInfo, buildEndSessionUrl } = require('openid-client');

let asgardeoConfig = null;

async function getOIDCConfig() {
  if (asgardeoConfig) return asgardeoConfig;

  const clientId = process.env.ASGARDEO_CLIENT_ID;
  const clientSecret = process.env.ASGARDEO_CLIENT_SECRET;

  try {
    const issuer = new URL(process.env.ASGARDEO_BASE_URL + '/oauth2/token');
    
    // In openid-client v6, passing clientSecret as the 3rd argument 
    // to discovery configures it to use the supported auth method automatically.
    asgardeoConfig = await discovery(issuer, clientId, clientSecret !== 'paste_your_secret_here' ? clientSecret : undefined);
    return asgardeoConfig;
  } catch (error) {
    console.error('[OIDC] Error discovering configuration:', error.message);
    throw error;
  }
}

module.exports = {
  getOIDCConfig,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomPKCECodeVerifier,
  randomState,
  authorizationCodeGrant,
  fetchUserInfo,
  buildEndSessionUrl
};
