class JWTClaims {
    /**
     * @param {string} sub - Subject (UUID)
     * @param {string} role - Role (admin, user)
     * @param {Date} exp - Expiration time
     */
    constructor(sub, role, exp) {
        this.sub = sub;
        this.role = role;
        this.exp = exp;
    }
}

export default JWTClaims;
