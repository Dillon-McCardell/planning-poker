const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "http://10.41.4.21:8000", // Update this to match your React app's address
        methods: ["GET", "POST"]
    }
});

// Use CORS middleware
app.use(cors({
    origin: "http://10.41.4.21:8000" // Update this to match your React app's address
}));

let tickets = [];
let votes = {};
let users = {};
let revealedVotes = {};
let consensusValues = {};

io.on('connection', (socket) => {
    console.log('New client connected');

    socket.on('login', (name) => {
        users[socket.id] = name;
        socket.emit('initialData', { tickets, votes, revealedVotes, name, users, consensusValues });
        io.sockets.emit('updateUsers', users);
    });

    socket.on('newTicket', (ticket) => {
        tickets.push(ticket);
        io.sockets.emit('updateTickets', tickets);
    });

    socket.on('newVote', ({ ticketId, vote }) => {
        if (!votes[ticketId]) {
            votes[ticketId] = [];
        }

        const userVoteIndex = votes[ticketId].findIndex(v => v.user === users[socket.id]);

        if (userVoteIndex >= 0) {
            if (votes[ticketId][userVoteIndex].vote === vote) {
                // Deselecting the vote
                votes[ticketId].splice(userVoteIndex, 1);
            } else {
                // Updating the vote
                votes[ticketId][userVoteIndex].vote = vote;
            }
        } else {
            // Adding new vote
            votes[ticketId].push({ vote, user: users[socket.id] });
        }

        io.sockets.emit('updateVotes', votes);
    });

    socket.on('revealVotes', (ticketId) => {
        revealedVotes[ticketId] = true;
        io.sockets.emit('updateRevealedVotes', revealedVotes);
    });

    socket.on('changeConsensus', ({ ticketId, value }) => {
        consensusValues[ticketId] = value;
        io.sockets.emit('updateConsensus', { ticketId, value });
    });

    socket.on('clearTickets', () => {
        tickets = [];
        votes = {};
        revealedVotes = {};
        consensusValues = {};
        io.sockets.emit('updateTickets', tickets);
        io.sockets.emit('updateVotes', votes);
        io.sockets.emit('updateRevealedVotes', revealedVotes);
        io.sockets.emit('updateConsensus', consensusValues);
    });

    socket.on('disconnect', () => {
        delete users[socket.id];
        io.sockets.emit('updateUsers', users);
        console.log('Client disconnected');
    });
});

app.get('/', (req, res) => {
    res.send('<h1>Planning Poker Server</h1>');
});

server.listen(3000, () => {
    console.log('Server is running on port 3000');
});
