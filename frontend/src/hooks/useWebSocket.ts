import { useEffect, useRef, useState, useCallback } from 'react';

export interface WsMessage {
  type: 'signal' | 'trade' | 'portfolio_update' | 'price_update' | 'market_update';
  payload: unknown;
}

export function useWebSocket(url: string) {
  const [connected, setConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WsMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen    = () => setConnected(true);
    ws.onclose   = () => { setConnected(false); retryRef.current = setTimeout(connect, 3000); };
    ws.onerror   = () => ws.close();
    ws.onmessage = (e) => { try { setLastMessage(JSON.parse(e.data) as WsMessage); } catch {} };
  }, [url]);

  useEffect(() => {
    connect();
    return () => {
      if (retryRef.current) clearTimeout(retryRef.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { connected, lastMessage };
}
