// utils/JwtClaims.js

const ALLOWED_ROLES = ["admin", "user", "teacher"];
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

class JwtClaims {
  /**
   * @param {string} sub - User ID (Subject). Must be a valid ObjectId string.
   * @param {string} role - User Role (e.g., admin, user).
   * @param {Date|number} [exp] - Expiration time (optional). If не передан — ставим 7 дней от сейчас.
   */
  constructor(sub, role, exp) {
    this.validateSub(sub);
    this.validateRole(role);

    // ✅ Если exp не передан — ставим дефолт: сейчас + 7 дней
    if (!exp) {
      this.exp = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    } else {
      this.validateExp(exp);
      this.exp = exp instanceof Date ? exp : new Date(exp * 1000);
    }

    this.sub = sub;
    this.role = role;
  }

  validateSub(sub) {
    if (!sub || typeof sub !== "string" || !MONGO_ID_REGEX.test(sub)) {
      throw new Error(`JWT Error: 'sub' must be a valid MongoDB ObjectId. Received: ${sub}`);
    }
  }

  validateRole(role) {
    if (!ALLOWED_ROLES.includes(role)) {
      throw new Error(`JWT Error: Invalid role '${role}'. Allowed: ${ALLOWED_ROLES.join(", ")}`);
    }
  }

  validateExp(exp) {
    // если сюда дошли, exp уже есть
    if (exp instanceof Date && !isNaN(exp)) return;
    if (typeof exp === "number" && exp > 0) return;
    throw new Error("JWT Error: 'exp' must be a valid Date object or Unix timestamp.");
  }

  toPayload() {
    return {
      sub: this.sub,
      role: this.role,
      exp: Math.floor(this.exp.getTime() / 1000),
    };
  }

  static fromPayload(decodedToken) {
    if (!decodedToken || typeof decodedToken !== "object") {
      throw new Error("Invalid token payload");
    }
    return new JwtClaims(decodedToken.sub, decodedToken.role, decodedToken.exp);
  }
}

export default JwtClaims;
