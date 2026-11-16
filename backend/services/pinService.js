
const argon2 = require("argon2");
const crypto = require("node:crypto");

// Prepare PIN using the backend-only secret
function preparePin(pin) {
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
        throw new Error("PIN must contain exactly 6 digits.");
    }

    const pepper = process.env.PIN_PEPPER;

    if (!pepper || !/^[0-9a-fA-F]{64}$/.test(pepper)) {
        throw new Error("PIN_PEPPER is not configured correctly.");
    }

    return crypto
        .createHmac("sha256", Buffer.from(pepper, "hex"))
        .update(pin)
        .digest("hex");
}

// Generate a secure hash for database storage
async function hashPin(pin) {
    return await argon2.hash(preparePin(pin), {
        type: argon2.argon2id,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1
    });
}

// Check an entered PIN against the stored hash
async function verifyPin(pin, storedHash) {
    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
        return false;
    }

    return await argon2.verify(storedHash, preparePin(pin));
}


function deriveAuthPassword(email, pin) {
    if (typeof email !== "string" || !email.trim()) {
        throw new Error("Email is required.");
    }

    // Reuse the protected PIN from our existing function
    const protectedPin = preparePin(pin);

    // Generate an internal credential specific to this customer
    return crypto
        .createHash("sha256")
        .update(
            `revent-auth-v1:${email.trim().toLowerCase()}:${protectedPin}`
        )
        .digest("hex");
}


module.exports = {
    hashPin,
    verifyPin,
    deriveAuthPassword
};
