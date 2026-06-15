const API_BASE = "https://adapt-3s27.onrender.com";
const AUTH_KEY = "adpt_auth";

const password = document.getElementById("password");
const confirmPassword = document.getElementById("confirmPassword");
const togglePassword = document.getElementById("togglePassword");
const toggleConfirmPassword = document.getElementById("toggleConfirmPassword");
const signupForm = document.getElementById("signupForm");
const nameInput = document.getElementById("signupName");
const emailInput = document.getElementById("signupEmail");

function setAuthState(auth) {
    const seconds = Number(auth.expiresIn || auth.expires_in || 3600);
    const normalized = {
        ...auth,
        idToken: auth.idToken || auth.id_token,
        refreshToken: auth.refreshToken || auth.refresh_token,
        uid: auth.uid || auth.localId || auth.user_id,
        expiresAt: Date.now() + ((Number.isFinite(seconds) ? seconds : 3600) * 1000)
    };

    localStorage.setItem(AUTH_KEY, JSON.stringify(normalized));
}


function getRedirectTarget() {
    const params = new URLSearchParams(window.location.search);
    const next = params.get("next");
    if (!next) return "profile.html";

    try {
        const decoded = decodeURIComponent(next);
        if (decoded.startsWith("/") && !decoded.startsWith("//")) {
            return decoded;
        }
    } catch (_) {}

    return "profile.html";
}

async function postJson(path, body) {
    const response = await fetch(`${API_BASE}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.detail || "Request failed. Please try again.");
    }

    return data;
}

togglePassword.addEventListener("click", () => {
    if (password.type === "password") {
        password.type = "text";
        togglePassword.textContent = "🙈";
    } else {
        password.type = "password";
        togglePassword.textContent = "👁";
    }
});

toggleConfirmPassword.addEventListener("click", () => {
    if (confirmPassword.type === "password") {
        confirmPassword.type = "text";
        toggleConfirmPassword.textContent = "🙈";
    } else {
        confirmPassword.type = "password";
        toggleConfirmPassword.textContent = "👁";
    }
});

signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const displayName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const passwordValue = password.value;
    const confirmPasswordValue = confirmPassword.value;

    if (!displayName || !email || !passwordValue || !confirmPasswordValue) {
        alert("Please fill all fields.");
        return;
    }

    if (passwordValue !== confirmPasswordValue) {
        alert("Passwords do not match!");
        return;
    }

    const submitButton = signupForm.querySelector("button[type='submit']");
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Creating...";

    try {
        await postJson("/auth/signup", {
            display_name: displayName,
            email,
            password: passwordValue
        });

        const loginData = await postJson("/auth/login", {
            email,
            password: passwordValue
        });

        setAuthState({
            idToken: loginData.idToken,
            refreshToken: loginData.refreshToken,
            uid: loginData.localId,
            email: loginData.email || email,
            displayName: loginData.displayName || displayName
        });

        window.location.href = getRedirectTarget();
    } catch (error) {
        alert(error.message);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});

const googleButton = document.querySelector(".google-btn");
if (googleButton) {
    googleButton.addEventListener("click", () => {
        alert("Google sign-in is not enabled in this demo yet.");
    });
}
