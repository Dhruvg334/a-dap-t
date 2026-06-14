const API_BASE = "https://adapt-3s27.onrender.com";
const AUTH_KEY = "adpt_auth";

const togglePassword = document.getElementById("togglePassword");
const password = document.getElementById("password");
const signinForm = document.getElementById("signinForm");
const emailInput = document.getElementById("signinEmail");

function setAuthState(auth) {
    localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
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

signinForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = emailInput.value.trim();
    const passwordValue = password.value;

    if (!email || !passwordValue) {
        alert("Please enter your email and password.");
        return;
    }

    const submitButton = signinForm.querySelector("button[type='submit']");
    const originalText = submitButton.textContent;
    submitButton.disabled = true;
    submitButton.textContent = "Signing in...";

    try {
        const data = await postJson("/auth/login", {
            email,
            password: passwordValue
        });

        setAuthState({
            idToken: data.idToken,
            refreshToken: data.refreshToken,
            uid: data.localId,
            email: data.email || email,
            displayName: data.displayName || "A-DAP-T User"
        });

        window.location.href = "profile.html";
    } catch (error) {
        alert(error.message);
        submitButton.disabled = false;
        submitButton.textContent = originalText;
    }
});

const aboutBtn = document.getElementById("aboutBtn");
const modal = document.getElementById("aboutModal");
const closeBtn = document.querySelector(".close-btn");

aboutBtn.addEventListener("click", () => {
    modal.style.display = "flex";
});

closeBtn.addEventListener("click", () => {
    modal.style.display = "none";
});

window.addEventListener("click", (e) => {
    if (e.target === modal) {
        modal.style.display = "none";
    }
});
