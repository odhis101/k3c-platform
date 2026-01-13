import { Server } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { io as ioClient, Socket as ClientSocket } from 'socket.io-client';
import socketService from '../services/socket.service';

describe('Socket.IO Real-time Updates', () => {
  let httpServer: Server;
  let io: SocketIOServer;
  let clientSocket: ClientSocket;
  const PORT = 5555;

  beforeAll((done) => {
    // Create HTTP server and Socket.IO instance for testing
    httpServer = require('http').createServer();
    io = new SocketIOServer(httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    // Initialize socket service
    socketService.initialize(io);

    // Start server
    httpServer.listen(PORT, () => {
      done();
    });
  });

  afterAll((done) => {
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
    io.close();
    httpServer.close(done);
  });

  beforeEach((done) => {
    // Connect client before each test
    clientSocket = ioClient(`http://localhost:${PORT}`);
    clientSocket.on('connect', done);
  });

  afterEach(() => {
    // Disconnect client after each test
    if (clientSocket && clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection Management', () => {
    it('should connect client successfully', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should disconnect client successfully', (done) => {
      clientSocket.on('disconnect', () => {
        expect(clientSocket.connected).toBe(false);
        done();
      });
      clientSocket.disconnect();
    });
  });

  describe('Campaign Room Management', () => {
    it('should allow client to join campaign room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';

      clientSocket.emit('join-campaign', campaignId);

      // Give it a moment to process
      setTimeout(() => {
        done();
      }, 100);
    });

    it('should allow client to leave campaign room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';

      clientSocket.emit('join-campaign', campaignId);

      setTimeout(() => {
        clientSocket.emit('leave-campaign', campaignId);
        setTimeout(done, 100);
      }, 100);
    });
  });

  describe('Campaign Update Events', () => {
    it('should emit campaign-updated event to campaign room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';
      const updateData = {
        currentAmount: 5000,
        completionPercentage: 50,
        newContribution: {
          amount: 1000,
          isAnonymous: false,
          donorName: 'John Doe',
        },
      };

      // Join campaign room
      clientSocket.emit('join-campaign', campaignId);

      // Listen for campaign update
      clientSocket.on('campaign-updated', (data: any) => {
        expect(data).toMatchObject({
          campaignId,
          currentAmount: updateData.currentAmount,
          completionPercentage: updateData.completionPercentage,
          newContribution: updateData.newContribution,
        });
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit update after joining room
      setTimeout(() => {
        socketService.emitCampaignUpdate(campaignId, updateData);
      }, 100);
    });

    it('should not receive campaign-updated event if not in room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';
      const updateData = {
        currentAmount: 5000,
        completionPercentage: 50,
      };

      let receivedEvent = false;

      // Listen for campaign update (but don't join room)
      clientSocket.on('campaign-updated', () => {
        receivedEvent = true;
      });

      // Emit update
      socketService.emitCampaignUpdate(campaignId, updateData);

      // Wait and verify no event was received
      setTimeout(() => {
        expect(receivedEvent).toBe(false);
        done();
      }, 200);
    });
  });

  describe('New Contribution Events', () => {
    it('should emit new-contribution event to campaign room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';
      const contributionData = {
        amount: 1000,
        isAnonymous: false,
        donorName: 'Jane Smith',
        paymentMethod: 'mpesa',
      };

      // Join campaign room
      clientSocket.emit('join-campaign', campaignId);

      // Listen for new contribution
      clientSocket.on('new-contribution', (data: any) => {
        expect(data).toMatchObject({
          campaignId,
          ...contributionData,
        });
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit contribution after joining room
      setTimeout(() => {
        socketService.emitNewContribution(campaignId, contributionData);
      }, 100);
    });

    it('should emit anonymous contribution correctly', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';
      const contributionData = {
        amount: 500,
        isAnonymous: true,
        paymentMethod: 'card',
      };

      // Join campaign room
      clientSocket.emit('join-campaign', campaignId);

      // Listen for new contribution
      clientSocket.on('new-contribution', (data: any) => {
        expect(data.isAnonymous).toBe(true);
        expect(data.donorName).toBeUndefined();
        expect(data.amount).toBe(500);
        done();
      });

      // Emit contribution
      setTimeout(() => {
        socketService.emitNewContribution(campaignId, contributionData);
      }, 100);
    });
  });

  describe('Campaign Completion Events', () => {
    it('should emit campaign-completed event to campaign room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';
      const completionData = {
        goalAmount: 10000,
        currentAmount: 10500,
        totalContributions: 25,
      };

      // Join campaign room
      clientSocket.emit('join-campaign', campaignId);

      // Listen for campaign completion
      clientSocket.on('campaign-completed', (data: any) => {
        expect(data).toMatchObject({
          campaignId,
          ...completionData,
        });
        expect(data).toHaveProperty('timestamp');
        done();
      });

      // Emit completion after joining room
      setTimeout(() => {
        socketService.emitCampaignCompleted(campaignId, completionData);
      }, 100);
    });
  });

  describe('Multiple Clients', () => {
    let secondClient: ClientSocket;

    beforeEach((done) => {
      secondClient = ioClient(`http://localhost:${PORT}`);
      secondClient.on('connect', done);
    });

    afterEach(() => {
      if (secondClient && secondClient.connected) {
        secondClient.disconnect();
      }
    });

    it('should broadcast campaign updates to all clients in room', (done) => {
      const campaignId = '507f1f77bcf86cd799439011';
      const updateData = {
        currentAmount: 7500,
        completionPercentage: 75,
      };

      let client1Received = false;
      let client2Received = false;

      // Both clients join the same campaign room
      clientSocket.emit('join-campaign', campaignId);
      secondClient.emit('join-campaign', campaignId);

      // Both clients listen for updates
      clientSocket.on('campaign-updated', (data: any) => {
        expect(data.campaignId).toBe(campaignId);
        client1Received = true;
        checkBothReceived();
      });

      secondClient.on('campaign-updated', (data: any) => {
        expect(data.campaignId).toBe(campaignId);
        client2Received = true;
        checkBothReceived();
      });

      function checkBothReceived() {
        if (client1Received && client2Received) {
          done();
        }
      }

      // Emit update after both joined
      setTimeout(() => {
        socketService.emitCampaignUpdate(campaignId, updateData);
      }, 200);
    });

    it('should only send updates to clients in the specific campaign room', (done) => {
      const campaign1Id = '507f1f77bcf86cd799439011';
      const campaign2Id = '507f1f77bcf86cd799439012';

      let client1Received = false;
      let client2Received = false;

      // Client 1 joins campaign 1
      clientSocket.emit('join-campaign', campaign1Id);

      // Client 2 joins campaign 2
      secondClient.emit('join-campaign', campaign2Id);

      // Client 1 listens for campaign 1 updates
      clientSocket.on('campaign-updated', (data: any) => {
        expect(data.campaignId).toBe(campaign1Id);
        client1Received = true;
      });

      // Client 2 listens for any updates (should not receive campaign 1 update)
      secondClient.on('campaign-updated', (data: any) => {
        client2Received = true;
      });

      // Emit update to campaign 1 only
      setTimeout(() => {
        socketService.emitCampaignUpdate(campaign1Id, {
          currentAmount: 3000,
          completionPercentage: 30,
        });

        // Wait and verify only client 1 received the update
        setTimeout(() => {
          expect(client1Received).toBe(true);
          expect(client2Received).toBe(false);
          done();
        }, 200);
      }, 200);
    });
  });
});
