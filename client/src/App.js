import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';
import './App.css';

const socket = io('http://10.41.4.21:3000'); // Ensure this URL is correct

const fibonacciNumbers = [1, 2, 3, 5, 8, 13, 21, 34, 55, 89];

function App() {
    const [tickets, setTickets] = useState([]);
    const [votes, setVotes] = useState({});
    const [newTicket, setNewTicket] = useState('');
    const [name, setName] = useState('');
    const [loggedIn, setLoggedIn] = useState(false);
    const [selectedVotes, setSelectedVotes] = useState({});
    const [revealedVotes, setRevealedVotes] = useState({});
    const [users, setUsers] = useState({});
    const [consensusValues, setConsensusValues] = useState({});

    useEffect(() => {
        socket.on('initialData', ({ tickets, votes, revealedVotes, name, users, consensusValues }) => {
            setTickets(tickets);
            setVotes(votes);
            setRevealedVotes(revealedVotes);
            setName(name);
            setUsers(users);
            setConsensusValues(consensusValues);
            setLoggedIn(true);
        });

        socket.on('updateTickets', (tickets) => {
            setTickets(tickets);
        });

        socket.on('updateVotes', (votes) => {
            setVotes(votes);
        });

        socket.on('updateRevealedVotes', (revealedVotes) => {
            setRevealedVotes(revealedVotes);
        });

        socket.on('updateUsers', (users) => {
            setUsers(users);
        });

        socket.on('updateConsensus', ({ ticketId, value }) => {
            setConsensusValues(prevValues => ({ ...prevValues, [ticketId]: value }));
        });

        return () => {
            socket.off('initialData');
            socket.off('updateTickets');
            socket.off('updateVotes');
            socket.off('updateRevealedVotes');
            socket.off('updateUsers');
            socket.off('updateConsensus');
        };
    }, []);

    const handleLogin = () => {
        if (name) {
            socket.emit('login', name);
        }
    };

    const handleNewTicket = () => {
        if (newTicket) {
            socket.emit('newTicket', newTicket);
            setNewTicket('');
        }
    };

    const handleNewVote = (ticketId, vote) => {
        const currentVote = selectedVotes[ticketId];

        if (currentVote === vote) {
            // Deselect the vote
            setSelectedVotes({ ...selectedVotes, [ticketId]: null });
        } else {
            // Select or change the vote
            setSelectedVotes({ ...selectedVotes, [ticketId]: vote });
        }

        socket.emit('newVote', { ticketId, vote });
    };

    const handleClearTickets = () => {
        socket.emit('clearTickets');
    };

    const handleRevealVotes = (ticketId) => {
        if (Object.keys(users).length === (votes[ticketId] ? votes[ticketId].length : 0)) {
            socket.emit('revealVotes', ticketId);
        }
    };

    const calculateAverage = (votes) => {
        if (!votes || votes.length === 0) return 0;
        const sum = votes.reduce((acc, vote) => acc + vote.vote, 0);
        return (sum / votes.length).toFixed(2);
    };

    const findClosestFibonacci = (average) => {
        return fibonacciNumbers.reduce((prev, curr) =>
            Math.abs(curr - average) < Math.abs(prev - average) ? curr : prev
        );
    };

    const handleConsensusChange = (ticketId, value) => {
        setConsensusValues({ ...consensusValues, [ticketId]: value });
        socket.emit('changeConsensus', { ticketId, value });
    };

    useEffect(() => {
        Object.keys(votes).forEach((ticketId) => {
            if (revealedVotes[ticketId]) {
                const avg = calculateAverage(votes[ticketId]);
                const closestFibonacci = findClosestFibonacci(avg);
                setConsensusValues((prevValues) => ({
                    ...prevValues,
                    [ticketId]: closestFibonacci
                }));
            }
        });
    }, [votes, revealedVotes]);

    const handleKeyDownLogin = (event) => {
        if (event.key === 'Enter') {
            handleLogin();
        }
    };

    const handleKeyDownNewTicket = (event) => {
        if (event.key === 'Enter') {
            handleNewTicket();
        }
    };

    if (!loggedIn) {
        return (
            <div className="login">
                <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    onKeyDown={handleKeyDownLogin}
                />
                <button onClick={handleLogin}>Login</button>
            </div>
        );
    }

    return (
        <div className="app">
            <header className="header">
                <h1>Team Gypsy Planning Poker</h1>
                <h2>Welcome, {name}</h2>
                <div className="users-container">
                    <h3>Current Participants</h3>
                    <div className="users-list">
                        {Object.values(users).map((user, index) => (
                            <span key={index} className="user">{user}</span>
                        ))}
                    </div>
                </div>
            </header>
            <div className="input-section">
                <h3>Add a new ticket</h3>
                <div className="add-ticket">
                    <input
                        value={newTicket}
                        onChange={(e) => setNewTicket(e.target.value)}
                        placeholder="Enter new ticket"
                        className="ticket-input"
                        onKeyDown={handleKeyDownNewTicket}
                    />
                    <button onClick={handleNewTicket} className="add-ticket-button">Add Ticket</button>
                </div>
            </div>
            <div className="tickets-section">
                <button onClick={handleClearTickets} className="clear-tickets-button">Clear All Tickets</button>
                <div className="tickets-box">
                    {tickets.map((ticket, index) => (
                        <div key={index} className="ticket">
                            <div className="ticket-header">
                                <select
                                    className="consensus-dropdown"
                                    value={consensusValues[index] || ''}
                                    onChange={(e) => handleConsensusChange(index, parseInt(e.target.value))}
                                >
                                    <option value="" disabled>Select</option>
                                    {fibonacciNumbers.map(num => (
                                        <option key={num} value={num}>{num}</option>
                                    ))}
                                </select>
                                <h2>{ticket}</h2>
                            </div>
                            <div className="vote-buttons">
                                {fibonacciNumbers.map(num => (
                                    <button
                                        key={num}
                                        className={selectedVotes[index] === num ? 'selected' : ''}
                                        onClick={() => handleNewVote(index, num)}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                            <button
                                className="reveal-button"
                                onClick={() => handleRevealVotes(index)}
                                disabled={Object.keys(users).length !== (votes[index] ? votes[index].length : 0)}
                            >
                                Votes Cast {votes[index] ? votes[index].length : 0}/{Object.keys(users).length}
                            </button>
                            {revealedVotes[index] && (
                                <div className="revealed-votes">
                                    <div className="votes-list">
                                        <h4>Votes:</h4>
                                        {votes[index] ? votes[index].map(v => (
                                            <div key={v.user} className="vote-item">
                                                {v.user}: {v.vote}
                                            </div>
                                        )) : 'No votes yet'}
                                    </div>
                                    <div className="average-vote">
                                        <h4>Average:</h4>
                                        <div className="average-value">{calculateAverage(votes[index])}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default App;
