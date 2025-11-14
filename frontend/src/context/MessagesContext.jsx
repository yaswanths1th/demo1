import React, { useState, useEffect } from "react";
import axios from "axios";
import { MessagesContext } from "./MessagesContext";

export const MessagesProvider = ({ children }) => {
  const [constants, setConstants] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadConstants = async () => {
      try {
        const res = await axios.get("http://127.0.0.1:8000/api/auth/constants/");
        setConstants(res.data);
      } catch (err) {
        console.error("Failed fetching constants:", err);
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
};
