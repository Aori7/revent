
const supabaseAdmin = require("../config/supabaseAdmin");

const { hashPin } = require("./pinService");

async function savePinCredentials(userId, pin) {

    // Step 1: Validate the user ID
    if (!userId || typeof userId !== "string") {
        throw new Error("Valid user ID is required.");
    }

    // Step 2: Securely hash the customer's PIN
    const pinHash = await hashPin(pin);

    // Step 3: Save the PIN hash in Supabase
    const { error } = await supabaseAdmin
        .from("user_pin_credentials")
        .insert({
            user_id: userId,
            pin_hash: pinHash
        });

    // Step 4: Handle database errors
    if (error) {
        console.error("PIN storage failed:", error.code);
        throw new Error("Unable to save PIN credentials.");
    }

    // Step 5: Confirm successful storage
    return { success: true };
}

module.exports = { savePinCredentials };
