// src/services/AuthService.js
import LocalStrategy from "./auth-strategies/LocalStrategy";
import Wso2Strategy from "./auth-strategies/Wso2Strategy";
import KeycloakStrategy from "./auth-strategies/KeycloakStrategy";

class AuthService {
  constructor() {
    this.strategies = {
      local: new LocalStrategy(),
      wso2: new Wso2Strategy(),
      keycloak: new KeycloakStrategy(),
    };
    this.currentStrategy = this.strategies.local;
  }

  setStrategy(authType) {
    if (this.strategies[authType]) {
      this.currentStrategy = this.strategies[authType];
    } else {
      // eslint-disable-next-line no-console
      console.warn(`[AuthService] Unknown authType: ${authType}. Falling back to local.`);
      this.currentStrategy = this.strategies.local;
    }
  }

  async login(credentials) {
    return await this.currentStrategy.login(credentials);
  }

  async logout(config) {
    return await this.currentStrategy.logout(config);
  }

  async revalidate() {
    return await this.currentStrategy.revalidate();
  }

  async handleCallback(code) {
    if (this.currentStrategy.handleCallback) {
      return await this.currentStrategy.handleCallback(code);
    }
    throw new Error("Current strategy does not support callback handling.");
  }

  getToken() {
    return this.currentStrategy.getToken();
  }

  clearTokens() {
    // Clear all possible tokens to be safe
    const tokenKeys = [
      "token",
      "access_token",
      "wso2_access_token",
      "id_token",
      "refresh_token",
      "scope",
      "token_type",
      "expires_in",
      "wso2_config",
      "userData",
      "wso2_auth_data"
    ];
    tokenKeys.forEach((key) => localStorage.removeItem(key));
  }
}

const authService = new AuthService();
export default authService;
