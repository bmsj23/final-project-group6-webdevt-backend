import asyncHandler from '../utils/asyncHandler.js';
import Message from '../models/Message.model.js';
import User from '../models/User.model.js';
import { successResponse } from '../utils/response.js';
import { sendNewMessageEmail } from '../utils/emailService.js';
import { onlineUsers, activeConversations } from '../config/socket.js';

// get all conversations for user

export const getConversations = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const conversations = await Message.getUserConversations(userId);

  successResponse(res, conversations, 'Conversations retrieved successfully', 200);
});

// get conversation with specific user

export const getConversation = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { otherUserId } = req.params;
  const { page, limit } = req.query;

  const messages = await Message.getConversation(userId, otherUserId, {
    limit: parseInt(limit) || 50,
    skip: ((parseInt(page) || 1) - 1) * (parseInt(limit) || 50),
  });

  successResponse(res, messages, 'Conversation retrieved successfully', 200);
});

// send new message

export const sendMessage = asyncHandler(async (req, res) => {
  const senderId = req.user.id;
  const { recipient, messageText, product, image, images } = req.body;

  const messageData = {
    sender: senderId,
    recipient,
    messageText,
    product,
  };

  if (images && Array.isArray(images)) {
    messageData.images = images;
  } else if (image) {
    messageData.images = [image];
    messageData.image = image;
  }

  const message = await Message.create(messageData);

  await message.populate([
    { path: 'sender', select: 'name profilePicture' },
    { path: 'recipient', select: 'name profilePicture' },
    { path: 'product', select: 'name images price' },
  ]);

  const conversationId = [senderId, recipient].sort().join('_');

  // check if recipient is viewing this conversation
  const recipientActiveConversation = activeConversations.get(recipient);
  const isRecipientViewingConversation = recipientActiveConversation === conversationId;

  // if recipient is viewing the conversation, mark as read immediately
  if (isRecipientViewingConversation) {
    message.isRead = true;
    message.readAt = new Date();
    await message.save();
  }

  // emit socket event to recipient if they're online
  const io = req.app.get('io');
  if (io) {
    const recipientSocketId = onlineUsers.get(recipient);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('newMessage', {
        _id: message._id,
        sender: message.sender,
        recipient: message.recipient,
        messageText: message.messageText,
        product: message.product,
        image: message.image,
        images: message.images,
        isRead: message.isRead,
        readAt: message.readAt,
        createdAt: message.createdAt,
        conversationId: conversationId,
      });

      // if message was auto-marked as read, notify the sender immediately
      if (isRecipientViewingConversation) {
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId) {
          io.to(senderSocketId).emit('messagesRead', {
            readBy: recipient,
            conversationId: conversationId,
            messageIds: [message._id.toString()],
          });
        }
      }
    }
  }

  // send email notification to recipient about new message
  try {
    const recipientUser = await User.findById(recipient);
    const senderUser = await User.findById(senderId);

    if (recipientUser && recipientUser.email && senderUser) {
      let emailContent = messageText;
      if (!emailContent) {
        const imageCount = message.images?.length || 0;
        emailContent = imageCount > 1 ? `[${imageCount} Images]` : '[Image]';
      }
      await sendNewMessageEmail(
        recipientUser.email,
        senderUser.name,
        emailContent
      );
    }
  } catch (emailError) {
    console.error('Failed to send message notification email:', emailError);
    // don't throw error - message was sent successfully even if email fails
  }

  successResponse(res, message, 'Message sent successfully', 201);
});

// delete message (sender only)

export const deleteMessage = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { messageId } = req.params;

  const message = await Message.findById(messageId);

  if (!message) {
    throw new AppError('Message not found', 404);
  }

  if (message.sender.toString() !== userId) {
    throw new AppError('You can only delete your own messages', 403);
  }

  const recipientId = message.recipient.toString();

  await message.deleteOne();

  // emit socket event to recipient if they're online
  const io = req.app.get('io');
  if (io) {
    const recipientSocketId = onlineUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('messageDeleted', { messageId });
    }
  }

  successResponse(res, null, 'Message deleted successfully', 200);
});

// mark messages as read

export const markAsRead = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { conversationId } = req.body;

  const messageIds = await Message.markConversationAsRead(conversationId, userId);

  const io = req.app.get('io');
  if (io) {

    // conversationId format: "userId1_userId2"
    const [user1Id, user2Id] = conversationId.split('_');
    const otherUserId = user1Id === userId ? user2Id : user1Id;

    const senderSocketId = onlineUsers.get(otherUserId);
    if (senderSocketId) {
      io.to(senderSocketId).emit('messagesRead', {
        readBy: userId,
        conversationId: conversationId,
        messageIds: messageIds
      });
    }
  }

  successResponse(res, null, 'Messages marked as read successfully', 200);
});

// get unread message count

export const getUnreadCount = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const count = await Message.getUnreadCount(userId);

  successResponse(res, { unreadCount: count }, 'Unread count retrieved successfully', 200);
});

// get online users status

export const getOnlineUsers = asyncHandler(async (req, res) => {
  const onlineUserIds = Array.from(onlineUsers.keys());

  successResponse(res, { onlineUsers: onlineUserIds }, 'Online users retrieved successfully', 200);
});

export default {
  getConversations,
  getConversation,
  sendMessage,
  deleteMessage,
  markAsRead,
  getUnreadCount,
  getOnlineUsers,
};