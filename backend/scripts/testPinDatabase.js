
const supabaseAdmin = require("../config/supabaseAdmin");

async function testConnection() {
    const { count, error } = await supabaseAdmin
        .from("user_pin_credentials")
        .select("*", {
            count: "exact",
            head: true
        });

    if (error) {
        console.error("Connection failed:", error.message);
        return;
    }

    console.log("PIN database connection successful!");
    console.log("Existing PIN records:", count);
}

testConnection().catch((error) => {
    console.error("Test failed:", error.message);
});
