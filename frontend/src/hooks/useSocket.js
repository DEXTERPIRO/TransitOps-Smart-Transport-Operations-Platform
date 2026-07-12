import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '../store/authStore';

let socketInstance = null;

export const useSocket = () => {
  const { token } = useAuthStore();
  // useState so components re-render when socket becomes available
  const [socket, setSocket] = useState(socketInstance);

  useEffect(() => {
    if (!token) return;

    if (!socketInstance) {
      socketInstance = io('http://localhost:5000', {
        auth: { token },
        transports: ['websocket'],
      });
    }

    // Trigger re-render in consumers so they can attach listeners
    setSocket(socketInstance);

    return () => {
      // Keep socket alive across component unmounts
    };
  }, [token]);

  return socket;
};

export const getSocket = () => socketInstance;
