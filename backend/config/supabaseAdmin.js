
const { createClient } = require("@supabase/supabase-js");
const path = require("node:path");

require("dotenv").config({
    path: path.resolve(__dirname, "../.env")
});

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !secretKey) {
    throw new Error(
        "Missing Supabase URL or backend secret key."
    );
}

const supabaseAdmin = createClient(
    supabaseUrl,
    secretKey,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    }
);

module.exports = supabaseAdmin;
