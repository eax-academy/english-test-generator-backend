//TODO: Refresh token

const ALLOWED_ROLES = ["admin", "user", "teacher"]; //TODO: Add teacher?

// Regex to validate MongoDB ObjectId (24 hex characters)
const MONGO_ID_REGEX = /^[0-9a-fA-F]{24}$/;

class JwtClaims {
  /**
   * @param {string} sub - User ID (Subject). Must be a valid ObjectId string.
   * @param {string} role - User Role (e.g., admin, user).
   * @param {Date|number} exp - Expiration time. Can be a Date object or Unix Timestamp (in seconds).
   */
  constructor(sub, role, exp) {
    this.validateSub(sub);
    this.validateRole(role);
    this.validateExp(exp);

    this.sub = sub;
    this.role = role;

    //TODO: IMPORTANT: Normalize the date to a single format (Date Object).
    // If a number is provided (JWT uses seconds), convert it to milliseconds.
    this.exp = typeof exp === 'number' ? new Date(exp * 1000) : exp;
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
    if (!exp) throw new Error("JWT Error: 'exp' (Expiration) is required.");
    
    // If it is already a Date object, just check its validity
    if (exp instanceof Date && !isNaN(exp)) {
      return; 
    }
    
    // If it is a number (timestamp), it must be positive
    if (typeof exp === "number" && exp > 0) {
        return;
    }

    throw new Error("JWT Error: 'exp' must be a valid Date object or Unix timestamp.");
  }


  /**
   * Converts the class instance to a plain object for jwt.sign().
   * Converts the Date object back to seconds (UNIX timestamp).
   */
  toPayload() {
    return {
      sub: this.sub,
      role: this.role,
      // JWT standard requires seconds, not milliseconds
      exp: Math.floor(this.exp.getTime() / 1000), 
    };
  }

  /**
   * Static factory method to create an instance from a decoded token.
   * Useful in middleware.
   */
  static fromPayload(decodedToken) {
    if (!decodedToken || typeof decodedToken !== 'object') {
      throw new Error("Invalid token payload");
    }
    
    // The jsonwebtoken library returns 'exp' in seconds, and 'sub'/'role' as strings.
    // Our constructor handles the conversion from seconds to Date automatically.
    return new JwtClaims(decodedToken.sub, decodedToken.role, decodedToken.exp);
  }
}

export default JwtClaims;