import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import config from './config.js';

// store online users (userId -> socketId)
export const onlineUsers = new Map();

// store active conversations (userId -> conversationId they're currently viewing)
export const activeConversations = new Map();

// initialize socket.io server
export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: config.frontendUrl,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // socket.io middleware for authentication
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    const decoded = jwt.verify(token, config.jwt.accessSecret);

    socket.userId = decoded.userId || decoded.id || decoded._id;

    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
});

  // socket.io connection handler
  io.on('connection', (socket) => {

    // add user to online users
    onlineUsers.set(socket.userId, socket.id);
    socket.join(socket.userId);

    // broadcast updated online users list
    io.emit('onlineUsers', Array.from(onlineUsers.keys()));

    // listen for user joining a conversation
    socket.on('joinConversation', ({ conversationId }) => {
      socket.join(conversationId);
      activeConversations.set(socket.userId, conversationId);
    });

    // listen for user leaving a conversation
    socket.on('leaveConversation', ({ conversationId }) => {
      socket.leave(conversationId);
      activeConversations.delete(socket.userId);
    });

    // listen for typing indicator
    socket.on('typing', ({ conversationId, recipientId, isTyping }) => {
      // broadcast to recipient using their user id room
      io.to(recipientId).emit('userTyping', {
        conversationId,
        userId: socket.userId,
        isTyping,
      });
    });

    // listen for message read status
    socket.on('markAsRead', async ({ conversationId }) => {
      try {
        // get the other user in conversation
        const [user1, user2] = conversationId.split('_');
        const otherUserId = user1 === socket.userId ? user2 : user1;

        // broadcast to sender that their messages were read
        io.to(otherUserId).emit('messagesRead', {
          conversationId,
          readBy: socket.userId,
        });
      } catch (error) {
        console.error('error handling markAsRead:', error);
      }
    });

    // listen for sending messages
    socket.on('sendMessage', async (message) => {
      try {
        // emit to recipient using their user id room
        io.to(message.recipient).emit('newMessage', message);

        // also emit back to sender for confirmation
        socket.emit('messageSent', message);
      } catch (error) {
        console.error('error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // listen for message deletion
    socket.on('deleteMessage', ({ messageId, recipientId }) => {
      // emit to recipient using their user id room
      io.to(recipientId).emit('messageDeleted', { messageId });
    });

    // handle disconnection
    socket.on('disconnect', () => {
      onlineUsers.delete(socket.userId);
      activeConversations.delete(socket.userId);

      // broadcast updated online users list
      io.emit('onlineUsers', Array.from(onlineUsers.keys()));
    });
  });

  console.log('Socket.IO initialized');
  return io;
};

export default initializeSocket;