
require("dotenv").config();

const { hashPin, verifyPin } = require("../services/pinService");

async function test() {
    const pin = "482716"; // Test PIN only

    const hashedPin = await hashPin(pin);

    console.log(
        "Correct PIN:",
        await verifyPin("482716", hashedPin)
    );

    console.log(
        "Incorrect PIN:",
        await verifyPin("111111", hashedPin)
    );

    console.log(
        "Stored as plaintext:",
        hashedPin === pin
    );
}

test().catch(error => {
    console.error("PIN test failed:", error.message);
    process.exitCode = 1;
});
