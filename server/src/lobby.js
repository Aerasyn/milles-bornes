/**
 * Lobby management for Milles Bornes
 */

class Lobby {
  constructor() {
    this.users = new Map(); // Map of socketId -> user object
    this.chatMessages = []; // Array of chat messages
    this.maxChatHistory = 50; // Maximum number of chat messages to keep
  }

  // Add a user to the lobby
  addUser(socketId, username) {
    if (this.isUsernameTaken(username)) {
      return { success: false, error: 'Username is already taken' };
    }

    const user = {
      id: socketId,
      username,
      status: 'online', // 'online', 'in-game'
      joinedAt: new Date()
    };

    this.users.set(socketId, user);
    
    // Add system message about user joining
    this.addSystemMessage(`${username} has joined the lobby`);
    
    return { success: true, user };
  }

  // Remove a user from the lobby
  removeUser(socketId) {
    const user = this.users.get(socketId);
    if (user) {
      this.users.delete(socketId);
      
      // Add system message about user leaving
      this.addSystemMessage(`${user.username} has left the lobby`);
      
      return user;
    }
    return null;
  }

  // Update user status
  updateUserStatus(socketId, status) {
    const user = this.users.get(socketId);
    if (user) {
      user.status = status;
      return user;
    }
    return null;
  }

  // Get all online users
  getOnlineUsers() {
    return Array.from(this.users.values()).filter(user => user.status === 'online');
  }

  // Get all users
  getAllUsers() {
    return Array.from(this.users.values());
  }

  // Get user by socket ID
  getUserBySocketId(socketId) {
    return this.users.get(socketId);
  }

  // Check if username is taken
  isUsernameTaken(username) {
    return Array.from(this.users.values()).some(user => 
      user.username.toLowerCase() === username.toLowerCase()
    );
  }

  // Add a chat message
  addChatMessage(socketId, message) {
    const user = this.users.get(socketId);
    if (!user) return null;

    const chatMessage = {
      id: Date.now().toString(),
      userId: socketId,
      username: user.username,
      message,
      timestamp: new Date()
    };

    this.chatMessages.push(chatMessage);
    
    // Limit chat history
    if (this.chatMessages.length > this.maxChatHistory) {
      this.chatMessages = this.chatMessages.slice(-this.maxChatHistory);
    }
    
    return chatMessage;
  }

  // Add a system message
  addSystemMessage(message) {
    const systemMessage = {
      id: Date.now().toString(),
      userId: 'system',
      username: 'System',
      message,
      timestamp: new Date(),
      isSystem: true
    };

    this.chatMessages.push(systemMessage);
    
    // Limit chat history
    if (this.chatMessages.length > this.maxChatHistory) {
      this.chatMessages = this.chatMessages.slice(-this.maxChatHistory);
    }
    
    return systemMessage;
  }

  // Get recent chat messages
  getChatMessages(limit = 20) {
    return this.chatMessages.slice(-limit);
  }
}

module.exports = { Lobby };
