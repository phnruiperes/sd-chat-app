const http = require('http')
const express = require('express')
const path = require('path')
const { isObject } = require('util')
const PORT = 3000
// Array with all active connections
const connectionPeers = {}
const channels = {}
const app = express()
// Creating HTTP server
const server = http.createServer(app)
const socketIO = require('socket.io').listen(server) 

server.listen(PORT, null, function(){
    console.log('Server listening on PORT', PORT)
})
app.use(express.static(path.join(__dirname,"../public")))
app.get('/', function(req, res){ res.sendFile(__dirname + '/client.html')  }) 

sendPeersCount = function(){
    for (user in connectionPeers){
        connectionPeers[user].emit('peersConnected', Object.keys(socketIO.sockets.connected).length)
    }
}

socketIO.sockets.on('connection', function(socket){
    socket.channels = {}
    connectionPeers[socket.id] = socket
    console.log(socket.id, 'Connection accepted')
    socket.emit('myID', socket.id)
    // When user disconnect 
    socket.on('disconnect', function(){
        console.log(socket.id,'disconnected')
        socket.removeAllListeners()
        for(const channel in socket.channels){
            part(channel)
        }
        
        sendPeersCount()
        // Delete user from list
        delete connectionPeers[socket.id]
    })
    socket.on('end', ()=> socket.disconnect(0))
    sendPeersCount()
    

    socket.on('join', function (config) {
        // console.log("["+ socket.id + "] joined on ", config) 
        const channel = config.channel 
        if (!(channel in channels)) {
            channels[channel] = {} 
        }

        // AddPeer for every Peer already on this channel
        for (conn in channels[channel]) {
            channels[channel][conn].emit('addPeer', {'peer_id': socket.id, 'should_create_offer': false}) 
            socket.emit('addPeer', {'peer_id': conn, 'should_create_offer': true}) 
        }
        // if(channels[channel]){
        //     // Case it's the first to connect
        //     socket.emit('addPeer',{'should_create_offer': true} )
        // }
        channels[channel][socket.id] = socket 
        socket.channels[channel] = channel 
    }) 
    // 'Remove' user from channel
    function part(channel) {
        console.log("["+ socket.id + "] part ");

        if (!(channel in socket.channels)) {
            console.log("["+ socket.id + "] ERROR: not in ", channel);
            return;
        }

        delete socket.channels[channel];
        delete channels[channel][socket.id];

        for (id in channels[channel]) {
            channels[channel][id].emit('removePeer', {'peer_id': socket.id});
            socket.emit('removePeer', {'peer_id': id});
        }
    }

    socket.on('part', part)

    // Change current ID
    socket.on('changeID', function(id){
        socket.id = id
    })

    // Relay IP/PORT data to all other users at the chat
    socket.on('relayICEcandidate', async function(configuration){
        console.log('RECEIVED CONFIG CANDIDATE', configuration)
        const peerID = configuration.peer_id
        const iceCandidate = configuration.ice_candidate
        // console.log("["+ socket.id + "] relaying ICE candidate to [" + peerID + "] ", iceCandidate)
        // console.log('CONFIGURATION', configuration)
        if(peerID in connectionPeers){
            await connectionPeers[peerID].emit('iceCandidateFunction', {'peer_id':socket.id, 'ice_candidate': iceCandidate})
        }
    })

    socket.on('relaySessionDescription', async function(config) {
        const peerID = config.peer_id 
        const sessionDescription = config.session_description 
        // console.log("["+ socket.id + "] relaying session description to [" + peerID + "] ", sessionDescription) 
        if (peerID in connectionPeers) {
            await connectionPeers[peerID].emit('sessionDescriptionFunction', {'peer_id': socket.id, 'session_description': sessionDescription}) 
        }
    }) 

    // function sendHeartBeat(){
    //     console.log('Pong')
    //     socket.emit('ping',{beat:1})
    // }

    // socket.on('pong', function(data){
    //     console.log('Pong received')
    // })
    // setTimeout(sendHeartBeat, 2000)

})
