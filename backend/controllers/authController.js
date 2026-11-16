const { createClient } = require("@supabase/supabase-js");
const supabaseAdmin = require("../config/supabaseAdmin");
const { savePinCredentials } = require("../services/pinCredentialsService");
const {
    verifyPin,
    deriveAuthPassword
} = require("../services/pinService");

async function register(req, res) {
    const { full_name, email, pin } = req.body || {};

    // 1. Validate the customer's details
    if (
        typeof full_name !== "string" ||
        !full_name.trim() ||
        full_name.trim().length > 120
    ) {
        return res.status(400).json({
            error: "Please enter a valid full name."
        });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
        typeof email !== "string" ||
        email.length > 254 ||
        !emailRegex.test(email.trim())
    ) {
        return res.status(400).json({
            error: "Please enter a valid email address."
        });
    }

    if (typeof pin !== "string" || !/^\d{6}$/.test(pin)) {
        return res.status(400).json({
            error: "PIN must contain exactly 6 digits."
        });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        // 2. Create an internal Supabase credential
        const authPassword = deriveAuthPassword(
            normalizedEmail,
            pin
        );

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        // 3. Register the customer in Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email: normalizedEmail,
            password: authPassword,
            options: {
                data: {
                    full_name: full_name.trim()
                },
                emailRedirectTo: "http://localhost:5173/login"
            }
        });

        if (error) {
            console.error("Supabase signup failed:", error.message);

            return res.status(400).json({
                error: "Registration could not be completed."
            });
        }

        // Do not treat an obfuscated existing-user response
        // as a newly created account.
        if (
            !data.user?.id ||
            (Array.isArray(data.user.identities) &&
             data.user.identities.length === 0)
        ) {
            return res.status(400).json({
                error: "Registration could not be completed with this email."
            });
        }

        // 4. Store the customer's hashed PIN
        try {
            await savePinCredentials(data.user.id, pin);
        } catch (pinError) {
            console.error("PIN setup failed:", pinError.message);

            // Best-effort cleanup of the newly created profile.
            const { error: profileError } = await supabaseAdmin
                .from("users")
                .delete()
                .eq("user_id", data.user.id);

            if (profileError) {
                console.error(
                    "Profile cleanup failed:",
                    profileError.message
                );
            } else {
                const { error: deleteError } =
                    await supabaseAdmin.auth.admin.deleteUser(data.user.id);

                if (deleteError) {
                    console.error(
                        "Auth cleanup failed:",
                        deleteError.message
                    );
                }
            }

            return res.status(503).json({
                error: "Registration setup failed. Please contact support before retrying."
            });
        }

        // 5. Registration completed
        return res.status(201).json({
            message: "Registration successful! Please check your email to verify your account and retrieve your Access Code."
        });

    } catch (error) {
        console.error("Registration error:", error.message);

        return res.status(500).json({
            error: "An unexpected error occurred during registration."
        });
    }
}


async function login(req, res) {
    const { access_code, pin } = req.body || {};

    // 1. Validate Access Code and PIN
    if (
        typeof access_code !== "string" ||
        !/^\d{6}$/.test(access_code)
    ) {
        return res.status(400).json({
            error: "Please enter a valid 6-digit Access Code."
        });
    }

    if (
        typeof pin !== "string" ||
        !/^\d{6}$/.test(pin)
    ) {
        return res.status(400).json({
            error: "Please enter a valid 6-digit PIN."
        });
    }

    try {
        // 2. Find the customer using their Access Code
        const { data: customer, error: customerError } =
            await supabaseAdmin
                .from("users")
                .select("user_id, email, account_status")
                .eq("access_code", access_code)
                .maybeSingle();

        if (customerError) {
            throw customerError;
        }

        if (
            !customer ||
            customer.account_status !== "ACTIVE"
        ) {
            return res.status(401).json({
                error: "Invalid Access Code or PIN."
            });
        }

        // 3. Retrieve the customer's stored PIN hash
        const { data: credentials, error: credentialsError } =
            await supabaseAdmin
                .from("user_pin_credentials")
                .select("pin_hash, failed_attempts, locked_until")
                .eq("user_id", customer.user_id)
                .maybeSingle();

        if (credentialsError) {
            throw credentialsError;
        }

        if (!credentials) {
            return res.status(401).json({
                error: "Invalid Access Code or PIN."
            });
        }

        // 4. Check whether the account is locked
        const now = Date.now();

        if (
            credentials.locked_until &&
            new Date(credentials.locked_until).getTime() > now
        ) {
            return res.status(429).json({
                error: "Account temporarily locked. Please try again later."
            });
        }

        // 5. Verify the PIN against the stored hash
        const pinValid = await verifyPin(
            pin,
            credentials.pin_hash
        );

        if (!pinValid) {
            const previousAttempts =
                credentials.locked_until
                    ? 0
                    : credentials.failed_attempts;

            const attempts = previousAttempts + 1;

            const lockedUntil =
                attempts >= 5
                    ? new Date(now + 15 * 60 * 1000).toISOString()
                    : null;

            const { error: updateError } = await supabaseAdmin
                .from("user_pin_credentials")
                .update({
                    failed_attempts: attempts,
                    locked_until: lockedUntil,
                    updated_at: new Date().toISOString()
                })
                .eq("user_id", customer.user_id);

            if (updateError) {
                throw updateError;
            }

            return res.status(401).json({
                error: "Invalid Access Code or PIN."
            });
        }

        // 6. Derive the internal Supabase credential
        const authPassword = deriveAuthPassword(
            customer.email,
            pin
        );

        const supabase = createClient(
            process.env.VITE_SUPABASE_URL,
            process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            {
                auth: {
                    persistSession: false,
                    autoRefreshToken: false,
                    detectSessionInUrl: false
                }
            }
        );

        // 7. Authenticate with Supabase
        const { data, error } =
            await supabase.auth.signInWithPassword({
                email: customer.email,
                password: authPassword
            });

        if (error || !data.session?.access_token) {
            return res.status(401).json({
                error: "Unable to log in. Check your credentials and email verification."
            });
        }

        // 8. Reset failed attempts after successful login
        const { error: resetError } = await supabaseAdmin
            .from("user_pin_credentials")
            .update({
                failed_attempts: 0,
                locked_until: null,
                updated_at: new Date().toISOString()
            })
            .eq("user_id", customer.user_id);

        if (resetError) {
            throw resetError;
        }

        // 9. Return the authenticated session
        return res.status(200).json({
            message: "Login successful.",
            user: {
                id: data.user.id,
                email: data.user.email
            },
            session: {
                access_token: data.session.access_token,
                expires_at: data.session.expires_at
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(503).json({
            error: "Unable to process login. Please try again."
        });
    }
}



async function logout(req, res) {
  try {
    const response = await fetch(
      `${process.env.VITE_SUPABASE_URL}/auth/v1/logout?scope=local`,
      {
        method: "POST",
        headers: {
          apikey: process.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: req.headers.authorization
        }
      }
    );

    if (!response.ok) {
      return res.status(502).json({
        error: "Unable to log out. Please try again."
      });
    }

    return res.status(204).send();

  } catch (error) {
    console.error("Logout error:", error.message);

    return res.status(503).json({
      error: "Logout service unavailable."
    });
  }
}


module.exports = { register, login, logout };