'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5001';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinCampaign: (campaignId: string) => void;
  leaveCampaign: (campaignId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

interface SocketProviderProps {
  children: ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socketInstance = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionDelay: 1000,
      reconnection: true,
      reconnectionAttempts: 10,
    });

    socketInstance.on('connect', () => {
      console.log('Socket.IO connected:', socketInstance.id);
      setIsConnected(true);
    });

    socketInstance.on('disconnect', () => {
      console.log('Socket.IO disconnected');
      setIsConnected(false);
    });

    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error);
    });

    setSocket(socketInstance);

    // Cleanup on unmount
    return () => {
      socketInstance.disconnect();
    };
  }, []);

  const joinCampaign = (campaignId: string) => {
    if (socket && isConnected) {
      socket.emit('join-campaign', campaignId);
      console.log(`Joined campaign room: ${campaignId}`);
    }
  };

  const leaveCampaign = (campaignId: string) => {
    if (socket && isConnected) {
      socket.emit('leave-campaign', campaignId);
      console.log(`Left campaign room: ${campaignId}`);
    }
  };

  const value = {
    socket,
    isConnected,
    joinCampaign,
    leaveCampaign,
  };

  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
};

// Custom hook for campaign updates
export const useCampaignUpdates = (
  campaignId: string,
  onUpdate?: (data: any) => void,
  onNewContribution?: (data: any) => void,
  onCompleted?: (data: any) => void
) => {
  const { socket, isConnected, joinCampaign, leaveCampaign } = useSocket();

  useEffect(() => {
    if (!campaignId || !socket || !isConnected) return;

    // Join the campaign room
    joinCampaign(campaignId);

    // Listen for campaign updates
    if (onUpdate) {
      socket.on('campaign-updated', onUpdate);
    }

    if (onNewContribution) {
      socket.on('new-contribution', onNewContribution);
    }

    if (onCompleted) {
      socket.on('campaign-completed', onCompleted);
    }

    // Cleanup
    return () => {
      leaveCampaign(campaignId);
      if (onUpdate) socket.off('campaign-updated', onUpdate);
      if (onNewContribution) socket.off('new-contribution', onNewContribution);
      if (onCompleted) socket.off('campaign-completed', onCompleted);
    };
  }, [campaignId, socket, isConnected]);
};
