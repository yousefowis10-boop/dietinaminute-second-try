import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import API from "../hooks/useApi";

export default function Login() {
    const { setUserFromLogin, refreshProfile } = useAuth();
    const navigate = useNavigate();

    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [activeTab, setActiveTab] = useState("login");

    const [signupForm, setSignupForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        confirm_password: "",
    });

    const handleLogin = async () => {
        try {
            let uName = username.toLowerCase()
            const res = await API.post("/auth/login/", { username: uName, password });
            localStorage.setItem("access", res.data.access);
            localStorage.setItem("refresh", res.data.refresh);
            await setUserFromLogin();
            await refreshProfile();
            navigate("/dashboard");
        } catch (err) {
            console.error("Login error:", err);
            toast.error("Login failed");
        }
    };

    const handleSignup = async () => {
        if (signupForm.password !== signupForm.confirm_password) {
            toast.error("Passwords do not match.");
            return;
        }

        try {
            await API.post("/auth/register/", {
                username: signupForm.email.toLowerCase(),
                email: signupForm.email.toLowerCase(),
                password: signupForm.password,
                first_name: signupForm.first_name,
                last_name: signupForm.last_name,
            });
            toast.success("Signup successful!");
            setActiveTab("login");
        } catch (err) {
            console.error("Signup error:", err);
            toast.error("Signup failed");
        }
    };

    const handleClick = async () => {
        if (activeTab === "login") {
            handleLogin();
        } else {
            handleSignup();
        }
    };



    return (
        <div className="min-h-screen w-full bg-[#f7f3ef] relative overflow-hidden">
            {/* Top Left Logo */}
            <div className="absolute top-6 left-6">
                <img src="/logo.png" alt="Logo" className="h-40 w-auto" />
            </div>
            {/* Centered Panel */}
            <div className="flex flex-col items-center justify-center min-h-screen px-4">
                <div>
                    <h1 className='text-[#7c5f4d] uppercase text-5xl font-serif tracking-wider mb-12' >The One Minute Diet Plan</h1>
                </div>
                <div className="bg-white shadow-2xl rounded-2xl p-8 w-full max-w-md space-y-6">
                    {/* Title */}
                    <h2 className="text-xl font-semibold text-center text-gray-800">
                        {activeTab === "login"
                            ? "Login to Your Account"
                            : "Create an Account"}
                    </h2>

                    {/* Tab Switcher */}
                    <div className="flex w-full rounded-full overflow-hidden bg-[#e7d8ce]">
                        <button
                            onClick={() => setActiveTab("login")}
                            className={`flex-1 py-2 text-sm font-medium transition ${
                                activeTab === "login"
                                    ? "bg-[#7c5f4d] text-white"
                                    : "text-gray-700"
                            }`}
                        >
                            Login
                        </button>
                        <button
                            onClick={() => setActiveTab("signup")}
                            className={`flex-1 py-2 text-sm font-medium transition ${
                                activeTab === "signup"
                                    ? "bg-[#7c5f4d] text-white"
                                    : "text-gray-700"
                            }`}
                        >
                            Signup
                        </button>
                    </div>

                    {/* Input Fields */}
                    {activeTab === "login" ? (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="Email"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#c8b4a8]"
                            />
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input
                                type="text"
                                placeholder="First Name"
                                value={signupForm.first_name}
                                onChange={(e) =>
                                    setSignupForm({...signupForm, first_name: e.target.value})
                                }
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-[#c8b4a8]"
                            />
                            <input
                                type="text"
                                placeholder="Last Name"
                                value={signupForm.last_name}
                                onChange={(e) =>
                                    setSignupForm({...signupForm, last_name: e.target.value})
                                }
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-[#c8b4a8]"
                            />
                            <input
                                type="email"
                                placeholder="Email"
                                value={signupForm.email}
                                onChange={(e) =>
                                    setSignupForm({...signupForm, email: e.target.value})
                                }
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-[#c8b4a8]"
                            />
                            <input
                                type="password"
                                placeholder="Password"
                                value={signupForm.password}
                                onChange={(e) =>
                                    setSignupForm({...signupForm, password: e.target.value})
                                }
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-[#c8b4a8]"
                            />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={signupForm.confirm_password}
                                onChange={(e) =>
                                    setSignupForm({
                                        ...signupForm,
                                        confirm_password: e.target.value,
                                    })
                                }
                                className="w-full px-4 py-2 rounded-md border border-gray-300 focus:ring-[#c8b4a8]"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleClick}
                        className="w-full bg-[#7c5f4d] hover:bg-[#6a4d3d] text-white font-medium rounded-full py-2 transition shadow"
                    >
                        {activeTab === "login" ? "Login" : "Sign up"}
                    </button>
                </div>
            </div>
        </div>
    );
}