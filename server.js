const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const players = {};
const MAX_PLAYERS = 40;

app.use(express.static('public'));

io.on('connection', (socket) => {
  if (Object.keys(players).length >= MAX_PLAYERS) {
    socket.emit('gameUpdate', 'Server full. Try again later.');
    socket.disconnect();
    return;
  }

  socket.on('createCharacter', ({ name, profession }) => {
    const playerId = uuidv4();
    players[playerId] = {
      id: playerId,
      name,
      profession,
      stats: {
        health: 100,
        mana: 50,
        strength: 10,
        agility: 10,
      },
      position: { x: 0, y: 0 },
    };
    socket.emit('playerCreated', players[playerId]);
    io.emit('gameUpdate', `${name} the ${profession} has joined the game.`);
  });

  socket.on('command', ({ playerId, command }) => {
    if (!players[playerId]) return;
    const player = players[playerId];
    let response = '';

    const cmd = command.toUpperCase().trim();
    if (cmd === 'ATTACK') {
      const damage = Math.floor(Math.random() * 10) + player.stats.strength;
      response = `${player.name} attacks for ${damage} damage!`;
      if (Math.random() < 0.1) {
        response += ' Critical hit!';
      }
    } else if (cmd === 'CAST MINOR SHOCK') {
      if (player.stats.mana >= 10) {
        player.stats.mana -= 10;
        const damage = Math.floor(Math.random() * 15) + 5;
        response = `${player.name} casts Minor Shock for ${damage} electrical damage!`;
        socket.emit('playerCreated', player); // Update mana
      } else {
        response = `${player.name} lacks mana to cast Minor Shock.`;
      }
    } else {
      response = `Unknown command: ${command}`;
    }

    io.emit('gameUpdate', response);
  });

  socket.on('disconnect', () => {
    for (const playerId in players) {
      if (players[playerId].id === socket.id) {
        io.emit('gameUpdate', `${players[playerId].name} has left the game.`);
        delete players[playerId];
        break;
      }
    }
  });
});

server.listen(3000, () => {
  console.log('Server running on http://localhost:3000');
});