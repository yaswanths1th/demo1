import { useState, useEffect } from "react";
import api from "../utils/api";
import MessagesContext from "./MessagesContext";

export default function MessagesProvider({ children }) {
  const [constants, setConstants] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConstants = async () => {
      try {
        const res = await api.get("/api/auth/constants/");
        setConstants(res.data);
      } catch (err) {
        console.error("Failed loading constants:", err);
      } finally {
        setLoading(false);
      }
    };

    loadConstants();
  }, []);

  return (
    <MessagesContext.Provider value={{ constants, loading }}>
      {children}
    </MessagesContext.Provider>
  );
}
