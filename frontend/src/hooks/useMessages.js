// src/hooks/useMessages.js
import { useContext } from "react";
import MessagesContext from "../context/MessagesContext";

export function useMessages() {
  return useContext(MessagesContext);
}
