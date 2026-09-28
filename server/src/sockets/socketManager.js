const { Server } = require('socket.io');

let io = null;

const initSocketIO = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: '*', // Allows connections from Vite dev server and production clients
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log(`[Socket.IO] New client connected: ${socket.id}`);

    // Register into student private room
    socket.on('join:student', (studentId) => {
      if (studentId) {
        const roomName = `student:${studentId}`;
        socket.join(roomName);
        console.log(`[Socket.IO] Socket ${socket.id} joined room ${roomName}`);
      }
    });

    // Register into staff counter room
    socket.on('join:counter', (counterId) => {
      if (counterId) {
        const roomName = `counter:${counterId}`;
        socket.join(roomName);
        console.log(`[Socket.IO] Socket ${socket.id} joined room ${roomName}`);
      }
    });

    // Register into department room
    socket.on('join:dept', (deptCode) => {
      if (deptCode) {
        const roomName = `dept:${deptCode.toUpperCase()}`;
        socket.join(roomName);
        console.log(`[Socket.IO] Socket ${socket.id} joined room ${roomName}`);
      }
    });

    // Register into admin room
    socket.on('join:admin', () => {
      socket.join('admin:room');
      console.log(`[Socket.IO] Socket ${socket.id} joined admin:room`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io has not been initialized yet!');
  }
  return io;
};

// Event emitter helpers
const emitQueueUpdate = (data) => {
  if (io) {
    // Broadcast to department room, admin room, and all connected clients
    if (data.departmentCode) {
      io.to(`dept:${data.departmentCode.toUpperCase()}`).emit('queue:updated', data);
    }
    io.to('admin:room').emit('queue:updated', data);
    io.emit('queue:updated', data);
  }
};

const emitTokenCalled = (studentId, data) => {
  if (io) {
    if (studentId) {
      io.to(`student:${studentId}`).emit('token:called', data);
    }
    if (data.counterId) {
      io.to(`counter:${data.counterId}`).emit('token:called', data);
    }
    io.to('admin:room').emit('token:called', data);
    io.emit('token:called', data); // General feed for waiting boards
  }
};

const emitTokenServing = (studentId, data) => {
  if (io) {
    if (studentId) {
      io.to(`student:${studentId}`).emit('token:serving', data);
    }
    if (data.counterId) {
      io.to(`counter:${data.counterId}`).emit('token:serving', data);
    }
    io.to('admin:room').emit('token:serving', data);
    io.emit('token:serving', data);
  }
};

const emitTokenCompleted = (studentId, data) => {
  if (io) {
    if (studentId) {
      io.to(`student:${studentId}`).emit('token:completed', data);
    }
    if (data.counterId) {
      io.to(`counter:${data.counterId}`).emit('token:completed', data);
    }
    io.to('admin:room').emit('token:completed', data);
    io.emit('token:completed', data);
  }
};

const emitTokenSkipped = (studentId, data) => {
  if (io) {
    if (studentId) {
      io.to(`student:${studentId}`).emit('token:skipped', data);
    }
    if (data.counterId) {
      io.to(`counter:${data.counterId}`).emit('token:skipped', data);
    }
    io.to('admin:room').emit('token:skipped', data);
    io.emit('token:skipped', data);
  }
};

const emitCounterStatus = (counterId, data) => {
  if (io) {
    io.to(`counter:${counterId}`).emit('counter:status', data);
    if (data.departmentCode) {
      io.to(`dept:${data.departmentCode.toUpperCase()}`).emit('counter:status', data);
    }
    io.to('admin:room').emit('counter:status', data);
    io.emit('counter:status', data);
  }
};

module.exports = {
  initSocketIO,
  getIO,
  emitQueueUpdate,
  emitTokenCalled,
  emitTokenServing,
  emitTokenCompleted,
  emitTokenSkipped,
  emitCounterStatus
};
