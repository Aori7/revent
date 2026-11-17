const API_URL = "http://localhost:3000";

export async function loginCustomer(accessCode, pin) {
    const response = await fetch(
        "http://localhost:3000/api/auth/login",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                access_code: accessCode,
                pin: pin
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Login failed.");
    }

    return data;
}

export async function registerCustomer(fullName, email, pin) {
    const response = await fetch(
        "http://localhost:3000/api/auth/register",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                full_name: fullName,
                email: email,
                pin: pin
            })
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(data.error || "Registration failed.");
    }

    return data;
}


export async function getCurrentUser(token, signal) {
    const response = await fetch(
        "http://localhost:3000/api/auth/me",
        {
            method: "GET",
            headers: {
                Authorization: `Bearer ${token}`
            },
            signal
        }
    );

    if (!response.ok) {
        const error = new Error("Session verification failed.");
        error.status = response.status;
        throw error;
    }

    return await response.json();
}


export async function logoutCustomer(token) {
    const response = await fetch(
        "http://localhost:3000/api/auth/logout",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    );

    if (!response.ok) {
        throw new Error("Unable to complete server logout.");
    }
}
