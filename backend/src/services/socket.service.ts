import { Server as SocketIOServer } from 'socket.io';

/**
 * Socket.IO Service for real-time updates
 */
class SocketService {
  private io: SocketIOServer | null = null;

  /**
   * Initialize Socket.IO instance
   */
  initialize(io: SocketIOServer): void {
    this.io = io;
    this.setupEventHandlers();
    console.log('✅ Socket.IO service initialized');
  }

  /**
   * Set up Socket.IO event handlers
   */
  private setupEventHandlers(): void {
    if (!this.io) return;

    this.io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);

      // Handle room joining for specific campaigns
      socket.on('join-campaign', (campaignId: string) => {
        socket.join(`campaign-${campaignId}`);
        console.log(`📢 Client ${socket.id} joined campaign room: ${campaignId}`);
      });

      // Handle leaving campaign rooms
      socket.on('leave-campaign', (campaignId: string) => {
        socket.leave(`campaign-${campaignId}`);
        console.log(`📤 Client ${socket.id} left campaign room: ${campaignId}`);
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });
  }

  /**
   * Emit campaign update event
   * Broadcasts to all clients watching a specific campaign
   */
  emitCampaignUpdate(campaignId: string, data: {
    currentAmount: number;
    completionPercentage: number;
    newContribution?: {
      amount: number;
      isAnonymous: boolean;
      donorName?: string;
    };
  }): void {
    if (!this.io) {
      console.warn('⚠️  Socket.IO not initialized. Cannot emit campaign update.');
      return;
    }

    const roomName = `campaign-${campaignId}`;
    this.io.to(roomName).emit('campaign-updated', {
      campaignId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`📡 Emitted campaign update to room: ${roomName}`, {
      campaignId,
      currentAmount: data.currentAmount,
      completionPercentage: data.completionPercentage,
    });
  }

  /**
   * Emit new contribution event
   * Broadcasts to all clients watching a specific campaign
   */
  emitNewContribution(campaignId: string, contributionData: {
    amount: number;
    isAnonymous: boolean;
    donorName?: string;
    paymentMethod: string;
  }): void {
    if (!this.io) {
      console.warn('⚠️  Socket.IO not initialized. Cannot emit new contribution.');
      return;
    }

    const roomName = `campaign-${campaignId}`;
    this.io.to(roomName).emit('new-contribution', {
      campaignId,
      ...contributionData,
      timestamp: new Date().toISOString(),
    });

    console.log(`🎉 Emitted new contribution to room: ${roomName}`, contributionData);
  }

  /**
   * Broadcast campaign completion event
   */
  emitCampaignCompleted(campaignId: string, data: {
    goalAmount: number;
    currentAmount: number;
    totalContributions: number;
  }): void {
    if (!this.io) {
      console.warn('⚠️  Socket.IO not initialized. Cannot emit campaign completion.');
      return;
    }

    const roomName = `campaign-${campaignId}`;
    this.io.to(roomName).emit('campaign-completed', {
      campaignId,
      ...data,
      timestamp: new Date().toISOString(),
    });

    console.log(`🏆 Emitted campaign completion to room: ${roomName}`);
  }

  /**
   * Get Socket.IO instance
   */
  getIO(): SocketIOServer | null {
    return this.io;
  }
}

// Export singleton instance
export default new SocketService();
