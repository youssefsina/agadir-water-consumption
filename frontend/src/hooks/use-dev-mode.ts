import { useState, useEffect } from "react";

export function useDevMode() {
    const [devMode, setDevMode] = useState(false);

    useEffect(() => {
        const handleStorage = () => {
            setDevMode(localStorage.getItem("devMode") === "true");
        };
        handleStorage(); // init

        window.addEventListener("storage", handleStorage);
        window.addEventListener("devModeChanged", handleStorage);

        return () => {
            window.removeEventListener("storage", handleStorage);
            window.removeEventListener("devModeChanged", handleStorage);
        };
    }, []);

    const toggleDevMode = (v: boolean) => {
        localStorage.setItem("devMode", String(v));
        setDevMode(v);
        window.dispatchEvent(new Event("devModeChanged"));
    };

    return { devMode, toggleDevMode };
}
