
const supabase = require("../config/supabaseClient");

async function requireAuth(req, res, next) {
  // STEP 1: Retrieve the Authorization header
  const authHeader = req.headers.authorization;

  // STEP 2: Check whether the token was provided
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      error: "Authentication required."
    });
  }

  // STEP 3: Extract the access token
  const token = authHeader.slice(7).trim();

  if (!token) {
    return res.status(401).json({
      error: "Authentication required."
    });
  }

  try {
    // STEP 4: Ask Supabase to verify the token
    const { data: { user }, error } =
      await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: "Invalid or expired session."
      });
    }

    // STEP 5: Store verified user details for this request
    req.user = {
      id: user.id,
      email: user.email
    };

    // STEP 6: Allow the request to continue
    next();

  } catch (error) {
    console.error("Authentication verification failed:", error.message);

    return res.status(503).json({
      error: "Unable to verify authentication."
    });
  }
}

module.exports = { requireAuth };
