import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { playCallChime } from '../utils/sound';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [lastQueueEvent, setLastQueueEvent] = useState(null);
  const [activeAlert, setActiveAlert] = useState(null);

  useEffect(() => {
    // Request browser notification permission once user logs in
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const newSocket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });

    newSocket.on('connect', () => {
      console.log('[Socket.IO Client] Connected with ID:', newSocket.id);

      if (user) {
        if (user.role === 'STUDENT' && user.studentId) {
          newSocket.emit('join:student', user.studentId);
        } else if ((user.role === 'LIBRARY_STAFF' || user.role === 'FEES_STAFF')) {
          if (user.assignedCounter?.id) {
            newSocket.emit('join:counter', user.assignedCounter.id);
          }
          if (user.departmentCode) {
            newSocket.emit('join:dept', user.departmentCode);
          }
        } else if (user.role === 'ADMIN') {
          newSocket.emit('join:admin');
        }
      }
    });

    // Listen for queue updates
    newSocket.on('queue:updated', (data) => {
      setLastQueueEvent({ type: 'queue:updated', data, timestamp: Date.now() });
    });

    // Listen for counter status changes
    newSocket.on('counter:status', (data) => {
      setLastQueueEvent({ type: 'counter:status', data, timestamp: Date.now() });
    });

    // Listen for token called
    newSocket.on('token:called', (data) => {
      console.log('[Socket.IO Client] token:called event:', data);
      setLastQueueEvent({ type: 'token:called', data, timestamp: Date.now() });

      // If this alert is for the logged in student
      if (user?.role === 'STUDENT' && data.studentId === user.studentId) {
        playCallChime();
        setActiveAlert({
          type: 'CALLED',
          title: '🔔 YOUR TURN NOW!',
          tokenNumber: data.tokenNumber,
          counterName: data.counterName,
          serviceName: data.serviceName,
          message: `Please proceed immediately to ${data.counterName}!`
        });

        // Trigger native browser notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`YOUR TURN: Token ${data.tokenNumber}`, {
            body: `Please proceed to ${data.counterName} for ${data.serviceName}.`,
            icon: '/favicon.ico'
          });
        }
      }
    });

    // Listen for token serving
    newSocket.on('token:serving', (data) => {
      setLastQueueEvent({ type: 'token:serving', data, timestamp: Date.now() });
      if (user?.role === 'STUDENT' && data.studentId === user.studentId) {
        setActiveAlert({
          type: 'SERVING',
          title: 'Service In Progress',
          tokenNumber: data.tokenNumber,
          counterName: data.counterName,
          message: `You are currently being served at ${data.counterName}.`
        });
      }
    });

    // Listen for token completed
    newSocket.on('token:completed', (data) => {
      setLastQueueEvent({ type: 'token:completed', data, timestamp: Date.now() });
      if (user?.role === 'STUDENT' && data.studentId === user.studentId) {
        setActiveAlert({
          type: 'COMPLETED',
          title: '✓ Service Completed',
          tokenNumber: data.tokenNumber,
          counterName: data.counterName,
          message: `Your service at ${data.counterName} has ended successfully.`
        });
      }
    });

    // Listen for token skipped
    newSocket.on('token:skipped', (data) => {
      setLastQueueEvent({ type: 'token:skipped', data, timestamp: Date.now() });
      if (user?.role === 'STUDENT' && data.studentId === user.studentId) {
        setActiveAlert({
          type: 'SKIPPED',
          title: '⚠️ Token Skipped',
          tokenNumber: data.tokenNumber,
          counterName: data.counterName,
          message: `Your token was marked skipped (${data.reason || 'No show'}).`
        });
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [user]);

  const clearActiveAlert = () => setActiveAlert(null);

  return (
    <SocketContext.Provider
      value={{
        socket,
        lastQueueEvent,
        activeAlert,
        clearActiveAlert
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
