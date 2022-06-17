const Peer = require('fully-connected-topology')
const StreamSet = require('stream-set') 
const JSONstream = require('duplex-json-stream')
const myConn = process.argv[2]
const otherConn = process.argv.slice(3)
const streamset = StreamSet()
const peer = Peer(myConn, otherConn)

peer.on('connection', function(conn,connectedTo){
    console.log('Connected successfully to : ',connectedTo)
    conn = JSONstream(conn)   // Stream para leitura e escrita
    streamset.add(conn)
    conn.on('data', function(data){
        console.log(data.message)
    })
})

// Escutar as mensagens no terminal
process.stdin.on('data', function(data){
    streamset.forEach(function(conn){
        conn.write({message: data.toString()})
    })
})

