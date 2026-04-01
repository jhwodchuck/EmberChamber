"use client";

import { useEffect, useRef, useCallback, useState } from "react";

type WSEventHandler = (event: unknown) => void;

interface UseWebSocketOptions {
  onMessage?: WSEventHandler;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const handlersRef = useRef(options);
  handlersRef.current = options;

  const connect = useCallback(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) return;

    const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:3001"}/ws?token=${token}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      handlersRef.current.onConnect?.();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        handlersRef.current.onMessage?.(data);
      } catch {
        // ignore
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      handlersRef.current.onDisconnect?.();
      wsRef.current = null;
      // Reconnect after 3 seconds
      setTimeout(() => connect(), 3000);
    };

    ws.onerror = () => {
      ws.close();
    };
  }, []);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.onclose = null; // prevent reconnect
      wsRef.current.close();
      wsRef.current = null;
      setIsConnected(false);
    }
  }, []);

  const send = useCallback((data: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  return { isConnected, send, disconnect, connect };
}
